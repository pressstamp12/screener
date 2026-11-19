-- ============================================================
-- MODE D SCREENER - SUPABASE DATABASE SCHEMA
-- Jalankan seluruh SQL ini di Supabase -> SQL Editor -> Run
-- ============================================================

-- 1. Tabel hasil screening harian
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

CREATE INDEX IF NOT EXISTS idx_screening_results_date
  ON public.screening_results (date DESC, score DESC);

-- 2. Tabel watchlist pribadi
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

-- 3. Tabel jurnal / riwayat trade
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

CREATE INDEX IF NOT EXISTS idx_trades_date
  ON public.trades (trade_date DESC, id DESC);

-- ============================================================
-- RLS OFF (Khusus MVP Aplikasi Pribadi)
-- ============================================================
ALTER TABLE public.screening_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades DISABLE ROW LEVEL SECURITY;
