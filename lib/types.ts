export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockRawData {
  ticker: string;
  name: string;
  currency: string;
  price: number;
  prevClose: number;
  candles: Candle[];
}

export type ReboundLabel = 'POTENSI REBOUND' | 'TUNGGU' | 'SKIP';

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
  scoreDelta: number;
}

export interface ScreenedStock {
  ticker: string;
  name: string;
  isSyariah: boolean;
  isLq45: boolean;
  price: number;
  prevClose: number;
  changePercent: number;
  support: number;
  supportTests: number;
  resistance: number;
  distToSupport: number;
  distToResistance: number;
  dropFromHigh20: number;
  rsi: number;
  isRsiApprox: boolean;
  volumeToday: number;
  avgVolume20: number;
  volumeRatio: number;
  isGreenCandle: boolean;
  baseScore: number;
  newsScoreDelta: number;
  score: number;
  label: ReboundLabel;
  lotAffordable: number;
  estimatedCost: number;
  checks: {
    dropOk: boolean;
    supportOk: boolean;
    rsiOk: boolean;
    volumeOk: boolean;
    greenCandle: boolean;
    allModeD: boolean;
  };
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

export type ResultQuickFilter = 'all' | 'lq45' | 'syariah' | 'score_gt_60';

export interface WatchlistItem {
  id: number;
  ticker: string;
  entry_plan: number;
  tp: number;
  sl: number;
  lot: number;
  modal: number;
  created_at: string;
}

export interface TradeItem {
  id: number;
  ticker: string;
  entry_price: number;
  exit_price: number;
  lot: number;
  profit_loss: number;
  note: string;
  trade_date: string;
}
