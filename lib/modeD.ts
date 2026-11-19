import { isSyariahTicker } from '@/data/syariah-list';
import { Candle, ReboundLabel, ScreenedStock, StockRawData } from './types';

/**
 * Hitung RSI 14 (Wilder's Smoothing) dari array harga close minimal 15-30 hari
 */
export function calculateRSI14(closes: number[], period = 14): number {
  if (closes.length < period + 1) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return Number(rsi.toFixed(1));
}

/**
 * Cari Support 20 hari: Low terendah dalam 20 hari perdagangan yang sudah diuji minimal 2x
 * (dalam toleransi 2.5% dari titik low tersebut). Jika belum ada yang tersentuh 2x,
 * fallback ke Low terendah 20 hari.
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
    const tolerance = candidate * 0.025; // zona uji 2.5%
    const touches = recent20.filter(
      (c) => c.low >= candidate - tolerance && c.low <= candidate + tolerance
    ).length;

    if (touches >= 2) {
      return { support: Math.round(candidate), tests: touches };
    }
  }

  const lowest = Math.min(...lows);
  return { support: Math.round(lowest), tests: 1 };
}

/**
 * Analisa lengkap satu saham menggunakan aturan Mode D Screener
 */
export function analyzeStockModeD(
  raw: StockRawData,
  modalUser: number
): ScreenedStock {
  const candles = raw.candles;
  const lastCandle = candles[candles.length - 1];
  const prevCandle =
    candles.length >= 2 ? candles[candles.length - 2] : lastCandle;

  const price = Math.round(raw.price || lastCandle?.close || 0);
  const prevClose = Math.round(raw.prevClose || prevCandle?.close || price);
  const changePercent =
    prevClose > 0 ? Number((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0;

  const last20 = candles.slice(-20);
  const last30Plus = candles.slice(-40); // ambil hingga 40 hari agar RSI-14 akurat

  // Resistance = High tertinggi 20 hari
  const high20 = Math.round(
    Math.max(...last20.map((c) => c.high), price)
  );

  // Support = Low terendah 20 hari yang sudah diuji minimal 2x
  const { support: rawSupport, tests: supportTests } = findSupport20(candles);
  const support = rawSupport > 0 ? rawSupport : Math.round(price * 0.95);

  // Turun dari High 20 hari (%)
  const dropFromHigh20 =
    high20 > 0 ? Number((((price - high20) / high20) * 100).toFixed(1)) : 0;

  // Jarak harga ke Support & Resistance (%)
  const distToSupport =
    support > 0 ? Number((((price - support) / support) * 100).toFixed(1)) : 0;
  const distToResistance =
    price > 0 ? Number((((high20 - price) / price) * 100).toFixed(1)) : 0;

  // Hitung RSI 14 di frontend dari data close 30+ hari
  const closes = last30Plus.map((c) => c.close);
  const rsi = calculateRSI14(closes, 14);

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

  // Filter Mode D (4 syarat teknikal + range harga diterapkan di UI)
  const dropOk = dropFromHigh20 <= -8;
  const supportOk = distToSupport >= 0 && distToSupport <= 4;
  const rsiOk = rsi >= 28 && rsi <= 48;
  const volumeOk = volumeRatio > 1.2;
  const allModeD = dropOk && supportOk && rsiOk && volumeOk;

  // Skor Rebound (0 - 100) sesuai aturan:
  // Dekat Support (+40), RSI 30-45 (+30), Volume Naik (+20), Candle Hijau Terakhir (+10)
  let score = 0;
  if (distToSupport >= -1 && distToSupport <= 4) score += 40;
  if (rsi >= 30 && rsi <= 45) score += 30;
  if (volumeRatio > 1.2) score += 20;
  if (isGreenCandle) score += 10;

  let label: ReboundLabel = 'SKIP';
  if (score >= 70) {
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
    ticker: raw.ticker,
    name: raw.name,
    isSyariah: isSyariahTicker(raw.ticker),
    price,
    prevClose,
    changePercent,
    support,
    supportTests,
    resistance: high20,
    distToSupport,
    distToResistance,
    dropFromHigh20,
    rsi,
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
