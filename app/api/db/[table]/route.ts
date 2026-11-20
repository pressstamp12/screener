import { NextRequest, NextResponse } from 'next/server';
import { db, dbKeyOk, isDbConfigured, WRONG_KEY_MSG } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Tabel yang boleh diakses + kolom yang boleh ditulis + konflik upsert. */
const TABLES: Record<string, { order: string; asc?: boolean; cols: string[]; conflict?: string }> = {
  watchlist: { order: 'created_at', cols: ['ticker', 'strategy', 'entry_plan', 'tp', 'sl', 'lot', 'modal', 'score', 'note'], conflict: 'ticker' },
  trades: {
    order: 'trade_date',
    cols: ['ticker', 'strategy', 'entry_price', 'exit_price', 'sl', 'tp', 'lot', 'fees', 'profit_loss', 'r_multiple', 'score_at_entry', 'note', 'trade_date'],
  },
  screening_results: {
    order: 'date',
    cols: ['date', 'ticker', 'strategy', 'price', 'support', 'resistance', 'rsi', 'volume_ratio', 'score', 'label', 'is_syariah', 'entry', 'sl', 'tp1'],
    conflict: 'date,ticker,strategy',
  },
  app_settings: { order: 'key', asc: true, cols: ['key', 'value'], conflict: 'key' },
};

function pick(row: Record<string, unknown>, cols: string[]) {
  const out: Record<string, unknown> = {};
  for (const c of cols) if (c in row) out[c] = row[c];
  return out;
}

function guard(table: string) {
  if (!isDbConfigured) return NextResponse.json({ error: 'Database belum dikonfigurasi', notConfigured: true }, { status: 503 });
  if (!dbKeyOk) return NextResponse.json({ error: WRONG_KEY_MSG, wrongKey: true }, { status: 503 });
  if (!TABLES[table]) return NextResponse.json({ error: 'Tabel tidak dikenal' }, { status: 404 });
  return null;
}

const GRANT_MSG =
  'Izin tabel belum diberikan ke service_role. Jalankan ulang supabase/schema.sql (bagian GRANT di paling bawah) di Supabase SQL Editor.';

function dbError(message: string) {
  const msg = /row-level security/i.test(message) ? WRONG_KEY_MSG : /permission denied/i.test(message) ? GRANT_MSG : message;
  return NextResponse.json({ error: msg }, { status: 500 });
}

export async function GET(req: NextRequest, { params }: { params: { table: string } }) {
  const g = guard(params.table);
  if (g) return g;
  const cfg = TABLES[params.table];
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get('limit')) || 500, 2000);
  let q = db().from(params.table).select('*').order(cfg.order, { ascending: Boolean(cfg.asc) }).limit(limit);
  const key = sp.get('key');
  if (key && params.table === 'app_settings') q = q.eq('key', key);
  const since = sp.get('since');
  if (since && params.table === 'screening_results') q = q.gte('date', since);
  const { data, error } = await q;
  if (error) return dbError(error.message);
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: { table: string } }) {
  const g = guard(params.table);
  if (g) return g;
  const cfg = TABLES[params.table];
  const body = await req.json().catch(() => null);
  const rows = (Array.isArray(body?.rows) ? body.rows : body?.row ? [body.row] : []).map((r: Record<string, unknown>) => pick(r, cfg.cols));
  if (!rows.length) return NextResponse.json({ error: 'Tidak ada data' }, { status: 400 });
  if (params.table === 'app_settings') rows.forEach((r: Record<string, unknown>) => (r.updated_at = new Date().toISOString()));
  const q = cfg.conflict ? db().from(params.table).upsert(rows, { onConflict: cfg.conflict }) : db().from(params.table).insert(rows);
  const { data, error } = await q.select();
  if (error) return dbError(error.message);
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: { table: string } }) {
  const g = guard(params.table);
  if (g) return g;
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 });
  const { data, error } = await db().from(params.table).update(pick(body, TABLES[params.table].cols)).eq('id', id).select();
  if (error) return dbError(error.message);
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, { params }: { params: { table: string } }) {
  const g = guard(params.table);
  if (g) return g;
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 });
  const { error } = await db().from(params.table).delete().eq('id', id);
  if (error) return dbError(error.message);
  return NextResponse.json({ ok: true });
}
