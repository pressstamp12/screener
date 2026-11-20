/**
 * Aturan pasar Bursa Efek Indonesia yang memengaruhi rencana trading:
 * fraksi harga (tick), batas auto rejection (ARA/ARB), jam sesi, dan biaya.
 *
 * ARB per SK Direksi BEI Kep-00158/BEI/10-2026 (berlaku 20 Okt – 31 Des 2026):
 *   Rp1–10: Rp1 | Rp11–14: Rp1 | ≥Rp15: 7%.
 * Mulai 1 Jan 2027 ARB kembali simetris dengan ARA (35% / 25% / 20%).
 * Kalau BEI mengubah lagi, cukup ubah fungsi arLimits() di bawah.
 */

export const LOT_SIZE = 100;

export function tickSize(price: number): number {
  if (price < 200) return 1;
  if (price < 500) return 2;
  if (price < 2000) return 5;
  if (price < 5000) return 10;
  return 25;
}

export function roundToTick(price: number, mode: 'down' | 'up' | 'nearest' = 'nearest'): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const t = tickSize(price);
  const q = price / t;
  const r = mode === 'down' ? Math.floor(q + 1e-9) : mode === 'up' ? Math.ceil(q - 1e-9) : Math.round(q);
  return Math.max(1, r * t);
}

/** Naik/turun n tick dari harga (menghormati perubahan fraksi antar rentang). */
export function addTicks(price: number, n: number): number {
  let p = roundToTick(price);
  const step = n >= 0 ? 1 : -1;
  for (let i = 0; i < Math.abs(n); i++) {
    p = step > 0 ? p + tickSize(p) : Math.max(1, p - tickSize(p - 1));
  }
  return p;
}

export interface ArLimits {
  ara: number; // harga tertinggi yang diizinkan hari ini
  arb: number; // harga terendah yang diizinkan hari ini
  araPct: number;
  arbPct: number;
}

export function arLimits(prevClose: number, onDate: Date = new Date()): ArLimits {
  const p = prevClose;
  let araPct: number;
  if (p <= 10) araPct = NaN;
  else if (p <= 200) araPct = 0.35;
  else if (p <= 5000) araPct = 0.25;
  else araPct = 0.2;

  const symmetric = onDate.getTime() >= Date.UTC(2026, 11, 31, 17, 0, 0); // 1 Jan 2027 00:00 WIB
  let arbPct: number;
  if (p <= 14) arbPct = NaN;
  else arbPct = symmetric ? araPct : 0.07;

  const ara = Number.isFinite(araPct) ? roundToTick(p * (1 + araPct), 'down') : p + 1;
  const arb = Number.isFinite(arbPct) ? roundToTick(p * (1 - arbPct), 'up') : Math.max(1, p - 1);
  return { ara, arb, araPct: (ara - p) / p, arbPct: (p - arb) / p };
}

// ---------------------------------------------------------------- Sesi

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface WibTime {
  day: number; // 0=Min .. 6=Sab
  minutes: number; // menit sejak 00:00 WIB
  dateStr: string; // YYYY-MM-DD (WIB)
}

export function toWib(d: Date = new Date()): WibTime {
  const w = new Date(d.getTime() + WIB_OFFSET_MS);
  return {
    day: w.getUTCDay(),
    minutes: w.getUTCHours() * 60 + w.getUTCMinutes(),
    dateStr: w.toISOString().slice(0, 10),
  };
}

interface SessionWindow {
  start: number;
  end: number;
}

export function sessionWindows(day: number): SessionWindow[] {
  if (day === 0 || day === 6) return [];
  if (day === 5) {
    return [
      { start: 9 * 60, end: 11 * 60 + 30 },
      { start: 14 * 60, end: 15 * 60 + 50 },
    ];
  }
  return [
    { start: 9 * 60, end: 12 * 60 },
    { start: 13 * 60 + 30, end: 15 * 60 + 50 },
  ];
}

export type MarketPhase = 'PRE_OPEN' | 'SESI_1' | 'ISTIRAHAT' | 'SESI_2' | 'PRE_CLOSE' | 'TUTUP' | 'LIBUR';

export interface SessionInfo {
  phase: MarketPhase;
  label: string;
  isTrading: boolean;
  minutesElapsed: number; // menit perdagangan berjalan hari ini
  minutesTotal: number;
  minutesLeft: number;
  elapsedFraction: number; // 0..1
}

export function sessionInfo(d: Date = new Date()): SessionInfo {
  const { day, minutes } = toWib(d);
  const wins = sessionWindows(day);
  if (wins.length === 0) {
    return { phase: 'LIBUR', label: 'Akhir pekan', isTrading: false, minutesElapsed: 0, minutesTotal: 0, minutesLeft: 0, elapsedFraction: 1 };
  }
  const total = wins.reduce((a, w) => a + (w.end - w.start), 0);
  let elapsed = 0;
  for (const w of wins) elapsed += Math.max(0, Math.min(minutes, w.end) - w.start);
  const frac = total > 0 ? elapsed / total : 0;
  const base = { minutesElapsed: elapsed, minutesTotal: total, minutesLeft: total - elapsed, elapsedFraction: frac };

  if (minutes < 8 * 60 + 45) return { phase: 'TUTUP', label: 'Belum buka', isTrading: false, ...base };
  if (minutes < wins[0].start) return { phase: 'PRE_OPEN', label: 'Pra-pembukaan', isTrading: false, ...base };
  if (minutes < wins[0].end) return { phase: 'SESI_1', label: 'Sesi 1', isTrading: true, ...base };
  if (minutes < wins[1].start) return { phase: 'ISTIRAHAT', label: 'Istirahat siang', isTrading: false, ...base };
  if (minutes < wins[1].end) return { phase: 'SESI_2', label: 'Sesi 2', isTrading: true, ...base };
  if (minutes < 16 * 60) return { phase: 'PRE_CLOSE', label: 'Pra-penutupan', isTrading: false, ...base };
  return { phase: 'TUTUP', label: 'Pasar tutup', isTrading: false, ...base, elapsedFraction: 1 };
}

/** Menit sesi perdagangan ke-berapa untuk timestamp tertentu (untuk profil volume). */
export function sessionMinuteOf(d: Date): number {
  const { day, minutes } = toWib(d);
  let elapsed = 0;
  for (const w of sessionWindows(day)) elapsed += Math.max(0, Math.min(minutes, w.end) - w.start);
  return elapsed;
}

// ---------------------------------------------------------------- Biaya

export interface FeeConfig {
  buyPct: number; // contoh 0.15 (%)
  sellPct: number; // contoh 0.25 (%) termasuk PPh final 0.1%
}

export const DEFAULT_FEES: FeeConfig = { buyPct: 0.15, sellPct: 0.25 };

export function netPnl(entry: number, exit: number, lots: number, fees: FeeConfig = DEFAULT_FEES): number {
  const shares = lots * LOT_SIZE;
  const buy = entry * shares * (1 + fees.buyPct / 100);
  const sell = exit * shares * (1 - fees.sellPct / 100);
  return sell - buy;
}

/** Harga jual minimum agar impas setelah biaya. */
export function breakEvenPrice(entry: number, fees: FeeConfig = DEFAULT_FEES): number {
  return roundToTick((entry * (1 + fees.buyPct / 100)) / (1 - fees.sellPct / 100), 'up');
}
