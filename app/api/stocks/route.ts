import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_WATCHLIST } from '@/data/syariah-list';
import { Candle, StockRawData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;
export const preferredRegion = 'sin1';

const YAHOO_HOSTS = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
];

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
  Referer: 'https://finance.yahoo.com/',
  Origin: 'https://finance.yahoo.com',
};

const CACHE_TTL_MS = 3 * 60 * 1000;
const stockCache = new Map<string, { data: StockRawData; expiresAt: number }>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getYahooSessionCookie(): Promise<string> {
  try {
    const res = await fetchWithTimeout(
      'https://fc.yahoo.com',
      {
        cache: 'no-store',
        redirect: 'manual',
        headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] },
      },
      3500
    );
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) return '';
    return setCookie.split(';')[0] || '';
  } catch {
    return '';
  }
}

async function fetchYahooStock(
  ticker: string,
  cookie: string
): Promise<StockRawData> {
  const cleanTicker = ticker.replace(/\.JK$/i, '').trim().toUpperCase();

  const cached = stockCache.get(cleanTicker);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const symbol = `${cleanTicker}.JK`;
  let lastError: Error | null = null;

  for (const host of YAHOO_HOSTS) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?range=3mo&interval=1d&includePrePost=false&events=div%2Csplits`;

      const headers: Record<string, string> = { ...BROWSER_HEADERS };
      if (cookie) {
        headers.Cookie = cookie;
      }

      const res = await fetchWithTimeout(url, {
        cache: 'no-store',
        headers,
      });

      if (res.status === 429) {
        await sleep(400);
        throw new Error('HTTP 429 (Rate limit Yahoo Finance)');
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} dari Yahoo Finance`);
      }

      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) {
        throw new Error(`Data kosong untuk ${symbol}`);
      }

      const meta = result.meta || {};
      const timestamps: number[] = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const opens: (number | null)[] = quote.open || [];
      const highs: (number | null)[] = quote.high || [];
      const lows: (number | null)[] = quote.low || [];
      const closes: (number | null)[] = quote.close || [];
      const volumes: (number | null)[] = quote.volume || [];

      const candles: Candle[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const close = closes[i];
        const open = opens[i];
        const high = highs[i];
        const low = lows[i];
        const volume = volumes[i];

        if (
          close !== null &&
          close !== undefined &&
          close > 0 &&
          high !== null &&
          low !== null
        ) {
          candles.push({
            date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
            open: open ?? close,
            high: high ?? close,
            low: low ?? close,
            close,
            volume: volume ?? 0,
          });
        }
      }

      if (candles.length < 2) {
        throw new Error(`Histori candle terlalu sedikit untuk ${cleanTicker}`);
      }

      const lastCandle = candles[candles.length - 1];
      const prevCandle = candles[candles.length - 2] || lastCandle;

      const price = Number(meta.regularMarketPrice || lastCandle.close);
      const prevClose = Number(
        meta.chartPreviousClose && candles.length < 2
          ? meta.chartPreviousClose
          : prevCandle.close
      );

      const parsed: StockRawData = {
        ticker: cleanTicker,
        name: meta.shortName || meta.longName || cleanTicker,
        currency: meta.currency || 'IDR',
        price,
        prevClose,
        candles: candles.slice(-45),
      };

      stockCache.set(cleanTicker, {
        data: parsed,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error(`Gagal ambil data ${cleanTicker}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get('tickers');

  const tickers = tickersParam
    ? tickersParam
        .split(',')
        .map((t) => t.replace(/\.JK$/i, '').trim().toUpperCase())
        .filter(Boolean)
    : DEFAULT_WATCHLIST.slice(0, 10);

  // Batasi maksimal 15 ticker per panggilan agar aman dari timeout Vercel
  const uniqueTickers = Array.from(new Set(tickers)).slice(0, 15);
  const cookie = await getYahooSessionCookie();

  const stocks: StockRawData[] = [];
  const errors: { ticker: string; message: string }[] = [];

  const SUB_BATCH_SIZE = 5;
  for (let i = 0; i < uniqueTickers.length; i += SUB_BATCH_SIZE) {
    const batch = uniqueTickers.slice(i, i + SUB_BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((ticker) => fetchYahooStock(ticker, cookie))
    );

    settled.forEach((item, idx) => {
      if (item.status === 'fulfilled') {
        stocks.push(item.value);
      } else {
        errors.push({
          ticker: batch[idx],
          message: item.reason?.message || 'Gagal fetch',
        });
      }
    });

    if (i + SUB_BATCH_SIZE < uniqueTickers.length) {
      await sleep(200);
    }
  }

  return NextResponse.json({
    fetchedAt: new Date().toISOString(),
    count: stocks.length,
    stocks,
    errors,
  });
}
