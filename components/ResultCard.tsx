'use client';

import { useState } from 'react';
import { AlertTriangle, BookmarkPlus, Check, ChevronDown, ChevronUp, Newspaper, Zap } from 'lucide-react';
import type { CalibrationBucket, ScreenResult } from '@/lib/scoring';
import type { TickerNewsBundle } from '@/lib/types';
import { formatPercent, formatRelativeTimeIndo, formatRupiah } from '@/lib/format';

const LABEL_STYLE: Record<string, string> = {
  'SETUP KUAT': 'bg-[#00C853]/15 text-[#00C853] border-[#00C853]/40',
  PANTAU: 'bg-[#FFB300]/15 text-[#FFB300] border-[#FFB300]/40',
  LEWATI: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/40',
};

function n(v: number) {
  return Math.round(v).toLocaleString('id-ID');
}

export default function ResultCard({
  r,
  cal,
  news,
  newsLoading,
  isSyariah,
  saved,
  onSave,
}: {
  r: ScreenResult;
  cal: CalibrationBucket | null;
  news?: TickerNewsBundle;
  newsLoading?: boolean;
  isSyariah: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(false);
  const p = r.plan;
  const up = r.changePct >= 0;

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-extrabold tracking-wide">{r.ticker}</span>
            {isSyariah && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-300">Syariah</span>}
            {r.live && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-900/40 text-sky-300 flex items-center gap-0.5">
                <Zap className="w-3 h-3" /> Live
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-500 truncate">{r.name}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-white">{n(r.price)}</span>
            <span className={`text-sm font-semibold ${up ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>{formatPercent(r.changePct)}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-black leading-none">{r.score}</div>
          <div className={`mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block ${LABEL_STYLE[r.label]}`}>{r.label}</div>
        </div>
      </div>

      {cal && (
        <div className="mt-2 text-xs text-zinc-400">
          Histori skor {cal.min}–{cal.max}: <b className={cal.winRate >= 0.5 ? 'text-[#00C853]' : 'text-[#FFB300]'}>{Math.round(cal.winRate * 100)}% profit</b>, rata-rata{' '}
          <b className={cal.avgR >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}>{cal.avgR >= 0 ? '+' : ''}{cal.avgR.toFixed(2)}R</b> ({cal.n} sinyal)
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <Chip label="RVOL" value={`${r.metrics.rvol.toFixed(1)}x`} good={r.metrics.rvol >= 1.5} />
        <Chip label="RSI" value={r.metrics.rsi.toFixed(0)} />
        <Chip label="ATR" value={`${r.metrics.atrPct.toFixed(1)}%`} />
        {r.metrics.vwapDistPct !== null && <Chip label="vs VWAP" value={formatPercent(r.metrics.vwapDistPct)} good={r.metrics.vwapDistPct >= 0} />}
        <Chip label="Nilai/hari" value={`Rp${(r.metrics.avgValue / 1e9).toFixed(1)}M`} />
      </div>

      {p && r.gates.length === 0 && (
        <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
          <PlanBox label="Beli" value={p.entryLow < p.entry ? `${n(p.entryLow)}–${n(p.entry)}` : n(p.entry)} />
          <PlanBox label="Cut loss" value={n(p.sl)} tone="red" />
          <PlanBox label="TP1" value={n(p.tp1)} tone="green" />
          <PlanBox label="TP2" value={n(p.tp2)} tone="green" />
        </div>
      )}
      {p && r.gates.length === 0 && (
        <div className="mt-2 text-xs text-zinc-400 leading-relaxed">
          {p.lots > 0 ? (
            <>
              <b className="text-zinc-200">{p.lots} lot</b> ≈ {formatRupiah(p.cost)} · risiko maks {formatRupiah(p.maxLoss)} · potensi TP1 {formatRupiah(p.potentialProfit1)} · R:R {p.rr1.toFixed(1)}
            </>
          ) : (
            <>Modal/risiko belum cukup untuk 1 lot (butuh ≈ {formatRupiah(p.entry * 100)})</>
          )}
          <span className="block">Impas setelah biaya: {n(p.breakEven)}</span>
        </div>
      )}

      {r.gates.length > 0 && <div className="mt-3 text-xs text-zinc-400">⛔ {r.gates.join(' · ')}</div>}

      {r.warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {r.warnings.slice(0, open ? undefined : 2).map((w) => (
            <div key={w} className="flex gap-1.5 text-xs text-[#FFB300]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-2 border-t border-[#2A2A2A] pt-3">
          {r.factors.map((f) => (
            <div key={f.key}>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300">{f.label}</span>
                <span className="text-zinc-500">bobot {f.weight}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.round(f.value * 100)}%`, background: f.value >= 0.7 ? '#00C853' : f.value >= 0.4 ? '#FFB300' : '#FF3B30' }} />
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">{f.detail}</div>
            </div>
          ))}
          <div className="text-[11px] text-zinc-500">
            Support {n(r.metrics.support)} ({r.metrics.supportTouches}x) · Resistance {n(r.metrics.resistance)} · EMA20 {n(r.metrics.ema20)} · EMA50 {n(r.metrics.ema50)} · ADX {r.metrics.adx.toFixed(0)}
            {p && ` · ARA ${n(p.ara)} · ARB ${n(p.arb)}`} · skor dasar {r.rawScore}
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <Newspaper className="w-3.5 h-3.5" /> Berita 7 hari
            </div>
            {newsLoading && <div className="text-xs text-zinc-500 mt-1">Memuat berita…</div>}
            {!newsLoading && news && news.items.length === 0 && <div className="text-xs text-zinc-500 mt-1">Tidak ada berita relevan.</div>}
            {news?.items.slice(0, 4).map((it) => (
              <a key={it.url + it.title} href={it.url} target="_blank" rel="noreferrer" className="block mt-1.5 text-xs">
                <span className={it.sentiment === 'POSITIF' ? 'text-[#00C853]' : it.sentiment === 'NEGATIF' ? 'text-[#FF3B30]' : 'text-zinc-400'}>●</span>{' '}
                <span className="text-zinc-200">{it.title}</span>
                <span className="text-zinc-500"> — {it.source}, {formatRelativeTimeIndo(it.published_at)}</span>
              </a>
            ))}
            {news?.externalSummary && <div className="text-[11px] text-zinc-500 mt-1.5">{news.externalSummary}</div>}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button onClick={() => setOpen(!open)} className="flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-xl bg-[#232323] text-zinc-300">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} {open ? 'Tutup' : 'Detail & berita'}
        </button>
        <button
          onClick={onSave}
          disabled={saved || !p}
          className={`flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-xl font-semibold ${saved ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#00C853] text-black'} disabled:opacity-70`}
        >
          {saved ? <Check className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />} {saved ? 'Tersimpan' : 'Watchlist'}
        </button>
      </div>
    </div>
  );
}

function Chip({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <span className={`px-2 py-1 rounded-lg bg-[#232323] ${good === true ? 'text-[#00C853]' : 'text-zinc-300'}`}>
      <span className="text-zinc-500">{label}</span> {value}
    </span>
  );
}

function PlanBox({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'green' }) {
  return (
    <div className="bg-[#232323] rounded-xl py-2 px-1">
      <div className="text-[10px] text-zinc-500">{label}</div>
      <div className={`text-xs font-bold ${tone === 'red' ? 'text-[#FF3B30]' : tone === 'green' ? 'text-[#00C853]' : 'text-zinc-100'}`}>{value}</div>
    </div>
  );
}
