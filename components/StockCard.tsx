'use client';

import {
  AlertTriangle,
  BookmarkPlus,
  Building2,
  Check,
  ExternalLink,
  Globe,
  Newspaper,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { NewsSentiment, ScreenedStock, TickerNewsBundle } from '@/lib/types';
import {
  formatPercent,
  formatPrice,
  formatRelativeTimeIndo,
  formatRupiah,
} from '@/lib/format';

interface StockCardProps {
  stock: ScreenedStock;
  news?: TickerNewsBundle;
  isLoadingNews?: boolean;
  isSaved: boolean;
  isSaving: boolean;
  onSaveWatchlist: (stock: ScreenedStock) => void;
}

function getSentimentBadgeClass(sentiment: NewsSentiment): string {
  if (sentiment === 'POSITIF') {
    return 'bg-[#00C853]/15 text-[#00C853] border-[#00C853]/40';
  }
  if (sentiment === 'NEGATIF') {
    return 'bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/40';
  }
  return 'bg-zinc-700/40 text-zinc-300 border-zinc-600/50';
}

export default function StockCard({
  stock,
  news,
  isLoadingNews = false,
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
    stock.score >= 60
      ? 'bg-[#00C853]'
      : stock.score >= 40
      ? 'bg-[#FFB300]'
      : 'bg-[#FF3B30]';

  const isUp = stock.changePercent >= 0;
  const showSpreadWarning = stock.price < 500 && stock.lotAffordable > 10;

  const rsiDisplay = `${stock.isRsiApprox ? '~' : ''}${
    Number.isFinite(stock.rsi) ? stock.rsi.toFixed(1) : '50.0'
  }`;

  const newsItems = news?.items || [];

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
              stock.score >= 60
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

      {/* Grid Support, Resistance (High 5H), RSI (14), Volume & Drop */}
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
            Resistance (High 5H)
          </span>
          <span className="font-bold text-white text-base">
            {formatPrice(stock.resistance)}
          </span>
          <span className="block text-xs font-semibold text-sky-400 mt-0.5">
            Upside: +{Math.max(0, stock.distToResistance).toFixed(1)}%
          </span>
        </div>

        <div className="bg-[#141414] rounded-xl p-2.5 border border-[#252525] flex flex-col justify-between">
          <span
            className="font-bold text-base block"
            style={{ color: stock.checks.rsiOk ? '#00C853' : '#FFFFFF' }}
          >
            RSI (14) : {rsiDisplay}
          </span>
          <span className="block text-[11px] text-zinc-400 mt-1">
            Target Mode D: 28 - 48
          </span>
        </div>

        <div className="bg-[#141414] rounded-xl p-2.5 border border-[#252525]">
          <span className="text-[11px] text-zinc-400 block">
            Vol &amp; Drop 20H
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
          {stock.checks.dropOk ? '✓' : '✕'} Drop &gt;8%
        </span>
        <span
          className={`px-2 py-1 rounded-lg font-medium ${
            stock.checks.supportOk
              ? 'bg-[#00C853]/15 text-[#00C853]'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {stock.checks.supportOk ? '✓' : '✕'} Dekat Support &lt;4%
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

      {/* Section Baru: Berita & Isu Terbaru */}
      <div className="bg-[#121212] border border-[#252525] rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
            <Newspaper className="w-3.5 h-3.5 text-[#00C853]" />
            <span>Berita &amp; Isu Terbaru</span>
          </div>
          {stock.newsScoreDelta !== 0 && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                stock.newsScoreDelta > 0
                  ? 'bg-[#00C853]/15 text-[#00C853]'
                  : 'bg-[#FF3B30]/15 text-[#FF3B30]'
              }`}
            >
              Skor {stock.newsScoreDelta > 0 ? '+' : ''}
              {stock.newsScoreDelta}
            </span>
          )}
        </div>

        {/* Peringatan Negatif / Katalis Positif 24 jam */}
        {news?.hasNegative24h && (
          <div className="flex items-center gap-2 bg-[#FF3B30]/15 border border-[#FF3B30]/40 text-[#FF6B63] rounded-lg px-2.5 py-2 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Ada isu negatif, jangan entry dulu</span>
          </div>
        )}

        {news?.hasPositive24h && (
          <div className="flex items-center gap-2 bg-[#00C853]/15 border border-[#00C853]/40 text-[#00C853] rounded-lg px-2.5 py-2 text-xs font-bold">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Ada katalis positif</span>
          </div>
        )}

        {/* Daftar maks 3 berita terbaru */}
        {isLoadingNews && !news ? (
          <p className="text-xs text-zinc-500">Memuat berita terbaru...</p>
        ) : newsItems.length > 0 ? (
          <ul className="space-y-2">
            {newsItems.slice(0, 3).map((item, idx) => (
              <li
                key={`${item.url || item.title}-${idx}`}
                className="border-b border-[#222222] last:border-b-0 pb-2 last:pb-0"
              >
                <div className="flex items-start justify-between gap-2">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-zinc-100 hover:text-[#00C853] line-clamp-2 leading-snug flex-1"
                    >
                      {item.title}
                      <ExternalLink className="inline w-3 h-3 ml-1 text-zinc-500" />
                    </a>
                  ) : (
                    <p className="text-xs font-medium text-zinc-100 line-clamp-2 leading-snug flex-1">
                      {item.title}
                    </p>
                  )}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${getSentimentBadgeClass(
                      item.sentiment
                    )}`}
                  >
                    {item.sentiment}
                  </span>
                </div>
                <span className="block text-[10px] text-zinc-400 mt-1">
                  {item.source} - {formatRelativeTimeIndo(item.published_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-400">Tidak ada berita terbaru 24 jam</p>
        )}

        {/* 2 Kolom Ringkasan: Isu Internal & Isu Eksternal */}
        <div className="pt-2 border-t border-[#222222] space-y-1.5 text-[11px]">
          <div className="flex items-start gap-1.5 text-zinc-300">
            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
            <p className="line-clamp-1">
              <span className="text-zinc-400 font-semibold">Isu Internal: </span>
              {news?.internalSummary || 'Belum ada isu korporasi terbaru'}
            </p>
          </div>
          <div className="flex items-start gap-1.5 text-zinc-300">
            <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
            <p className="line-clamp-1">
              {news?.externalSummary ||
                'Eksternal: Pantau pergerakan IHSG & Rupiah hari ini'}
            </p>
          </div>
        </div>
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

      {/* Peringatan risiko spread untuk saham harga < 500 dengan lot > 10 */}
      {showSpreadWarning && (
        <div className="flex items-center gap-2 bg-[#FFB300]/15 border border-[#FFB300]/40 text-[#FFB300] rounded-xl px-3 py-2 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Lot besar, risiko spread tinggi</span>
        </div>
      )}

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
