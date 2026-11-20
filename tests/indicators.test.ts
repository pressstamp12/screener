import { describe, expect, it } from 'vitest';
import { atr, ema, macd, rsi, sma, stochastic, vwap, adx, bollinger } from '@/lib/indicators';
import type { Candle } from '@/lib/types';

// Contoh klasik Wilder / StockCharts untuk RSI(14)
const WILDER = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.0, 46.03, 46.41, 46.22, 45.64];

describe('indikator', () => {
  it('RSI Wilder cocok dengan tabel referensi', () => {
    const r = rsi(WILDER, 14);
    expect(r[13]).toBeNaN();
    expect(r[14]).toBeCloseTo(70.46, 0);
    expect(r[15]).toBeCloseTo(66.25, 0);
    expect(r[19]).toBeCloseTo(57.92, 0);
  });

  it('SMA & EMA', () => {
    const v = [1, 2, 3, 4, 5, 6];
    expect(sma(v, 3)[2]).toBe(2);
    expect(sma(v, 3)[5]).toBe(5);
    const e = ema(v, 3);
    expect(e[2]).toBe(2); // seed = SMA
    expect(e[3]).toBe(3); // 4*0.5 + 2*0.5
  });

  it('ATR konstan untuk range konstan', () => {
    const c: Candle[] = Array.from({ length: 30 }, (_, i) => ({ date: `d${i}`, open: 100, high: 102, low: 98, close: 100, volume: 1 }));
    expect(atr(c, 14)[29]).toBeCloseTo(4, 6);
  });

  it('MACD positif saat tren naik', () => {
    const up = Array.from({ length: 60 }, (_, i) => 100 + i);
    const m = macd(up);
    expect(m.macd[59]).toBeGreaterThan(0);
    expect(Number.isFinite(m.signal[59])).toBe(true);
  });

  it('Stochastic 100 saat close di high', () => {
    const c: Candle[] = Array.from({ length: 30 }, (_, i) => ({ date: `d${i}`, open: 100 + i, high: 101 + i, low: 99 + i, close: 101 + i, volume: 1 }));
    expect(stochastic(c).k[29]).toBeCloseTo(100, 6);
  });

  it('ADX tinggi pada tren kuat, +DI dominan', () => {
    const c: Candle[] = Array.from({ length: 60 }, (_, i) => ({ date: `d${i}`, open: 100 + i * 2, high: 102 + i * 2, low: 99 + i * 2, close: 101.5 + i * 2, volume: 1 }));
    const a = adx(c, 14);
    expect(a.adx[59]).toBeGreaterThan(40);
    expect(a.plusDI[59]).toBeGreaterThan(a.minusDI[59]);
  });

  it('Bollinger %B dan VWAP', () => {
    const v = Array.from({ length: 25 }, (_, i) => 100 + (i % 2));
    const b = bollinger(v);
    expect(b.percentB[24]).toBeGreaterThan(0);
    expect(b.percentB[24]).toBeLessThan(1.01);
    const w = vwap([
      { date: 'x', open: 10, high: 10, low: 10, close: 10, volume: 100 },
      { date: 'x', open: 20, high: 20, low: 20, close: 20, volume: 300 },
    ]);
    expect(w[1]).toBeCloseTo(17.5, 6);
  });
});
