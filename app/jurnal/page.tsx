'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  PlusCircle,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  formatDateIndo,
  formatPrice,
  formatRupiah,
  getTodayISO,
} from '@/lib/format';
import { TradeItem } from '@/lib/types';

export default function JurnalPage() {
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Form state
  const [ticker, setTicker] = useState<string>('');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [exitPrice, setExitPrice] = useState<string>('');
  const [lot, setLot] = useState<string>('1');
  const [note, setNote] = useState<string>('');
  const [tradeDate, setTradeDate] = useState<string>(getTodayISO());

  const loadTrades = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setErrorMsg('ENV Supabase belum diset. Cek README untuk panduan setup.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('trade_date', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      setErrorMsg(`Gagal ambil riwayat trade: ${error.message}`);
    } else {
      setTrades((data || []) as TradeItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTrades();
  }, []);

  // Preview profit/loss otomatis saat mengetik
  const previewPL = useMemo(() => {
    const entry = Number(entryPrice) || 0;
    const exit = Number(exitPrice) || 0;
    const lotNum = Number(lot) || 0;
    if (entry <= 0 || exit <= 0 || lotNum <= 0) return 0;
    return (exit - entry) * lotNum * 100;
  }, [entryPrice, exitPrice, lot]);

  // Statistik keseluruhan
  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter((t) => Number(t.profit_loss) > 0).length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const totalPL = trades.reduce((acc, t) => acc + Number(t.profit_loss), 0);
    return { total, wins, winRate, totalPL };
  }, [trades]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setErrorMsg('Isi ENV Supabase dulu ya biar bisa simpan jurnal.');
      return;
    }

    const cleanTicker = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
    const entry = Number(entryPrice);
    const exit = Number(exitPrice);
    const lotNum = Number(lot);

    if (!cleanTicker || entry <= 0 || exit <= 0 || lotNum <= 0) {
      setErrorMsg('Lengkapi Ticker, Harga Entry, Harga Exit, dan Lot dulu.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setStatusMsg('');

    const profitLoss = (exit - entry) * lotNum * 100;

    const { data, error } = await supabase
      .from('trades')
      .insert({
        ticker: cleanTicker,
        entry_price: entry,
        exit_price: exit,
        lot: lotNum,
        profit_loss: profitLoss,
        note: note.trim(),
        trade_date: tradeDate || getTodayISO(),
      })
      .select()
      .single();

    if (error) {
      setErrorMsg(`Gagal simpan trade: ${error.message}`);
    } else if (data) {
      setTrades((prev) => [data as TradeItem, ...prev]);
      setTicker('');
      setEntryPrice('');
      setExitPrice('');
      setLot('1');
      setNote('');
      setStatusMsg(`Trade ${cleanTicker} berhasil dicatat di jurnal!`);
    }

    setSubmitting(false);
  };

  const handleDeleteTrade = async (id: number) => {
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (error) {
      setErrorMsg(`Gagal hapus data: ${error.message}`);
      return;
    }
    setTrades((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-black tracking-tight text-white">
          Jurnal & Riwayat
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Catat tiap eksekusi biar makin disiplin & evaluasi gampang
        </p>
      </header>

      {/* Statistik Ringkas */}
      <section className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-3 text-center">
          <span className="text-[11px] text-zinc-400 block">Total Trade</span>
          <span className="text-2xl font-black text-white mt-0.5 block">
            {stats.total}
          </span>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-3 text-center">
          <span className="text-[11px] text-zinc-400 block">Win Rate</span>
          <span
            className={`text-2xl font-black mt-0.5 block ${
              stats.winRate >= 50 ? 'text-[#00C853]' : 'text-[#FFB300]'
            }`}
          >
            {stats.winRate.toFixed(0)}%
          </span>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-3 text-center">
          <span className="text-[11px] text-zinc-400 block">Total P/L</span>
          <span
            className={`text-sm font-black mt-2 block leading-tight ${
              stats.totalPL >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'
            }`}
          >
            {stats.totalPL >= 0 ? '+' : ''}
            {formatRupiah(stats.totalPL)}
          </span>
        </div>
      </section>

      {/* Form Input Trade */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-3.5"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <PlusCircle className="w-4 h-4 text-[#00C853]" />
          <span>Catat Hasil Trade</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">
              Ticker
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="ADRO"
              maxLength={6}
              required
              className="w-full bg-[#121212] border border-[#333] rounded-xl px-3 py-2.5 text-sm font-extrabold text-white uppercase focus:outline-none focus:border-[#00C853]"
            />
          </div>

          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">
              Tanggal
            </label>
            <input
              type="date"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              className="w-full bg-[#121212] border border-[#333] rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#00C853]"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">
              Entry (Rp)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="2500"
              required
              className="w-full bg-[#121212] border border-[#333] rounded-xl px-2.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#00C853]"
            />
          </div>

          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">
              Exit (Rp)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              placeholder="2700"
              required
              className="w-full bg-[#121212] border border-[#333] rounded-xl px-2.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#00C853]"
            />
          </div>

          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">Lot</label>
            <input
              type="number"
              inputMode="numeric"
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              placeholder="2"
              min={1}
              required
              className="w-full bg-[#121212] border border-[#333] rounded-xl px-2.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-[#00C853]"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-zinc-400 block mb-1">
            Alasan Masuk / Catatan
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Mantul support 20H + RSI 34 + volume naik"
            className="w-full bg-[#121212] border border-[#333] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00C853]"
          />
        </div>

        {/* Preview Hasil Untung / Rugi */}
        {entryPrice && exitPrice && (
          <div className="flex items-center justify-between bg-[#121212] border border-[#252525] rounded-xl px-3.5 py-2.5">
            <span className="text-xs text-zinc-400">Hasil Estimasi</span>
            <span
              className={`text-sm font-black ${
                previewPL >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'
              }`}
            >
              {previewPL >= 0 ? 'UNTUNG ' : 'RUGI '}
              {previewPL >= 0 ? '+' : ''}
              {formatRupiah(previewPL)}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[52px] bg-[#00C853] hover:bg-[#00e05d] disabled:opacity-60 text-black font-black text-base rounded-2xl transition-all active:scale-[0.98]"
        >
          {submitting ? 'Menyimpan...' : 'SIMPAN KE JURNAL'}
        </button>
      </form>

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

      {/* Daftar Riwayat Trade */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-300">Riwayat Trade</h2>

        {loading ? (
          <p className="text-center py-6 text-sm text-zinc-400">
            Memuat riwayat...
          </p>
        ) : trades.length === 0 ? (
          <div className="bg-[#1A1A1A] border border-dashed border-[#333] rounded-2xl p-8 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="font-bold text-zinc-200">Belum ada catatan trade</p>
            <p className="text-xs text-zinc-400">
              Mulai catat hasil buy & sell kamu di form atas.
            </p>
          </div>
        ) : (
          trades.map((t) => {
            const isWin = Number(t.profit_loss) >= 0;
            const pct =
              Number(t.entry_price) > 0
                ? ((Number(t.exit_price) - Number(t.entry_price)) /
                    Number(t.entry_price)) *
                  100
                : 0;

            return (
              <article
                key={t.id}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-white">
                        {t.ticker}
                      </span>
                      <span
                        className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                          isWin
                            ? 'bg-[#00C853]/15 text-[#00C853]'
                            : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                        }`}
                      >
                        {isWin ? 'UNTUNG' : 'RUGI'}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {formatDateIndo(t.trade_date)} · {t.lot} Lot
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span
                        className={`text-base font-black block ${
                          isWin ? 'text-[#00C853]' : 'text-[#FF3B30]'
                        }`}
                      >
                        {isWin ? '+' : ''}
                        {formatRupiah(Number(t.profit_loss))}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {pct >= 0 ? '+' : ''}
                        {pct.toFixed(1)}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTrade(t.id)}
                      aria-label="Hapus trade"
                      className="p-2 rounded-xl bg-[#121212] text-zinc-500 hover:text-[#FF3B30]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-300 bg-[#121212] rounded-xl px-3 py-2">
                  <span>
                    Entry: <strong>{formatPrice(Number(t.entry_price))}</strong>
                  </span>
                  <span className="text-zinc-600">→</span>
                  <span>
                    Exit: <strong>{formatPrice(Number(t.exit_price))}</strong>
                  </span>
                </div>

                {t.note && (
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    &ldquo;{t.note}&rdquo;
                  </p>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
