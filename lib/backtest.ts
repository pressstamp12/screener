/**
 * Backtest memakai fungsi skor yang SAMA dengan screener (lib/scoring.ts),
 * jadi angka win rate di sini adalah ukuran jujur seberapa berguna skornya.
 *
 * Aturan simulasi (sengaja konservatif):
 *  - Masuk di harga open bar/hari berikutnya setelah sinyal (bukan di harga sinyal).
 *  - Jarak SL & TP1 dari rencana trade dipertahankan relatif terhadap harga masuk.
 *  - Jika SL dan TP tersentuh di bar yang sama → dianggap kena SL.
 *  - Biaya beli/jual dihitung.
 *  - DAYTRADE: keluar paling lambat saat penutupan hari itu.
 *  - REBOUND : ditahan maksimal 5 hari bursa.
 */
import { DEFAULT_FEES, FeeConfig } from './idx';
import { Calibration, CalibrationBucket, marketRegime, MarketRegime, screenStock, ScreenSettings, Strategy, groupByDate } from './scoring';
import type { Candle } from './types';

export interface BacktestSample {
  ticker: string;
  date: string;
  score: number;
  r: number;
  exit: 'TP' | 'SL' | 'WAKTU';
  factors: Record<string, number>;
}

export interface BacktestSummary {
  strategy: Strategy;
  mode: 'EOD' | 'INTRADAY';
  samples: number;
  tickers: number;
  from: string;
  to: string;
  buckets: (CalibrationBucket & { expectancy: number; tpRate: number })[];
  factorLift: { key: string; highR: number; lowR: number; highN: number; lowN: number }[];
  topSignals: { n: number; winRate: number; avgR: number; profitFactor: number; maxConsecLoss: number };
}

export const BUCKETS: [number, number][] = [
  [0, 39],
  [40, 54],
  [55, 69],
  [70, 79],
  [80, 100],
];

function rOf(entry: number, exit: number, riskDist: number, fees: FeeConfig): number {
  const net = exit * (1 - fees.sellPct / 100) - entry * (1 + fees.buyPct / 100);
  return net / riskDist;
}

function simulate(bars: Candle[], entry: number, slDist: number, tpDist: number, fees: FeeConfig): { r: number; exit: BacktestSample['exit'] } | null {
  if (!bars.length || !(slDist > 0)) return null;
  const sl = entry - slDist;
  const tp = entry + tpDist;
  for (const b of bars) {
    const hitSl = b.low <= sl;
    const hitTp = b.high >= tp;
    if (hitSl) return { r: rOf(entry, Math.min(sl, b.open), slDist, fees), exit: 'SL' };
    if (hitTp) return { r: rOf(entry, Math.max(tp, b.open), slDist, fees), exit: 'TP' };
  }
  return { r: rOf(entry, bars[bars.length - 1].close, slDist, fees), exit: 'WAKTU' };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

/** Waktu evaluasi EOD: 16:30 WIB pada tanggal tsb. */
function eodTime(date: string): Date {
  return new Date(`${date}T09:30:00Z`);
}

export interface TickerData {
  ticker: string;
  daily: Candle[];
  intraday?: Candle[];
}

export async function runEodBacktest(
  data: TickerData[],
  ihsgDaily: Candle[],
  strategy: Strategy,
  settings: ScreenSettings,
  onProgress?: (done: number, total: number) => void
): Promise<BacktestSample[]> {
  const fees = settings.fees || DEFAULT_FEES;
  const regimeCache = new Map<string, MarketRegime>();
  const samples: BacktestSample[] = [];
  const holdDays = strategy === 'DAYTRADE' ? 1 : 5;

  for (let k = 0; k < data.length; k++) {
    const { ticker, daily } = data[k];
    for (let i = 80; i < daily.length - 1; i++) {
      const date = daily[i].date;
      const now = eodTime(date);
      let reg = regimeCache.get(date);
      if (!reg) {
        const ih = ihsgDaily.filter((c) => c.date <= date).slice(-150);
        reg = marketRegime(ih, undefined, now);
        regimeCache.set(date, reg);
      }
      const res = screenStock({ ticker, daily: daily.slice(Math.max(0, i - 150), i + 1) }, strategy, reg, settings, now);
      if (!res || !res.plan || res.gates.length) continue;
      const next = daily.slice(i + 1, i + 1 + holdDays);
      const entry = next[0].open;
      const slDist = res.plan.entry - res.plan.sl;
      const tpDist = res.plan.tp1 - res.plan.entry;
      const sim = simulate(next, entry, slDist, tpDist, fees);
      if (!sim) continue;
      samples.push({
        ticker,
        date,
        score: res.score,
        r: sim.r,
        exit: sim.exit,
        factors: Object.fromEntries(res.factors.map((f) => [f.key, f.value])),
      });
    }
    onProgress?.(k + 1, data.length);
    await tick();
  }
  return samples;
}

/** Titik evaluasi intraday (menit sejak 00:00 WIB). */
const CHECKPOINTS = [9 * 60 + 30, 10 * 60, 10 * 60 + 30, 11 * 60, 11 * 60 + 30, 14 * 60, 14 * 60 + 30, 15 * 60];

export async function runIntradayBacktest(
  data: TickerData[],
  ihsgDaily: Candle[],
  ihsgIntraday: Candle[],
  settings: ScreenSettings,
  onProgress?: (done: number, total: number) => void
): Promise<BacktestSample[]> {
  const fees = settings.fees || DEFAULT_FEES;
  const samples: BacktestSample[] = [];
  const regimeCache = new Map<number, MarketRegime>();

  for (let k = 0; k < data.length; k++) {
    const { ticker, daily, intraday } = data[k];
    if (!intraday?.length) continue;
    const days = groupByDate(intraday);
    for (const [date, bars] of Array.from(days.entries())) {
      const seenBucket = new Set<number>();
      for (const cp of CHECKPOINTS) {
        const now = new Date(Date.parse(`${date}T00:00:00Z`) - 7 * 3600_000 + cp * 60_000);
        const after = bars.filter((b) => (b.t ?? 0) > now.getTime() - 5 * 60_000 + 1 && (b.t ?? 0) >= now.getTime());
        if (after.length < 2) continue;
        const before = intraday.filter((b) => (b.t ?? 0) < now.getTime() && b.date >= shiftDate(date, -8));
        if (!before.some((b) => b.date === date)) continue;
        let reg = regimeCache.get(now.getTime());
        if (!reg) {
          reg = marketRegime(
            ihsgDaily.filter((c) => c.date <= date).slice(-150),
            ihsgIntraday.filter((b) => (b.t ?? 0) < now.getTime()),
            now
          );
          regimeCache.set(now.getTime(), reg);
        }
        const dSlice = daily.filter((c) => c.date <= date).slice(-151);
        const res = screenStock({ ticker, daily: dSlice, intraday: before }, 'DAYTRADE', reg, settings, now);
        if (!res || !res.plan || !res.live || res.gates.length) continue;
        const bIdx = BUCKETS.findIndex(([a, b]) => res.score >= a && res.score <= b);
        if (seenBucket.has(bIdx)) continue;
        seenBucket.add(bIdx);
        const entry = after[0].open;
        const sim = simulate(after, entry, res.plan.entry - res.plan.sl, res.plan.tp1 - res.plan.entry, fees);
        if (!sim) continue;
        samples.push({
          ticker,
          date,
          score: res.score,
          r: sim.r,
          exit: sim.exit,
          factors: Object.fromEntries(res.factors.map((f) => [f.key, f.value])),
        });
      }
    }
    onProgress?.(k + 1, data.length);
    await tick();
  }
  return samples;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function summarize(samples: BacktestSample[], strategy: Strategy, mode: 'EOD' | 'INTRADAY', topThreshold = 70): BacktestSummary {
  const dates = samples.map((s) => s.date).sort();
  const buckets = BUCKETS.map(([min, max]) => {
    const s = samples.filter((x) => x.score >= min && x.score <= max);
    const n = s.length;
    const wins = s.filter((x) => x.r > 0).length;
    const avgR = n ? s.reduce((a, x) => a + x.r, 0) / n : 0;
    return { min, max, n, winRate: n ? wins / n : 0, avgR, expectancy: avgR, tpRate: n ? s.filter((x) => x.exit === 'TP').length / n : 0 };
  });

  const keys = Array.from(new Set(samples.flatMap((s) => Object.keys(s.factors))));
  const factorLift = keys
    .map((key) => {
      const hi = samples.filter((s) => (s.factors[key] ?? 0) >= 0.7);
      const lo = samples.filter((s) => (s.factors[key] ?? 0) <= 0.3);
      const avg = (a: BacktestSample[]) => (a.length ? a.reduce((x, s) => x + s.r, 0) / a.length : 0);
      return { key, highR: avg(hi), lowR: avg(lo), highN: hi.length, lowN: lo.length };
    })
    .sort((a, b) => b.highR - b.lowR - (a.highR - a.lowR));

  const top = samples.filter((s) => s.score >= topThreshold).sort((a, b) => (a.date < b.date ? -1 : 1));
  const gains = top.filter((s) => s.r > 0).reduce((a, s) => a + s.r, 0);
  const losses = -top.filter((s) => s.r <= 0).reduce((a, s) => a + s.r, 0);
  let streak = 0;
  let maxStreak = 0;
  for (const s of top) {
    streak = s.r <= 0 ? streak + 1 : 0;
    maxStreak = Math.max(maxStreak, streak);
  }

  return {
    strategy,
    mode,
    samples: samples.length,
    tickers: new Set(samples.map((s) => s.ticker)).size,
    from: dates[0] || '-',
    to: dates[dates.length - 1] || '-',
    buckets,
    factorLift,
    topSignals: {
      n: top.length,
      winRate: top.length ? top.filter((s) => s.r > 0).length / top.length : 0,
      avgR: top.length ? top.reduce((a, s) => a + s.r, 0) / top.length : 0,
      profitFactor: losses > 0 ? gains / losses : gains > 0 ? Infinity : 0,
      maxConsecLoss: maxStreak,
    },
  };
}

export function toCalibration(summary: BacktestSummary): Calibration {
  return {
    strategy: summary.strategy,
    mode: summary.mode,
    createdAt: new Date().toISOString(),
    buckets: summary.buckets.map(({ min, max, n, winRate, avgR }) => ({ min, max, n, winRate, avgR })),
  };
}
