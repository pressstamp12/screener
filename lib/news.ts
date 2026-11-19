import { NewsSentiment, StockNewsItem, TickerNewsBundle } from './types';

type StockSector =
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

interface TickerMeta {
  keywords: string[];
  sector: StockSector;
  sectorLabel: string;
}

const TICKER_META: Record<string, TickerMeta> = {
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
  BRMS: { keywords: ['brms', 'bumi resources minerals'], sector: 'nikel', sectorLabel: 'tambang mineral' },
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
  SIDO: { keywords: ['sido', 'sido muncul'], sector: 'konsumer', sectorLabel: 'konsumer' },
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

const POSITIVE_KEYWORDS = [
  'naik',
  'untung',
  'laba',
  'dividen',
  'buyback',
  'ekspansi',
  'kontrak baru',
  'rekor',
  'upgrade',
];

const NEGATIVE_KEYWORDS = [
  'rugi',
  'turun',
  'anjlok',
  'suspend',
  'gagal',
  'utang',
  'denda',
  'downgrade',
  'gugatan',
];

// Singkatan pendek dicocokkan per batas kata agar tidak salah tangkap ("utama" != "UMA")
const NEGATIVE_WORD_REGEXES = [/\buma\b/i, /\bphk\b/i];

const INTERNAL_HINTS = [
  'laporan keuangan',
  'rups',
  'dividen',
  'buyback',
  'proyek',
  'kontrak',
  'ekspansi',
  'akuisisi',
  'right issue',
  'laba bersih',
  'pendapatan',
  'emiten',
  'perseroan',
  'direksi',
];

const SECTOR_MACRO_KEYWORDS: Record<StockSector, string[]> = {
  bank: ['bi rate', 'suku bunga', 'bank indonesia', 'rupiah', 'kredit', 'ihsg'],
  batubara: ['batubara', 'batu bara', 'coal', 'energi', 'dmo', 'esdm', 'ihsg'],
  nikel: ['nikel', 'nickel', 'emas', 'tambang', 'hilirisasi', 'komoditas', 'ihsg'],
  energi: ['minyak', 'brent', 'energi', 'geothermal', 'migas', 'esdm', 'ihsg'],
  telko: ['komdigi', 'kominfo', 'spektrum', 'tarif', 'ihsg', 'rupiah'],
  konsumer: ['inflasi', 'daya beli', 'rupiah', 'cpo', 'pangan', 'ihsg'],
  ritel: ['daya beli', 'inflasi', 'bi rate', 'rupiah', 'ppn', 'ihsg'],
  properti: ['bi rate', 'suku bunga', 'kpr', 'insentif ppn', 'properti', 'ihsg'],
  semen: ['infrastruktur', 'apbn', 'bi rate', 'properti', 'ihsg'],
  teknologi: ['the fed', 'suku bunga', 'bi rate', 'rupiah', 'ihsg'],
  infrastruktur: ['apbn', 'tarif tol', 'infrastruktur', 'bi rate', 'ihsg'],
  industri: ['rupiah', 'suku bunga', 'ekspor', 'manufaktur', 'pmi', 'ihsg'],
};

function getTickerMeta(ticker: string): TickerMeta {
  const clean = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  return (
    TICKER_META[clean] || {
      keywords: [clean.toLowerCase()],
      sector: 'industri',
      sectorLabel: 'pasar',
    }
  );
}

export function classifyNewsSentiment(title: string): NewsSentiment {
  const lower = title.toLowerCase();

  const isNegative =
    NEGATIVE_KEYWORDS.some((kw) => lower.includes(kw)) ||
    NEGATIVE_WORD_REGEXES.some((rx) => rx.test(lower));

  const isPositive = POSITIVE_KEYWORDS.some((kw) => lower.includes(kw));

  if (isNegative) return 'NEGATIF';
  if (isPositive) return 'POSITIF';
  return 'NETRAL';
}

export function detectIsInternalNews(ticker: string, title: string): boolean {
  const clean = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  if (clean === 'MACRO') return false;

  const lower = title.toLowerCase();
  const meta = getTickerMeta(clean);

  if (meta.keywords.some((kw) => lower.includes(kw))) {
    return true;
  }

  return INTERNAL_HINTS.some((kw) => lower.includes(kw));
}

export function isWithin24Hours(publishedAt: string): boolean {
  const ts = new Date(publishedAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= 24 * 60 * 60 * 1000;
}

function sentimentLabelIndo(s: NewsSentiment): string {
  if (s === 'POSITIF') return 'Positif';
  if (s === 'NEGATIF') return 'Negatif';
  return 'Netral';
}

function truncateText(text: string, maxLen = 68): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trim()}…`;
}

/**
 * Susun daftar maks 3 berita, 1 baris Isu Internal, 1 baris Isu Eksternal,
 * serta flag peringatan negatif / katalis positif 24 jam (terpisah dari skor utama).
 */
export function buildTickerNewsBundle(
  ticker: string,
  tickerItems: StockNewsItem[],
  macroItems: StockNewsItem[]
): TickerNewsBundle {
  const sortedItems = [...tickerItems]
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    )
    .slice(0, 3);

  const recent24h = sortedItems.filter((item) =>
    isWithin24Hours(item.published_at)
  );
  const hasNegative24h = recent24h.some((item) => item.sentiment === 'NEGATIF');
  const hasPositive24h = recent24h.some((item) => item.sentiment === 'POSITIF');

  const internalItem =
    sortedItems.find((i) => i.is_internal) || sortedItems[0] || null;
  const internalSummary = internalItem
    ? `${truncateText(internalItem.title, 70)} (${sentimentLabelIndo(
        internalItem.sentiment
      )})`
    : null;

  const meta = getTickerMeta(ticker);
  const sectorKeys = SECTOR_MACRO_KEYWORDS[meta.sector] || ['ihsg', 'rupiah'];

  const matchedMacro =
    macroItems.find((m) => {
      const lower = m.title.toLowerCase();
      return sectorKeys.some((kw) => lower.includes(kw));
    }) ||
    macroItems[0] ||
    null;

  const externalSummary = matchedMacro
    ? `${truncateText(matchedMacro.title, 58)} - ${sentimentLabelIndo(
        matchedMacro.sentiment
      )} untuk ${meta.sectorLabel}`
    : null;

  return {
    items: sortedItems,
    internalSummary,
    externalSummary,
    hasNegative24h,
    hasPositive24h,
  };
}
