import { getTickerMeta, StockSector } from '@/data/syariah-list';
import { NewsSentiment, StockNewsItem, TickerNewsBundle } from './types';

const POSITIVE_KEYWORDS = [
  'naik',
  'untung',
  'laba',
  'dividen',
  'buyback',
  'ekspansi',
  'proyek baru',
  'kontrak baru',
  'rekor',
  'positif',
  'upgrade',
  'target naik',
];

const NEGATIVE_KEYWORDS = [
  'rugi',
  'turun',
  'anjlok',
  'suspend',
  'gagal',
  'utang',
  'denda',
  'negatif',
  'downgrade',
  'kebakaran',
  'gugatan',
];

// Singkatan pendek dicocokkan per batas kata agar "utama"/"perumahan" tidak keliru jadi "UMA"
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

export function classifyNewsSentiment(title: string): NewsSentiment {
  const lower = title.toLowerCase();

  const isNegative =
    NEGATIVE_KEYWORDS.some((kw) => lower.includes(kw)) ||
    NEGATIVE_WORD_REGEXES.some((rx) => rx.test(lower));

  const isPositive = POSITIVE_KEYWORDS.some((kw) => lower.includes(kw));

  // Prioritaskan NEGATIF demi proteksi risiko trader jika judul ambigu
  if (isNegative && !isPositive) return 'NEGATIF';
  if (isPositive && !isNegative) return 'POSITIF';
  if (isNegative && isPositive) return 'NEGATIF';
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
 * Susun ringkasan berita internal, eksternal relevan, dan pengaruh skor untuk 1 ticker
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

  // Pengaruh ke skor: -15 jika ada berita negatif 24 jam, +10 jika ada positif 24 jam
  let scoreDelta = 0;
  if (hasNegative24h) scoreDelta -= 15;
  if (hasPositive24h) scoreDelta += 10;

  // Isu Internal: cari berita internal pertama
  const internalItem =
    sortedItems.find((i) => i.is_internal) || sortedItems[0] || null;
  const internalSummary = internalItem
    ? `${truncateText(internalItem.title, 72)} (${sentimentLabelIndo(
        internalItem.sentiment
      )})`
    : null;

  // Isu Eksternal: cocokkan berita makro paling relevan dengan sektor ticker
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
    ? `Eksternal: ${truncateText(matchedMacro.title, 58)} - ${sentimentLabelIndo(
        matchedMacro.sentiment
      )} untuk ${meta.sectorLabel}`
    : null;

  return {
    items: sortedItems,
    internalSummary,
    externalSummary,
    hasNegative24h,
    hasPositive24h,
    scoreDelta,
  };
}