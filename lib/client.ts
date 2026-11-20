'use client';
/** Helper sisi browser: ambil data, akses DB lewat server, simpan pengaturan. */
import { DEFAULT_WATCHLIST } from '@/data/syariah-list';
import { Calibration, DEFAULT_SETTINGS, ScreenSettings, Strategy } from './scoring';
import type { StockSeries } from './types';

export interface AppSettings {
  screen: ScreenSettings;
  universe: string[];
  autoRefreshMin: number; // 0 = mati
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  screen: DEFAULT_SETTINGS,
  universe: DEFAULT_WATCHLIST,
  autoRefreshMin: 5,
};

const LS_SETTINGS = 'sc2_settings';
const LS_CAL = (s: Strategy, m: string) => `sc2_cal_${s}_${m}`;

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function lsSet(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* storage penuh / mode privat */
  }
}

async function handle(res: Response) {
  if (res.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new Error('Belum login');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || `HTTP ${res.status}`) as Error & { notConfigured?: boolean };
    err.notConfigured = Boolean(json.notConfigured);
    throw err;
  }
  return json;
}

let dbStatus: Promise<boolean> | null = null;
/** Cek sekali apakah DB terkonfigurasi, supaya tidak memanggil endpoint yang pasti gagal. */
async function ensureDb() {
  if (!dbStatus) {
    dbStatus = fetch('/api/status')
      .then((r) => r.json())
      .then((j) => Boolean(j.db))
      .catch(() => true);
  }
  if (!(await dbStatus)) {
    const err = new Error('Database belum dikonfigurasi') as Error & { notConfigured?: boolean };
    err.notConfigured = true;
    throw err;
  }
}

export const api = {
  async get<T>(table: string, params: Record<string, string> = {}): Promise<T[]> {
    await ensureDb();
    const qs = new URLSearchParams(params).toString();
    const j = await handle(await fetch(`/api/db/${table}${qs ? `?${qs}` : ''}`, { cache: 'no-store' }));
    return j.data as T[];
  },
  async save<T>(table: string, rows: Record<string, unknown> | Record<string, unknown>[]): Promise<T[]> {
    await ensureDb();
    const body = Array.isArray(rows) ? { rows } : { row: rows };
    const j = await handle(await fetch(`/api/db/${table}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
    return j.data as T[];
  },
  async update(table: string, row: Record<string, unknown>) {
    await ensureDb();
    return handle(await fetch(`/api/db/${table}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) }));
  },
  async remove(table: string, id: number) {
    await ensureDb();
    return handle(await fetch(`/api/db/${table}?id=${id}`, { method: 'DELETE' }));
  },
};

export interface FetchSeriesOptions {
  daily?: '6mo' | '1y' | '2y';
  intraday?: '5d' | '60d' | 'none';
  batchSize?: number;
  concurrency?: number;
  onProgress?: (done: number, total: number, partial: StockSeries[]) => void;
}

export async function fetchSeries(tickers: string[], opts: FetchSeriesOptions = {}) {
  const { daily = '6mo', intraday = '5d', batchSize = 8, concurrency = 3 } = opts;
  const batches: string[][] = [];
  for (let i = 0; i < tickers.length; i += batchSize) batches.push(tickers.slice(i, i + batchSize));
  const series: StockSeries[] = [];
  const errors: { ticker: string; message: string }[] = [];
  let done = 0;
  let next = 0;
  async function worker() {
    while (next < batches.length) {
      const b = batches[next++];
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const j = await handle(await fetch(`/api/candles?tickers=${b.join(',')}&daily=${daily}&intraday=${intraday}`, { cache: 'no-store' }));
          series.push(...j.series);
          errors.push(...j.errors);
          break;
        } catch (e) {
          if (attempt === 1) b.forEach((t) => errors.push({ ticker: t, message: e instanceof Error ? e.message : 'Gagal' }));
          else await new Promise((r) => setTimeout(r, 800));
        }
      }
      done += b.length;
      opts.onProgress?.(Math.min(done, tickers.length), tickers.length, [...series]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, worker));
  return { series, errors };
}

// ---------------------------------------------------------------- pengaturan

export function loadSettings(): AppSettings {
  const s = lsGet<Partial<AppSettings>>(LS_SETTINGS);
  return {
    ...DEFAULT_APP_SETTINGS,
    ...s,
    screen: { ...DEFAULT_SETTINGS, ...(s?.screen || {}), fees: { ...DEFAULT_SETTINGS.fees, ...(s?.screen?.fees || {}) } },
    universe: s?.universe?.length ? s.universe : DEFAULT_WATCHLIST,
  };
}

export async function saveSettings(s: AppSettings) {
  lsSet(LS_SETTINGS, s);
  try {
    await api.save('app_settings', { key: 'settings', value: s });
  } catch {
    /* DB opsional */
  }
}

/** Ambil pengaturan dari DB (sinkron antar perangkat). */
export async function syncSettingsFromDb(): Promise<AppSettings | null> {
  try {
    const rows = await api.get<{ key: string; value: AppSettings }>('app_settings', { key: 'settings' });
    if (rows[0]?.value) {
      lsSet(LS_SETTINGS, rows[0].value);
      return loadSettings();
    }
  } catch {
    /* abaikan */
  }
  return null;
}

export function loadCalibration(strategy: Strategy, mode: 'EOD' | 'INTRADAY'): Calibration | null {
  return lsGet<Calibration>(LS_CAL(strategy, mode));
}

export async function saveCalibration(cal: Calibration) {
  lsSet(LS_CAL(cal.strategy, cal.mode), cal);
  try {
    await api.save('app_settings', { key: `cal_${cal.strategy}_${cal.mode}`, value: cal });
  } catch {
    /* DB opsional */
  }
}

export async function syncCalibrationFromDb() {
  for (const s of ['DAYTRADE', 'REBOUND'] as Strategy[]) {
    for (const m of ['EOD', 'INTRADAY']) {
      try {
        const rows = await api.get<{ value: Calibration }>('app_settings', { key: `cal_${s}_${m}` });
        if (rows[0]?.value) lsSet(LS_CAL(s, m), rows[0].value);
      } catch {
        return;
      }
    }
  }
}

export const cache = { get: lsGet, set: lsSet };
