export function money(value: number | null | undefined): string {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1000) {
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function compact(value: number | null | undefined): string {
  const n = Number(value || 0);
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

export function pct(value: number | null | undefined): string {
  const n = Number(value || 0);
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}
