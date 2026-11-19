export function formatRupiah(value: number, withPrefix = true): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  const formatted = Math.abs(safe).toLocaleString('id-ID');
  const sign = safe < 0 ? '-' : '';
  return withPrefix ? `${sign}Rp ${formatted}` : `${sign}${formatted}`;
}

export function formatPrice(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  return `Rp ${safe.toLocaleString('id-ID')}`;
}

export function formatPercent(value: number, showPlus = true): string {
  const safe = Number.isFinite(value) ? value : 0;
  const prefix = showPlus && safe > 0 ? '+' : '';
  return `${prefix}${safe.toFixed(1)}%`;
}

export function formatDateIndo(isoOrDate: string): string {
  try {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return isoOrDate;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoOrDate;
  }
}

export function formatRelativeTimeIndo(isoOrDate: string): string {
  try {
    const t = new Date(isoOrDate).getTime();
    if (Number.isNaN(t)) return 'baru saja';
    const diffMs = Date.now() - t;
    if (diffMs < 60_000) return 'baru saja';

    const mins = Math.floor(diffMs / 60_000);
    if (mins < 60) return `${mins} menit lalu`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;

    const days = Math.floor(hours / 24);
    if (days === 1) return '1 hari lalu';
    if (days < 7) return `${days} hari lalu`;

    return formatDateIndo(isoOrDate);
  } catch {
    return 'baru saja';
  }
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
