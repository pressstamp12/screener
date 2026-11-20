import { NextRequest, NextResponse } from 'next/server';
import { db, isDbConfigured } from '@/lib/supabaseServer';
import {
  buildTickerNewsBundle,
  classifyNewsSentiment,
  detectIsInternalNews,
  ExternalSectorKey,
  getExternalSectorKey,
  isFreshNews,
  isTickerRelevantNews,
  MAX_NEWS_AGE_DAYS,
  SECTOR_CONFIGS,
} from '@/lib/news';
import { StockNewsItem, TickerNewsBundle } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;
export const preferredRegion = 'sin1';

const CACHE_HOURS = 6;
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json, application/xml, text/xml, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

type NewsCacheMap = Map<string, StockNewsItem[]>;

async function fetchWithTimeout(
  url: string,
  timeoutMs = 7000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: 'no-store',
      headers: BROWSER_HEADERS,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtmlToSnippet(raw: string): string {
  return decodeXmlEntities(raw)
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractXmlTag(block: string, tag: string): string {
  const rx = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = block.match(rx);
  return match ? decodeXmlEntities(match[1]) : '';
}

function parseGoogleNewsRss(
  xml: string,
  tickerKey: string,
  maxItems = 5
): StockNewsItem[] {
  const items: StockNewsItem[] = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  const isMacroKey = tickerKey.startsWith('MACRO_');

  for (const block of itemMatches) {
    let rawTitle = extractXmlTag(block, 'title');
    if (!rawTitle) continue;

    let source = extractXmlTag(block, 'source') || 'Google News';
    const dashIdx = rawTitle.lastIndexOf(' - ');
    if (dashIdx > 15) {
      const trailingSource = rawTitle.slice(dashIdx + 3).trim();
      if (trailingSource && trailingSource.length <= 45) {
        if (!source || source === 'Google News') {
          source = trailingSource;
        }
        rawTitle = rawTitle.slice(0, dashIdx).trim();
      }
    }

    const link = extractXmlTag(block, 'link');
    const pubRaw = extractXmlTag(block, 'pubDate');
    const pubDate = pubRaw ? new Date(pubRaw) : null;
    if (!pubDate || Number.isNaN(pubDate.getTime())) continue;

    const publishedAt = pubDate.toISOString();
    // Wajib maksimal 7 hari terakhir (buang 2023/2024/2025)
    if (!isFreshNews(publishedAt, MAX_NEWS_AGE_DAYS)) continue;

    const descRaw = extractXmlTag(block, 'description');
    const snippet = stripHtmlToSnippet(descRaw);

    if (!isMacroKey && !isTickerRelevantNews(tickerKey, rawTitle, snippet)) {
      continue;
    }

    if (isMacroKey) {
      const cfg = SECTOR_CONFIGS[tickerKey as ExternalSectorKey];
      const lower = `${rawTitle} ${snippet}`.toLowerCase();
      if (cfg && !cfg.matchKeywords.some((kw) => lower.includes(kw))) {
        continue;
      }
    }

    items.push({
      ticker: tickerKey,
      title: rawTitle,
      source,
      published_at: publishedAt,
      sentiment: classifyNewsSentiment(rawTitle, snippet),
      is_internal: detectIsInternalNews(tickerKey, rawTitle),
      url: link,
    });

    if (items.length >= maxItems) break;
  }

  return items.sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

async function fetchYahooTickerNews(ticker: string): Promise<StockNewsItem[]> {
  try {
    const symbol = `${ticker}.JK`;
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      symbol
    )}&quotesCount=0&newsCount=8`;

    const res = await fetchWithTimeout(url, 6000);
    if (!res.ok) return [];

    const json = await res.json();
    const newsList: Array<{
      title?: string;
      publisher?: string;
      link?: string;
      providerPublishTime?: number;
      summary?: string;
    }> = json?.news || [];

    const valid: StockNewsItem[] = [];

    for (const n of newsList) {
      if (!n.title || !n.providerPublishTime) continue;
      const title = n.title.trim();
      const snippet = (n.summary || '').trim();
      const publishedAt = new Date(n.providerPublishTime * 1000).toISOString();

      // Wajib <= 7 hari dan relevan dengan ticker IDX (buang berita global nyasar)
      if (!isFreshNews(publishedAt, MAX_NEWS_AGE_DAYS)) continue;
      if (!isTickerRelevantNews(ticker, title, snippet)) continue;

      valid.push({
        ticker,
        title,
        source: n.publisher || 'Yahoo Finance',
        published_at: publishedAt,
        sentiment: classifyNewsSentiment(title, snippet),
        is_internal: detectIsInternalNews(ticker, title),
        url: n.link || '',
      });
    }

    return valid
      .sort(
        (a, b) =>
          new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      )
      .slice(0, 3);
  } catch {
    return [];
  }
}

async function fetchGoogleNews(
  query: string,
  tickerKey: string,
  maxItems = 4
): Promise<StockNewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
      query
    )}&hl=id&gl=ID&ceid=ID:id`;

    const res = await fetchWithTimeout(url, 6500);
    if (!res.ok) return [];

    const xml = await res.text();
    return parseGoogleNewsRss(xml, tickerKey, maxItems);
  } catch {
    return [];
  }
}

async function getCachedNewsFromSupabase(
  keys: string[]
): Promise<NewsCacheMap> {
  const result: NewsCacheMap = new Map();
  if (!isDbConfigured || keys.length === 0) return result;

  try {
    const cutoff6HoursIso = new Date(
      Date.now() - CACHE_HOURS * 60 * 60 * 1000
    ).toISOString();
    const cutoff7DaysIso = new Date(
      Date.now() - MAX_NEWS_AGE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await db()
      .from('stock_news')
      .select('*')
      .in('ticker', keys)
      .gte('created_at', cutoff6HoursIso)
      .gte('published_at', cutoff7DaysIso)
      .order('published_at', { ascending: false });

    if (error || !data) return result;

    for (const row of data as StockNewsItem[]) {
      if (!isFreshNews(row.published_at, MAX_NEWS_AGE_DAYS)) continue;
      // Evaluasi ulang sentimen agar keyword baru langsung berlaku pada data cache
      const refreshedRow: StockNewsItem = {
        ...row,
        sentiment: classifyNewsSentiment(row.title),
      };
      const list = result.get(row.ticker) || [];
      list.push(refreshedRow);
      result.set(row.ticker, list);
    }
  } catch {
    // Abaikan jika tabel belum tersedia
  }

  return result;
}

async function saveNewsToSupabase(
  tickerKey: string,
  items: StockNewsItem[]
): Promise<void> {
  if (!isDbConfigured) return;

  try {
    const cutoff7DaysIso = new Date(
      Date.now() - MAX_NEWS_AGE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    // Hapus berita lama (> 7 hari) dan cache lama untuk ticker ini saat fetch baru
    await db()
      .from('stock_news')
      .delete()
      .eq('ticker', tickerKey);

    await db()
      .from('stock_news')
      .delete()
      .lt('published_at', cutoff7DaysIso);

    const freshItems = items.filter((i) =>
      isFreshNews(i.published_at, MAX_NEWS_AGE_DAYS)
    );
    if (freshItems.length === 0) return;

    const rows = freshItems.map((item) => ({
      ticker: item.ticker,
      title: item.title,
      source: item.source,
      published_at: item.published_at,
      sentiment: item.sentiment,
      is_internal: item.is_internal,
      url: item.url,
    }));

    await db().from('stock_news').insert(rows);
  } catch {
    // Jangan gagalkan respons API jika cache DB gagal
  }
}

async function fetchFreshNewsForKey(key: string): Promise<StockNewsItem[]> {
  if (key.startsWith('MACRO_')) {
    const cfg = SECTOR_CONFIGS[key as ExternalSectorKey];
    if (!cfg) return [];
    return fetchGoogleNews(cfg.query, key, 5);
  }

  // 1. Coba Yahoo Finance News dulu (yang fresh <= 7 hari & relevan)
  const yahooItems = await fetchYahooTickerNews(key);
  if (yahooItems.length > 0) {
    return yahooItems.slice(0, 3);
  }

  // 2. Fallback ke Google News RSS Indonesia khusus 7 hari terakhir
  const googleItems = await fetchGoogleNews(
    `(${key} IDX OR saham ${key}) when:7d`,
    key,
    4
  );
  return googleItems.slice(0, 3);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get('tickers') || '';
  const includeMacro = searchParams.get('includeMacro') !== 'false';

  const requestedTickers = Array.from(
    new Set(
      tickersParam
        .split(',')
        .map((t) => t.replace(/\.JK$/i, '').trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, 12);

  if (requestedTickers.length === 0) {
    return NextResponse.json({ news: {} });
  }

  // Kumpulkan sector macro key unik hanya untuk sektor yang muncul di batch ini
  const sectorKeys = includeMacro
    ? Array.from(new Set(requestedTickers.map((t) => getExternalSectorKey(t))))
    : [];

  const lookupKeys = [...requestedTickers, ...sectorKeys];

  // 1. Cek cache 6 jam di Supabase (hanya berita <= 7 hari)
  const cachedMap = await getCachedNewsFromSupabase(lookupKeys);
  const missingKeys = lookupKeys.filter((k) => !cachedMap.has(k));

  // 2. Fetch paralel untuk ticker/sektor yang belum ada di cache
  if (missingKeys.length > 0) {
    const settled = await Promise.allSettled(
      missingKeys.map(async (key) => {
        const fresh = await fetchFreshNewsForKey(key);
        await saveNewsToSupabase(key, fresh);
        return { key, fresh };
      })
    );

    for (const res of settled) {
      if (res.status === 'fulfilled') {
        cachedMap.set(res.value.key, res.value.fresh);
      }
    }
  }

  const bundles: Record<string, TickerNewsBundle> = {};

  for (const ticker of requestedTickers) {
    const items = cachedMap.get(ticker) || [];
    const sectorKey = getExternalSectorKey(ticker);
    const sectorMacros = cachedMap.get(sectorKey) || [];
    bundles[ticker] = buildTickerNewsBundle(ticker, items, sectorMacros);
  }

  return NextResponse.json({
    fetchedAt: new Date().toISOString(),
    news: bundles,
  });
}
