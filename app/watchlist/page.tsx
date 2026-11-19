'use client';

import { useEffect, useState } from 'react';
import {
  Bookmark,
  RefreshCw,
  Trash2,
  Save,
  Plus,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { formatPercent, formatPrice, formatRupiah } from '@/lib/format';
import { WatchlistItem } from '@/lib/types';
import { isSyariahTicker } from '@/data/syariah-list';

interface LivePriceMap {
  [ticker: string]: {
    price: number;
    changePercent: number;
  };
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [livePrices, setLivePrices] = useState<LivePriceMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingPrices, setCheckingPrices] = useState<boolean>(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Form tambah ticker manual
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newTicker, setNewTicker] = useState<string>('');

  const loadWatchlist = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setErrorMsg('ENV Supabase belum diset. Cek README untuk panduan setup.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg(`Gagal memuat watchlist: ${error.message}`);
    } else {
      setItems((data || []) as WatchlistItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleFieldChange = (
    id: number,
    field: 'entry_plan' | 'tp' | 'sl' | 'lot' | 'modal',
    rawVal: string
  ) => {
    const num = Number(rawVal) || 0;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: num };
        // Otomatis sinkronkan modal saat entry_plan atau lot diubah
        if (field === 'entry_plan' || field === 'lot') {
          updated.modal = updated.entry_plan * updated.lot * 100;
        }
        return updated;
      })
    );
  };

  const handleSaveItem = async (item: WatchlistItem) => {
    setSavingId(item.id);
    setErrorMsg('');
    setStatusMsg('');

    const { error } = await supabase
      .from('watchlist')
      .update({
        entry_plan: item.entry_plan,
        tp: item.tp,
        sl: item.sl,
        lot: item.lot,
        modal: item.modal,
      })
      .eq('id', item.id);

    if (error) {
      setErrorMsg(`Gagal simpan ${item.ticker}: ${error.message}`);
    } else {
      setStatusMsg(`Rencana trading ${item.ticker} tersimpan!`);
    }
    setSavingId(null);
  };

  const handleDeleteItem = async (id: number, ticker: string) => {
    const { error } = await supabase.from('watchlist').delete().eq('id', id);
    if (error) {
      setErrorMsg(`Gagal hapus ${ticker}: ${error.message}`);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setStatusMsg(`${ticker} dihapus dari watchlist.`);
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTicker.replace(/\.JK$/i, '').trim().toUpperCase();
    if (!clean) return;

    setErrorMsg('');
    const { data, error } = await supabase
      .from('watchlist')
      .upsert(
        {
          ticker: clean,
          entry_plan: 0,
          tp: 0,
          sl: 0,
          lot: 1,
          modal: 0,
        },
        { onConflict: 'ticker' }
      )
      .select()
      .single();

    if (error) {
      setErrorMsg(`Gagal tambah ${clean}: ${error.message}`);
      return;
    }

    if (data) {
      setItems((prev) => {
        const exists = prev.some((i) => i.ticker === clean);
        return exists ? prev : [data as WatchlistItem, ...prev];
      });
    }
    setNewTicker('');
    setShowAddForm(false);
    setStatusMsg(`${clean} ditambahkan ke watchlist!`);
  };

  const handleCheckLatestPrices = async () => {
    if (items.length === 0) return;
    setCheckingPrices(true);
    setErrorMsg('');
    setStatusMsg('');

    try {
      const tickers = items.map((i) => i.ticker).join(',');
      const res = await fetch(`/api/stocks?tickers=${tickers}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Gagal cek harga dari Yahoo Finance.');

      const data = await res.json();
      const map: LivePriceMap = {};

      for (const s of data.stocks || []) {
        const prev = s.prevClose || s.price;
        const pct = prev > 0 ? ((s.price - prev) / prev) * 100 : 0;
        map[s.ticker] = {
          price: Math.round(s.price),
          changePercent: Number(pct.toFixed(2)),
        };
      }

      setLivePrices(map);
      setStatusMsg(`Harga terbaru ${Object.keys(map).length} saham berhasil di-update!`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal update harga terbaru.'
      );
    } finally {
      setCheckingPrices(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Watchlist Saya
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Atur plan Entry, TP, SL & cek Risk/Reward otomatis
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="bg-[#1A1A1A] border border-[#2E2E2E] text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#00C853]" />
          Tambah
        </button>
      </header>

      {/* Form Tambah Manual */}
      {showAddForm && (
        <form
          onSubmit={handleAddManual}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-3.5 flex gap-2"
        >
          <input
            type="text"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            placeholder="Ketik ticker (misal: ADRO)"
            maxLength={6}
            className="flex-1 bg-[#121212] border border-[#333] rounded-xl px-3.5 py-2.5 text-sm font-bold text-white uppercase focus:outline-none focus:border-[#00C853]"
          />
          <button
            type="submit"
            className="bg-[#00C853] text-black font-black text-sm px-4 rounded-xl active:scale-95"
          >
            Simpan
          </button>
        </form>
      )}

      {/* Tombol Besar CEK HARGA TERBARU */}
      <button
        type="button"
        disabled={checkingPrices || items.length === 0}
        onClick={handleCheckLatestPrices}
        className="w-full min-h-[54px] bg-[#00C853] hover:bg-[#00e05d] disabled:opacity-50 text-black font-black text-base rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-[#00C853]/20 transition-all active:scale-[0.98]"
      >
        <RefreshCw
          className={`w-5 h-5 ${checkingPrices ? 'animate-spin' : ''}`}
        />
        {checkingPrices ? 'Mengambil harga terbaru...' : 'CEK HARGA TERBARU'}
      </button>

      {/* Feedback */}
      {errorMsg && (
        <div className="bg-[#FF3B30]/15 border border-[#FF3B30]/40 text-[#FF6B63] rounded-2xl p-3.5 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {statusMsg && !errorMsg && (
        <div className="bg-[#00C853]/10 border border-[#00C853]/30 text-[#00C853] rounded-2xl p-3 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* List Watchlist */}
      {loading ? (
        <div className="text-center py-10 text-zinc-400 text-sm">
          Memuat watchlist kamu...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-dashed border-[#333] rounded-2xl p-8 text-center space-y-2">
          <Bookmark className="w-10 h-10 text-zinc-600 mx-auto" />
          <p className="font-bold text-zinc-200">Watchlist masih kosong</p>
          <p className="text-xs text-zinc-400">
            Scan dulu di halaman Screening lalu klik &quot;Simpan ke Watchlist&quot;.
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          {items.map((item) => {
            const live = livePrices[item.ticker];
            const shares = item.lot * 100;
            const entry = item.entry_plan;
            const estProfitRp =
              entry > 0 && item.tp > 0 ? (item.tp - entry) * shares : 0;
            const estProfitPct =
              entry > 0 && item.tp > 0 ? ((item.tp - entry) / entry) * 100 : 0;

            const estLossRp =
              entry > 0 && item.sl > 0 ? (entry - item.sl) * shares : 0;
            const estLossPct =
              entry > 0 && item.sl > 0 ? ((entry - item.sl) / entry) * 100 : 0;

            const risk = entry - item.sl;
            const reward = item.tp - entry;
            const rrRatio =
              risk > 0 && reward > 0 ? (reward / risk).toFixed(2) : null;

            return (
              <article
                key={item.id}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-4"
              >
                {/* Header Card */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-white">
                        {item.ticker}
                      </h2>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isSyariahTicker(item.ticker)
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-700/40 text-zinc-300 border-zinc-600/50'
                        }`}
                      >
                        {isSyariahTicker(item.ticker) ? 'SYARIAH' : 'NON-SYARIAH'}
                      </span>
                    </div>

                    {live && (
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-zinc-400">Harga Live:</span>
                        <span className="font-extrabold text-white text-sm">
                          {formatPrice(live.price)}
                        </span>
                        <span
                          className={`font-bold ${
                            live.changePercent >= 0
                              ? 'text-[#00C853]'
                              : 'text-[#FF3B30]'
                          }`}
                        >
                          ({formatPercent(live.changePercent)})
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id, item.ticker)}
                    aria-label={`Hapus ${item.ticker}`}
                    className="p-2 rounded-xl bg-[#121212] text-zinc-400 hover:text-[#FF3B30] border border-[#262626]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Input Trading Plan */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      Beli Rencana
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={item.entry_plan || ''}
                      onChange={(e) =>
                        handleFieldChange(item.id, 'entry_plan', e.target.value)
                      }
                      className="w-full bg-[#121212] border border-[#333] rounded-xl px-2.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#00C853]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#00C853] block mb-1">
                      Target (TP)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={item.tp || ''}
                      onChange={(e) =>
                        handleFieldChange(item.id, 'tp', e.target.value)
                      }
                      className="w-full bg-[#121212] border border-[#00C853]/40 rounded-xl px-2.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#00C853]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#FF3B30] block mb-1">
                      Cut Loss (SL)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={item.sl || ''}
                      onChange={(e) =>
                        handleFieldChange(item.id, 'sl', e.target.value)
                      }
                      className="w-full bg-[#121212] border border-[#FF3B30]/40 rounded-xl px-2.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#FF3B30]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      Jumlah Lot
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={item.lot || ''}
                      onChange={(e) =>
                        handleFieldChange(item.id, 'lot', e.target.value)
                      }
                      className="w-full bg-[#121212] border border-[#333] rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#00C853]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      Modal (Rp)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={item.modal || ''}
                      onChange={(e) =>
                        handleFieldChange(item.id, 'modal', e.target.value)
                      }
                      className="w-full bg-[#121212] border border-[#333] rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#00C853]"
                    />
                  </div>
                </div>

                {/* Kalkulasi Otomatis Profit, Loss, R/R */}
                <div className="bg-[#121212] border border-[#252525] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Estimasi Untung (TP)</span>
                    <span className="font-extrabold text-[#00C853]">
                      +{formatRupiah(Math.max(0, estProfitRp))} (
                      {formatPercent(estProfitPct)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Estimasi Rugi (SL)</span>
                    <span className="font-extrabold text-[#FF3B30]">
                      -{formatRupiah(Math.max(0, estLossRp))} (
                      -{Math.max(0, estLossPct).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#242424] flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      Risk / Reward Ratio
                    </span>
                    <span
                      className={`text-sm font-black px-2.5 py-0.5 rounded-lg ${
                        rrRatio && Number(rrRatio) >= 2
                          ? 'bg-[#00C853]/15 text-[#00C853]'
                          : rrRatio && Number(rrRatio) >= 1
                          ? 'bg-[#FFB300]/15 text-[#FFB300]'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {rrRatio ? `1 : ${rrRatio}` : 'Set Entry, TP & SL'}
                    </span>
                  </div>
                </div>

                {/* Tombol Simpan Perubahan */}
                <button
                  type="button"
                  disabled={savingId === item.id}
                  onClick={() => handleSaveItem(item)}
                  className="w-full min-h-[46px] bg-[#252525] hover:bg-[#303030] text-white font-bold text-sm rounded-xl border border-[#3A3A3A] flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Save className="w-4 h-4 text-[#00C853]" />
                  {savingId === item.id ? 'Menyimpan...' : 'SIMPAN PLAN'}
                </button>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
