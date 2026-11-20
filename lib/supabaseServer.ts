import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Klien Supabase KHUSUS SERVER memakai service role key.
 * Key ini tidak pernah dikirim ke browser; semua tabel memakai RLS tanpa policy
 * sehingga anon key (kalau bocor) tidak bisa membaca/menulis apa pun.
 */
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isDbConfigured = Boolean(url && key && !url.includes('your-project-id'));

export type KeyKind = 'service_role' | 'secret' | 'anon' | 'publishable' | 'unknown' | 'none';

/** Kenali jenis key tanpa memanggil Supabase. Hanya service_role / sb_secret_ yang bisa melewati RLS. */
export function dbKeyKind(k: string = key): KeyKind {
  if (!k) return 'none';
  if (k.startsWith('sb_secret_')) return 'secret';
  if (k.startsWith('sb_publishable_')) return 'publishable';
  const parts = k.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      if (payload.role === 'service_role') return 'service_role';
      if (payload.role === 'anon') return 'anon';
    } catch {
      /* bukan JWT valid */
    }
  }
  return 'unknown';
}

export const dbKeyOk = ['service_role', 'secret', 'unknown'].includes(dbKeyKind());

export const WRONG_KEY_MSG =
  'SUPABASE_SERVICE_ROLE_KEY di Vercel berisi key publik (anon/publishable), bukan service_role. Ganti dengan service_role key (Supabase → Project Settings → API Keys), lalu Redeploy.';

let client: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (!isDbConfigured) throw new Error('Supabase belum dikonfigurasi (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY)');
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
