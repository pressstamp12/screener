'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  Radar,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { DEFAULT_WATCHLIST, isSyariahTicker } from '@/data/syariah-list';
import { analyzeStockModeD } from '@/lib/modeD';
import { formatDateIndo, formatRupiah, getTodayISO } from '@/lib/format';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  PriceFilterKey,
  ResultQuickFilter,
  ScreenedStock,
  StockRawData,
  SyariahFilter,
  TickerNewsBundle,
} from '@/lib/types';
import StockCard from '@/components/StockCard';

const PAGE_SIZE = 10;
const SCAN_BATCH_SIZE = 10;

const PRICE_OPTIONS: {
  key: PriceFilterKey;
  label: string;
  min: number;
  max: number;
}[] = [
  { key: 'default_100_3500', label: '100 - 3.500', min: 100, max: 3500 },
  { key: 'all', label: 'Semua', min: 0, max: Infinity },
  { key: '100_500', label: '100 - 500', min: 100, max: 500 },
  { key: '500_1000', label: '500 - 1.000', min: 500, max: 1000 },
  { key: '1000_2000', label: '1.000 - 2.000', min: 1000, max: 2000 },
  { key: '2000_3500', label: '2.000 - 3.500', min: 2000, max: 3500 },
  { key: 'custom', label: 'Custom Min - Max', min: 100, max: 3500 },
];

const SYARIAH_OPTIONS: { key: SyariahFilter; label: string }[] = [
  { key: 'all', label: 'Semua Saham' },
  { key: 'syariah', label: 'Hanya Saham Syariah' },
  { key: 'non_syariah', label: 'Hanya Non-Syariah' },
];

const RESULT_FILTER_OPTIONS: { key: ResultQuickFilter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'lq45', label: 'LQ45 Saja' },
  { key: 'syariah', label: 'Syariah Saja' },
  { key: 'score_gt_60', label: 'Skor > 60 Saja' },
];

export default function ScreeningPage() {
  // State filter harian
  const [priceFilter, setPriceFilter] =
    useState<PriceFilterKey>('default_100_3500');
  const [customMin, setCustomMin] = useState<string>('100');
  const [customMax, setCustomMax] = useState<string>('3500');
  const [syariahFilter, setSyariahFilter] = useState<SyariahFilter>('all');
  const [modalInput, setModalInput] = useState<string>('500000');

  // Filter cepat di atas hasil + pagination
  const [resultFilter, setResultFilter] = useState<ResultQuickFilter>('all');
  const [onlyStrictModeD, setOnlyStrictModeD] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // State data & scan
  const [rawStocks, setRawStocks] = useState<StockRawData[]>([]);
  const [lastScanDate, setLastScanDate] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<{
    done: number;
    total: number;
  }>({ done: 0, total: DEFAULT_WATCHLIST.length });
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [infoMsg, setInfoMsg] = useState<string>('');

  // State berita per ticker
  const [newsMap, setNewsMap] = useState<Record<string, TickerNewsBundle>>({});
  const [loadingNewsTickers, setLoadingNewsTickers] = useState<Set<string>>(
    new Set()
  );
  const fetchedNewsTickersRef = useRef<Set<string>>(new Set());

  // State watchlist
  const [savedTickers, setSavedTickers] = useState<Set<string>>(new Set());
  const [savingTicker, setSavingTicker] = useState<string | null>(null);

  const modalNumber = useMemo(() => {
    const parsed = Number(modalInput.replace(/[^0-9]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 500000;
  }, [modalInput]);

  // Muat cache terakhir dari localStorage & daftar watchlist dari Supabase
  useEffect(() => {
    try {
      const cachedRaw = localStorage.getItem('modeD_last_raw_stocks');
      const cachedDate = localStorage.getItem('modeD_last_scan_date');
      const cachedModal = localStorage.getItem('modeD_user_modal');
      if (cachedRaw) setRawStocks(JSON.parse(cachedRaw));
      if (cachedDate) setLastScanDate(cachedDate);
      if (cachedModal) setModalInput(cachedModal);
    } catch {
      // abaikan error parse cache
    }

    if (isSupabaseConfigured) {
      supabase
        .from('watchlist')
        .select('ticker')
        .then(({ data }) => {
          if (data) {
            setSavedTickers(new Set(data.map((row) => row.ticker)));
          }
        });
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('modeD_user_modal', String(modalNumber));
    } catch {
      // abaikan
    }
  }, [modalNumber]);

  // Reset pagination ke 10 saat filter diubah
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [
    priceFilter,
    customMin,
    customMax,
    syariahFilter,
    resultFilter,
    onlyStrictModeD,
  ]);

  const getPriceBounds = (): { min: number; max: number } => {
    if (priceFilter === 'custom') {
      const min = Number(customMin) || 0;
      const max = Number(customMax) || Infinity;
      return { min, max };
    }
    const found = PRICE_OPTIONS.find((o) => o.key === priceFilter);
    return found
      ? { min: found.min, max: found.max }
      : { min: 100, max: 3500 };
  };

  // Hitung analisa Mode D + penyesuaian skor berita secara real-time
  const screenedList: ScreenedStock[] = useMemo(() => {
    const { min, max } = getPriceBounds();

    return rawStocks
      .map((raw) => analyzeStockModeD(raw, modalNumber, newsMap[raw.ticker]))
      .filter((s) => {
        if (s.price < min || s.price > max) return false;
        if (syariahFilter === 'syariah' && !s.isSyariah) return false;
        if (syariahFilter === 'non_syariah' && s.isSyariah) return false;
        if (resultFilter === 'lq45' && !s.isLq45) return false;
        if (resultFilter === 'syariah' && !s.isSyariah) return false;
        if (resultFilter === 'score_gt_60' && s.score <= 60) return false;
        if (onlyStrictModeD && !s.checks.allModeD) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score);
  }, [
    rawStocks,
    modalNumber,
    newsMap,
    priceFilter,
    customMin,
    customMax,
    syariahFilter,
    resultFilter,
    onlyStrictModeD,
  ]);

  const visibleStocks = useMemo(
    () => screenedList.slice(0, visibleCount),
    [screenedList, visibleCount]
  );

  // Ambil berita & sentimen otomatis untuk saham yang sedang ditampilkan di layar (per halaman 10 saham)
  useEffect(() => {
    if (visibleStocks.length === 0) return;

    const missingTickers = visibleStocks
      .map((s) => s.ticker)
      .filter((t) => !fetchedNewsTickersRef.current.has(t));

    if (missingTickers.length === 0) return;

    let cancelled = false;
    missingTickers.forEach((t) => fetchedNewsTickersRef.current.add(t));

    setLoadingNewsTickers((prev) => {
      const next = new Set(prev);
      missingTickers.forEach((t) => next.add(t));
      return next;
    });

    const loadVisibleNews = async () => {
      try {
        // Pecah per 5 ticker agar fetch berita cepat & aman dari timeout
        const NEWS_BATCH = 5;
        for (let i = 0; i < missingTickers.length; i += NEWS_BATCH) {
          if (cancelled) return;
          const chunk = missingTickers.slice(i, i + NEWS_BATCH);
          const res = await fetch(
            `/api/news?tickers=${chunk.join(',')}&includeMacro=true`,
            { cache: 'no-store' }
          );

          if (!res.ok) continue;
          const data = await res.json();
          if (!cancelled && data?.news) {
            setNewsMap((prev) => ({ ...prev, ...data.news }));
          }
        }
      } catch {
        // Jika offline / gagal fetch berita, biarkan card tetap tampil normal
      } finally {
        if (!cancelled) {
          setLoadingNewsTickers((prev) => {
            const next = new Set(prev);
            missingTickers.forEach((t) => next.delete(t));
            return next;
          });
        }
      }
    };

    loadVisibleNews();

    return () => {
      cancelled = true;
    };
  }, [visibleStocks]);

  const handleScanToday = async () => {
    setIsScanning(true);
    setErrorMsg('');
    setInfoMsg('');
    setVisibleCount(PAGE_SIZE);
    setScanProgress({ done: 0, total: DEFAULT_WATCHLIST.length });

    // Reset cache berita di sesi agar ikut refresh
    fetchedNewsTickersRef.current.clear();
    setNewsMap({});

    try {
      const collected: StockRawData[] = [];
      let lastFetchedIso = new Date().toISOString();

      // Scan batch 10 saham per request agar tidak timeout di Vercel
      for (let i = 0; i < DEFAULT_WATCHLIST.length; i += SCAN_BATCH_SIZE) {
        const batch = DEFAULT_WATCHLIST.slice(i, i + SCAN_BATCH_SIZE);
        const res = await fetch(`/api/stocks?tickers=${batch.join(',')}`, {
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          const batchStocks: StockRawData[] = data.stocks || [];
          collected.push(...batchStocks);
          if (data.fetchedAt) lastFetchedIso = data.fetchedAt;
        }

        const doneCount = Math.min(
          i + batch.length,
          DEFAULT_WATCHLIST.length
        );
        setScanProgress({ done: doneCount, total: DEFAULT_WATCHLIST.length });

        // Update layar progresif tiap batch selesai
        if (collected.length > 0) {
          setRawStocks([...collected]);
        }
      }

      if (collected.length === 0) {
        throw new Error(
          'Yahoo Finance lagi sibuk atau data kosong. Coba scan ulang.'
        );
      }

      setRawStocks(collected);
      setLastScanDate(lastFetchedIso);

      // Simpan cache lokal untuk mode offline
      try {
        localStorage.setItem(
          'modeD_last_raw_stocks',
          JSON.stringify(collected)
        );
        localStorage.setItem('modeD_last_scan_date', lastFetchedIso);
      } catch {
        // abaikan jika storage penuh
      }

      // Simpan hasil screening ke Supabase
      if (isSupabaseConfigured) {
        const today = getTodayISO();
        const { min, max } = getPriceBounds();

        const analyzedForDb = collected
          .map((raw) => analyzeStockModeD(raw, modalNumber))
          .filter((s) => {
            if (s.price < min || s.price > max) return false;
            if (syariahFilter === 'syariah' && !s.isSyariah) return false;
            if (syariahFilter === 'non_syariah' && s.isSyariah) return false;
            return true;
          });

        if (analyzedForDb.length > 0) {
          const rows = analyzedForDb.map((s) => ({
            date: today,
            ticker: s.ticker,
            price: s.price,
            support: s.support,
            resistance: s.resistance,
            rsi: s.rsi,
            volume_ratio: s.volumeRatio,
            score: s.score,
            label: s.label,
            is_syariah: isSyariahTicker(s.ticker),
          }));

          const { error: dbErr } = await supabase
            .from('screening_results')
            .insert(rows);

          if (dbErr) {
            console.warn('Gagal simpan ke Supabase:', dbErr.message);
            setInfoMsg(
              `Berhasil scan ${collected.length} dari ${DEFAULT_WATCHLIST.length} saham (belum tersimpan ke Supabase)`
            );
          } else {
            setInfoMsg(
              `Berhasil scan ${collected.length} dari ${DEFAULT_WATCHLIST.length} saham & simpan ke Supabase!`
            );
          }
        } else {
          setInfoMsg(
            `Berhasil scan ${collected.length} dari ${DEFAULT_WATCHLIST.length} saham. Coba longgarkan filter harga/syariah kalau daftar kosong.`
          );
        }
      } else {
        setInfoMsg(
          `Berhasil scan ${collected.length} dari ${DEFAULT_WATCHLIST.length} saham! Isi ENV Supabase biar hasil ikut tersimpan di database.`
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat scan.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveWatchlist = async (stock: ScreenedStock) => {
    if (!isSupabaseConfigured) {
      setErrorMsg(
        'Isi NEXT_PUBLIC_SUPABASE_URL & ANON_KEY dulu biar bisa simpan ke Watchlist.'
      );
      return;
    }

    setSavingTicker(stock.ticker);
    setErrorMsg('');

    try {
      const lot = Math.max(1, stock.lotAffordable);
      const entryPlan = stock.price;
      const tp = Math.max(stock.resistance, Math.round(entryPlan * 1.06));
      const sl = Math.max(50, Math.round(stock.support * 0.98));
      const modal = entryPlan * lot * 100;

      const { error } = await supabase.from('watchlist').upsert(
        {
          ticker: stock.ticker,
          entry_plan: entryPlan,
          tp,
          sl,
          lot,
          modal,
        },
        { onConflict: 'ticker' }
      );

      if (error) throw error;

      setSavedTickers((prev) => new Set(prev).add(stock.ticker));
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? `Gagal simpan ${stock.ticker}: ${err.message}`
          : 'Gagal simpan ke Watchlist.'
      );
    } finally {
      setSavingTicker(null);
    }
  };

  const reboundCount = screenedList.filter(
    (s) => s.label === 'POTENSI REBOUND'
  ).length;
  const strictCount = screenedList.filter((s) => s.checks.allModeD).length;
  const remainingCount = Math.max(0, screenedList.length - visibleCount);

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C853] animate-pulse" />
            <h1 className="text-2xl font-black tracking-tight text-white">
              Mode D Screener
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {rawStocks.length > 0
              ? `Berhasil scan ${rawStocks.length} dari ${DEFAULT_WATCHLIST.length} saham`
              : `Pantau ${DEFAULT_WATCHLIST.length} saham rebound IDX buat modal santai`}
          </p>
        </div>
        {lastScanDate && (
          <span className="text-[11px] bg-[#1A1A1A] border border-[#2A2A2A] px-2.5 py-1 rounded-lg text-zinc-300 shrink-0">
            Update: {formatDateIndo(lastScanDate)}
          </span>
        )}
      </header>

      {/* Panel Filter */}
      <section className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
          <SlidersHorizontal className="w-4 h-4 text-[#00C853]" />
          <span>Filter Harian</span>
        </div>

        {/* a. Range Harga */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 block">
            Range Harga Saham (Rp)
          </label>
          <div className="flex flex-wrap gap-2">
            {PRICE_OPTIONS.map((opt) => {
              const active = priceFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPriceFilter(opt.key)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    active
                      ? 'bg-[#00C853] text-black'
                      : 'bg-[#121212] text-zinc-300 border border-[#2A2A2A]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {priceFilter === 'custom' && (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <span className="text-[11px] text-zinc-400">Min (Rp)</span>
                <input
                  type="number"
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  placeholder="100"
                  className="w-full mt-1 bg-[#121212] border border-[#333] rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#00C853]"
                />
              </div>
              <div>
                <span className="text-[11px] text-zinc-400">Max (Rp)</span>
                <input
                  type="number"
                  value={customMax}
                  onChange={(e) => setCustomMax(e.target.value)}
                  placeholder="3500"
                  className="w-full mt-1 bg-[#121212] border border-[#333] rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#00C853]"
                />
              </div>
            </div>
          )}
        </div>

        {/* b. Filter Syariah */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 block">
            Syariah / Non-Syariah (ISSI &amp; JII)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SYARIAH_OPTIONS.map((opt) => {
              const active = syariahFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSyariahFilter(opt.key)}
                  className={`px-2 py-2.5 rounded-xl text-xs font-bold text-center transition-all active:scale-95 ${
                    active
                      ? 'bg-[#00C853] text-black'
                      : 'bg-[#121212] text-zinc-300 border border-[#2A2A2A]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* c. Modal Saya */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="modal-saya"
              className="text-xs font-semibold text-zinc-400"
            >
              Modal Saya (buat hitung lot)
            </label>
            <span className="text-xs font-bold text-[#00C853]">
              {formatRupiah(modalNumber)}
            </span>
          </div>
          <input
            id="modal-saya"
            type="number"
            inputMode="numeric"
            value={modalInput}
            onChange={(e) => setModalInput(e.target.value)}
            placeholder="500000"
            className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-base font-extrabold text-white focus:outline-none focus:border-[#00C853]"
          />
        </div>

        {/* Tombol Besar SCAN HARI INI */}
        <button
          type="button"
          disabled={isScanning}
          onClick={handleScanToday}
          className="w-full min-h-[56px] bg-[#00C853] hover:bg-[#00e05d] disabled:opacity-60 text-black font-black text-base rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-[#00C853]/20 transition-all active:scale-[0.98]"
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Sedang scan {scanProgress.done} dari {scanProgress.total} saham...
            </>
          ) : (
            <>
              <Radar className="w-5 h-5 stroke-[2.5]" />
              SCAN HARI INI ({DEFAULT_WATCHLIST.length} SAHAM)
            </>
          )}
        </button>
      </section>

      {/* Notifikasi Info / Error */}
      {errorMsg && (
        <div className="bg-[#FF3B30]/15 border border-[#FF3B30]/40 text-[#FF6B63] rounded-2xl p-3.5 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {infoMsg && !errorMsg && (
        <div className="bg-[#00C853]/10 border border-[#00C853]/30 text-[#00C853] rounded-2xl p-3.5 text-xs font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{infoMsg}</span>
        </div>
      )}

      {/* Filter Cepat di Atas Hasil + Ringkasan */}
      {rawStocks.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-2">
            {RESULT_FILTER_OPTIONS.map((opt) => {
              const active = resultFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setResultFilter(opt.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    active
                      ? 'bg-[#00C853] text-black'
                      : 'bg-[#1A1A1A] text-zinc-300 border border-[#2A2A2A]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-zinc-400">
              Ketemu <strong className="text-white">{screenedList.length}</strong>{' '}
              saham
              {reboundCount > 0 && (
                <>
                  {' · '}
                  <strong className="text-[#00C853]">
                    {reboundCount} Potensi Rebound
                  </strong>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOnlyStrictModeD((v) => !v)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                onlyStrictModeD
                  ? 'bg-[#00C853]/20 text-[#00C853] border-[#00C853]/50'
                  : 'bg-[#1A1A1A] text-zinc-300 border-[#2A2A2A]'
              }`}
            >
              {onlyStrictModeD
                ? `Mode D Penuh (${strictCount})`
                : 'Filter 5 Syarat Penuh'}
            </button>
          </div>
        </div>
      )}

      {/* Daftar Card Hasil Screening (10 per halaman) */}
      {visibleStocks.length > 0 ? (
        <section className="space-y-4">
          {visibleStocks.map((stock) => (
            <StockCard
              key={stock.ticker}
              stock={stock}
              news={newsMap[stock.ticker]}
              isLoadingNews={loadingNewsTickers.has(stock.ticker)}
              isSaved={savedTickers.has(stock.ticker)}
              isSaving={savingTicker === stock.ticker}
              onSaveWatchlist={handleSaveWatchlist}
            />
          ))}

          {/* Tombol Pagination MUAT LEBIH BANYAK */}
          {remainingCount > 0 && (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              className="w-full min-h-[50px] bg-[#1A1A1A] hover:bg-[#242424] border border-[#333] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <ChevronDown className="w-4 h-4 text-[#00C853]" />
              MUAT LEBIH BANYAK ({remainingCount} saham lagi)
            </button>
          )}
        </section>
      ) : (
        <section className="bg-[#1A1A1A] border border-dashed border-[#333] rounded-2xl p-8 text-center space-y-2">
          <Radar className="w-10 h-10 text-zinc-600 mx-auto" />
          <p className="font-bold text-zinc-200">
            {rawStocks.length === 0
              ? 'Belum ada hasil scan hari ini'
              : 'Tidak ada saham yang cocok dengan filter aktif'}
          </p>
          <p className="text-xs text-zinc-400">
            {rawStocks.length === 0
              ? 'Atur filter di atas lalu tekan tombol hijau SCAN HARI INI.'
              : 'Coba pilih "Semua" atau ubah range harga / syariah.'}
          </p>
        </section>
      )}
    </div>
  );
}
