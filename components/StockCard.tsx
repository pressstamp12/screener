'use client';

import { BookmarkPlus, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { ScreenedStock } from '@/lib/types';
import { formatPercent, formatPrice, formatRupiah } from '@/lib/format';

interface StockCardProps {
  stock: ScreenedStock;
  isSaved: boolean;
  isSaving: boolean;
  onSaveWatchlist: (stock: ScreenedStock) => void;
}

export default function StockCard({
  stock,
  isSaved,
  isSaving,
  onSaveWatchlist,
}: StockCardProps) {
  const labelStyle =
    stock.label === 'POTENSI REBOUND'
      ? 'bg-[#00C853]/15 text-[#00C853] border-[#00C853]/40'
      : stock.label === 'TUNGGU'
      ? 'bg-[#FFB300]/15 text-[#FFB300] border-[#FFB300]/40'
      : 'bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/40';

  const scoreBarColor =
    stock.score >= 70
      ? 'bg-[#00C853]'
      : stock.score >= 40
      ? 'bg-[#FFB300]'
      : 'bg-[#FF3B30]';

  const isUp = stock.changePercent >= 0;

  return (
    <article className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-3.5 shadow-md">
      {/* Baris Atas: Ticker, Badge Syariah, Label Rebound */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-2xl font-extrabold tracking-tight text-white">
              {stock.ticker}
            </h3>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                stock.isSyariah
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-zinc-700/40 text-zinc-300 border-zinc-600/50'
              }`}
            >
              {stock.isSyariah ? 'SYARIAH' : 'NON-SYARIAH'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 truncate max-w-[190px] mt-0.5">
            {stock.name}
          </p>
        </div>

        <span
          className={`text-xs font-extrabold px-2.5 py-1.5 rounded-xl border shrink-0 ${labelStyle}`}
        >
          {stock.label}
        </span>
      </div>

      {/* Harga & Naik/Turun + Skor Rebound */}
      <div className="flex items-end justify-between bg-[#121212] rounded-xl p-3 border border-[#242424]">
        <div>
          <span className="text-[11px] text-zinc-400 block">Harga Terakhir</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">
              {formatPrice(stock.price)}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-sm font-bold ${
                isUp ? 'text-[#00C853]' : 'text-[#FF3B30]'
              }`}
            >
              {isUp ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {formatPercent(stock.changePercent)}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-zinc-400 block">Skor Rebound</span>
          <span
            className={`text-2xl font-black ${
              stock.score >= 70
                ? 'text-[#00C853]'
                : stock.score >= 40
                ? 'text-[#FFB300]'
                : 'text-[#FF3B30]'
            }`}
          >
            {stock.score}
            <span className="text-xs font-normal text-zinc-500">/100</span>
          </span>
        </div>
      </div>

      {/* Progress bar skor */}
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${scoreBarColor}`}
          style={{ width: `${Math.min(100, Math.max(4, stock.score))}%` }}
        />
      </div>

      {/* Grid Support, Resistance, Jarak %, RSI */}
      <div className="grid grid-cols-2 gap-2.5 text-sm">
        <div className="bg-[#141414] rounded-xl p-2.5 border border-[#252525]">
          <span className="text-[11px] text-zinc-400 block">
            Support (uji {stock.supportTests}x)
          </span>
          <span className="font-bold text-white text-base">
            {formatPrice(stock.support)}
          </span>
          <span
            className={`block text-xs font-semibold mt-0.5 ${
              stock.checks.supportOk ? 'text-[#00C853]' : 'text-zinc-400'
            }`}
          >
            Jarak: {formatPercent(stock.distToSupport)}
          </span>
        </div>

        <div className="bg-[#141414] rounded-xl p-2.5 border border-[#252525]">
          <span className="text-[11px] text-zinc-400 block">
            Resistance (High 20H)
          </span>
          <span className="font-bold text-white text-base">
            {formatPrice(stock.resistance)}
          </span>
          <span className="block text-xs font-semibold text-sky-400 mt-0.5">
            Upside: +{Math.max(0, stock.distToResistance).toFixed(1)}%
          </span>
        </div>

        <div className="bg-[#141414] rounded-xl p-2.5 border border-[#252525]">
          <span className="text-[11px] text-zinc-400 block">RSI (14)</span>
          <span
            className={`font-bold text-base ${
              stock.checks.rsiOk ? 'text-[#00C853]' : 'text-white'
            }`}
          >
            {stock.rsi}
          </span>
          <span className="block text-[11px] text-zinc-400">
            Target Mode D: 28 - 48
          </span>
        </div>

        <div className="bg-[#141414] rounded-xl p-2.5 border border-[#252525]">
          <span className="text-[11px] text-zinc-400 block">
            Vol & Drop 20H
          </span>
          <span
            className={`font-bold text-base ${
              stock.checks.volumeOk ? 'text-[#00C853]' : 'text-white'
            }`}
          >
            {stock.volumeRatio}x Vol
          </span>
          <span
            className={`block text-[11px] ${
              stock.checks.dropOk ? 'text-[#00C853]' : 'text-zinc-400'
            }`}
          >
            Dari High: {stock.dropFromHigh20}%
          </span>
        </div>
      </div>

      {/* Indikator Checklist Mode D */}
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span
          className={`px-2 py-1 rounded-lg font-medium ${
            stock.checks.dropOk
              ? 'bg-[#00C853]/15 text-[#00C853]'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {stock.checks.dropOk ? '✓' : '✕'} Drop ≥8%
        </span>
        <span
          className={`px-2 py-1 rounded-lg font-medium ${
            stock.checks.supportOk
              ? 'bg-[#00C853]/15 text-[#00C853]'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {stock.checks.supportOk ? '✓' : '✕'} Dekat Support ≤4%
        </span>
        <span
          className={`px-2 py-1 rounded-lg font-medium ${
            stock.checks.rsiOk
              ? 'bg-[#00C853]/15 text-[#00C853]'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {stock.checks.rsiOk ? '✓' : '✕'} RSI 28-48
        </span>
        <span
          className={`px-2 py-1 rounded-lg font-medium ${
            stock.checks.volumeOk
              ? 'bg-[#00C853]/15 text-[#00C853]'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {stock.checks.volumeOk ? '✓' : '✕'} Vol &gt;1.2x
        </span>
        <span
          className={`px-2 py-1 rounded-lg font-medium ${
            stock.checks.greenCandle
              ? 'bg-[#00C853]/15 text-[#00C853]'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {stock.checks.greenCandle ? '✓' : '✕'} Candle Hijau
        </span>
      </div>

      {/* Estimasi Lot dari Modal User */}
      <div className="flex items-center justify-between bg-[#121212] border border-[#252525] rounded-xl px-3.5 py-2.5">
        <div>
          <span className="text-[11px] text-zinc-400 block">
            Bisa Beli (Modal Kamu)
          </span>
          <span className="text-base font-extrabold text-white">
            {stock.lotAffordable > 0
              ? `${stock.lotAffordable} Lot`
              : 'Modal belum cukup 1 lot'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-zinc-400 block">Estimasi Dana</span>
          <span className="text-sm font-bold text-zinc-200">
            {stock.lotAffordable > 0
              ? formatRupiah(stock.estimatedCost)
              : `Min ${formatRupiah(stock.price * 100)}`}
          </span>
        </div>
      </div>

      {/* Tombol Simpan ke Watchlist */}
      <button
        type="button"
        disabled={isSaving || isSaved}
        onClick={() => onSaveWatchlist(stock)}
        className={`w-full min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
          isSaved
            ? 'bg-zinc-800 text-[#00C853] border border-[#00C853]/40 cursor-default'
            : 'bg-[#252525] hover:bg-[#2F2F2F] text-white border border-[#3A3A3A]'
        }`}
      >
        {isSaved ? (
          <>
            <Check className="w-4 h-4" />
            SUDAH DI WATCHLIST
          </>
        ) : isSaving ? (
          'Menyimpan...'
        ) : (
          <>
            <BookmarkPlus className="w-4 h-4 text-[#00C853]" />
            SIMPAN KE WATCHLIST
          </>
        )}
      </button>
    </article>
  );
}
