import { NextRequest, NextResponse } from 'next/server';
import { cleanTicker, fetchChart, mapLimit } from '@/lib/yahoo';
import type { StockSeries } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const preferredRegion = 'sin1';

const DAILY_RANGES = new Set(['6mo', '1y', '2y']);
const INTRADAY_RANGES = new Set(['1d', '5d', '1mo', '60d']);

/**
 * GET /api/candles?tickers=BBRI,TLKM,^JKSE&daily=6mo&intraday=5d
 * intraday=none untuk melewati data 5 menit.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tickers = Array.from(
    new Set(
      (sp.get('tickers') || '')
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter((t) => /^[\^A-Z0-9.=]{2,12}$/.test(t))
    )
  ).slice(0, 12);
  if (!tickers.length) return NextResponse.json({ error: 'tickers wajib' }, { status: 400 });

  const daily = DAILY_RANGES.has(sp.get('daily') || '') ? sp.get('daily')! : '6mo';
  const intrParam = sp.get('intraday') || '5d';
  const intraday = INTRADAY_RANGES.has(intrParam) ? intrParam : null;

  const settled = await mapLimit(tickers, 6, async (t): Promise<StockSeries> => {
    const d = await fetchChart(t, '1d', daily);
    let intr;
    if (intraday) {
      try {
        intr = (await fetchChart(t, '5m', intraday)).candles;
      } catch {
        intr = undefined; // data harian tetap dipakai
      }
    }
    return { ticker: cleanTicker(t), name: d.name, price: d.price, prevClose: d.prevClose, regularMarketTime: d.regularMarketTime, daily: d.candles, intraday: intr };
  });

  const series: StockSeries[] = [];
  const errors: { ticker: string; message: string }[] = [];
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') series.push(s.value);
    else errors.push({ ticker: tickers[i], message: s.reason instanceof Error ? s.reason.message : 'Gagal' });
  });
  return NextResponse.json({ fetchedAt: new Date().toISOString(), series, errors });
}
