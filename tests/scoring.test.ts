import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, marketRegime, prepareSeries, screenStock, expectedVolumeFraction } from '@/lib/scoring';
import { tickSize } from '@/lib/idx';
import { businessDays, makeDaily, makeIntradayDay, wib } from './helpers';
import type { Candle } from '@/lib/types';

const TODAY = '2026-11-19'; // Kamis
const dates = businessDays(TODAY, 130);
const histDates = dates.slice(0, -1);

const settings = { ...DEFAULT_SETTINGS, modal: 10_000_000 };

function uptrendDaily() {
  return makeDaily(histDates, 1000, () => 0.006, { vol: 20_000_000, noise: 0.03 });
}
function downtrendDaily() {
  return makeDaily(histDates, 2000, () => -0.006, { vol: 20_000_000, noise: 0.03 });
}

function strongIntraday(open: number, upTo: number, barVol: number): Candle[] {
  // hari-hari sebelumnya untuk profil volume
  const prior = histDates.slice(-4).flatMap((d) => makeIntradayDay(d, open, () => 0, barVol / 2));
  const today = makeIntradayDay(TODAY, open, (k) => 0.0015 * k, barVol, upTo);
  return [...prior, ...today];
}

describe('prepareSeries', () => {
  it('live saat sesi berjalan, EOD setelah 16:00', () => {
    const daily = uptrendDaily();
    const intr = strongIntraday(daily[daily.length - 1].close, 10 * 60 + 30, 400_000);
    const live = prepareSeries(daily, intr, wib(TODAY, 10, 30))!;
    expect(live.live).toBe(true);
    expect(live.today.date).toBe(TODAY);
    expect(live.hist[live.hist.length - 1].date < TODAY).toBe(true);
    const eod = prepareSeries(daily, undefined, wib(TODAY, 17, 0))!;
    expect(eod.live).toBe(false);
  });

  it('tidak mengintip bar masa depan', () => {
    const daily = uptrendDaily();
    const intr = strongIntraday(daily[daily.length - 1].close, 15 * 60 + 50, 400_000);
    const p = prepareSeries(daily, intr, wib(TODAY, 10, 0))!;
    expect(p.todayBars.every((b) => (b.t ?? 0) <= wib(TODAY, 10, 0).getTime())).toBe(true);
  });

  it('profil volume intraday dipakai untuk RVOL', () => {
    const prior = [makeIntradayDay('2026-11-17', 100, () => 0, 1000), makeIntradayDay('2026-11-18', 100, () => 0, 1000)];
    const f = expectedVolumeFraction(prior, 160, 0.5);
    expect(f).toBeGreaterThan(0.4);
    expect(f).toBeLessThan(0.6);
  });
});

describe('screenStock', () => {
  it('DAYTRADE: tren naik + breakout intraday bervolume > tren turun', () => {
    const up = uptrendDaily();
    const down = downtrendDaily();
    const now = wib(TODAY, 10, 30);
    const avgBar = 20_000_000 / 64;
    const a = screenStock({ ticker: 'UP', daily: up, intraday: strongIntraday(up[up.length - 1].close, 10 * 60 + 30, avgBar * 3) }, 'DAYTRADE', null, settings, now)!;
    const b = screenStock({ ticker: 'DN', daily: down, intraday: makeIntradayDay(TODAY, down[down.length - 1].close, (k) => -0.001 * k, avgBar * 0.5, 10 * 60 + 30) }, 'DAYTRADE', null, settings, now)!;
    expect(a.live).toBe(true);
    expect(a.score).toBeGreaterThan(b.score + 20);
    expect(a.metrics.rvol).toBeGreaterThan(2);
    expect(a.metrics.vwapDistPct).not.toBeNull();
  });

  it('REBOUND: oversold di support dengan hammer > saham uptrend', () => {
    // turun ke area 800, pantul beberapa kali (support), lalu turun lagi & hammer
    const path = (i: number) => (i < 60 ? 0.002 : i < 90 ? -0.008 : i < 110 ? (i % 6 < 3 ? 0.01 : -0.01) : -0.01);
    const d = makeDaily(histDates, 1000, path, { vol: 20_000_000, noise: 0.02, seed: 3 });
    const prev = d[d.length - 1];
    const low = Math.min(...d.slice(-40).map((c) => c.low));
    d.push({ date: TODAY, open: prev.close * 0.99, high: prev.close * 1.005, low: low * 0.995, close: prev.close * 1.004, volume: 35_000_000 });
    const reb = screenStock({ ticker: 'RB', daily: d }, 'REBOUND', null, settings, wib(TODAY, 17))!;
    const upD = makeDaily(dates, 1000, () => 0.006, { vol: 20_000_000, noise: 0.03 });
    const upR = screenStock({ ticker: 'UP', daily: upD }, 'REBOUND', null, settings, wib(TODAY, 17))!;
    expect(reb.metrics.rsi).toBeLessThan(45);
    expect(reb.score).toBeGreaterThan(upR.score);
    expect(reb.factors.find((f) => f.key === 'reversal')!.value).toBeGreaterThan(0.5);
  });

  it('rencana trade valid: tick benar, SL < entry < TP1 ≤ TP2, lot sesuai risiko', () => {
    const up = uptrendDaily();
    for (const strat of ['DAYTRADE', 'REBOUND'] as const) {
      const r = screenStock({ ticker: 'UP', daily: up, intraday: strongIntraday(up[up.length - 1].close, 11 * 60, 900_000) }, strat, null, settings, wib(TODAY, 11))!;
      const p = r.plan!;
      expect(p.sl).toBeLessThan(p.entry);
      expect(p.tp1).toBeGreaterThan(p.entry);
      expect(p.tp2).toBeGreaterThanOrEqual(p.tp1);
      expect(p.sl).toBeGreaterThanOrEqual(p.arb);
      expect(p.tp2).toBeLessThanOrEqual(p.ara);
      for (const v of [p.entry, p.sl, p.tp1, p.tp2]) expect(v % tickSize(v)).toBe(0);
      expect(p.maxLoss).toBeLessThanOrEqual(settings.modal * (settings.riskPct / 100) + 1);
      expect(p.cost).toBeLessThanOrEqual(settings.modal);
    }
  });

  it('saham tidak likuid dilewati', () => {
    const thin = makeDaily(dates, 1000, () => 0.004, { vol: 50_000 });
    const r = screenStock({ ticker: 'TIPIS', daily: thin }, 'DAYTRADE', null, settings, wib(TODAY, 17))!;
    expect(r.gates.length).toBeGreaterThan(0);
    expect(r.label).toBe('LEWATI');
    expect(r.score).toBeLessThanOrEqual(30);
  });

  it('regime pasar bearish menurunkan skor', () => {
    const up = uptrendDaily();
    const intr = strongIntraday(up[up.length - 1].close, 10 * 60 + 30, 900_000);
    const ihsgDown = makeDaily(dates, 7000, () => -0.004, { noise: 0.005 });
    const reg = marketRegime(ihsgDown, undefined, wib(TODAY, 10, 30));
    expect(reg.regime).toBe('BEARISH');
    const noReg = screenStock({ ticker: 'UP', daily: up, intraday: intr }, 'DAYTRADE', null, settings, wib(TODAY, 10, 30))!;
    const withReg = screenStock({ ticker: 'UP', daily: up, intraday: intr }, 'DAYTRADE', reg, settings, wib(TODAY, 10, 30))!;
    expect(withReg.score).toBeLessThan(noReg.score);
  });
});
