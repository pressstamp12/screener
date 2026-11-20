/**
 * Pengambil data Yahoo Finance (server-side saja).
 * Data IDX di Yahoo tertunda ±10 menit.
 */
import type { Candle } from './types';

const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];

const HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
  Referer: 'https://finance.yahoo.com/',
  Origin: 'https://finance.yahoo.com',
};

export type Interval = '1d' | '5m' | '15m';

export interface ChartResult {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  regularMarketTime: number; // epoch ms
  candles: Candle[];
}

const cache = new Map<string, { data: ChartResult; exp: number }>();
let cookie = '';
let cookieExp = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' });
  } finally {
    clearTimeout(t);
  }
}

async function getCookie(): Promise<string> {
  if (cookie && cookieExp > Date.now()) return cookie;
  try {
    const res = await fetchTimeout(
      'https://fc.yahoo.com',
      { redirect: 'manual', headers: { 'User-Agent': HEADERS['User-Agent'] } },
      3500
    );
    const sc = res.headers.get('set-cookie');
    cookie = sc ? sc.split(';')[0] : '';
    cookieExp = Date.now() + 30 * 60 * 1000;
  } catch {
    cookie = '';
    cookieExp = Date.now() + 60 * 1000;
  }
  return cookie;
}

export function toYahooSymbol(ticker: string): string {
  const t = ticker.trim().toUpperCase();
  if (t.startsWith('^') || t.includes('=') || t.includes('.')) return t;
  return `${t}.JK`;
}

export function cleanTicker(ticker: string): string {
  return ticker.replace(/\.JK$/i, '').trim().toUpperCase();
}

export async function fetchChart(ticker: string, interval: Interval, range: string): Promise<ChartResult> {
  const symbol = toYahooSymbol(ticker);
  const key = `${symbol}|${interval}|${range}`;
  const ttl = interval === '1d' ? 5 * 60_000 : 60_000;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.data;

  const ck = await getCookie();
  let lastErr: Error = new Error(`Gagal ambil ${symbol}`);

  for (let attempt = 0; attempt < HOSTS.length * 2; attempt++) {
    const host = HOSTS[attempt % HOSTS.length];
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false&events=div%2Csplits`;
      const headers = { ...HEADERS };
      if (ck) headers.Cookie = ck;
      const res = await fetchTimeout(url, { headers }, 8000);
      if (res.status === 429) {
        await sleep(500 + attempt * 400);
        throw new Error('Rate limit Yahoo (429)');
      }
      if (res.status === 404) throw new Error(`${symbol} tidak ditemukan di Yahoo`);
      if (!res.ok) throw new Error(`HTTP ${res.status} dari Yahoo`);
      const json = await res.json();
      const r = json?.chart?.result?.[0];
      if (!r) throw new Error(json?.chart?.error?.description || `Data kosong ${symbol}`);

      const meta = r.meta || {};
      const ts: number[] = r.timestamp || [];
      const q = r.indicators?.quote?.[0] || {};
      const candles: Candle[] = [];
      for (let i = 0; i < ts.length; i++) {
        const c = q.close?.[i];
        const h = q.high?.[i];
        const l = q.low?.[i];
        if (c == null || h == null || l == null || !(c > 0)) continue;
        const o = q.open?.[i] ?? c;
        const t = ts[i] * 1000;
        candles.push({
          t,
          date: new Date(t + 7 * 3600_000).toISOString().slice(0, 10),
          open: o,
          high: Math.max(h, o, c),
          low: Math.min(l, o, c),
          close: c,
          volume: q.volume?.[i] ?? 0,
        });
      }
      // Yahoo kadang mengirim candle harian ganda untuk hari ini
      const dedup: Candle[] = [];
      for (const c of candles) {
        const prev = dedup[dedup.length - 1];
        if (interval === '1d' && prev && prev.date === c.date) dedup[dedup.length - 1] = c;
        else dedup.push(c);
      }
      if (dedup.length === 0) throw new Error(`Tidak ada candle untuk ${symbol}`);

      const lastC = dedup[dedup.length - 1];
      const data: ChartResult = {
        symbol: cleanTicker(symbol),
        name: meta.shortName || meta.longName || cleanTicker(symbol),
        price: Number(meta.regularMarketPrice) || lastC.close,
        prevClose: Number(meta.chartPreviousClose ?? meta.previousClose) || lastC.close,
        regularMarketTime: (Number(meta.regularMarketTime) || lastC.t! / 1000) * 1000,
        candles: dedup,
      };
      cache.set(key, { data, exp: Date.now() + ttl });
      return data;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (lastErr.message.includes('tidak ditemukan')) break;
    }
  }
  throw lastErr;
}

/** Jalankan tugas async dengan batas konkurensi. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      try {
        out[i] = { status: 'fulfilled', value: await fn(items[i]) };
      } catch (reason) {
        out[i] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
