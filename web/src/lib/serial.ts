/** Official VCA physical-slab certificate numbers. First issued value is VCA-26-0101. */
export const CERT_PREFIX = "VCA-26-";
export const CERT_START = 101;
const CERT_PATTERN = /^VCA-26-(\d{4})$/;

export function parseCertSerial(value: string): number | null {
  const match = value.trim().toUpperCase().match(CERT_PATTERN);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isInteger(n) || n < 1 || n > 9999) return null;
  return n;
}

export function formatCertSerial(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 9999) throw new Error("Serial out of range.");
  return `${CERT_PREFIX}${String(n).padStart(4, "0")}`;
}

export function assertCertSerial(value: string): string {
  const n = parseCertSerial(value);
  if (n === null) throw new Error("Use format VCA-26-0101.");
  if (n < CERT_START) throw new Error("First issued serial is VCA-26-0101.");
  return formatCertSerial(n);
}

export function nextCertSerial(existing: Array<string | null | undefined>): string {
  const nums = existing.map((s) => (s ? parseCertSerial(s) : null)).filter((n): n is number => n !== null);
  const max = nums.length ? Math.max(...nums) : CERT_START - 1;
  const next = Math.max(CERT_START, max + 1);
  if (next > 9999) throw new Error("Serial range exhausted.");
  return formatCertSerial(next);
}
