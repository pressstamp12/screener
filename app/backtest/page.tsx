'use client';

import { useEffect, useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { AppSettings, cache, DEFAULT_APP_SETTINGS, fetchSeries, loadSettings, saveCalibration } from '@/lib/client';
import { BacktestSummary, runEodBacktest, runIntradayBacktest, summarize, toCalibration } from '@/lib/backtest';
import type { Strategy } from '@/lib/scoring';

type Mode = 'EOD' | 'INTRADAY';

const FACTOR_NAMES: Record<string, string> = {
  trend: 'Tren harian',
  rvol: 'Volume relatif',
  vwap: 'Di atas VWAP',
  orb: 'Breakout opening range',
  intraday: 'Momentum 5 menit',
  closeloc: 'Tutup dekat high',
  breakout: 'Breakout high 20H',
  momentum: 'Momentum harian',
  rsi: 'RSI',
  atr: 'Volatilitas (ATR)',
  room: 'Ruang ke resistance',
  macd: 'MACD',
  support: 'Dekat support',
  supportStrength: 'Support teruji',
  drawdown: 'Sudah koreksi',
  reversal: 'Candle pembalikan',
  volume: 'Volume konfirmasi',
  stoch: 'Stochastic cross',
  trendHealth: 'Bukan downtrend kuat',
  accum: 'Tanda akumulasi',
};

export default function BacktestPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [strategy, setStrategy] = useState<Strategy>('DAYTRADE');
  const [mode, setMode] = useState<Mode>('EOD');
  const [limit, setLimit] = useState(40);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<BacktestSummary | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setSettings(loadSettings());
    const last = cache.get<BacktestSummary>('sc2_last_backtest');
    if (last) setSummary(last);
  }, []);

  useEffect(() => {
    if (strategy === 'REBOUND') setMode('EOD');
  }, [strategy]);

  const run = async () => {
    setRunning(true);
    setErr('');
    setSummary(null);
    try {
      const tickers = settings.universe.slice(0, limit);
      setPhase('Mengambil data historis');
      const intradayRange = mode === 'INTRADAY' ? '60d' : 'none';
      const { series: idx } = await fetchSeries(['^JKSE'], { daily: '2y', intraday: intradayRange });
      const { series } = await fetchSeries(tickers, {
        daily: '2y',
        intraday: intradayRange,
        batchSize: mode === 'INTRADAY' ? 3 : 8,
        onProgress: (d, t) => setProgress({ done: d, total: t }),
      });
      if (!series.length) throw new Error('Data historis gagal diambil.');
      const ihsgDaily = idx[0]?.daily || [];
      setPhase('Menjalankan simulasi');
      setProgress({ done: 0, total: series.length });
      const onP = (d: number, t: number) => setProgress({ done: d, total: t });
      const samples =
        mode === 'INTRADAY'
          ? await runIntradayBacktest(series, ihsgDaily, idx[0]?.intraday || [], settings.screen, onP)
          : await runEodBacktest(series, ihsgDaily, strategy, settings.screen, onP);
      if (!samples.length) throw new Error('Tidak ada sinyal yang bisa disimulasikan.');
      const sum = summarize(samples, strategy, mode);
      setSummary(sum);
      cache.set('sc2_last_backtest', sum);
      await saveCalibration(toCalibration(sum));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Backtest gagal');
    } finally {
      setRunning(false);
      setPhase('');
    }
  };

  const maxAbsR = summary ? Math.max(0.25, ...summary.buckets.map((b) => Math.abs(b.avgR))) : 1;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-[#00C853]" /> Backtest
        </h1>
        <p className="text-sm text-zinc-400">Uji skor pada data historis dengan logika yang sama persis seperti screener. Hasilnya otomatis jadi angka win rate di tiap kartu saham.</p>
      </header>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-3">
        <Seg label="Strategi" value={strategy} onChange={(v) => setStrategy(v as Strategy)} options={[{ key: 'DAYTRADE', label: 'Day Trade' }, { key: 'REBOUND', label: 'Rebound' }]} />
        <Seg
          label="Mode"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={
            strategy === 'DAYTRADE'
              ? [
                  { key: 'EOD', label: 'Harian (2 tahun)' },
                  { key: 'INTRADAY', label: 'Intraday 5m (60 hari)' },
                ]
              : [{ key: 'EOD', label: 'Harian (2 tahun)' }]
          }
        />
        <Seg
          label="Jumlah saham"
          value={String(limit)}
          onChange={(v) => setLimit(Number(v))}
          options={[20, 40, 70, settings.universe.length].map((x) => ({ key: String(x), label: x === settings.universe.length ? `Semua (${x})` : String(x) }))}
        />
        <p className="text-xs text-zinc-500 leading-relaxed">
          {mode === 'EOD'
            ? strategy === 'DAYTRADE'
              ? 'Sinyal dinilai saat penutupan, beli di open besoknya, jual saat TP1/SL tersentuh atau di penutupan hari itu.'
              : 'Sinyal dinilai saat penutupan, beli di open besoknya, tahan maksimal 5 hari bursa.'
            : 'Dinilai tiap 30 menit sepanjang sesi, beli di bar 5 menit berikutnya, keluar di TP1/SL atau penutupan.'}{' '}
          Jika SL dan TP tersentuh di bar yang sama dihitung kena SL. Biaya {settings.screen.fees.buyPct}% beli + {settings.screen.fees.sellPct}% jual sudah dihitung.
        </p>
        <button onClick={run} disabled={running} className="w-full bg-[#00C853] text-black font-extrabold rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-70">
          {running && <Loader2 className="w-5 h-5 animate-spin" />}
          {running ? `${phase} ${progress.done}/${progress.total}` : 'JALANKAN BACKTEST'}
        </button>
        {mode === 'INTRADAY' && !running && <p className="text-xs text-[#FFB300]">Mode intraday mengunduh banyak data; bisa makan 1–3 menit.</p>}
      </div>

      {err && <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/40 text-[#FF3B30] text-sm rounded-xl p-3">{err}</div>}

      {summary && (
        <>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4">
            <div className="text-xs text-zinc-500">
              {summary.strategy === 'DAYTRADE' ? 'Day Trade' : 'Rebound'} · {summary.mode === 'EOD' ? 'harian' : 'intraday'} · {summary.tickers} saham · {summary.samples.toLocaleString('id-ID')} sinyal · {summary.from} s/d {summary.to}
            </div>
            <div className="mt-3 text-sm font-semibold">Sinyal SETUP KUAT (skor ≥ 70)</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Stat label="Jumlah" value={String(summary.topSignals.n)} />
              <Stat label="Win rate" value={`${Math.round(summary.topSignals.winRate * 100)}%`} good={summary.topSignals.winRate >= 0.5} />
              <Stat label="Rata-rata per trade" value={`${summary.topSignals.avgR >= 0 ? '+' : ''}${summary.topSignals.avgR.toFixed(2)}R`} good={summary.topSignals.avgR > 0} />
              <Stat label="Profit factor" value={Number.isFinite(summary.topSignals.profitFactor) ? summary.topSignals.profitFactor.toFixed(2) : '∞'} good={summary.topSignals.profitFactor > 1} />
              <Stat label="Rugi beruntun terpanjang" value={String(summary.topSignals.maxConsecLoss)} />
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              1R = jarak entry ke cut loss. +0,30R artinya rata-rata untung 30% dari risiko per trade. Yang penting: angka rata-rata R positif dan naik seiring skor.
            </p>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4">
            <div className="text-sm font-semibold mb-3">Hasil per rentang skor</div>
            <div className="space-y-3">
              {summary.buckets.map((b) => (
                <div key={b.min}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">
                      Skor {b.min}–{b.max}
                    </span>
                    <span className="text-zinc-400">
                      {b.n} sinyal · win {Math.round(b.winRate * 100)}% · TP {Math.round(b.tpRate * 100)}%
                    </span>
                  </div>
                  <div className="relative h-5 bg-zinc-900 rounded mt-1">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-700" />
                    <div
                      className="absolute top-0 bottom-0 rounded"
                      style={{
                        background: b.avgR >= 0 ? '#00C853' : '#FF3B30',
                        left: b.avgR >= 0 ? '50%' : `${50 - (Math.abs(b.avgR) / maxAbsR) * 50}%`,
                        width: `${(Math.abs(b.avgR) / maxAbsR) * 50}%`,
                        opacity: b.n < 20 ? 0.4 : 1,
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">
                      {b.n ? `${b.avgR >= 0 ? '+' : ''}${b.avgR.toFixed(2)}R` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-3">Batang pudar = sampel &lt; 20, belum bisa dipercaya.</p>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4">
            <div className="text-sm font-semibold mb-1">Faktor mana yang benar-benar membantu?</div>
            <p className="text-xs text-zinc-500 mb-3">Rata-rata R saat faktor kuat (≥0,7) vs lemah (≤0,3). Selisih positif = faktor berguna di data ini.</p>
            <div className="space-y-1.5">
              {summary.factorLift.map((f) => {
                const diff = f.highR - f.lowR;
                return (
                  <div key={f.key} className="flex justify-between text-xs">
                    <span className="text-zinc-300">{FACTOR_NAMES[f.key] || f.key}</span>
                    <span>
                      <span className="text-zinc-500">
                        {f.highR.toFixed(2)}R ({f.highN}) vs {f.lowR.toFixed(2)}R ({f.lowN})
                      </span>{' '}
                      <b className={diff >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}>
                        {diff >= 0 ? '+' : ''}
                        {diff.toFixed(2)}
                      </b>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] text-zinc-600">Hasil masa lalu tidak menjamin hasil ke depan. Universe saham dipilih hari ini, jadi ada bias survivorship kecil.</p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="bg-[#232323] rounded-xl p-2.5">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className={`text-lg font-black ${good === undefined ? '' : good ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>{value}</div>
    </div>
  );
}

function Seg({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { key: string; label: string }[] }) {
  return (
    <div>
      <div className="text-xs text-zinc-500 mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o.key} onClick={() => onChange(o.key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${value === o.key ? 'bg-[#00C853] text-black' : 'bg-[#232323] text-zinc-300'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
