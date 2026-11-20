import { describe, expect, it } from 'vitest';
import { runEodBacktest, runIntradayBacktest, summarize, toCalibration } from '@/lib/backtest';
import { DEFAULT_SETTINGS, lookupCalibration } from '@/lib/scoring';
import { businessDays, makeDaily, makeIntradayDay } from './helpers';

const dates = businessDays('2026-11-19', 220);

describe('backtest', () => {
  it('EOD berjalan, menghasilkan sampel & ringkasan konsisten', async () => {
    const data = [1, 2, 3].map((s) => ({
      ticker: `T${s}`,
      daily: makeDaily(dates, 1000, (i) => Math.sin(i / (6 + s)) * 0.012, { vol: 30_000_000, noise: 0.04, seed: s }),
    }));
    const ihsg = makeDaily(dates, 7000, () => 0.0005, { noise: 0.008 });
    for (const strat of ['DAYTRADE', 'REBOUND'] as const) {
      const samples = await runEodBacktest(data, ihsg, strat, DEFAULT_SETTINGS);
      expect(samples.length).toBeGreaterThan(50);
      // tidak ada R di luar batas wajar (SL selalu dihormati kecuali gap)
      expect(samples.every((s) => Number.isFinite(s.r) && s.r > -5 && s.r < 10)).toBe(true);
      const sum = summarize(samples, strat, 'EOD');
      expect(sum.buckets.reduce((a, b) => a + b.n, 0)).toBe(samples.length);
      const cal = toCalibration(sum);
      const big = sum.buckets.find((b) => b.n >= 10)!;
      expect(lookupCalibration(cal, big.min)?.n).toBe(big.n);
    }
  });

  it('kena SL & TP di bar yang sama dihitung sebagai SL (konservatif)', async () => {
    // tren naik stabil agar sinyal muncul, lalu hari berikutnya bar sangat lebar
    const d = makeDaily(dates, 1000, () => 0.004, { vol: 30_000_000, noise: 0.03, seed: 9 });
    const last = d[d.length - 1];
    d.push({ date: '2026-11-20', open: last.close, high: last.close * 1.2, low: last.close * 0.8, close: last.close, volume: 30_000_000 });
    const samples = await runEodBacktest([{ ticker: 'X', daily: d }], d, 'DAYTRADE', DEFAULT_SETTINGS);
    const lastSample = samples.find((s) => s.date === last.date);
    expect(lastSample?.exit).toBe('SL');
    expect(lastSample!.r).toBeLessThan(-0.9);
  });

  it('intraday backtest berjalan pada data 5 menit', async () => {
    const days = dates.slice(-10);
    const daily = makeDaily(dates, 1000, () => 0.004, { vol: 30_000_000, noise: 0.03, seed: 5 });
    const intraday = days.flatMap((d, i) => makeIntradayDay(d, daily[dates.indexOf(d)].open, (k) => 0.001 * k * (i % 2 ? 1 : -1), 900_000));
    const samples = await runIntradayBacktest([{ ticker: 'I', daily, intraday }], daily, [], DEFAULT_SETTINGS);
    expect(samples.length).toBeGreaterThan(5);
    expect(samples.every((s) => Number.isFinite(s.r))).toBe(true);
  });
});
