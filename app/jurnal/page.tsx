'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, loadSettings } from '@/lib/client';
import { DEFAULT_FEES, FeeConfig, netPnl } from '@/lib/idx';
import { formatDateIndo, formatRupiah, getTodayISO } from '@/lib/format';
import type { TradeItem } from '@/lib/types';

const EMPTY = { ticker: '', strategy: 'DAYTRADE', entry: '', exit: '', sl: '', lot: '', date: getTodayISO(), note: '' };

export default function JurnalPage() {
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [fees, setFees] = useState<FeeConfig>(DEFAULT_FEES);
  const [filter, setFilter] = useState<'ALL' | 'DAYTRADE' | 'REBOUND'>('ALL');

  useEffect(() => {
    setFees(loadSettings().screen.fees);
    api
      .get<TradeItem>('trades')
      .then(setTrades)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => trades.filter((t) => filter === 'ALL' || t.strategy === filter), [trades, filter]);

  const stats = useMemo(() => {
    const nT = list.length;
    const wins = list.filter((t) => Number(t.profit_loss) > 0);
    const total = list.reduce((a, t) => a + Number(t.profit_loss), 0);
    const gross = wins.reduce((a, t) => a + Number(t.profit_loss), 0);
    const loss = -list.filter((t) => Number(t.profit_loss) <= 0).reduce((a, t) => a + Number(t.profit_loss), 0);
    const rs = list.map((t) => t.r_multiple).filter((r): r is number => r !== null && r !== undefined).map(Number);
    return {
      nT,
      winRate: nT ? wins.length / nT : 0,
      total,
      pf: loss > 0 ? gross / loss : gross > 0 ? Infinity : 0,
      avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
      avgWin: wins.length ? gross / wins.length : 0,
      avgLoss: nT - wins.length ? loss / (nT - wins.length) : 0,
    };
  }, [list]);

  const submit = async () => {
    const entry = Number(form.entry);
    const exit = Number(form.exit);
    const lot = Number(form.lot);
    const sl = Number(form.sl) || null;
    if (!form.ticker || !entry || !exit || !lot) {
      setErr('Isi ticker, entry, exit, dan lot');
      return;
    }
    const pl = netPnl(entry, exit, lot, fees);
    const gross = (exit - entry) * lot * 100;
    try {
      const [row] = await api.save<TradeItem>('trades', {
        ticker: form.ticker.toUpperCase(),
        strategy: form.strategy,
        entry_price: entry,
        exit_price: exit,
        sl,
        lot,
        fees: Math.round(gross - pl),
        profit_loss: Math.round(pl),
        r_multiple: sl && entry > sl ? Number((pl / ((entry - sl) * lot * 100)).toFixed(2)) : null,
        note: form.note,
        trade_date: form.date,
      });
      setTrades((t) => [row, ...t]);
      setForm(EMPTY);
      setShowForm(false);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal simpan');
    }
  };

  const remove = async (id: number) => {
    setTrades((t) => t.filter((x) => x.id !== id));
    await api.remove('trades', id).catch(() => setErr('Gagal menghapus'));
  };

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Jurnal</h1>
          <p className="text-sm text-zinc-400">Evaluasi hasil nyata, setelah biaya</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 text-sm px-3 py-2 rounded-xl bg-[#00C853] text-black font-bold">
          <Plus className="w-4 h-4" /> Catat
        </button>
      </header>

      <div className="flex gap-1.5">
        {(['ALL', 'DAYTRADE', 'REBOUND'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === f ? 'bg-[#00C853] text-black' : 'bg-[#1A1A1A] text-zinc-300'}`}>
            {f === 'ALL' ? 'Semua' : f === 'DAYTRADE' ? 'Day trade' : 'Rebound'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Trade" value={String(stats.nT)} />
        <Stat label="Win rate" value={`${Math.round(stats.winRate * 100)}%`} />
        <Stat label="Profit factor" value={Number.isFinite(stats.pf) ? stats.pf.toFixed(2) : '∞'} tone={stats.pf >= 1 ? 'g' : 'r'} />
        <Stat label="Total P/L" value={formatRupiah(stats.total)} tone={stats.total >= 0 ? 'g' : 'r'} wide />
        <Stat label="Rata-rata R" value={stats.avgR === null ? '-' : `${stats.avgR >= 0 ? '+' : ''}${stats.avgR.toFixed(2)}`} tone={(stats.avgR ?? 0) >= 0 ? 'g' : 'r'} />
      </div>
      {stats.nT > 0 && (
        <p className="text-xs text-zinc-500">
          Rata-rata untung {formatRupiah(stats.avgWin)} vs rata-rata rugi {formatRupiah(stats.avgLoss)}. Bandingkan win rate di sini dengan angka Backtest — kalau jauh lebih rendah, cek disiplin entry/cut loss.
        </p>
      )}

      {showForm && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 grid grid-cols-2 gap-2">
          <Field label="Ticker">
            <input value={form.ticker} onChange={set('ticker')} className="inp uppercase" />
          </Field>
          <Field label="Strategi">
            <select value={form.strategy} onChange={set('strategy')} className="inp">
              <option value="DAYTRADE">Day trade</option>
              <option value="REBOUND">Rebound</option>
              <option value="LAIN">Lainnya</option>
            </select>
          </Field>
          <Field label="Harga beli">
            <input type="number" inputMode="numeric" value={form.entry} onChange={set('entry')} className="inp" />
          </Field>
          <Field label="Harga jual">
            <input type="number" inputMode="numeric" value={form.exit} onChange={set('exit')} className="inp" />
          </Field>
          <Field label="Cut loss rencana">
            <input type="number" inputMode="numeric" value={form.sl} onChange={set('sl')} className="inp" />
          </Field>
          <Field label="Lot">
            <input type="number" inputMode="numeric" value={form.lot} onChange={set('lot')} className="inp" />
          </Field>
          <Field label="Tanggal">
            <input type="date" value={form.date} onChange={set('date')} className="inp" />
          </Field>
          <Field label="Catatan">
            <input value={form.note} onChange={set('note')} className="inp" />
          </Field>
          <button onClick={submit} className="col-span-2 mt-1 bg-[#00C853] text-black font-bold rounded-xl py-2.5">
            Simpan trade
          </button>
        </div>
      )}

      {err && <div className="text-sm text-[#FF3B30]">{err}</div>}
      {loading && <div className="text-sm text-zinc-500">Memuat…</div>}

      <div className="space-y-2">
        {list.map((t) => {
          const pl = Number(t.profit_loss);
          return (
            <div key={t.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold">
                  {t.ticker} <span className="text-xs font-normal text-zinc-500">{formatDateIndo(t.trade_date)}</span>
                </div>
                <div className="text-xs text-zinc-400">
                  {Math.round(Number(t.entry_price)).toLocaleString('id-ID')} → {Math.round(Number(t.exit_price)).toLocaleString('id-ID')} · {t.lot} lot
                  {t.r_multiple != null && ` · ${Number(t.r_multiple) >= 0 ? '+' : ''}${Number(t.r_multiple).toFixed(2)}R`}
                </div>
                {t.note && <div className="text-[11px] text-zinc-500 truncate">{t.note}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`font-bold text-sm ${pl >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>{formatRupiah(pl)}</span>
                <button onClick={() => remove(t.id)} className="text-zinc-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, tone, wide }: { label: string; value: string; tone?: 'g' | 'r'; wide?: boolean }) {
  return (
    <div className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-2.5 ${wide ? 'col-span-2' : ''}`}>
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className={`font-black ${tone === 'g' ? 'text-[#00C853]' : tone === 'r' ? 'text-[#FF3B30]' : ''}`}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
