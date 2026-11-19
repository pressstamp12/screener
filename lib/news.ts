import { NewsSentiment, StockNewsItem, TickerNewsBundle } from './types';

export type ExternalSectorKey =
  | 'MACRO_BANK'
  | 'MACRO_BATUBARA'
  | 'MACRO_TELCO'
  | 'MACRO_CONSUMER'
  | 'MACRO_LAIN';

interface SectorConfig {
  key: ExternalSectorKey;
  label: string;
  query: string;
  matchKeywords: string[];
  fallbackText: string;
}

export const SECTOR_CONFIGS: Record<ExternalSectorKey, SectorConfig> = {
  MACRO_BANK: {
    key: 'MACRO_BANK',
    label: 'bank',
    query: '("BI Rate" OR "suku bunga BI" OR "nilai tukar rupiah" OR IHSG) perbankan Indonesia when:7d',
    matchKeywords: ['bi rate', 'suku bunga', 'bank indonesia', 'rupiah', 'ihsg', 'perbankan', 'kredit'],
    fallbackText: 'BI Rate, IHSG & Rupiah - Pantau sentimen perbankan hari ini',
  },
  MACRO_BATUBARA: {
    key: 'MACRO_BATUBARA',
    label: 'batubara & tambang',
    query: '("harga batubara" OR "harga batu bara" OR "harga nikel" OR "kebijakan ekspor" tambang) when:7d',
    matchKeywords: ['batubara', 'batu bara', 'coal', 'nikel', 'nickel', 'ekspor', 'tambang', 'esdm', 'dmo'],
    fallbackText: 'Harga Batubara, Harga Nikel & Kebijakan Ekspor - Pantau komoditas hari ini',
  },
  MACRO_TELCO: {
    key: 'MACRO_TELCO',
    label: 'telko & tower',
    query: '(telekomunikasi OR operator seluler) ("tarif" OR "jumlah pelanggan" OR "5G" OR "belanja modal" OR "capex") Indonesia when:7d',
    matchKeywords: ['tarif', 'pelanggan', '5g', 'belanja modal', 'capex', 'telekomunikasi', 'operator', 'spektrum', 'menara'],
    fallbackText: 'Tarif, Jumlah Pelanggan & Belanja Modal 5G - Pantau sektor telko',
  },
  MACRO_CONSUMER: {
    key: 'MACRO_CONSUMER',
    label: 'consumer & ritel',
    query: '("harga CPO" OR "harga pangan" OR "daya beli" OR inflasi pangan) Indonesia when:7d',
    matchKeywords: ['cpo', 'pangan', 'daya beli', 'inflasi', 'beras', 'sawit', 'konsumen', 'ritel', 'ayam'],
    fallbackText: 'Harga CPO, Harga Pangan & Daya Beli - Pantau sektor consumer',
  },
  MACRO_LAIN: {
    key: 'MACRO_LAIN',
    label: 'pasar IDX',
    query: '(IHSG OR "BI Rate" OR "suku bunga BI") bursa Indonesia when:7d',
    matchKeywords: ['ihsg', 'bi rate', 'suku bunga', 'bursa', 'bei', 'bank indonesia'],
    fallbackText: 'IHSG & BI Rate - Pantau sentimen pasar domestik hari ini',
  },
};

const BANK_TICKERS = new Set(['BBCA', 'BBRI', 'BMRI', 'BBNI', 'BRIS', 'ARTO']);
const BATUBARA_TICKERS = new Set([
  'ADRO', 'PTBA', 'BUMI', 'BRMS', 'ITMG', 'DEWA',
  'ANTM', 'INCO', 'MDKA', 'MBMA', 'NCKL',
]);
const TELCO_TICKERS = new Set(['ISAT', 'EXCL', 'TLKM', 'TOWR']);
const CONSUMER_TICKERS = new Set([
  'ICBP', 'INDF', 'AMRT', 'CPIN', 'JPFA',
  'UNVR', 'MAPI', 'ERAA', 'ACES', 'KLBF', 'SIDO',
]);

const TICKER_COMPANY_KEYWORDS: Record<string, string[]> = {
  BBCA: ['bbca', 'bca', 'bank central asia'],
  BBRI: ['bbri', 'bri', 'bank rakyat indonesia'],
  BMRI: ['bmri', 'bank mandiri', 'mandiri'],
  BBNI: ['bbni', 'bni', 'bank negara indonesia'],
  BRIS: ['bris', 'bsi', 'bank syariah indonesia'],
  ARTO: ['arto', 'bank jago'],
  ADRO: ['adro', 'adaro', 'alamtri'],
  PTBA: ['ptba', 'bukit asam'],
  ITMG: ['itmg', 'indo tambangraya'],
  BUMI: ['bumi', 'bumi resources'],
  BRMS: ['brms', 'bumi resources minerals'],
  DEWA: ['dewa', 'darma henwa'],
  ANTM: ['antm', 'antam', 'aneka tambang'],
  INCO: ['inco', 'vale indonesia', 'vale'],
  MDKA: ['mdka', 'merdeka copper'],
  MBMA: ['mbma', 'merdeka battery'],
  NCKL: ['nckl', 'harita nickel', 'trimegah bangun'],
  ISAT: ['isat', 'indosat'],
  EXCL: ['excl', 'xl axiata', 'xlsmart'],
  TLKM: ['tlkm', 'telkom indonesia', 'telkom'],
  TOWR: ['towr', 'sarana menara', 'protelindo'],
  ICBP: ['icbp', 'indofood cbp'],
  INDF: ['indf', 'indofood'],
  AMRT: ['amrt', 'alfamart', 'sumber alfaria'],
  CPIN: ['cpin', 'charoen pokphand'],
  JPFA: ['jpfa', 'japfa'],
  UNVR: ['unvr', 'unilever'],
  MAPI: ['mapi', 'mitra adiperkasa'],
  ERAA: ['eraa', 'erajaya'],
  ACES: ['aces', 'aspirasi hidup', 'azko', 'ace hardware'],
  KLBF: ['klbf', 'kalbe farma', 'kalbe'],
  SIDO: ['sido', 'sido muncul'],
  ASII: ['asii', 'astra international', 'astra'],
  GOTO: ['goto', 'gojek tokopedia'],
  BUKA: ['buka', 'bukalapak'],
  SCMA: ['scma', 'surya citra media'],
  BREN: ['bren', 'barito renewables'],
  PGEO: ['pgeo', 'pertamina geothermal'],
  ESSA: ['essa', 'surya esa'],
  BRPT: ['brpt', 'barito pacific'],
  TPIA: ['tpia', 'chandra asri'],
  INKP: ['inkp', 'indah kiat'],
  TKIM: ['tkim', 'tjiwi kimia'],
  SRTG: ['srtg', 'saratoga'],
  SMGR: ['smgr', 'semen indonesia'],
  INTP: ['intp', 'indocement'],
  CTRA: ['ctra', 'ciputra'],
  SMRA: ['smra', 'summarecon'],
  BSDE: ['bsde', 'bumi serpong damai'],
  PWON: ['pwon', 'pakuwon'],
  JSMR: ['jsmr', 'jasa marga'],
  TOTL: ['totl', 'total bangun persada'],
  CMNP: ['cmnp', 'citra marga'],
};

const POSITIVE_KEYWORDS = [
  'naik',
  'menguat',
  'melonjak',
  'untung',
  'laba',
  'cuan',
  'dividen',
  'buyback',
  'ekspansi',
  'kontrak baru',
  'proyek baru',
  'rekor',
  'positif',
  'upgrade',
  'target naik',
  'berpotensi cuan',
  'catat laba',
  'kinerja naik',
  'produksi naik',
  'ekspor naik',
];

// Semua lowercase, dicek menggunakan .includes() dan diprioritaskan sebelum keyword positif
const NEGATIVE_KEYWORDS = [
  // Keluar / pencoretan indeks & MSCI
  'hapus',
  'dihapus',
  'dikeluarkan',
  'keluar dari indeks',
  'keluar dari',
  'dicoret',
  'dikeluarkan dari indeks',
  'hapus dari msci',
  'keluar msci',
  'msci hapus',
  // Penurunan kelas / downgrade
  'turun kelas',
  'turun kasta',
  'downgrade',
  'diturunkan',
  // Pengurangan posisi / aksi jual institusi
  'kurangi posisi',
  'mengurangi posisi',
  'jual',
  'lepas saham',
  'divestasi',
  'exit',
  'kurangi kepemilikan',
  // ARB & sentimen negatif umum lainnya
  'sentuh arb',
  'auto reject bawah',
  'auto rejection bawah',
  'mentok bawah',
  'arb berjilid',
  'rugi',
  'turun',
  'anjlok',
  'melemah',
  'suspend',
  'gagal',
  'utang',
  'denda',
  'negatif',
  'kebakaran',
  'gugatan',
  'penurunan laba',
  'kinerja turun',
];

// Singkatan pendek dicocokkan per batas kata agar kata umum tidak salah tangkap
const NEGATIVE_WORD_REGEXES = [/\barb\b/i, /\buma\b/i, /\bphk\b/i];

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
  'msci',
  'kepemilikan',
];

export const MAX_NEWS_AGE_DAYS = 7;

export function getExternalSectorKey(ticker: string): ExternalSectorKey {
  const clean = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  if (BANK_TICKERS.has(clean)) return 'MACRO_BANK';
  if (BATUBARA_TICKERS.has(clean)) return 'MACRO_BATUBARA';
  if (TELCO_TICKERS.has(clean)) return 'MACRO_TELCO';
  if (CONSUMER_TICKERS.has(clean)) return 'MACRO_CONSUMER';
  return 'MACRO_LAIN';
}

export function getCompanyKeywords(ticker: string): string[] {
  const clean = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  return TICKER_COMPANY_KEYWORDS[clean] || [clean.toLowerCase()];
}

export function isFreshNews(publishedAt: string, maxDays = MAX_NEWS_AGE_DAYS): boolean {
  const ts = new Date(publishedAt).getTime();
  if (Number.isNaN(ts)) return false;
  const ageMs = Date.now() - ts;
  return ageMs <= maxDays * 24 * 60 * 60 * 1000 && ageMs >= -12 * 60 * 60 * 1000;
}

export function isWithin24Hours(publishedAt: string): boolean {
  const ts = new Date(publishedAt).getTime();
  if (Number.isNaN(ts)) return false;
  const ageMs = Date.now() - ts;
  return ageMs <= 24 * 60 * 60 * 1000 && ageMs >= -12 * 60 * 60 * 1000;
}

/**
 * Klasifikasi sentimen dari judul + snippet berita.
 * ATURAN PRIORITAS:
 * 1. Jika mengandung SATU SAJA keyword NEGATIF => WAJIB NEGATIF (meski ada kata positif).
 * 2. Jika tidak ada NEGATIF dan mengandung keyword POSITIF => POSITIF.
 * 3. Selain itu => NETRAL.
 */
export function classifyNewsSentiment(title: string, snippet = ''): NewsSentiment {
  const combined = `${title} ${snippet}`.toLowerCase();

  const hasNegative =
    NEGATIVE_KEYWORDS.some((kw) => combined.includes(kw)) ||
    NEGATIVE_WORD_REGEXES.some((rx) => rx.test(combined));

  if (hasNegative) return 'NEGATIF';

  const hasPositive = POSITIVE_KEYWORDS.some((kw) => combined.includes(kw));
  if (hasPositive) return 'POSITIF';

  return 'NETRAL';
}

export function isTickerRelevantNews(
  ticker: string,
  title: string,
  snippet = ''
): boolean {
  const clean = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  const combined = `${title} ${snippet}`.toLowerCase();

  if (combined.includes('profil perusahaan tercatat')) return false;

  const keywords = getCompanyKeywords(clean);
  return keywords.some((kw) => combined.includes(kw));
}

export function detectIsInternalNews(ticker: string, title: string): boolean {
  const clean = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  if (clean.startsWith('MACRO_')) return false;

  const lower = title.toLowerCase();
  if (getCompanyKeywords(clean).some((kw) => lower.includes(kw))) {
    return true;
  }
  return INTERNAL_HINTS.some((kw) => lower.includes(kw));
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

function resolveItemSentiment(item: StockNewsItem): NewsSentiment {
  const fromTitle = classifyNewsSentiment(item.title);
  if (fromTitle === 'NEGATIF') return 'NEGATIF';
  if (item.sentiment === 'NEGATIF') return 'NEGATIF';
  if (fromTitle === 'POSITIF') return 'POSITIF';
  return item.sentiment || 'NETRAL';
}

/**
 * Susun daftar berita, Isu Internal, & Isu Eksternal dengan aturan sentimen yang sama.
 */
export function buildTickerNewsBundle(
  ticker: string,
  tickerItems: StockNewsItem[],
  sectorMacroItems: StockNewsItem[]
): TickerNewsBundle {
  const freshSorted = tickerItems
    .filter((item) => isFreshNews(item.published_at, MAX_NEWS_AGE_DAYS))
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    )
    .slice(0, 3)
    .map((item) => ({
      ...item,
      sentiment: resolveItemSentiment(item),
    }));

  const recent24h = freshSorted.filter((item) =>
    isWithin24Hours(item.published_at)
  );
  const hasNegative24h = recent24h.some((item) => item.sentiment === 'NEGATIF');
  const hasPositive24h = recent24h.some((item) => item.sentiment === 'POSITIF');

  const internalItem =
    freshSorted.find((i) => i.is_internal) || freshSorted[0] || null;
  const internalSummary = internalItem
    ? `${truncateText(internalItem.title, 70)} (${sentimentLabelIndo(
        internalItem.sentiment
      )})`
    : null;

  const sectorKey = getExternalSectorKey(ticker);
  const sectorCfg = SECTOR_CONFIGS[sectorKey];

  const freshSectorMacros = sectorMacroItems
    .filter((m) => isFreshNews(m.published_at, MAX_NEWS_AGE_DAYS))
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    )
    .map((m) => ({
      ...m,
      sentiment: resolveItemSentiment(m),
    }));

  const matchedMacro =
    freshSectorMacros.find((m) => {
      const lower = m.title.toLowerCase();
      return sectorCfg.matchKeywords.some((kw) => lower.includes(kw));
    }) || null;

  const externalSummary = matchedMacro
    ? `${truncateText(matchedMacro.title, 58)} - ${sentimentLabelIndo(
        matchedMacro.sentiment
      )} untuk ${sectorCfg.label}`
    : sectorCfg.fallbackText;

  return {
    items: freshSorted,
    internalSummary,
    externalSummary,
    hasNegative24h,
    hasPositive24h,
  };
}
