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

/**
 * Hitung RSI (14) dari data close 14 hari terakhir (15 data close = 14 perubahan harian).
 * Jika data close kurang dari 15 titik, tetap hitung dari data yang ada dan tandai isApprox = true.
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
 * Cari Support 20 hari: Low terendah dalam 20 hari perdagangan yang sudah diuji minimal 3x
 * (dalam toleransi 2.5% dari titik low tersebut). Jika belum ada yang tersentuh 3x,
 * fallback ke Low terendah 20 hari beserta jumlah ujinya.
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
 * Analisa lengkap satu saham menggunakan aturan Mode D Screener.
 * Skor murni dari 5 checklist teknikal (max 100), terpisah dari sentimen berita.
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

  // High 20 hari dipakai untuk hitung Drop dari High 20H
  const high20 = Math.round(Math.max(...last20.map((c) => c.high), price));

  // Resistance terdekat = High 5 hari terakhir
  const resistance = Math.round(Math.max(...last5.map((c) => c.high), price));

  // Support = Low terendah 20 hari yang sudah diuji minimal 3x
  const { support: rawSupport, tests: supportTests } = findSupport20(candles);
  const support = rawSupport > 0 ? rawSupport : Math.round(price * 0.95);

  // Turun dari High 20 hari (%)
  const dropFromHigh20 =
    high20 > 0 ? Number((((price - high20) / high20) * 100).toFixed(1)) : 0;

  // SINGLE SOURCE OF TRUTH: JarakKeSupport = (HargaSaatIni - Support) / Support * 100%
  // Nilai yang sama dipakai untuk tampilan UI dan evaluasi checklist Dekat Support
  const distToSupport =
    support > 0 ? Number((((price - support) / support) * 100).toFixed(1)) : 0;

  // Upside ke Resistance (High 5H) (%)
  const distToResistance =
    price > 0
      ? Number((((resistance - price) / price) * 100).toFixed(1))
      : 0;

  // Hitung RSI (14) dari data close 14 hari terakhir
  const closes14 = candles.slice(-15).map((c) => c.close);
  const { rsi, isApprox: isRsiApprox } = calculateRSI14(closes14, 14);

  // Volume hari ini vs rata-rata 20 hari
  const volumeToday = lastCandle?.volume || 0;
  const volSamples = last20.slice(0, Math.max(1, last20.length - 1));
  const avgVolume20 =
    volSamples.reduce((acc, c) => acc + c.volume, 0) /
    Math.max(1, volSamples.length);
  const volumeRatio =
    avgVolume20 > 0 ? Number((volumeToday / avgVolume20).toFixed(2)) : 0;

  // Candle hijau terakhir (close > open)
  const isGreenCandle = lastCandle ? lastCandle.close > lastCandle.open : false;

  // 5 Checklist Mode D (menggunakan nilai eksak yang ditampilkan di UI)
  const dropOk = dropFromHigh20 < -8;
  const supportOk = distToSupport >= 0 && distToSupport <= 4;
  const rsiOk = rsi >= 28 && rsi <= 48;
  const volumeOk = volumeRatio > 1.2;
  const allModeD = dropOk && supportOk && rsiOk && volumeOk && isGreenCandle;

  // Rumus Skor Rebound persis sesuai 5 checklist (Total max 100, tanpa modifikasi berita)
  const score =
    (dropOk ? 20 : 0) +
    (supportOk ? 30 : 0) +
    (rsiOk ? 15 : 0) +
    (volumeOk ? 25 : 0) +
    (isGreenCandle ? 10 : 0);

  // Label berdasarkan skor murni: >= 60 POTENSI REBOUND, 40-59 TUNGGU, < 40 SKIP
  let label: ReboundLabel = 'SKIP';
  if (score >= 60) {
    label = 'POTENSI REBOUND';
  } else if (score >= 40) {
    label = 'TUNGGU';
  }

  // Hitung lot yang bisa dibeli (1 lot IDX = 100 lembar)
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
    checks: {
      dropOk,
      supportOk,
      rsiOk,
      volumeOk,
      greenCandle: isGreenCandle,
      allModeD,
    },
  };
}
