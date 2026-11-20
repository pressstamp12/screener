import { describe, expect, it } from 'vitest';
import { isSyariahTicker, setSyariahOverride, SYARIAH_TICKERS } from '@/data/syariah-list';

describe('daftar syariah (DES OJK Periode I 2026)', () => {
  it('berisi 622 saham DES + 3 insidentil, tanpa duplikat', () => {
    expect(SYARIAH_TICKERS.length).toBe(625);
    expect(new Set(SYARIAH_TICKERS).size).toBe(625);
  });
  it('contoh status sesuai DES', () => {
    for (const t of ['BRIS', 'ADRO', 'TLKM', 'ANTM', 'ICBP', 'BUMI']) expect(isSyariahTicker(t)).toBe(true);
    for (const t of ['BUKA', 'GOTO', 'ASII', 'AMRT', 'BBCA', 'BREN', 'PTRO', 'CUAN']) expect(isSyariahTicker(t)).toBe(false);
  });
  it('daftar dari Pengaturan menggantikan bawaan', () => {
    setSyariahOverride(['BUKA']);
    expect(isSyariahTicker('BUKA')).toBe(true);
    expect(isSyariahTicker('ADRO')).toBe(false);
    setSyariahOverride(null);
    expect(isSyariahTicker('ADRO')).toBe(true);
  });
});
