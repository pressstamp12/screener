'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';

function LoginForm() {
  const sp = useSearchParams();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    if (res.ok) {
      const next = sp.get('next') || '/';
      window.location.href = next.startsWith('/') ? next : '/';
    } else {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || 'Gagal login');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-24 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 text-lg font-bold">
        <Lock className="w-5 h-5 text-[#00C853]" /> Screener IDX
      </div>
      <p className="text-sm text-zinc-400">Aplikasi pribadi. Masukkan password (APP_PASSWORD di Vercel).</p>
      <input
        type="password"
        autoFocus
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl px-4 py-3 outline-none focus:border-[#00C853]"
        placeholder="Password"
      />
      {err && <p className="text-sm text-[#FF3B30]">{err}</p>}
      <button disabled={busy || !pw} className="w-full bg-[#00C853] text-black font-bold rounded-xl py-3 disabled:opacity-50">
        {busy ? 'Memeriksa…' : 'Masuk'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
