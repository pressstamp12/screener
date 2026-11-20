import { NextResponse } from 'next/server';
import { authEnabled } from '@/lib/auth';
import { isDbConfigured } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ db: isDbConfigured, auth: authEnabled() });
}
