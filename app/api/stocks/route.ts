import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_WATCHLIST } from '@/data/syariah-list';
import { Candle, StockRawData } from '@/lib/types';

export const dynamic = 'force-dynamic';

const YAHOO_HOSTS = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
];

async function fetchYahooStock(ticker: string): Promise<StockRawData> {
  const cleanTicker = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  const symbol = `${cleanTicker}.JK`;

  let lastError: Error | null = null;

  for (const host of YAHOO_HOSTS) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
          Accept: 'application/json',
        },
      });

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

      if (candles.length < 5) {
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

      return {
        ticker: cleanTicker,
        name: meta.shortName || meta.longName || cleanTicker,
        currency: meta.currency || 'IDR',
        price,
        prevClose,
        candles: candles.slice(-45),
      };
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
    : DEFAULT_WATCHLIST;

  const uniqueTickers = Array.from(new Set(tickers)).slice(0, 30);

  const settled = await Promise.allSettled(
    uniqueTickers.map((ticker) => fetchYahooStock(ticker))
  );

  const stocks: StockRawData[] = [];
  const errors: { ticker: string; message: string }[] = [];

  settled.forEach((item, idx) => {
    if (item.status === 'fulfilled') {
      stocks.push(item.value);
    } else {
      errors.push({
        ticker: uniqueTickers[idx],
        message: item.reason?.message || 'Gagal fetch',
      });
    }
  });

  return NextResponse.json({
    fetchedAt: new Date().toISOString(),
    count: stocks.length,
    stocks,
    errors,
  });
}
