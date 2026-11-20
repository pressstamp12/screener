import { describe, expect, it } from 'vitest';
import { addTicks, arLimits, breakEvenPrice, netPnl, roundToTick, sessionInfo, tickSize } from '@/lib/idx';
import { wib } from './helpers';

describe('aturan BEI', () => {
  it('fraksi harga', () => {
    expect(tickSize(150)).toBe(1);
    expect(tickSize(200)).toBe(2);
    expect(tickSize(1995)).toBe(5);
    expect(tickSize(2000)).toBe(10);
    expect(tickSize(9000)).toBe(25);
    expect(roundToTick(1237, 'down')).toBe(1235);
    expect(roundToTick(1237, 'up')).toBe(1240);
    expect(roundToTick(4996, 'nearest')).toBe(5000);
    expect(addTicks(498, 2)).toBe(505);
    expect(addTicks(505, -2)).toBe(498);
  });

  it('ARA/ARB periode transisi (ARB 7%)', () => {
    const d = new Date('2026-11-20T03:00:00Z');
    expect(arLimits(1000, d)).toMatchObject({ ara: 1250, arb: 930 });
    expect(arLimits(6000, d)).toMatchObject({ ara: 7200, arb: 5600 });
    expect(arLimits(100, d)).toMatchObject({ ara: 135, arb: 93 });
    expect(arLimits(12, d).arb).toBe(11);
  });

  it('ARB simetris mulai 2027', () => {
    const d = new Date('2027-01-04T03:00:00Z');
    expect(arLimits(1000, d).arb).toBe(750);
  });

  it('sesi perdagangan WIB', () => {
    expect(sessionInfo(wib('2026-11-20', 10, 0)).phase).toBe('SESI_1'); // Jumat
    expect(sessionInfo(wib('2026-11-20', 13, 0)).phase).toBe('ISTIRAHAT'); // Jumat istirahat s/d 14:00
    expect(sessionInfo(wib('2026-11-19', 13, 45)).phase).toBe('SESI_2'); // Kamis
    expect(sessionInfo(wib('2026-11-21', 10, 0)).phase).toBe('LIBUR');
    const s = sessionInfo(wib('2026-11-19', 10, 30));
    expect(s.minutesElapsed).toBe(90);
    expect(s.minutesTotal).toBe(320);
  });

  it('biaya transaksi', () => {
    expect(breakEvenPrice(1000)).toBe(1005);
    expect(netPnl(1000, 1000, 1)).toBeCloseTo(-400, 6); // 0.15% + 0.25% dari Rp100.000
  });
});
