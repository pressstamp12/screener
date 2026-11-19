import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  buildTickerNewsBundle,
  classifyNewsSentiment,
  detectIsInternalNews,
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
  ticker: string,
  maxItems = 5
): StockNewsItem[] {
  const items: StockNewsItem[] = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  for (const block of itemMatches.slice(0, maxItems)) {
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
    const pubDate = pubRaw ? new Date(pubRaw) : new Date();
    const publishedAt = Number.isNaN(pubDate.getTime())
      ? new Date().toISOString()
      : pubDate.toISOString();

    items.push({
      ticker,
      title: rawTitle,
      source,
      published_at: publishedAt,
      sentiment: classifyNewsSentiment(rawTitle),
      is_internal: detectIsInternalNews(ticker, rawTitle),
      url: link,
    });
  }

  return items;
}

async function fetchYahooTickerNews(ticker: string): Promise<StockNewsItem[]> {
  try {
    const symbol = `${ticker}.JK`;
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      symbol
    )}&quotesCount=0&newsCount=5`;

    const res = await fetchWithTimeout(url, 6000);
    if (!res.ok) return [];

    const json = await res.json();
    const newsList: Array<{
      title?: string;
      publisher?: string;
      link?: string;
      providerPublishTime?: number;
    }> = json?.news || [];

    return newsList
      .filter((n) => Boolean(n.title))
      .slice(0, 4)
      .map((n) => {
        const title = (n.title || '').trim();
        const publishedAt = n.providerPublishTime
          ? new Date(n.providerPublishTime * 1000).toISOString()
          : new Date().toISOString();

        return {
          ticker,
          title,
          source: n.publisher || 'Yahoo Finance',
          published_at: publishedAt,
          sentiment: classifyNewsSentiment(title),
          is_internal: detectIsInternalNews(ticker, title),
          url: n.link || '',
        };
      });
  } catch {
    return [];
  }
}

async function fetchGoogleNews(
  query: string,
  ticker: string,
  maxItems = 4
): Promise<StockNewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
      query
    )}&hl=id&gl=ID&ceid=ID:id`;

    const res = await fetchWithTimeout(url, 6500);
    if (!res.ok) return [];

    const xml = await res.text();
    return parseGoogleNewsRss(xml, ticker, maxItems);
  } catch {
    return [];
  }
}

async function getCachedNewsFromSupabase(
  tickers: string[]
): Promise> {
  const result = new Map<string, StockNewsItem[]>();
  if (!isSupabaseConfigured || tickers.length === 0) return result;

  try {
    const cutoffIso = new Date(
      Date.now() - CACHE_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from('stock_news')
      .select('*')
      .in('ticker', tickers)
      .gte('created_at', cutoffIso)
      .order('published_at', { ascending: false });

    if (error || !data) return result;

    for (const row of data as StockNewsItem[]) {
      const list = result.get(row.ticker) || [];
      list.push(row);
      result.set(row.ticker, list);
    }
  } catch {
    // Abaikan jika tabel stock_news belum dibuat agar API tetap jalan
  }

  return result;
}

async function saveNewsToSupabase(
  ticker: string,
  items: StockNewsItem[]
): Promise<void> {
  if (!isSupabaseConfigured || items.length === 0) return;

  try {
    await supabase.from('stock_news').delete().eq('ticker', ticker);

    const rows = items.map((item) => ({
      ticker: item.ticker,
      title: item.title,
      source: item.source,
      published_at: item.published_at,
      sentiment: item.sentiment,
      is_internal: item.is_internal,
      url: item.url,
    }));

    await supabase.from('stock_news').insert(rows);
  } catch {
    // Jangan gagalkan respons jika cache DB gagal
  }
}

async function fetchFreshNewsForTicker(
  ticker: string
): Promise<StockNewsItem[]> {
  if (ticker === 'MACRO') {
    const macroQuery =
      '("BI Rate" OR IHSG OR "harga batubara" OR "harga nikel" OR CPO OR "harga minyak" OR Rupiah) when:3d';
    return fetchGoogleNews(macroQuery, 'MACRO', 8);
  }

  // 1. Coba Yahoo Finance News terlebih dahulu
  const yahooItems = await fetchYahooTickerNews(ticker);
  if (yahooItems.length > 0) {
    return yahooItems.slice(0, 3);
  }

  // 2. Fallback ke Google News RSS (TICKER IDX) jika Yahoo kosong
  const googleItems = await fetchGoogleNews(`${ticker} IDX`, ticker, 4);
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
    return NextResponse.json({ news: {}, macroCount: 0 });
  }

  const lookupKeys = includeMacro
    ? [...requestedTickers, 'MACRO']
    : requestedTickers;

  // 1. Ambil cache 6 jam dari Supabase
  const cachedMap = await getCachedNewsFromSupabase(lookupKeys);
  const missingKeys = lookupKeys.filter((k) => !cachedMap.has(k));

  // 2. Fetch berita baru untuk ticker yang belum ada di cache
  if (missingKeys.length > 0) {
    const settled = await Promise.allSettled(
      missingKeys.map(async (key) => {
        const fresh = await fetchFreshNewsForTicker(key);
        if (fresh.length > 0) {
          await saveNewsToSupabase(key, fresh);
        }
        return { key, fresh };
      })
    );

    for (const res of settled) {
      if (res.status === 'fulfilled') {
        cachedMap.set(res.value.key, res.value.fresh);
      }
    }
  }

  const macroItems = cachedMap.get('MACRO') || [];
  const bundles: Record<string, TickerNewsBundle> = {};

  for (const ticker of requestedTickers) {
    const items = cachedMap.get(ticker) || [];
    bundles[ticker] = buildTickerNewsBundle(ticker, items, macroItems);
  }

  return NextResponse.json({
    fetchedAt: new Date().toISOString(),
    news: bundles,
    macroCount: macroItems.length,
  });
}
