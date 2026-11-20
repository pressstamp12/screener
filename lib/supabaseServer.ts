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

let client: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (!isDbConfigured) throw new Error('Supabase belum dikonfigurasi (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY)');
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
