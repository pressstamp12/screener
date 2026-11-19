import { isSyariahTicker } from '@/data/syariah-list';
import { Candle, ReboundLabel, ScreenedStock, StockRawData } from './types';

const LQ45_SET = new Set([
  'BBCA', 'BBRI', 'BMRI', 'BBNI', 'BRIS',
  'AMRT', 'ICBP', 'INDF', 'UNVR', 'ASII',
  'TLKM', 'EXCL', 'ISAT', 'TOWR', 'MAPI',
  'INKP', 'MDKA', 'ANTM', 'INCO', 'PTBA',
  'ADRO', 'ITMG', 'GOTO', 'BUKA', 'ACES',
  'SRTG', 'KLBF', 'SIDO', 'CPIN', 'JPFA',
  'SMGR', 'INTP', 'CTRA', 'SMRA', 'BSDE',
  'PWON', 'JSMR', 'PGEO', 'MBMA', 'ARTO',
  'BRPT', 'ESSA', 'TPIA', 'BRMS', 'BUMI',
]);

export interface ModeDScoreInput {
  dropPercent: number;    // (High 20H - Harga) / High 20H * 100
  distToSupport: number;  // (Harga - Support) / Support * 100
  rsi: number;            // RSI 14
  volumeRatio: number;    // Volume Hari Ini / Avg Volume 20H
  isGreenCandle: boolean; // Close hari ini > Open hari ini
}

export interface ModeDScorePoints {
  drop: number;
  support: number;
  rsi: number;
  volume: number;
  candle: number;
}

export interface ModeDScoreResult {
  points: ModeDScorePoints;
  checks: {
    dropOk: boolean;
    supportOk: boolean;
    rsiOk: boolean;
    volumeOk: boolean;
    greenCandle: boolean;
    allModeD: boolean;
  };
  score: number;
  label: ReboundLabel;
}

/**
 * FUNGSI TUNGGAL PERHITUNGAN SKOR, CHECKLIST, DAN LABEL MODE D
 * Rumus final (Max 100):
 * - Drop > 8%          => 20
 * - Jarak Support 0-4% => 30
 * - RSI 28 - 48        => 15
 * - Vol > 1.2x         => 25
 * - Candle Hijau       => 10
 */
export function calculateScore(input: ModeDScoreInput): ModeDScoreResult {
  const dropVal = Number(input.dropPercent);
  const supportVal = Number(input.distToSupport);
  const rsiVal = Number(input.rsi);
  const volVal = Number(input.volumeRatio);
  const isGreen = Boolean(input.isGreenCandle);

  const dropPoints = Number.isFinite(dropVal) && dropVal > 8 ? 20 : 0;
  const supportPoints =
    Number.isFinite(supportVal) && supportVal >= 0 && supportVal <= 4 ? 30 : 0;
  const rsiPoints =
    Number.isFinite(rsiVal) && rsiVal >= 28 && rsiVal <= 48 ? 15 : 0;
  const volumePoints = Number.isFinite(volVal) && volVal > 1.2 ? 25 : 0;
  const candlePoints = isGreen ? 10 : 0;

  const score =
    dropPoints + supportPoints + rsiPoints + volumePoints + candlePoints;

  let label: ReboundLabel = 'SKIP';
  if (score >= 60) {
    label = 'POTENSI REBOUND';
  } else if (score >= 40) {
    label = 'TUNGGU';
  }

  const dropOk = dropPoints > 0;
  const supportOk = supportPoints > 0;
  const rsiOk = rsiPoints > 0;
  const volumeOk = volumePoints > 0;
  const greenCandle = candlePoints > 0;

  return {
    points: {
      drop: dropPoints,
      support: supportPoints,
      rsi: rsiPoints,
      volume: volumePoints,
      candle: candlePoints,
    },
    checks: {
      dropOk,
      supportOk,
      rsiOk,
      volumeOk,
      greenCandle,
      allModeD: dropOk && supportOk && rsiOk && volumeOk && greenCandle,
    },
    score,
    label,
  };
}

/**
 * Format baris validasi console:
 * TICKER - Drop:X Dekat:X RSI:X Vol:X Candle:X = Skor:Y
 */
export function formatScoreAuditLog(stock: ScreenedStock): string {
  const { points, score } = calculateScore({
    dropPercent: Number((-stock.dropFromHigh20).toFixed(1)),
    distToSupport: stock.distToSupport,
    rsi: stock.rsi,
    volumeRatio: stock.volumeRatio,
    isGreenCandle: stock.isGreenCandle,
  });

  return `${stock.ticker} - Drop:${points.drop} Dekat:${points.support} RSI:${points.rsi} Vol:${points.volume} Candle:${points.candle} = Skor:${score}`;
}

/**
 * Hitung RSI (14) dari data close 14 hari terakhir (15 data close = 14 perubahan harian).
 * Jika data close kurang dari 15 titik, hitung dari data yang ada & tandai isApprox = true.
 */
export function calculateRSI14(
  closes: number[],
  period = 14
): { rsi: number; isApprox: boolean } {
  const validCloses = closes.filter((c) => Number.isFinite(c) && c > 0);

  if (validCloses.length < 2) {
    return { rsi: 50, isApprox: true };
  }

  const isApprox = validCloses.length < period + 1;
  const windowCloses = validCloses.slice(-(period + 1));
  const changesCount = windowCloses.length - 1;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i < windowCloses.length; i++) {
    const diff = windowCloses[i] - windowCloses[i - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  const avgGain = gains / changesCount;
  const avgLoss = losses / changesCount;

  if (avgLoss === 0) {
    return { rsi: avgGain === 0 ? 50 : 100, isApprox };
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return {
    rsi: Number.isFinite(rsi) ? Number(rsi.toFixed(1)) : 50,
    isApprox,
  };
}

/**
 * Support 20H: Low terendah dalam 20 hari yang sudah diuji minimal 3x (toleransi 2.5%).
 * Fallback ke Low terendah 20H jika belum ada yang tersentuh 3x.
 */
export function findSupport20(candles: Candle[]): {
  support: number;
  tests: number;
} {
  const recent20 = candles.slice(-20);
  if (recent20.length === 0) {
    return { support: 0, tests: 0 };
  }

  const lows = recent20.map((c) => c.low).filter((l) => l > 0);
  if (lows.length === 0) {
    return { support: 0, tests: 0 };
  }

  const sortedUniqueLows = Array.from(new Set(lows)).sort((a, b) => a - b);

  for (const candidate of sortedUniqueLows) {
    const tolerance = candidate * 0.025;
    const touches = recent20.filter(
      (c) => c.low >= candidate - tolerance && c.low <= candidate + tolerance
    ).length;

    if (touches >= 3) {
      return { support: Math.round(candidate), tests: touches };
    }
  }

  const lowest = Math.min(...lows);
  const tolerance = lowest * 0.025;
  const lowestTouches = recent20.filter(
    (c) => c.low >= lowest - tolerance && c.low <= lowest + tolerance
  ).length;
  return { support: Math.round(lowest), tests: Math.max(1, lowestTouches) };
}

/**
 * Analisa lengkap satu saham menggunakan rumus final Mode D Screener
 */
export function analyzeStockModeD(
  raw: StockRawData,
  modalUser: number
): ScreenedStock {
  const cleanTicker = raw.ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  const candles = raw.candles || [];
  const lastCandle = candles[candles.length - 1];
  const prevCandle =
    candles.length >= 2 ? candles[candles.length - 2] : lastCandle;

  const price = Math.round(raw.price || lastCandle?.close || 0);
  const prevClose = Math.round(raw.prevClose || prevCandle?.close || price);
  const changePercent =
    prevClose > 0
      ? Number((((price - prevClose) / prevClose) * 100).toFixed(2))
      : 0;

  const last20 = candles.slice(-20);
  const last5 = candles.slice(-5);

  // High 20H untuk Drop, High 5H untuk Resistance terdekat
  const high20 = Math.round(Math.max(...last20.map((c) => c.high), price));
  const resistance = Math.round(Math.max(...last5.map((c) => c.high), price));

  // Support = Low 20H uji 3x
  const { support: rawSupport, tests: supportTests } = findSupport20(candles);
  const support = rawSupport > 0 ? rawSupport : Math.round(price * 0.95);

  // Drop = (High 20H - Harga) / High 20H * 100%
  const dropPercent =
    high20 > 0 ? Number((((high20 - price) / high20) * 100).toFixed(1)) : 0;
  const dropFromHigh20 = dropPercent === 0 ? 0 : Number((-dropPercent).toFixed(1));

  // Dekat Support = (Harga - Support) / Support * 100%
  const distToSupport =
    support > 0 ? Number((((price - support) / support) * 100).toFixed(1)) : 0;

  // Upside ke Resistance (High 5H)
  const distToResistance =
    price > 0
      ? Number((((resistance - price) / price) * 100).toFixed(1))
      : 0;

  // RSI (14) dari data close 14 hari terakhir
  const closes14 = candles.slice(-15).map((c) => c.close);
  const { rsi, isApprox: isRsiApprox } = calculateRSI14(closes14, 14);

  // Volume Hari Ini / Avg Volume 20H
  const volumeToday = lastCandle?.volume || 0;
  const volSamples = last20.slice(0, Math.max(1, last20.length - 1));
  const avgVolume20 =
    volSamples.reduce((acc, c) => acc + c.volume, 0) /
    Math.max(1, volSamples.length);
  const volumeRatio =
    avgVolume20 > 0 ? Number((volumeToday / avgVolume20).toFixed(2)) : 0;

  // Candle Hijau: Close hari ini > Open hari ini
  const isGreenCandle = lastCandle ? lastCandle.close > lastCandle.open : false;

  // Hitung skor, checklist, & label dari 1 fungsi tunggal calculateScore()
  const { checks, score, label } = calculateScore({
    dropPercent,
    distToSupport,
    rsi,
    volumeRatio,
    isGreenCandle,
  });

  // Hitung lot yang bisa dibeli (1 lot = 100 lembar)
  const costPerLot = price * 100;
  const lotAffordable =
    costPerLot > 0 && modalUser > 0 ? Math.floor(modalUser / costPerLot) : 0;
  const estimatedCost = lotAffordable * costPerLot;

  return {
    ticker: cleanTicker,
    name: raw.name,
    isSyariah: isSyariahTicker(cleanTicker),
    isLq45: LQ45_SET.has(cleanTicker),
    price,
    prevClose,
    changePercent,
    support,
    supportTests,
    resistance,
    distToSupport,
    distToResistance,
    dropFromHigh20,
    rsi,
    isRsiApprox,
    volumeToday,
    avgVolume20: Math.round(avgVolume20),
    volumeRatio,
    isGreenCandle,
    score,
    label,
    lotAffordable,
    estimatedCost,
    checks,
  };
}
