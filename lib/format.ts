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

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
