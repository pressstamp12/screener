import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { dbKeyKind } from '@/lib/supabaseServer';

const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ iss: 'supabase', role })).toString('base64url')}.sig`;

describe('deteksi jenis key Supabase', () => {
  it('membedakan service_role dan anon', () => {
    expect(dbKeyKind(jwt('service_role'))).toBe('service_role');
    expect(dbKeyKind(jwt('anon'))).toBe('anon');
    expect(dbKeyKind('sb_secret_abc')).toBe('secret');
    expect(dbKeyKind('sb_publishable_abc')).toBe('publishable');
    expect(dbKeyKind('')).toBe('none');
  });
});
