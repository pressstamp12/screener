/**
 * Indikator teknikal murni (tanpa I/O). Semua fungsi mengembalikan array
 * sepanjang input; nilai sebelum periode "pemanasan" terisi NaN.
 * Rumus mengikuti definisi standar yang dipakai TradingView / Stockbit.
 */
import type { Candle } from './types';

export function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

export function lastFinite(arr: number[]): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (Number.isFinite(arr[i])) return arr[i];
  }
  return NaN;
}

export function sma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** EMA dengan seed SMA (standar TradingView). */
export function ema(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i];
  prev /= period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's smoothing (RMA), seed = SMA periode pertama. */
export function rma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < period) return out;
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i];
  prev /= period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = (prev * (period - 1) + values[i]) / period;
    out[i] = prev;
  }
  return out;
}

/** RSI Wilder (sama dengan RSI di TradingView/Stockbit). */
export function rsi(closes: number[], period = 14): number[] {
  const out = new Array<number>(closes.length).fill(NaN);
  if (closes.length <= period) return out;
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gains.push(d > 0 ? d : 0);
    losses.push(d < 0 ? -d : 0);
  }
  const ag = rma(gains, period);
  const al = rma(losses, period);
  for (let i = 0; i < ag.length; i++) {
    if (!Number.isFinite(ag[i])) continue;
    const g = ag[i];
    const l = al[i];
    out[i + 1] = l === 0 ? (g === 0 ? 50 : 100) : 100 - 100 / (1 + g / l);
  }
  return out;
}

export function trueRange(candles: Candle[]): number[] {
  return candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const pc = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc));
  });
}

export function atr(candles: Candle[], period = 14): number[] {
  return rma(trueRange(candles), period);
}

export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): { macd: number[]; signal: number[]; hist: number[] } {
  const ef = ema(closes, fast);
  const es = ema(closes, slow);
  const line = closes.map((_, i) => ef[i] - es[i]);
  const firstValid = line.findIndex((v) => Number.isFinite(v));
  const sig = new Array<number>(closes.length).fill(NaN);
  if (firstValid >= 0) {
    const sub = ema(line.slice(firstValid), signal);
    for (let i = 0; i < sub.length; i++) sig[firstValid + i] = sub[i];
  }
  const hist = line.map((v, i) => v - sig[i]);
  return { macd: line, signal: sig, hist };
}

export function bollinger(
  closes: number[],
  period = 20,
  mult = 2
): { mid: number[]; upper: number[]; lower: number[]; percentB: number[]; width: number[] } {
  const mid = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const percentB: number[] = [];
  const width: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (!Number.isFinite(mid[i])) {
      upper.push(NaN);
      lower.push(NaN);
      percentB.push(NaN);
      width.push(NaN);
      continue;
    }
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += (closes[j] - mid[i]) ** 2;
    const sd = Math.sqrt(s / period);
    const u = mid[i] + mult * sd;
    const l = mid[i] - mult * sd;
    upper.push(u);
    lower.push(l);
    percentB.push(u === l ? 0.5 : (closes[i] - l) / (u - l));
    width.push(mid[i] > 0 ? (u - l) / mid[i] : NaN);
  }
  return { mid, upper, lower, percentB, width };
}

/** Stochastic %K (smoothed) dan %D. */
export function stochastic(
  candles: Candle[],
  kPeriod = 14,
  kSmooth = 3,
  dPeriod = 3
): { k: number[]; d: number[] } {
  const raw = candles.map((c, i) => {
    if (i < kPeriod - 1) return NaN;
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      hh = Math.max(hh, candles[j].high);
      ll = Math.min(ll, candles[j].low);
    }
    return hh === ll ? 50 : ((c.close - ll) / (hh - ll)) * 100;
  });
  const k = smaSkipNaN(raw, kSmooth);
  const d = smaSkipNaN(k, dPeriod);
  return { k, d };
}

function smaSkipNaN(values: number[], period: number): number[] {
  const first = values.findIndex((v) => Number.isFinite(v));
  const out = new Array<number>(values.length).fill(NaN);
  if (first < 0) return out;
  const sub = sma(values.slice(first), period);
  for (let i = 0; i < sub.length; i++) out[first + i] = sub[i];
  return out;
}

/** ADX + DI (Wilder). */
export function adx(
  candles: Candle[],
  period = 14
): { adx: number[]; plusDI: number[]; minusDI: number[] } {
  const n = candles.length;
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  for (let i = 1; i < n; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
  }
  const tr = trueRange(candles);
  const trS = rma(tr.slice(1), period);
  const pS = rma(plusDM.slice(1), period);
  const mS = rma(minusDM.slice(1), period);
  const plusDI = new Array<number>(n).fill(NaN);
  const minusDI = new Array<number>(n).fill(NaN);
  const dx: number[] = [];
  for (let i = 0; i < trS.length; i++) {
    if (!Number.isFinite(trS[i]) || trS[i] === 0) {
      dx.push(NaN);
      continue;
    }
    const p = (100 * pS[i]) / trS[i];
    const m = (100 * mS[i]) / trS[i];
    plusDI[i + 1] = p;
    minusDI[i + 1] = m;
    dx.push(p + m === 0 ? 0 : (100 * Math.abs(p - m)) / (p + m));
  }
  const firstDx = dx.findIndex((v) => Number.isFinite(v));
  const adxOut = new Array<number>(n).fill(NaN);
  if (firstDx >= 0) {
    const sub = rma(dx.slice(firstDx), period);
    for (let i = 0; i < sub.length; i++) adxOut[firstDx + i + 1] = sub[i];
  }
  return { adx: adxOut, plusDI, minusDI };
}

export function obv(candles: Candle[]): number[] {
  const out: number[] = [];
  let acc = 0;
  candles.forEach((c, i) => {
    if (i > 0) {
      if (c.close > candles[i - 1].close) acc += c.volume;
      else if (c.close < candles[i - 1].close) acc -= c.volume;
    }
    out.push(acc);
  });
  return out;
}

/** Money Flow Index. */
export function mfi(candles: Candle[], period = 14): number[] {
  const out = new Array<number>(candles.length).fill(NaN);
  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  for (let i = period; i < candles.length; i++) {
    let pos = 0;
    let neg = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const flow = tp[j] * candles[j].volume;
      if (tp[j] > tp[j - 1]) pos += flow;
      else if (tp[j] < tp[j - 1]) neg += flow;
    }
    out[i] = neg === 0 ? (pos === 0 ? 50 : 100) : 100 - 100 / (1 + pos / neg);
  }
  return out;
}

/** Kemiringan regresi linear, dinormalisasi sebagai % per bar terhadap nilai terakhir. */
export function slopePct(values: number[], lookback: number): number {
  const v = values.slice(-lookback).filter((x) => Number.isFinite(x));
  const n = v.length;
  if (n < 3) return 0;
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sx += i;
    sy += v[i];
    sxy += i * v[i];
    sxx += i * i;
  }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const ref = v[n - 1];
  return ref ? (slope / ref) * 100 : 0;
}

/** VWAP kumulatif untuk candle intraday dalam satu hari. */
export function vwap(intraday: Candle[]): number[] {
  let pv = 0;
  let vol = 0;
  return intraday.map((c) => {
    const tp = (c.high + c.low + c.close) / 3;
    pv += tp * c.volume;
    vol += c.volume;
    return vol > 0 ? pv / vol : tp;
  });
}

/** Pivot low sederhana: low yang lebih rendah dari `wing` candle di kiri & kanan. */
export function pivotLows(candles: Candle[], wing = 2): number[] {
  const res: number[] = [];
  for (let i = wing; i < candles.length - wing; i++) {
    let ok = true;
    for (let j = 1; j <= wing; j++) {
      if (candles[i].low > candles[i - j].low || candles[i].low > candles[i + j].low) {
        ok = false;
        break;
      }
    }
    if (ok) res.push(i);
  }
  return res;
}

export function pivotHighs(candles: Candle[], wing = 2): number[] {
  const res: number[] = [];
  for (let i = wing; i < candles.length - wing; i++) {
    let ok = true;
    for (let j = 1; j <= wing; j++) {
      if (candles[i].high < candles[i - j].high || candles[i].high < candles[i + j].high) {
        ok = false;
        break;
      }
    }
    if (ok) res.push(i);
  }
  return res;
}

export function clamp(x: number, lo = 0, hi = 1): number {
  if (!Number.isFinite(x)) return lo;
  return Math.min(hi, Math.max(lo, x));
}

/** Pemetaan linear x dari [a,b] ke [0,1] (b boleh < a untuk arah terbalik). */
export function ramp(x: number, a: number, b: number): number {
  if (!Number.isFinite(x)) return 0;
  return clamp((x - a) / (b - a));
}
