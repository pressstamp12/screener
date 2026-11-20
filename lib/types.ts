export interface Candle {
  t?: number; // epoch ms (opsional untuk data lama)
  date: string; // YYYY-MM-DD (WIB)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockSeries {
  ticker: string;
  name: string;
  price: number;
  prevClose: number;
  regularMarketTime?: number;
  daily: Candle[];
  intraday?: Candle[]; // 5 menit, beberapa hari terakhir
}

export type NewsSentiment = 'POSITIF' | 'NEGATIF' | 'NETRAL';

export interface StockNewsItem {
  id?: number;
  ticker: string;
  title: string;
  source: string;
  published_at: string;
  sentiment: NewsSentiment;
  is_internal: boolean;
  url: string;
  created_at?: string;
}

export interface TickerNewsBundle {
  items: StockNewsItem[];
  internalSummary: string | null;
  externalSummary: string | null;
  hasNegative24h: boolean;
  hasPositive24h: boolean;
}

export type PriceFilterKey =
  | 'default_100_3500'
  | 'all'
  | '100_500'
  | '500_1000'
  | '1000_2000'
  | '2000_3500'
  | 'custom';

export type SyariahFilter = 'all' | 'syariah' | 'non_syariah';

export interface WatchlistItem {
  id: number;
  ticker: string;
  strategy: string | null;
  entry_plan: number;
  tp: number;
  sl: number;
  lot: number;
  modal: number;
  score: number | null;
  note: string | null;
  created_at: string;
}

export interface TradeItem {
  id: number;
  ticker: string;
  strategy: string | null;
  entry_price: number;
  exit_price: number;
  sl: number | null;
  tp: number | null;
  lot: number;
  fees: number | null;
  profit_loss: number;
  r_multiple: number | null;
  score_at_entry: number | null;
  note: string;
  trade_date: string;
}
