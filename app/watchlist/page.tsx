'use client';

import { useEffect, useState } from 'react';
import { BookCheck, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { api, fetchSeries, loadSettings } from '@/lib/client';
import { DEFAULT_FEES, FeeConfig, netPnl } from '@/lib/idx';
import { formatRupiah, getTodayISO } from '@/lib/format';
import type { WatchlistItem } from '@/lib/types';

const n = (v: number) => Math.round(v).toLocaleString('id-ID');

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [fees, setFees] = useState<FeeConfig>(DEFAULT_FEES);
  const [closing, setClosing] = useState<number | null>(null);
  const [exitPrice, setExitPrice] = useState('');

  const load = async () => {
    try {
      setItems(await api.get<WatchlistItem>('watchlist'));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFees(loadSettings().screen.fees);
    load();
  }, []);

  const refreshPrices = async () => {
    if (!items.length) return;
    setRefreshing(true);
    const { series } = await fetchSeries(
      items.map((i) => i.ticker),
      { daily: '6mo', intraday: 'none' }
    );
    setPrices(Object.fromEntries(series.map((s) => [s.ticker, s.price])));
    setRefreshing(false);
  };

  useEffect(() => {
    if (items.length) refreshPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const update = async (it: WatchlistItem, field: keyof WatchlistItem, value: number) => {
    setItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, [field]: value } : x)));
    await api.update('watchlist', { id: it.id, [field]: value }).catch(() => setErr('Gagal menyimpan perubahan'));
  };

  const remove = async (id: number) => {
    setItems((arr) => arr.filter((x) => x.id !== id));
    await api.remove('watchlist', id).catch(() => setErr('Gagal menghapus'));
  };

  const closeToJournal = async (it: WatchlistItem) => {
    const exit = Number(exitPrice);
    if (!exit) return;
    const pl = netPnl(it.entry_plan, exit, it.lot, fees);
    const gross = (exit - it.entry_plan) * it.lot * 100;
    const riskPerShare = it.entry_plan - it.sl;
    await api.save('trades', {
      ticker: it.ticker,
      strategy: it.strategy,
      entry_price: it.entry_plan,
      exit_price: exit,
      sl: it.sl,
      tp: it.tp,
      lot: it.lot,
      fees: Math.round(gross - pl),
      profit_loss: Math.round(pl),
      r_multiple: riskPerShare > 0 ? Number((pl / (riskPerShare * it.lot * 100)).toFixed(2)) : null,
      score_at_entry: it.score,
      note: it.note || '',
      trade_date: getTodayISO(),
    });
    await remove(it.id);
    setClosing(null);
    setExitPrice('');
  };

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Watchlist</h1>
          <p className="text-sm text-zinc-400">Rencana trade yang sedang dipantau</p>
        </div>
        <button onClick={refreshPrices} disabled={refreshing || !items.length} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Harga
        </button>
      </header>

      {err && <div className="text-sm text-[#FF3B30]">{err}</div>}
      {loading && <div className="text-zinc-500 text-sm">Memuat…</div>}
      {!loading && !items.length && !err && <div className="text-zinc-500 text-sm py-10 text-center">Belum ada. Simpan dari halaman Screener.</div>}

      {items.map((it) => {
        const px = prices[it.ticker];
        const pl = px ? netPnl(it.entry_plan, px, it.lot, fees) : null;
        const status = !px ? null : px <= it.sl ? 'KENA CUT LOSS' : px >= it.tp ? 'TARGET TERCAPAI' : px < it.entry_plan ? 'Di bawah entry' : 'Di atas entry';
        const statusColor = !px ? '' : px <= it.sl ? 'text-[#FF3B30]' : px >= it.tp ? 'text-[#00C853]' : 'text-zinc-400';
        const risk = (it.entry_plan - it.sl) * it.lot * 100;
        const reward = (it.tp - it.entry_plan) * it.lot * 100;
        return (
          <div key={it.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-lg font-extrabold">{it.ticker}</div>
                <div className="text-xs text-zinc-500">
                  {it.strategy === 'DAYTRADE' ? 'Day trade' : it.strategy === 'REBOUND' ? 'Rebound' : 'Manual'}
                  {it.score != null && ` · skor ${it.score}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{px ? n(px) : '—'}</div>
                {status && <div className={`text-xs font-semibold ${statusColor}`}>{status}</div>}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Num label="Entry" value={it.entry_plan} onChange={(v) => update(it, 'entry_plan', v)} />
              <Num label="Cut loss" value={it.sl} onChange={(v) => update(it, 'sl', v)} />
              <Num label="Target" value={it.tp} onChange={(v) => update(it, 'tp', v)} />
              <Num label="Lot" value={it.lot} onChange={(v) => update(it, 'lot', v)} />
            </div>
            <div className="text-xs text-zinc-400">
              Risiko {formatRupiah(risk)} · potensi {formatRupiah(reward)} · R:R {risk > 0 ? (reward / risk).toFixed(1) : '-'}
              {pl !== null && (
                <span className={pl >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}>
                  {' '}
                  · P/L sekarang {formatRupiah(pl)} (bersih)
                </span>
              )}
            </div>
            {it.note && <div className="text-[11px] text-zinc-500">Alasan: {it.note}</div>}
            {closing === it.id ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Harga jual"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="flex-1 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-3 py-2 text-sm"
                />
                <button onClick={() => closeToJournal(it)} className="px-4 rounded-xl bg-[#00C853] text-black text-sm font-bold">
                  Simpan
                </button>
                <button onClick={() => setClosing(null)} className="px-3 rounded-xl bg-[#232323] text-sm">
                  Batal
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setClosing(it.id);
                    setExitPrice(px ? String(Math.round(px)) : '');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl bg-[#232323]"
                >
                  <BookCheck className="w-4 h-4" /> Sudah jual → Jurnal
                </button>
                <button onClick={() => remove(it.id)} className="px-3 rounded-xl bg-[#232323] text-[#FF3B30]">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <label className="block">
      <span className="text-[10px] text-zinc-500">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => Number(v) !== value && Number(v) > 0 && onChange(Number(v))}
        className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-2 py-1.5 text-sm font-semibold"
      />
    </label>
  );
}
