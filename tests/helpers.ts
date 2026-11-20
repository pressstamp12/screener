import type { Candle } from '@/lib/types';

/** PRNG deterministik supaya tes stabil. */
export function rng(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function businessDays(end: string, n: number): string[] {
  const out: string[] = [];
  const d = new Date(`${end}T00:00:00Z`);
  while (out.length < n) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) out.unshift(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out;
}

/** Buat candle harian dari deret drift per hari. */
export function makeDaily(dates: string[], start: number, drift: (i: number) => number, opts: { vol?: number; noise?: number; seed?: number } = {}): Candle[] {
  const r = rng(opts.seed ?? 7);
  const noise = opts.noise ?? 0.01;
  let p = start;
  return dates.map((date, i) => {
    const o = p;
    const c = Math.max(10, o * (1 + drift(i) + (r() - 0.5) * noise));
    const h = Math.max(o, c) * (1 + r() * noise);
    const l = Math.min(o, c) * (1 - r() * noise);
    p = c;
    return { t: Date.parse(`${date}T02:00:00Z`), date, open: o, high: h, low: l, close: c, volume: Math.round((opts.vol ?? 10_000_000) * (0.8 + r() * 0.4)) };
  });
}

/** Bar 5 menit untuk satu hari bursa (Senin–Kamis) mulai 09:00 WIB. */
export function makeIntradayDay(date: string, open: number, path: (k: number) => number, barVol: number, upToMinute = 15 * 60 + 50): Candle[] {
  const bars: Candle[] = [];
  const base = Date.parse(`${date}T00:00:00Z`) - 7 * 3600_000;
  const minutes: number[] = [];
  for (let m = 9 * 60; m < 12 * 60; m += 5) minutes.push(m);
  for (let m = 13 * 60 + 30; m < 15 * 60 + 50; m += 5) minutes.push(m);
  let p = open;
  minutes.forEach((m, k) => {
    if (m >= upToMinute) return;
    const o = p;
    const c = open * (1 + path(k));
    bars.push({ t: base + m * 60_000, date, open: o, high: Math.max(o, c) * 1.001, low: Math.min(o, c) * 0.999, close: c, volume: barVol });
    p = c;
  });
  return bars;
}

/** Waktu WIB → Date. */
export function wib(date: string, hh: number, mm = 0): Date {
  return new Date(Date.parse(`${date}T00:00:00Z`) - 7 * 3600_000 + (hh * 60 + mm) * 60_000);
}
