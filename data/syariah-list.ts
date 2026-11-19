/**
 * Watchlist default universe screening (LQ45 + JII + IDX30)
 */
export const DEFAULT_WATCHLIST: string[] = [
  'BBCA', 'BBRI', 'BMRI', 'BBNI', 'BRIS',
  'BREN', 'AMRT', 'ICBP', 'INDF', 'UNVR',
  'ASII', 'TLKM', 'EXCL', 'ISAT', 'TOWR',
  'MAPI', 'INKP', 'TKIM', 'MDKA', 'ANTM',
  'INCO', 'PTBA', 'ADRO', 'ITMG', 'BUMI',
  'BRMS', 'DEWA', 'GOTO', 'BUKA', 'ERAA',
  'ACES', 'SCMA', 'SRTG', 'KLBF', 'SIDO',
  'CPIN', 'JPFA', 'SMGR', 'INTP', 'CTRA',
  'SMRA', 'BSDE', 'PWON', 'JSMR', 'PGEO',
  'MBMA', 'NCKL', 'ARTO', 'BRPT', 'ESSA',
  'TPIA', 'TOTL', 'CMNP',
];

/**
 * Daftar konstituen LQ45 di dalam universe screening
 */
export const LQ45_TICKERS: string[] = [
  'BBCA', 'BBRI', 'BMRI', 'BBNI', 'BRIS',
  'AMRT', 'ICBP', 'INDF', 'UNVR', 'ASII',
  'TLKM', 'EXCL', 'ISAT', 'TOWR', 'MAPI',
  'INKP', 'MDKA', 'ANTM', 'INCO', 'PTBA',
  'ADRO', 'ITMG', 'GOTO', 'BUKA', 'ACES',
  'SRTG', 'KLBF', 'SIDO', 'CPIN', 'JPFA',
  'SMGR', 'INTP', 'CTRA', 'SMRA', 'BSDE',
  'PWON', 'JSMR', 'PGEO', 'MBMA', 'ARTO',
  'BRPT', 'ESSA', 'TPIA', 'BRMS', 'BUMI',
];

/**
 * Daftar statis saham Syariah (ISSI / JII - IDX)
 * Update secara berkala mengikuti pengumuman DES OJK (Mei & November).
 */
export const SYARIAH_TICKERS: string[] = [
  'ADRO', 'BRIS', 'BRMS', 'EXCL', 'ERAA',
  'GOTO', 'TOTL', 'TLKM', 'BREN', 'AMRT',
  'ICBP', 'INDF', 'UNVR', 'ASII', 'ISAT',
  'MAPI', 'INKP', 'TKIM', 'MDKA', 'ANTM',
  'INCO', 'PTBA', 'ITMG', 'DEWA', 'BUKA',
  'ACES', 'SCMA', 'KLBF', 'SIDO', 'CPIN',
  'JPFA', 'SMGR', 'INTP', 'CTRA', 'SMRA',
  'BSDE', 'PWON', 'JSMR', 'PGEO', 'MBMA',
  'NCKL', 'BRPT', 'ESSA', 'TPIA', 'CMNP',
  // Tambahan emiten ISSI / JII populer lainnya
  'ADMR', 'AKRA', 'AMMN', 'AVIA', 'BMTR',
  'BTPS', 'DMAS', 'ELSA', 'EMTK', 'GGRM',
  'HEAL', 'HRUM', 'LSIP', 'MEDC', 'MIKA',
  'MNCN', 'MYOR', 'PANI', 'PGAS', 'PNBS',
  'PTPP', 'RAJA', 'SILO', 'TAPG', 'TINS',
  'UNTR', 'WIKA',
];

export type StockSector =
  | 'bank'
  | 'batubara'
  | 'nikel'
  | 'energi'
  | 'telko'
  | 'konsumer'
  | 'properti'
  | 'semen'
  | 'ritel'
  | 'teknologi'
  | 'infrastruktur'
  | 'industri';

export interface TickerMeta {
  keywords: string[];
  sector: StockSector;
  sectorLabel: string;
}

export const TICKER_META: Record<string, TickerMeta> = {
  BBCA: { keywords: ['bbca', 'bca', 'bank central asia'], sector: 'bank', sectorLabel: 'bank' },
  BBRI: { keywords: ['bbri', 'bri', 'bank rakyat indonesia'], sector: 'bank', sectorLabel: 'bank' },
  BMRI: { keywords: ['bmri', 'bank mandiri', 'mandiri'], sector: 'bank', sectorLabel: 'bank' },
  BBNI: { keywords: ['bbni', 'bni', 'bank negara indonesia'], sector: 'bank', sectorLabel: 'bank' },
  BRIS: { keywords: ['bris', 'bsi', 'bank syariah indonesia'], sector: 'bank', sectorLabel: 'bank syariah' },
  ARTO: { keywords: ['arto', 'bank jago', 'jago'], sector: 'bank', sectorLabel: 'bank digital' },
  ADRO: { keywords: ['adro', 'adaro', 'alamtri'], sector: 'batubara', sectorLabel: 'batubara' },
  PTBA: { keywords: ['ptba', 'bukit asam'], sector: 'batubara', sectorLabel: 'batubara' },
  ITMG: { keywords: ['itmg', 'indo tambangraya'], sector: 'batubara', sectorLabel: 'batubara' },
  BUMI: { keywords: ['bumi', 'bumi resources'], sector: 'batubara', sectorLabel: 'batubara' },
  DEWA: { keywords: ['dewa', 'darma henwa'], sector: 'batubara', sectorLabel: 'batubara' },
  ANTM: { keywords: ['antm', 'antam', 'aneka tambang'], sector: 'nikel', sectorLabel: 'tambang & nikel' },
  INCO: { keywords: ['inco', 'vale indonesia', 'vale'], sector: 'nikel', sectorLabel: 'nikel' },
  MDKA: { keywords: ['mdka', 'merdeka copper'], sector: 'nikel', sectorLabel: 'tambang & nikel' },
  MBMA: { keywords: ['mbma', 'merdeka battery'], sector: 'nikel', sectorLabel: 'nikel' },
  NCKL: { keywords: ['nckl', 'trimegah bangun', 'harita nickel'], sector: 'nikel', sectorLabel: 'nikel' },
  BRMS: { keywords: ['brms', 'bumi resources minerals'], sector: 'nikel', sectorLabel: 'tambang emas/mineral' },
  BREN: { keywords: ['bren', 'barito renewables'], sector: 'energi', sectorLabel: 'energi' },
  PGEO: { keywords: ['pgeo', 'pertamina geothermal'], sector: 'energi', sectorLabel: 'energi' },
  ESSA: { keywords: ['essa', 'surya esa'], sector: 'energi', sectorLabel: 'energi & gas' },
  BRPT: { keywords: ['brpt', 'barito pacific'], sector: 'energi', sectorLabel: 'energi & petrokimia' },
  TPIA: { keywords: ['tpia', 'chandra asri'], sector: 'energi', sectorLabel: 'petrokimia' },
  TLKM: { keywords: ['tlkm', 'telkom indonesia', 'telkom'], sector: 'telko', sectorLabel: 'telekomunikasi' },
  EXCL: { keywords: ['excl', 'xl axiata', 'xlsmart'], sector: 'telko', sectorLabel: 'telekomunikasi' },
  ISAT: { keywords: ['isat', 'indosat'], sector: 'telko', sectorLabel: 'telekomunikasi' },
  TOWR: { keywords: ['towr', 'sarana menara', 'protelindo'], sector: 'telko', sectorLabel: 'menara telko' },
  ICBP: { keywords: ['icbp', 'indofood cbp'], sector: 'konsumer', sectorLabel: 'konsumer' },
  INDF: { keywords: ['indf', 'indofood'], sector: 'konsumer', sectorLabel: 'konsumer' },
  UNVR: { keywords: ['unvr', 'unilever'], sector: 'konsumer', sectorLabel: 'konsumer' },
  KLBF: { keywords: ['klbf', 'kalbe farma', 'kalbe'], sector: 'konsumer', sectorLabel: 'farmasi' },
  SIDO: { keywords: ['sido', 'sido muncul'], sector: 'konsumer', sectorLabel: 'konsumer & jamu' },
  CPIN: { keywords: ['cpin', 'charoen pokphand'], sector: 'konsumer', sectorLabel: 'poultry' },
  JPFA: { keywords: ['jpfa', 'japfa'], sector: 'konsumer', sectorLabel: 'poultry' },
  AMRT: { keywords: ['amrt', 'alfamart', 'sumber alfaria'], sector: 'ritel', sectorLabel: 'ritel' },
  MAPI: { keywords: ['mapi', 'mitra adiperkasa'], sector: 'ritel', sectorLabel: 'ritel' },
  ERAA: { keywords: ['eraa', 'erajaya'], sector: 'ritel', sectorLabel: 'ritel' },
  ACES: { keywords: ['aces', 'aspirasi hidup', 'ace hardware', 'azko'], sector: 'ritel', sectorLabel: 'ritel' },
  GOTO: { keywords: ['goto', 'gojek tokopedia'], sector: 'teknologi', sectorLabel: 'teknologi' },
  BUKA: { keywords: ['buka', 'bukalapak'], sector: 'teknologi', sectorLabel: 'teknologi' },
  SCMA: { keywords: ['scma', 'surya citra media'], sector: 'teknologi', sectorLabel: 'media' },
  CTRA: { keywords: ['ctra', 'ciputra'], sector: 'properti', sectorLabel: 'properti' },
  SMRA: { keywords: ['smra', 'summarecon'], sector: 'properti', sectorLabel: 'properti' },
  BSDE: { keywords: ['bsde', 'bumi serpong damai', 'bsd'], sector: 'properti', sectorLabel: 'properti' },
  PWON: { keywords: ['pwon', 'pakuwon'], sector: 'properti', sectorLabel: 'properti' },
  SMGR: { keywords: ['smgr', 'semen indonesia', 'sig'], sector: 'semen', sectorLabel: 'semen' },
  INTP: { keywords: ['intp', 'indocement'], sector: 'semen', sectorLabel: 'semen' },
  JSMR: { keywords: ['jsmr', 'jasa marga'], sector: 'infrastruktur', sectorLabel: 'infrastruktur' },
  TOTL: { keywords: ['totl', 'total bangun persada'], sector: 'infrastruktur', sectorLabel: 'konstruksi' },
  CMNP: { keywords: ['cmnp', 'citra marga'], sector: 'infrastruktur', sectorLabel: 'jalan tol' },
  ASII: { keywords: ['asii', 'astra international', 'astra'], sector: 'industri', sectorLabel: 'otomotif & industri' },
  INKP: { keywords: ['inkp', 'indah kiat'], sector: 'industri', sectorLabel: 'pulp & kertas' },
  TKIM: { keywords: ['tkim', 'tjiwi kimia'], sector: 'industri', sectorLabel: 'pulp & kertas' },
  SRTG: { keywords: ['srtg', 'saratoga'], sector: 'industri', sectorLabel: 'investasi' },
};

const SYARIAH_SET = new Set(SYARIAH_TICKERS.map((t) => t.toUpperCase()));
const LQ45_SET = new Set(LQ45_TICKERS.map((t) => t.toUpperCase()));

export function isSyariahTicker(ticker: string): boolean {
  const clean = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  return SYARIAH_SET.has(clean);
}

export function isLq45Ticker(ticker: string): boolean {
  const clean = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  return LQ45_SET.has(clean);
}

export function getTickerMeta(ticker: string): TickerMeta {
  const clean = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  return (
    TICKER_META[clean] || {
      keywords: [clean.toLowerCase()],
      sector: 'industri',
      sectorLabel: 'pasar',
    }
  );
}
