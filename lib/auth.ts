/** Token sesi = HMAC-SHA256(APP_PASSWORD, label). Jalan di Edge (middleware) & Node. */
export const AUTH_COOKIE = 'sc_auth';

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export async function expectedToken(): Promise<string> {
  const secret = process.env.APP_PASSWORD || '';
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('screener-session-v2'));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Perbandingan waktu-konstan sederhana. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
