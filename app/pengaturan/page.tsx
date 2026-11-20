'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, LogOut, RotateCcw, XCircle } from 'lucide-react';
import { DEFAULT_WATCHLIST, SYARIAH_SOURCE, SYARIAH_TICKERS } from '@/data/syariah-list';
import { AppSettings, DEFAULT_APP_SETTINGS, loadSettings, saveSettings } from '@/lib/client';

export default function PengaturanPage() {
  const [s, setS] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [universeText, setUniverseText] = useState('');
  const [syariahText, setSyariahText] = useState('');
  const [status, setStatus] = useState<{ db: boolean; dbConfigured?: boolean; keyKind?: string; auth: boolean } | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const cur = loadSettings();
    setS(cur);
    setUniverseText(cur.universe.join(', '));
    setSyariahText((cur.syariahList || []).join(' '));
    fetch('/api/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  const num = (path: (v: number) => AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (Number.isFinite(v)) setS(path(v));
  };

  const save = async () => {
    const universe = Array.from(
      new Set(
        universeText
          .toUpperCase()
          .split(/[\s,;]+/)
          .map((t) => t.replace(/\.JK$/, ''))
          .filter((t) => /^[A-Z]{4}$/.test(t))
      )
    );
    // Ambil hanya token 4 huruf KAPITAL (nama perusahaan di PDF ditulis huruf campuran)
    const STOP = new Set(['KODE', 'NAMA', 'EFEK', 'DAN']);
    const syariahList = Array.from(new Set((syariahText.match(/\b[A-Z]{4}\b/g) || []).filter((t) => !STOP.has(t))));
    if (syariahList.length > 0 && syariahList.length < 100) {
      setMsg(`Daftar syariah hanya berisi ${syariahList.length} kode — sepertinya belum lengkap (DES berisi 600+ saham). Belum disimpan.`);
      return;
    }
    const next = { ...s, universe: universe.length ? universe : DEFAULT_WATCHLIST, syariahList };
    setS(next);
    setUniverseText(next.universe.join(', '));
    await saveSettings(next);
    setMsg(`Tersimpan. ${next.universe.length} saham di universe.`);
    setTimeout(() => setMsg(''), 3000);
  };

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight">Pengaturan</h1>
        <p className="text-sm text-zinc-400">Disimpan di perangkat ini dan disinkronkan ke database.</p>
      </header>

      {status && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-2 text-sm">
          <StatusRow ok={status.auth} okText="Login password aktif" badText="Login TIDAK aktif — isi APP_PASSWORD di Vercel" />
          <StatusRow
            ok={status.db}
            okText="Database terhubung (server-side)"
            badText={
              status.dbConfigured && (status.keyKind === 'anon' || status.keyKind === 'publishable')
                ? 'Key Supabase salah: yang diisi key publik (anon). Ganti SUPABASE_SERVICE_ROLE_KEY dengan service_role key, lalu Redeploy.'
                : 'Database belum diisi — watchlist & jurnal tidak tersimpan'
            }
          />
        </div>
      )}

      <Section title="Modal & risiko">
        <Field label="Modal trading (Rp)">
          <input type="number" inputMode="numeric" className="inp" value={s.screen.modal} onChange={num((v) => ({ ...s, screen: { ...s.screen, modal: v } }))} />
        </Field>
        <Field label="Risiko per trade (% modal)" hint="Ukuran lot dihitung agar kena cut loss = rugi sebesar ini. 0,5–2% umum dipakai.">
          <input type="number" step="0.1" className="inp" value={s.screen.riskPct} onChange={num((v) => ({ ...s, screen: { ...s.screen, riskPct: v } }))} />
        </Field>
      </Section>

      <Section title="Biaya broker">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Beli (%)">
            <input type="number" step="0.01" className="inp" value={s.screen.fees.buyPct} onChange={num((v) => ({ ...s, screen: { ...s.screen, fees: { ...s.screen.fees, buyPct: v } } }))} />
          </Field>
          <Field label="Jual (%)">
            <input type="number" step="0.01" className="inp" value={s.screen.fees.sellPct} onChange={num((v) => ({ ...s, screen: { ...s.screen, fees: { ...s.screen.fees, sellPct: v } } }))} />
          </Field>
        </div>
        <p className="text-xs text-zinc-500">Sesuaikan dengan aplikasi sekuritas Anda (jual biasanya sudah termasuk PPh 0,1%).</p>
      </Section>

      <Section title="Filter likuiditas">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min. nilai/hari Day Trade (miliar)">
            <input type="number" step="0.5" className="inp" value={s.screen.minValueDaytrade / 1e9} onChange={num((v) => ({ ...s, screen: { ...s.screen, minValueDaytrade: v * 1e9 } }))} />
          </Field>
          <Field label="Min. nilai/hari Rebound (miliar)">
            <input type="number" step="0.5" className="inp" value={s.screen.minValueRebound / 1e9} onChange={num((v) => ({ ...s, screen: { ...s.screen, minValueRebound: v * 1e9 } }))} />
          </Field>
        </div>
      </Section>

      <Section title="Auto-refresh saat jam bursa">
        <div className="flex gap-1.5">
          {[0, 3, 5, 10].map((m) => (
            <button
              key={m}
              onClick={() => setS({ ...s, autoRefreshMin: m })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${s.autoRefreshMin === m ? 'bg-[#00C853] text-black' : 'bg-[#232323] text-zinc-300'}`}
            >
              {m === 0 ? 'Mati' : `${m} mnt`}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Universe saham">
        <textarea className="inp h-40 font-mono text-xs" value={universeText} onChange={(e) => setUniverseText(e.target.value)} />
        <div className="flex justify-between items-center">
          <span className="text-xs text-zinc-500">Kode 4 huruf, pisahkan dengan koma/spasi.</span>
          <button onClick={() => setUniverseText(DEFAULT_WATCHLIST.join(', '))} className="text-xs flex items-center gap-1 text-zinc-400">
            <RotateCcw className="w-3.5 h-3.5" /> Default
          </button>
        </div>
      </Section>

      <Section title="Daftar saham syariah">
        <p className="text-xs text-zinc-400">
          Bawaan: <b>{SYARIAH_SOURCE}</b>, {SYARIAH_TICKERS.length} saham.{' '}
          {s.syariahList?.length ? <span className="text-[#FFB300]">Sedang memakai daftar Anda sendiri ({s.syariahList.length} saham).</span> : 'Sedang memakai daftar bawaan.'}
        </p>
        <p className="text-xs text-zinc-500">
          Saat OJK menerbitkan DES baru (akhir Mei & akhir November), tempel semua kode sahamnya di sini. Boleh tempel langsung dari tabel PDF/Excel OJK — kode 4 huruf akan diambil otomatis. Kosongkan untuk kembali ke daftar bawaan.
        </p>
        <textarea className="inp h-28 font-mono text-xs" placeholder="Kosong = pakai daftar bawaan" value={syariahText} onChange={(e) => setSyariahText(e.target.value)} />
      </Section>

      <button onClick={save} className="w-full bg-[#00C853] text-black font-extrabold rounded-2xl py-3.5">
        SIMPAN PENGATURAN
      </button>
      {msg && <div className="text-sm text-[#00C853] text-center">{msg}</div>}

      {status?.auth && (
        <button onClick={logout} className="w-full flex items-center justify-center gap-2 text-sm py-3 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] text-zinc-300">
          <LogOut className="w-4 h-4" /> Keluar
        </button>
      )}
    </div>
  );
}

function StatusRow({ ok, okText, badText }: { ok: boolean; okText: string; badText: string }) {
  return (
    <div className={`flex items-center gap-2 ${ok ? 'text-[#00C853]' : 'text-[#FFB300]'}`}>
      {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {ok ? okText : badText}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-2.5">
      <div className="text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-zinc-500">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-zinc-600 mt-1">{hint}</span>}
    </label>
  );
}
