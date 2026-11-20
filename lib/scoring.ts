/**
 * Mesin skor multi-faktor. Murni (tanpa I/O) supaya bisa dipakai di screener
 * live DAN di backtest dengan logika yang persis sama.
 *
 * Dua strategi:
 *  - DAYTRADE : momentum intraday (VWAP, RVOL disesuaikan jam, breakout opening range).
 *               Saat pasar tutup otomatis menilai "setup untuk besok" dari candle harian.
 *  - REBOUND  : pantulan dari support saat oversold (penerus Mode D lama).
 */
import {
  adx,
  atr,
  bollinger,
  clamp,
  ema,
  last,
  lastFinite,
  macd,
  mfi,
  obv,
  pivotHighs,
  pivotLows,
  ramp,
  rsi,
  slopePct,
  stochastic,
  vwap,
} from './indicators';
import { arLimits, breakEvenPrice, DEFAULT_FEES, FeeConfig, LOT_SIZE, roundToTick, sessionInfo, sessionMinuteOf, tickSize, toWib } from './idx';
import type { Candle, TickerNewsBundle } from './types';

export type Strategy = 'DAYTRADE' | 'REBOUND';
export type SignalLabel = 'SETUP KUAT' | 'PANTAU' | 'LEWATI';
export type Regime = 'BULLISH' | 'NETRAL' | 'BEARISH';

export interface ScreenSettings {
  modal: number;
  riskPct: number; // % modal yang siap hilang per trade
  fees: FeeConfig;
  minValueDaytrade: number; // rata-rata nilai transaksi harian minimal (Rp)
  minValueRebound: number;
}

export const DEFAULT_SETTINGS: ScreenSettings = {
  modal: 5_000_000,
  riskPct: 1,
  fees: DEFAULT_FEES,
  minValueDaytrade: 5_000_000_000,
  minValueRebound: 2_000_000_000,
};

export interface MarketRegime {
  regime: Regime;
  multiplierDaytrade: number;
  multiplierRebound: number;
  ihsg: number;
  ihsgChangePct: number;
  notes: string[];
}

export interface Factor {
  key: string;
  label: string;
  weight: number;
  value: number; // 0..1
  detail: string;
}

export interface TradePlan {
  entry: number;
  entryLow: number;
  sl: number;
  tp1: number;
  tp2: number;
  riskPerShare: number;
  rr1: number; // reward/risk bersih setelah biaya, ke TP1
  breakEven: number;
  lots: number;
  cost: number;
  maxLoss: number;
  potentialProfit1: number;
  ara: number;
  arb: number;
}

export interface ScreenResult {
  ticker: string;
  name: string;
  strategy: Strategy;
  live: boolean; // dihitung dengan data intraday hari ini
  asOf: string; // tanggal data (WIB)
  price: number;
  prevClose: number;
  changePct: number;
  score: number; // 0..100 setelah pengali pasar & penalti
  rawScore: number;
  label: SignalLabel;
  factors: Factor[];
  warnings: string[];
  gates: string[]; // alasan saham dilewati total
  plan: TradePlan | null;
  metrics: {
    rsi: number;
    atrPct: number;
    rvol: number;
    avgValue: number;
    vwapDistPct: number | null;
    support: number;
    supportTouches: number;
    resistance: number;
    ema20: number;
    ema50: number;
    adx: number;
  };
}

// ------------------------------------------------------------------ Persiapan data

export interface PreparedSeries {
  hist: Candle[]; // hari-hari lengkap sebelum "hari ini"
  today: Candle; // candle hari ini (bisa parsial jika live)
  all: Candle[]; // hist + today
  live: boolean;
  todayBars: Candle[]; // bar intraday hari ini
  priorDays: Candle[][]; // bar intraday per hari sebelumnya (untuk profil volume)
  asOf: string;
}

export function groupByDate(bars: Candle[]): Map<string, Candle[]> {
  const m = new Map<string, Candle[]>();
  for (const b of bars) {
    const arr = m.get(b.date) || [];
    arr.push(b);
    m.set(b.date, arr);
  }
  return m;
}

export function aggregateBars(bars: Candle[]): Candle {
  return {
    t: bars[0].t,
    date: bars[0].date,
    open: bars[0].open,
    high: Math.max(...bars.map((b) => b.high)),
    low: Math.min(...bars.map((b) => b.low)),
    close: bars[bars.length - 1].close,
    volume: bars.reduce((a, b) => a + b.volume, 0),
  };
}

/**
 * Menentukan apakah kita menilai sesi yang sedang berjalan (live) atau hari
 * terakhir yang sudah lengkap (EOD). `now` dipakai juga oleh backtest.
 */
export function prepareSeries(daily: Candle[], intraday: Candle[] | undefined, now: Date): PreparedSeries | null {
  const todayStr = toWib(now).dateStr;
  const sess = sessionInfo(now);
  const byDate = intraday && intraday.length ? groupByDate(intraday.filter((b) => (b.t ?? 0) <= now.getTime())) : new Map<string, Candle[]>();
  const todayBars = byDate.get(todayStr) || [];
  const marketDone = sess.phase === 'TUTUP' && toWib(now).minutes >= 16 * 60;
  const live = todayBars.length > 0 && !marketDone;

  let hist: Candle[];
  let today: Candle;
  if (live) {
    hist = daily.filter((c) => c.date < todayStr);
    today = aggregateBars(todayBars);
  } else {
    const done = daily.filter((c) => c.date <= todayStr);
    if (done.length < 2) return null;
    hist = done.slice(0, -1);
    today = done[done.length - 1];
  }
  if (hist.length < 30) return null;

  const priorDays = Array.from(byDate.entries())
    .filter(([d]) => d < todayStr)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, bars]) => bars);

  return { hist, today, all: [...hist, today], live, todayBars, priorDays, asOf: today.date };
}

/** Porsi volume harian yang "seharusnya" sudah terjadi pada menit sesi ini. */
export function expectedVolumeFraction(priorDays: Candle[][], sessionMinute: number, elapsedFraction: number): number {
  const fracs: number[] = [];
  for (const bars of priorDays.slice(-5)) {
    const total = bars.reduce((a, b) => a + b.volume, 0);
    if (total <= 0) continue;
    let cum = 0;
    for (const b of bars) {
      if (b.t !== undefined && sessionMinuteOf(new Date(b.t)) + 5 <= sessionMinute) cum += b.volume;
    }
    fracs.push(cum / total);
  }
  if (fracs.length >= 2) {
    const avg = fracs.reduce((a, b) => a + b, 0) / fracs.length;
    return clamp(avg, 0.03, 1);
  }
  // Pola U: volume pagi & sore lebih tebal. Pendekatan sqrt cukup untuk 1 jam pertama.
  return clamp(0.15 * Math.sqrt(elapsedFraction) + 0.85 * elapsedFraction, 0.03, 1);
}

// ------------------------------------------------------------------ Support / resistance

export function findLevels(candles: Candle[], price: number, atrVal: number) {
  const look = candles.slice(-90);
  const tol = Math.max(atrVal * 0.35, price * 0.01);
  const lows = pivotLows(look, 2).map((i) => look[i].low);
  const highs = pivotHighs(look, 2).map((i) => look[i].high);

  const cluster = (levels: number[]) => {
    const sorted = [...levels].sort((a, b) => a - b);
    const groups: { level: number; touches: number }[] = [];
    for (const l of sorted) {
      const g = groups[groups.length - 1];
      if (g && Math.abs(l - g.level) <= tol) {
        g.level = (g.level * g.touches + l) / (g.touches + 1);
        g.touches++;
      } else groups.push({ level: l, touches: 1 });
    }
    return groups;
  };

  const supports = cluster(lows).filter((g) => g.level <= price * 1.005);
  const resistances = cluster(highs).filter((g) => g.level > price * 1.002);
  const recent20 = candles.slice(-20);
  const low20 = Math.min(...recent20.map((c) => c.low));
  const high20 = Math.max(...recent20.map((c) => c.high));

  const sup = supports.length ? supports.reduce((best, g) => (g.level > best.level ? g : best)) : { level: low20, touches: 1 };
  const res = resistances.length ? resistances.reduce((best, g) => (g.level < best.level ? g : best)) : { level: Math.max(high20, price * 1.03), touches: 1 };

  return {
    support: roundToTick(sup.level, 'down'),
    supportTouches: sup.touches,
    resistance: roundToTick(res.level, 'up'),
    resistanceTouches: res.touches,
    low20,
    high20,
  };
}

// ------------------------------------------------------------------ Regime pasar

export function marketRegime(ihsgDaily: Candle[], ihsgIntraday: Candle[] | undefined, now: Date): MarketRegime {
  const prep = prepareSeries(ihsgDaily, ihsgIntraday, now);
  const notes: string[] = [];
  if (!prep) {
    return { regime: 'NETRAL', multiplierDaytrade: 0.95, multiplierRebound: 0.95, ihsg: 0, ihsgChangePct: 0, notes: ['Data IHSG tidak tersedia'] };
  }
  const closes = prep.all.map((c) => c.close);
  const price = prep.today.close;
  const prev = last(prep.hist)!.close;
  const chg = ((price - prev) / prev) * 100;
  const e20 = lastFinite(ema(closes, 20));
  const e50 = lastFinite(ema(closes, 50));
  const slope20 = slopePct(ema(closes, 20), 5);
  const r = lastFinite(rsi(closes, 14));

  let pts = 0;
  if (price > e20) pts++;
  else pts--;
  if (e20 > e50) pts++;
  else pts--;
  if (slope20 > 0.05) pts++;
  else if (slope20 < -0.05) pts--;

  const regime: Regime = pts >= 2 ? 'BULLISH' : pts <= -2 ? 'BEARISH' : 'NETRAL';
  notes.push(`IHSG ${price > e20 ? 'di atas' : 'di bawah'} EMA20, EMA20 ${slope20 >= 0 ? 'naik' : 'turun'}`);
  if (r < 30) notes.push(`RSI IHSG ${r.toFixed(0)} (jenuh jual — rebound massal sering terjadi)`);

  let mDay = regime === 'BULLISH' ? 1 : regime === 'NETRAL' ? 0.93 : 0.82;
  let mReb = regime === 'BULLISH' ? 1 : regime === 'NETRAL' ? 0.95 : 0.85;
  if (r < 30) mReb = Math.min(1, mReb + 0.08);
  if (prep.live && chg <= -1) {
    mDay *= 0.88;
    notes.push(`IHSG turun ${chg.toFixed(2)}% hari ini — momentum beli lemah`);
  }
  if (prep.live && chg <= -3) {
    mDay *= 0.8;
    mReb *= 0.85;
    notes.push('Tekanan jual luas: kurangi ukuran posisi');
  }
  return { regime, multiplierDaytrade: mDay, multiplierRebound: mReb, ihsg: price, ihsgChangePct: chg, notes };
}

// ------------------------------------------------------------------ Skor

function triangle(x: number, lo: number, peakLo: number, peakHi: number, hi: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x <= lo || x >= hi) return 0;
  if (x < peakLo) return (x - lo) / (peakLo - lo);
  if (x <= peakHi) return 1;
  return (hi - x) / (hi - peakHi);
}

const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : '-');
const fmtRp = (n: number) => Math.round(n).toLocaleString('id-ID');

export function labelFor(score: number): SignalLabel {
  if (score >= 70) return 'SETUP KUAT';
  if (score >= 55) return 'PANTAU';
  return 'LEWATI';
}

export interface ScreenInput {
  ticker: string;
  name?: string;
  daily: Candle[];
  intraday?: Candle[];
}

export function screenStock(
  input: ScreenInput,
  strategy: Strategy,
  market: MarketRegime | null,
  settings: ScreenSettings,
  now: Date = new Date()
): ScreenResult | null {
  const prep = prepareSeries(input.daily, input.intraday, now);
  if (!prep) return null;
  const { hist, today, all, live, todayBars } = prep;

  const closes = all.map((c) => c.close);
  const price = today.close;
  const prevClose = last(hist)!.close;
  const changePct = ((price - prevClose) / prevClose) * 100;

  // ---- indikator harian (hari ini parsial tetap ikut, seperti di chart)
  const ema20s = ema(closes, 20);
  const ema50s = ema(closes, 50);
  const e20 = lastFinite(ema20s);
  const e50 = lastFinite(ema50s);
  const slope20 = slopePct(ema20s, 5);
  const rsiS = rsi(closes, 14);
  const rsiNow = lastFinite(rsiS);
  const atrS = atr(hist, 14); // ATR dari hari lengkap supaya tidak bias candle parsial
  const atrVal = lastFinite(atrS);
  const atrPct = (atrVal / price) * 100;
  const m = macd(closes);
  const histNow = lastFinite(m.hist);
  const histPrev = m.hist[m.hist.length - 2];
  const bb = bollinger(closes, 20, 2);
  const pctB = lastFinite(bb.percentB);
  const st = stochastic(all);
  const kNow = lastFinite(st.k);
  const dNow = lastFinite(st.d);
  const kPrev = st.k[st.k.length - 2];
  const dPrev = st.d[st.d.length - 2];
  const ad = adx(hist, 14);
  const adxNow = lastFinite(ad.adx);
  const plusDI = lastFinite(ad.plusDI);
  const minusDI = lastFinite(ad.minusDI);
  const mfiNow = lastFinite(mfi(all, 14));
  const obvS = obv(all);

  const vol20 = hist.slice(-20);
  const avgVol = vol20.reduce((a, c) => a + c.volume, 0) / Math.max(1, vol20.length);
  const avgValue = vol20.reduce((a, c) => a + c.volume * c.close, 0) / Math.max(1, vol20.length);

  const sess = sessionInfo(now);
  let expFrac = 1;
  if (live) {
    expFrac = expectedVolumeFraction(prep.priorDays, sess.minutesElapsed, sess.elapsedFraction);
  }
  const rvol = avgVol > 0 ? today.volume / (avgVol * expFrac) : 0;

  const lv = findLevels(hist, price, atrVal);
  const distSupAtr = (price - lv.support) / atrVal;
  const distResAtr = (lv.resistance - price) / atrVal;
  const drawdown20 = ((lv.high20 - price) / lv.high20) * 100;

  const range = today.high - today.low;
  const body = Math.abs(today.close - today.open);
  const lowerWick = Math.min(today.open, today.close) - today.low;
  const upperWick = today.high - Math.max(today.open, today.close);
  const closeLoc = range > 0 ? (today.close - today.low) / range : 0.5;
  const green = today.close > today.open;
  const y = last(hist)!;
  const hammer = range > 0 && lowerWick >= 2 * Math.max(body, range * 0.05) && upperWick <= range * 0.3;
  const engulfing = green && y.close < y.open && today.close >= y.open && today.open <= y.close;

  const limits = arLimits(prevClose, now);
  const roomToAraPct = ((limits.ara - price) / price) * 100;

  const factors: Factor[] = [];
  const warnings: string[] = [];
  const gates: string[] = [];
  const add = (key: string, label: string, weight: number, value: number, detail: string) =>
    factors.push({ key, label, weight, value: clamp(value), detail });

  // ---- gate umum
  const minValue = strategy === 'DAYTRADE' ? settings.minValueDaytrade : settings.minValueRebound;
  if (avgValue < minValue) gates.push(`Kurang likuid: rata-rata transaksi Rp ${fmtRp(avgValue / 1e9)} M/hari (min Rp ${fmtRp(minValue / 1e9)} M)`);
  if (hist.length < 60) warnings.push('Histori < 60 hari, indikator kurang stabil');
  if (price >= limits.ara) gates.push('Sudah ARA — tidak bisa dibeli dengan wajar');
  if (price <= limits.arb) gates.push('Sedang ARB — tunggu tekanan jual mereda');

  let vwapDistPct: number | null = null;

  if (strategy === 'DAYTRADE') {
    if (atrPct < 1.5) gates.push(`Volatilitas terlalu kecil (ATR ${fmt(atrPct)}%) untuk day trade`);

    // 1. Tren harian
    const trendVal = (price > e20 ? 0.4 : 0) + (e20 > e50 ? 0.3 : 0) + (slope20 > 0 ? 0.3 : 0);
    add('trend', 'Tren harian naik', 15, trendVal, `Harga ${price > e20 ? '>' : '<'} EMA20 (${fmtRp(e20)}), EMA20 ${e20 > e50 ? '>' : '<'} EMA50, slope ${fmt(slope20, 2)}%/hari`);

    // 2. RVOL
    add('rvol', 'Volume relatif tinggi', 20, ramp(rvol, 1, 2.5), `RVOL ${fmt(rvol, 2)}x${live ? ` (disesuaikan jam, ekspektasi ${Math.round(expFrac * 100)}% volume harian)` : ''}`);

    if (live && todayBars.length > 0) {
      const vw = vwap(todayBars);
      const vwNow = last(vw)!;
      vwapDistPct = ((price - vwNow) / vwNow) * 100;
      const vwSlope = slopePct(vw, Math.min(6, vw.length));
      // 3. Di atas VWAP tapi tidak terlalu jauh
      const vwVal = vwapDistPct < 0 ? 0 : vwapDistPct <= 1.5 ? 0.6 + vwapDistPct / 3.75 : vwapDistPct <= 3 ? 1 - (vwapDistPct - 1.5) / 3 : 0.3;
      add('vwap', 'Di atas VWAP', 15, vwVal * (vwSlope >= 0 ? 1 : 0.7), `Harga ${vwapDistPct >= 0 ? '+' : ''}${fmt(vwapDistPct, 2)}% dari VWAP ${fmtRp(vwNow)}${vwSlope < 0 ? ', VWAP turun' : ''}`);
      if (vwapDistPct > 3) warnings.push(`Sudah ${fmt(vwapDistPct)}% di atas VWAP — rawan pullback, tunggu koreksi`);

      // 4. Opening range breakout & dekat HOD
      const orBars = todayBars.slice(0, 3); // 15 menit pertama
      const orHigh = Math.max(...orBars.map((b) => b.high));
      const orLow = Math.min(...orBars.map((b) => b.low));
      const hod = today.high;
      const nearHod = (hod - price) / price <= 0.01;
      const orbVal = todayBars.length <= 3 ? 0.3 : (price > orHigh ? 0.6 : price < orLow ? 0 : 0.25) + (nearHod ? 0.4 : 0);
      add('orb', 'Breakout opening range', 12, orbVal, `OR 15m ${fmtRp(orLow)}–${fmtRp(orHigh)}, high hari ini ${fmtRp(hod)}${nearHod ? ' (dekat HOD)' : ''}`);

      // 5. Momentum intraday
      const ic = todayBars.length >= 21 ? todayBars : [...(prep.priorDays.flat().slice(-40)), ...todayBars];
      const icl = ic.map((b) => b.close);
      const e9 = lastFinite(ema(icl, 9));
      const e21 = lastFinite(ema(icl, 21));
      const irsi = lastFinite(rsi(icl, 14));
      const momVal = (e9 > e21 ? 0.5 : 0) + 0.5 * triangle(irsi, 45, 55, 72, 85);
      add('intraday', 'Momentum 5 menit', 10, momVal, `EMA9 ${e9 > e21 ? '>' : '<'} EMA21 (5m), RSI 5m ${fmt(irsi, 0)}`);

      if (sess.minutesLeft < 30 && sess.isTrading) warnings.push('Kurang dari 30 menit sebelum penutupan — sisa waktu sempit');
    } else {
      // Mode persiapan besok: pakai karakter candle harian
      add('closeloc', 'Tutup dekat high', 15, ramp(closeLoc, 0.4, 0.9), `Close di ${Math.round(closeLoc * 100)}% range harian${green ? ', candle hijau' : ''}`);
      const breakout = price > Math.max(...hist.slice(-20).map((c) => c.high));
      add('breakout', 'Breakout high 20 hari', 12, breakout ? 1 : ramp(price / lv.high20, 0.95, 1), breakout ? 'Close menembus high 20 hari' : `${fmt(drawdown20)}% di bawah high 20 hari`);
      add('momentum', 'Momentum harian', 10, (histNow > 0 ? 0.5 : 0) + (histNow > histPrev ? 0.5 : 0), `MACD hist ${fmt(histNow, 1)} ${histNow > histPrev ? 'naik' : 'turun'}`);
    }

    // 6. RSI harian sehat
    add('rsi', 'RSI harian 50–70', 8, triangle(rsiNow, 40, 52, 70, 82), `RSI(14) ${fmt(rsiNow)}`);
    if (rsiNow > 80) warnings.push(`RSI ${fmt(rsiNow, 0)} sangat jenuh beli`);

    // 7. Volatilitas cukup
    add('atr', 'Range harian cukup', 8, ramp(atrPct, 1.8, 4), `ATR ${fmt(atrPct)}% ≈ Rp ${fmtRp(atrVal)}`);

    // 8. Ruang ke resistance
    add('room', 'Ruang ke resistance', 7, ramp(distResAtr, 0.3, 1.2), `Resistance ${fmtRp(lv.resistance)} (${fmt(distResAtr)} ATR lagi)`);

    // 9. MACD harian
    add('macd', 'MACD harian positif', 5, (histNow > 0 ? 0.6 : 0) + (histNow > histPrev ? 0.4 : 0), `Histogram ${fmt(histNow, 1)}`);

    if (changePct > 15) warnings.push(`Sudah naik ${fmt(changePct)}% — risiko mengejar harga`);
    if (roomToAraPct < atrPct * 0.75) warnings.push(`Dekat ARA (${fmtRp(limits.ara)}), ruang naik terbatas`);
  } else {
    // ======================= REBOUND
    add('rsi', 'RSI oversold', 15, triangle(rsiNow, 12, 24, 38, 50), `RSI(14) Wilder ${fmt(rsiNow)}`);

    const supVal = distSupAtr < -0.3 ? 0 : distSupAtr <= 0.75 ? 1 : ramp(distSupAtr, 2, 0.75);
    add('support', 'Dekat support', 20, supVal, `Support ${fmtRp(lv.support)} (${fmt(distSupAtr)} ATR di bawah harga)`);
    if (distSupAtr < -0.3) warnings.push('Support sudah jebol — tunggu konfirmasi support baru');

    add('supportStrength', 'Support teruji', 8, lv.supportTouches >= 3 ? 1 : lv.supportTouches === 2 ? 0.6 : 0.3, `Disentuh ${lv.supportTouches}x dalam 90 hari`);

    add('drawdown', 'Sudah koreksi cukup', 8, ramp(drawdown20, 4, 15), `${fmt(drawdown20)}% dari high 20 hari`);

    const revVal = Math.max(hammer ? 1 : 0, engulfing ? 1 : 0, green ? ramp(closeLoc, 0.4, 0.8) * 0.8 : 0);
    add('reversal', 'Candle pembalikan', 15, revVal, hammer ? 'Hammer (ekor bawah panjang)' : engulfing ? 'Bullish engulfing' : green ? `Candle hijau, close di ${Math.round(closeLoc * 100)}% range` : 'Belum ada candle pembalikan');

    add('volume', 'Volume konfirmasi', 12, green || hammer ? ramp(rvol, 0.9, 2) : ramp(rvol, 0.9, 2) * 0.3, `RVOL ${fmt(rvol, 2)}x${live ? ' (disesuaikan jam)' : ''}`);

    const stochCross = kPrev <= dPrev && kNow > dNow && Math.min(kPrev, kNow) < 30;
    add('stoch', 'Stochastic cross naik', 7, stochCross ? 1 : kNow < 20 ? 0.4 : 0, `%K ${fmt(kNow, 0)} / %D ${fmt(dNow, 0)}${stochCross ? ' — golden cross di area oversold' : ''}`);

    add('macd', 'Tekanan jual melemah', 5, histNow > histPrev ? 1 : 0, `MACD hist ${histNow > histPrev ? 'naik' : 'masih turun'} (${fmt(histNow, 1)})`);

    const strongDown = adxNow > 30 && minusDI > plusDI;
    const trendVal = strongDown ? 0 : price > e50 ? 1 : price > e50 * 0.92 ? 0.6 : 0.3;
    add('trendHealth', 'Bukan downtrend kuat', 10, trendVal, `ADX ${fmt(adxNow, 0)} (${plusDI > minusDI ? '+DI' : '-DI'} dominan), harga ${price > e50 ? 'di atas' : 'di bawah'} EMA50`);
    if (strongDown) warnings.push(`Downtrend kuat (ADX ${fmt(adxNow, 0)}) — rebound cenderung pendek`);

    const obvSlope = slopePct(obvS.map((v) => v + Math.abs(Math.min(...obvS)) + 1), 10);
    const priceSlope = slopePct(closes, 10);
    const accum = (mfiNow < 30 ? 0.5 : 0) + (priceSlope < 0 && obvSlope > 0 ? 0.5 : 0);
    add('accum', 'Tanda akumulasi', 5, accum, `MFI ${fmt(mfiNow, 0)}${priceSlope < 0 && obvSlope > 0 ? ', OBV naik saat harga turun' : ''}`);

    if (pctB < 0) warnings.push('Di bawah Bollinger bawah — bisa lanjut turun sebelum memantul');
  }

  const wSum = factors.reduce((a, f) => a + f.weight, 0);
  const rawScore = (factors.reduce((a, f) => a + f.weight * f.value, 0) / wSum) * 100;
  let score = rawScore;
  if (market) score *= strategy === 'DAYTRADE' ? market.multiplierDaytrade : market.multiplierRebound;
  if (gates.length) score = Math.min(score, 30);

  const plan = buildPlan(strategy, { price, atrVal, lv, todayBars, live, limits, settings });
  if (plan && plan.rr1 < 1.2) {
    warnings.push(`Risk/reward ke TP1 hanya ${fmt(plan.rr1, 2)} — kurang menarik`);
    score *= 0.9;
  }

  score = Math.round(clamp(score, 0, 100));
  return {
    ticker: input.ticker,
    name: input.name || input.ticker,
    strategy,
    live,
    asOf: prep.asOf,
    price,
    prevClose,
    changePct,
    score,
    rawScore: Math.round(rawScore),
    label: labelFor(score),
    factors,
    warnings,
    gates,
    plan,
    metrics: {
      rsi: rsiNow,
      atrPct,
      rvol,
      avgValue,
      vwapDistPct,
      support: lv.support,
      supportTouches: lv.supportTouches,
      resistance: lv.resistance,
      ema20: e20,
      ema50: e50,
      adx: adxNow,
    },
  };
}

// ------------------------------------------------------------------ Rencana trade

interface PlanCtx {
  price: number;
  atrVal: number;
  lv: ReturnType<typeof findLevels>;
  todayBars: Candle[];
  live: boolean;
  limits: ReturnType<typeof arLimits>;
  settings: ScreenSettings;
}

export function buildPlan(strategy: Strategy, c: PlanCtx): TradePlan | null {
  const { price, atrVal, lv, todayBars, live, limits, settings } = c;
  if (!(price > 0) || !(atrVal > 0)) return null;
  const tick = tickSize(price);
  const entry = roundToTick(price);
  let sl: number;
  let entryLow: number;

  if (strategy === 'DAYTRADE') {
    let structure = entry - 0.6 * atrVal;
    if (live && todayBars.length) {
      const vw = last(vwap(todayBars))!;
      const recentLow = Math.min(...todayBars.slice(-6).map((b) => b.low));
      structure = Math.min(vw, recentLow) - tick;
      entryLow = roundToTick(Math.max(vw, entry - 0.25 * atrVal), 'up');
    } else {
      entryLow = roundToTick(entry - 0.25 * atrVal, 'up');
    }
    // risiko day trade dibatasi 0.35–0.8 ATR
    const minRisk = Math.max(2 * tick, 0.35 * atrVal);
    const maxRisk = 0.8 * atrVal;
    let risk = entry - structure;
    risk = Math.min(Math.max(risk, minRisk), maxRisk);
    sl = roundToTick(entry - risk, 'down');
  } else {
    entryLow = roundToTick(Math.max(lv.support, entry - 0.3 * atrVal), 'up');
    let s = lv.support - 0.5 * atrVal;
    if (entry - s > 2 * atrVal) s = entry - 2 * atrVal;
    if (entry - s < Math.max(2 * tick, 0.5 * atrVal)) s = entry - Math.max(2 * tick, 0.5 * atrVal);
    sl = roundToTick(s, 'down');
  }
  sl = Math.max(sl, limits.arb);
  if (sl >= entry) sl = roundToTick(entry - tick, 'down');
  entryLow = Math.min(entryLow, entry);

  const risk = entry - sl;
  const feeIn = settings.fees.buyPct / 100;
  const feeOut = settings.fees.sellPct / 100;
  const netRisk = entry * (1 + feeIn) - sl * (1 - feeOut);
  // Target dihitung dari R BERSIH (setelah biaya), bukan jarak harga kotor
  const atR = (k: number) => (entry * (1 + feeIn) + k * netRisk) / (1 - feeOut);
  let tp1: number;
  let tp2: number;
  if (strategy === 'DAYTRADE') {
    tp1 = atR(1.5);
    tp2 = Math.max(atR(2.5), Math.min(lv.resistance, atR(4)));
  } else {
    tp1 = Math.max(atR(1.5), Math.min(lv.resistance, atR(2.5)));
    tp2 = Math.max(tp1 + risk, lv.resistance);
  }
  tp1 = Math.min(roundToTick(tp1, 'up'), limits.ara);
  tp2 = Math.min(roundToTick(tp2, 'up'), limits.ara);
  if (tp2 < tp1) tp2 = tp1;

  const netReward = tp1 * (1 - feeOut) - entry * (1 + feeIn);
  const rr1 = netRisk > 0 ? netReward / netRisk : 0;

  const riskBudget = settings.modal * (settings.riskPct / 100);
  const byRisk = Math.floor(riskBudget / (netRisk * LOT_SIZE));
  const byModal = Math.floor(settings.modal / (entry * LOT_SIZE * (1 + feeIn)));
  const lots = Math.max(0, Math.min(byRisk, byModal));

  return {
    entry,
    entryLow,
    sl,
    tp1,
    tp2,
    riskPerShare: risk,
    rr1,
    breakEven: breakEvenPrice(entry, settings.fees),
    lots,
    cost: lots * LOT_SIZE * entry * (1 + feeIn),
    maxLoss: lots * LOT_SIZE * netRisk,
    potentialProfit1: lots * LOT_SIZE * netReward,
    ara: limits.ara,
    arb: limits.arb,
  };
}

// ------------------------------------------------------------------ Berita

export function applyNews(result: ScreenResult, bundle: TickerNewsBundle | undefined): ScreenResult {
  if (!bundle) return result;
  let score = result.score;
  const warnings = [...result.warnings];
  if (bundle.hasNegative24h) {
    score = Math.round(score * 0.85);
    warnings.unshift('Ada berita negatif 24 jam terakhir');
  } else if (bundle.hasPositive24h) {
    score = Math.min(100, score + 3);
  }
  return { ...result, score, label: labelFor(score), warnings };
}

// ------------------------------------------------------------------ Kalibrasi dari backtest

export interface CalibrationBucket {
  min: number;
  max: number;
  n: number;
  winRate: number;
  avgR: number;
}

export interface Calibration {
  strategy: Strategy;
  mode: 'EOD' | 'INTRADAY';
  createdAt: string;
  buckets: CalibrationBucket[];
}

export function lookupCalibration(cal: Calibration | null | undefined, score: number): CalibrationBucket | null {
  if (!cal) return null;
  return cal.buckets.find((b) => score >= b.min && score <= b.max && b.n >= 10) || null;
}
