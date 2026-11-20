'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Loader2, RefreshCw, SlidersHorizontal, TrendingDown, TrendingUp } from 'lucide-react';
import ResultCard from '@/components/ResultCard';
import { isSyariahTicker } from '@/data/syariah-list';
import { AppSettings, api, cache, DEFAULT_APP_SETTINGS, fetchSeries, loadCalibration, loadSettings, syncCalibrationFromDb, syncSettingsFromDb } from '@/lib/client';
import { sessionInfo } from '@/lib/idx';
import { applyNews, lookupCalibration, marketRegime, ScreenResult, screenStock, Strategy } from '@/lib/scoring';
import type { StockSeries, SyariahFilter, TickerNewsBundle } from '@/lib/types';
import { formatRelativeTimeIndo } from '@/lib/format';

const PRICE_PRESETS = [
  { key: 'all', label: 'Semua', min: 0, max: Infinity },
  { key: 'lt500', label: '< 500', min: 0, max: 499 },
  { key: '500_2000', label: '500–2rb', min: 500, max: 2000 },
  { key: '2000_5000', label: '2rb–5rb', min: 2000, max: 5000 },
  { key: 'gt5000', label: '> 5rb', min: 5000, max: Infinity },
];

const LS_STRATEGY = 'sc2_strategy';
const LS_SNAPSHOT = 'sc2_snapshot';

interface Snapshot {
  at: string;
  strategy: Strategy;
  results: ScreenResult[];
}

export default function ScreenerPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [strategy, setStrategy] = useState<Strategy>('DAYTRADE');
  const [series, setSeries] = useState<StockSeries[]>([]);
  const [ihsg, setIhsg] = useState<StockSeries | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errors, setErrors] = useState<{ ticker: string; message: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastScan, setLastScan] = useState<string>('');
  const [now, setNow] = useState<Date>(new Date());
  const [pricePreset, setPricePreset] = useState('all');
  const [syariah, setSyariah] = useState<SyariahFilter>('all');
  const [onlyStrong, setOnlyStrong] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState(15);
  const [newsMap, setNewsMap] = useState<Record<string, TickerNewsBundle>>({});
  const [newsLoading, setNewsLoading] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [calVersion, setCalVersion] = useState(0);
  const newsRequested = useRef<Set<string>>(new Set());
  const scanningRef = useRef(false);

  useEffect(() => {
    setSettings(loadSettings());
    const st = cache.get<Strategy>(LS_STRATEGY);
    if (st) setStrategy(st);
    setSnapshot(cache.get<Snapshot>(LS_SNAPSHOT));
    syncSettingsFromDb().then((s) => s && setSettings(s));
    syncCalibrationFromDb().then(() => setCalVersion((v) => v + 1));
    api
      .get<{ ticker: string }>('watchlist')
      .then((rows) => setSaved(new Set(rows.map((r) => r.ticker))))
      .catch(() => {});
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => cache.set(LS_STRATEGY, strategy), [strategy]);

  const sess = useMemo(() => sessionInfo(now), [now]);
  const regime = useMemo(() => (ihsg ? marketRegime(ihsg.daily, ihsg.intraday, now) : null), [ihsg, now]);

  const cal = useMemo(() => {
    void calVersion;
    const live = series.some((s) => s.intraday?.length) && sess.phase !== 'TUTUP' && sess.phase !== 'LIBUR';
    return loadCalibration(strategy, strategy === 'DAYTRADE' && live ? 'INTRADAY' : 'EOD') || loadCalibration(strategy, 'EOD');
  }, [strategy, calVersion, series, sess.phase]);

  const allResults = useMemo<ScreenResult[]>(() => {
    if (!series.length) return snapshot?.strategy === strategy ? snapshot.results : [];
    return series
      .map((s) => screenStock({ ticker: s.ticker, name: s.name, daily: s.daily, intraday: s.intraday }, strategy, regime, settings.screen, now))
      .filter((r): r is ScreenResult => r !== null);
  }, [series, strategy, regime, settings.screen, now, snapshot]);

  const results = useMemo(() => {
    const preset = PRICE_PRESETS.find((p) => p.key === pricePreset)!;
    return allResults
      .map((r) => applyNews(r, newsMap[r.ticker]))
      .filter((r) => r.price >= preset.min && r.price <= preset.max)
      .filter((r) => (syariah === 'syariah' ? isSyariahTicker(r.ticker) : syariah === 'non_syariah' ? !isSyariahTicker(r.ticker) : true))
      .filter((r) => (onlyStrong ? r.label === 'SETUP KUAT' : true))
      .sort((a, b) => b.score - a.score);
  }, [allResults, newsMap, pricePreset, syariah, onlyStrong]);

  const counts = useMemo(
    () => ({
      kuat: results.filter((r) => r.label === 'SETUP KUAT').length,
      pantau: results.filter((r) => r.label === 'PANTAU').length,
    }),
    [results]
  );

  const scan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    setErrorMsg('');
    const universe = settings.universe;
    setProgress({ done: 0, total: universe.length });
    try {
      const { series: idx } = await fetchSeries(['^JKSE'], { daily: '1y', intraday: '5d' });
      if (idx[0]) setIhsg(idx[0]);
      const { series: got, errors: errs } = await fetchSeries(universe, {
        daily: '6mo',
        intraday: '5d',
        onProgress: (done, total, partial) => {
          setProgress({ done, total });
          setSeries(partial);
        },
      });
      setSeries(got);
      setErrors(errs);
      if (!got.length) throw new Error('Tidak ada data yang berhasil diambil dari Yahoo. Coba lagi beberapa saat.');
      const at = new Date().toISOString();
      setLastScan(at);
      setNow(new Date());
      cache.set('sc2_last_scan', at);
      newsRequested.current.clear();
      setNewsMap({});
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Scan gagal');
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  }, [settings.universe]);

  // Simpan snapshot & riwayat ke DB setelah scan
  useEffect(() => {
    if (!lastScan || !series.length || scanning) return;
    const top = allResults.filter((r) => r.score >= 55);
    cache.set(LS_SNAPSHOT, { at: lastScan, strategy, results: allResults.filter((r) => r.score >= 40).slice(0, 60) });
    if (top.length) {
      api
        .save(
          'screening_results',
          top.map((r) => ({
            date: r.asOf,
            ticker: r.ticker,
            strategy: r.strategy,
            price: r.price,
            support: r.metrics.support,
            resistance: r.metrics.resistance,
            rsi: Number(r.metrics.rsi.toFixed(1)),
            volume_ratio: Number(r.metrics.rvol.toFixed(2)),
            score: r.score,
            label: r.label,
            is_syariah: isSyariahTicker(r.ticker),
            entry: r.plan?.entry ?? null,
            sl: r.plan?.sl ?? null,
            tp1: r.plan?.tp1 ?? null,
          }))
        )
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastScan, scanning, strategy]);

  // Auto-refresh saat sesi berjalan
  useEffect(() => {
    if (!settings.autoRefreshMin || !lastScan || !sess.isTrading) return;
    const ms = settings.autoRefreshMin * 60_000;
    const due = new Date(lastScan).getTime() + ms - Date.now();
    const t = setTimeout(() => {
      if (document.visibilityState === 'visible') scan();
    }, Math.max(5_000, due));
    return () => clearTimeout(t);
  }, [lastScan, sess.isTrading, settings.autoRefreshMin, scan]);

  // Berita untuk kandidat teratas
  useEffect(() => {
    const want = results
      .filter((r) => r.score >= 55)
      .slice(0, 10)
      .map((r) => r.ticker)
      .filter((t) => !newsRequested.current.has(t));
    if (!want.length) return;
    want.forEach((t) => newsRequested.current.add(t));
    setNewsLoading((p) => new Set([...Array.from(p), ...want]));
    (async () => {
      for (let i = 0; i < want.length; i += 5) {
        const chunk = want.slice(i, i + 5);
        try {
          const res = await fetch(`/api/news?tickers=${chunk.join(',')}`);
          const j = await res.json();
          if (j.news) setNewsMap((m) => ({ ...m, ...j.news }));
        } catch {
          /* berita opsional */
        }
        setNewsLoading((p) => {
          const n = new Set(p);
          chunk.forEach((t) => n.delete(t));
          return n;
        });
      }
    })();
  }, [results]);

  const saveToWatchlist = async (r: ScreenResult) => {
    if (!r.plan) return;
    try {
      await api.save('watchlist', {
        ticker: r.ticker,
        strategy: r.strategy,
        entry_plan: r.plan.entry,
        tp: r.plan.tp1,
        sl: r.plan.sl,
        lot: Math.max(1, r.plan.lots),
        modal: Math.max(1, r.plan.lots) * 100 * r.plan.entry,
        score: r.score,
        note: r.factors
          .filter((f) => f.value >= 0.7)
          .map((f) => f.label)
          .join(', '),
      });
      setSaved((s) => new Set(s).add(r.ticker));
    } catch (e) {
      setErrorMsg(`Gagal simpan: ${e instanceof Error ? e.message : ''}`);
    }
  };

  const RegimeIcon = regime?.regime === 'BEARISH' ? TrendingDown : regime?.regime === 'BULLISH' ? TrendingUp : Activity;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight">Screener IDX</h1>
        <p className="text-sm text-zinc-400">{settings.universe.length} saham likuid · skor multi-faktor · rencana trade otomatis</p>
      </header>

      {/* Status pasar */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-3 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${sess.isTrading ? 'bg-[#00C853] animate-pulse' : 'bg-zinc-600'}`} />
          <span className="font-semibold">{sess.label}</span>
          {sess.isTrading && <span className="text-zinc-500 text-xs">sisa {sess.minutesLeft} mnt</span>}
        </div>
        {regime ? (
          <div className="flex items-center gap-1.5">
            <RegimeIcon className={`w-4 h-4 ${regime.regime === 'BEARISH' ? 'text-[#FF3B30]' : regime.regime === 'BULLISH' ? 'text-[#00C853]' : 'text-[#FFB300]'}`} />
            <span className="font-semibold">IHSG {Math.round(regime.ihsg).toLocaleString('id-ID')}</span>
            <span className={regime.ihsgChangePct >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}>
              {regime.ihsgChangePct >= 0 ? '+' : ''}
              {regime.ihsgChangePct.toFixed(2)}%
            </span>
          </div>
        ) : (
          <span className="text-zinc-500 text-xs">IHSG muncul setelah scan</span>
        )}
      </div>
      {regime && (
        <div className="text-xs text-zinc-400 -mt-2 px-1">
          Pasar <b>{regime.regime}</b> — {regime.notes.join('; ')}. Data Yahoo tertunda ±10 menit.
        </div>
      )}

      {/* Strategi */}
      <div className="grid grid-cols-2 gap-2 bg-[#1A1A1A] p-1 rounded-2xl border border-[#2A2A2A]">
        {(['DAYTRADE', 'REBOUND'] as Strategy[]).map((s) => (
          <button
            key={s}
            onClick={() => setStrategy(s)}
            className={`py-2.5 rounded-xl text-sm font-bold transition ${strategy === s ? 'bg-[#00C853] text-black' : 'text-zinc-400'}`}
          >
            {s === 'DAYTRADE' ? 'Day Trade' : 'Rebound'}
          </button>
        ))}
      </div>
      <p className="text-xs text-zinc-500 -mt-2 px-1">
        {strategy === 'DAYTRADE'
          ? sess.isTrading || sess.phase === 'ISTIRAHAT'
            ? 'Momentum intraday: di atas VWAP, volume relatif tinggi (disesuaikan jam), breakout opening range.'
            : 'Pasar tutup: menilai setup untuk sesi berikutnya dari candle harian (close dekat high, breakout, volume).'
          : 'Pantulan dari support saat oversold, dikonfirmasi candle pembalikan & volume.'}
      </p>

      {/* Filter */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl">
        <button onClick={() => setShowFilters(!showFilters)} className="w-full flex items-center justify-between px-4 py-3 text-sm">
          <span className="flex items-center gap-2 font-semibold">
            <SlidersHorizontal className="w-4 h-4" /> Filter
          </span>
          <span className="text-xs text-zinc-500">
            {PRICE_PRESETS.find((p) => p.key === pricePreset)?.label} · {syariah === 'all' ? 'Semua' : syariah === 'syariah' ? 'Syariah' : 'Non-syariah'}
            {onlyStrong ? ' · Setup kuat' : ''} · Modal Rp{(settings.screen.modal / 1e6).toFixed(1)}jt, risiko {settings.screen.riskPct}%
          </span>
        </button>
        {showFilters && (
          <div className="px-4 pb-4 space-y-3">
            <Seg label="Harga" value={pricePreset} onChange={setPricePreset} options={PRICE_PRESETS.map((p) => ({ key: p.key, label: p.label }))} />
            <Seg
              label="Syariah"
              value={syariah}
              onChange={(v) => setSyariah(v as SyariahFilter)}
              options={[
                { key: 'all', label: 'Semua' },
                { key: 'syariah', label: 'Syariah' },
                { key: 'non_syariah', label: 'Non' },
              ]}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyStrong} onChange={(e) => setOnlyStrong(e.target.checked)} className="accent-[#00C853] w-4 h-4" />
              Hanya tampilkan SETUP KUAT (skor ≥ 70)
            </label>
            <p className="text-xs text-zinc-500">Modal, risiko per trade, biaya broker & daftar saham diatur di menu Atur.</p>
          </div>
        )}
      </div>

      <button
        onClick={scan}
        disabled={scanning}
        className="w-full bg-[#00C853] text-black font-extrabold rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.99]"
      >
        {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
        {scanning ? `Mengambil data ${progress.done}/${progress.total}…` : series.length ? 'SCAN ULANG' : `SCAN ${settings.universe.length} SAHAM`}
      </button>
      {scanning && (
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden -mt-2">
          <div className="h-full bg-[#00C853] transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
        </div>
      )}

      {errorMsg && <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/40 text-[#FF3B30] text-sm rounded-xl p-3">{errorMsg}</div>}

      {(lastScan || snapshot) && (
        <div className="text-xs text-zinc-500 flex flex-wrap gap-x-3">
          <span>
            {series.length ? `${series.length} saham terambil` : 'Hasil tersimpan (belum scan ulang)'} · {formatRelativeTimeIndo(lastScan || snapshot!.at)}
          </span>
          {errors.length > 0 && (
            <span title={errors.map((e) => `${e.ticker}: ${e.message}`).join('\n')}>
              {errors.length} gagal ({errors
                .slice(0, 4)
                .map((e) => e.ticker)
                .join(', ')}
              {errors.length > 4 ? '…' : ''})
            </span>
          )}
          {settings.autoRefreshMin > 0 && sess.isTrading && series.length > 0 && <span>auto-refresh tiap {settings.autoRefreshMin} mnt</span>}
          {!cal && <span className="text-[#FFB300]">Belum ada kalibrasi — jalankan Backtest agar skor punya angka win rate</span>}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-[#00C853]/15 text-[#00C853] font-semibold">{counts.kuat} setup kuat</span>
          <span className="px-2.5 py-1 rounded-full bg-[#FFB300]/15 text-[#FFB300] font-semibold">{counts.pantau} pantau</span>
          <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400">{results.length} total</span>
        </div>
      )}

      <div className="space-y-3">
        {results.slice(0, visible).map((r) => (
          <ResultCard
            key={`${r.strategy}-${r.ticker}`}
            r={r}
            cal={lookupCalibration(cal, r.score)}
            news={newsMap[r.ticker]}
            newsLoading={newsLoading.has(r.ticker)}
            isSyariah={isSyariahTicker(r.ticker)}
            saved={saved.has(r.ticker)}
            onSave={() => saveToWatchlist(r)}
          />
        ))}
      </div>
      {results.length > visible && (
        <button onClick={() => setVisible((v) => v + 15)} className="w-full py-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-sm text-zinc-300">
          Tampilkan lagi ({results.length - visible} tersisa)
        </button>
      )}

      {!scanning && !results.length && (
        <div className="text-center text-zinc-500 text-sm py-10">
          {series.length ? 'Tidak ada saham yang lolos filter. Coba longgarkan filter.' : 'Tekan tombol scan untuk mulai.'}
        </div>
      )}

      <p className="text-[11px] text-zinc-600 leading-relaxed pt-2">
        Skor adalah alat bantu seleksi, bukan jaminan. Selalu pakai cut loss dan cek angka backtest. Bukan rekomendasi investasi.
      </p>
    </div>
  );
}

function Seg({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { key: string; label: string }[] }) {
  return (
    <div>
      <div className="text-xs text-zinc-500 mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${value === o.key ? 'bg-[#00C853] text-black' : 'bg-[#232323] text-zinc-300'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
