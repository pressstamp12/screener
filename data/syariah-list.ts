/**
 * Watchlist default 12 saham populer IDX untuk screening harian Mode D
 */
export const DEFAULT_WATCHLIST: string[] = [
  'ADRO',
  'BBRI',
  'BRIS',
  'BRMS',
  'EXCL',
  'ERAA',
  'GOTO',
  'TOTL',
  'BUMI',
  'BBCA',
  'BMRI',
  'TLKM',
];

/**
 * Daftar statis saham Syariah (ISSI / JII - IDX)
 * Update secara berkala mengikuti pengumuman DES OJK (biasanya Mei & November).
 */
export const SYARIAH_TICKERS: string[] = [
  // Dari watchlist default (yang tergolong Syariah)
  'ADRO',
  'BRIS',
  'BRMS',
  'EXCL',
  'ERAA',
  'GOTO',
  'TOTL',
  'TLKM',

  // Tambahan emiten ISSI / JII populer lainnya
  'ACES',
  'ADMR',
  'AKRA',
  'AMMN',
  'AMRT',
  'ANTM',
  'ASII',
  'AVIA',
  'BMTR',
  'BSDE',
  'BTPS',
  'CPIN',
  'CTRA',
  'DMAS',
  'ELSA',
  'EMTK',
  'ESSA',
  'GGRM',
  'HEAL',
  'HRUM',
  'ICBP',
  'INCO',
  'INDF',
  'INKP',
  'INTP',
  'ISAT',
  'ITMG',
  'JPFA',
  'JSMR',
  'KLBF',
  'LSIP',
  'MAPI',
  'MBMA',
  'MDKA',
  'MEDC',
  'MIKA',
  'MNCN',
  'MYOR',
  'NCKL',
  'PANI',
  'PGAS',
  'PGEO',
  'PNBS',
  'PTBA',
  'PTPP',
  'PWON',
  'RAJA',
  'SCMA',
  'SIDO',
  'SILO',
  'SMGR',
  'SMRA',
  'SRTG',
  'TAPG',
  'TINS',
  'TKIM',
  'TPIA',
  'UNTR',
  'UNVR',
  'WIKA',
];

const SYARIAH_SET = new Set(SYARIAH_TICKERS.map((t) => t.toUpperCase()));

export function isSyariahTicker(ticker: string): boolean {
  const clean = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  return SYARIAH_SET.has(clean);
}
