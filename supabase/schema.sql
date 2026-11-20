-- ============================================================
-- SCREENER v2 — SKEMA SUPABASE
-- Aman dijalankan ulang, dan aman untuk database v1 yang sudah ada
-- (data lama dipertahankan). Supabase → SQL Editor → paste → Run.
-- ============================================================

-- 1. Hasil screening harian -----------------------------------
CREATE TABLE IF NOT EXISTS public.screening_results (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  ticker TEXT NOT NULL,
  price NUMERIC NOT NULL,
  support NUMERIC NOT NULL,
  resistance NUMERIC NOT NULL,
  rsi NUMERIC NOT NULL,
  volume_ratio NUMERIC NOT NULL,
  score INTEGER NOT NULL,
  label TEXT NOT NULL,
  is_syariah BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.screening_results ADD COLUMN IF NOT EXISTS strategy TEXT NOT NULL DEFAULT 'REBOUND';
ALTER TABLE public.screening_results ADD COLUMN IF NOT EXISTS entry NUMERIC;
ALTER TABLE public.screening_results ADD COLUMN IF NOT EXISTS sl NUMERIC;
ALTER TABLE public.screening_results ADD COLUMN IF NOT EXISTS tp1 NUMERIC;

-- Hapus duplikat dari v1 (simpan baris terbaru) sebelum membuat unique index
DELETE FROM public.screening_results a
USING public.screening_results b
WHERE a.date = b.date AND a.ticker = b.ticker AND a.strategy = b.strategy AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_screening_date_ticker_strategy
  ON public.screening_results (date, ticker, strategy);
CREATE INDEX IF NOT EXISTS idx_screening_results_date
  ON public.screening_results (date DESC, score DESC);

-- 2. Watchlist --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watchlist (
  id BIGSERIAL PRIMARY KEY,
  ticker TEXT NOT NULL UNIQUE,
  entry_plan NUMERIC NOT NULL DEFAULT 0,
  tp NUMERIC NOT NULL DEFAULT 0,
  sl NUMERIC NOT NULL DEFAULT 0,
  lot INTEGER NOT NULL DEFAULT 1,
  modal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.watchlist ADD COLUMN IF NOT EXISTS strategy TEXT;
ALTER TABLE public.watchlist ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE public.watchlist ADD COLUMN IF NOT EXISTS note TEXT;

-- 3. Jurnal trade -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.trades (
  id BIGSERIAL PRIMARY KEY,
  ticker TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC NOT NULL,
  lot INTEGER NOT NULL,
  profit_loss NUMERIC NOT NULL,
  note TEXT DEFAULT '',
  trade_date DATE NOT NULL DEFAULT CURRENT_DATE
);
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS strategy TEXT;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS sl NUMERIC;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS tp NUMERIC;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS fees NUMERIC;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS r_multiple NUMERIC;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS score_at_entry INTEGER;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_trades_date ON public.trades (trade_date DESC, id DESC);

-- 4. Cache berita (dipakai /api/news; tidak ada di v1) -------------
CREATE TABLE IF NOT EXISTS public.stock_news (
  id BIGSERIAL PRIMARY KEY,
  ticker TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  sentiment TEXT NOT NULL DEFAULT 'NETRAL',
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_news_ticker ON public.stock_news (ticker, created_at DESC);

-- 5. Pengaturan & kalibrasi backtest ------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- KEAMANAN: RLS AKTIF, TANPA POLICY.
-- Artinya anon key tidak bisa membaca/menulis apa pun. Aplikasi mengakses
-- data lewat server Next.js memakai SUPABASE_SERVICE_ROLE_KEY (bypass RLS).
-- ============================================================
ALTER TABLE public.screening_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- IZIN (GRANT). Project Supabase baru tidak otomatis memberi izin tabel
-- ke role API; tanpa ini muncul "permission denied for table ...".
-- ============================================================
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_results, public.watchlist, public.trades, public.stock_news, public.app_settings TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Key publik (anon/authenticated) tidak butuh akses sama sekali
REVOKE ALL ON public.screening_results, public.watchlist, public.trades, public.stock_news, public.app_settings FROM anon, authenticated;
