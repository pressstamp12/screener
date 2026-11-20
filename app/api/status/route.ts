import { NextResponse } from 'next/server';
import { authEnabled } from '@/lib/auth';
import { dbKeyKind, dbKeyOk, isDbConfigured } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ db: isDbConfigured && dbKeyOk, dbConfigured: isDbConfigured, keyKind: dbKeyKind(), auth: authEnabled() });
}
