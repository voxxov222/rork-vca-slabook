import type { CatalogCard } from './types';

/** Retains collector-number prefixes (TG/GG/SV), ignoring only numeric zero padding. */
export function collectorNumber(value: string): string {
  return value.split('/')[0].trim().toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(^|[A-Z])0+(?=\d)/g, '$1');
}
export const normalizeIdentity = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');
export const normalizeSet = (value: string): string => normalizeIdentity(value).replace(/^baseset$/, 'base');

/** Exact product identity. An absent field never counts as a match. */
export function sameProduct(a: { name: string; set: string; number: string }, b: { name: string; set: string; number: string }): boolean {
  return Boolean(a.name && a.set && collectorNumber(a.number)) && normalizeIdentity(a.name) === normalizeIdentity(b.name) && normalizeSet(a.set) === normalizeSet(b.set) && collectorNumber(a.number) === collectorNumber(b.number);
}

export type Printing = 'normal' | 'holofoil' | 'reverseHolofoil' | '1stEditionHolofoil' | '1stEditionNormal';
/** A selected printing is separate from the catalog artwork. */
export function printingOf(card: Pick<CatalogCard, 'variant'>): Printing | null {
  const v = card.variant.toLowerCase();
  if (/red cheeks|shadowless|unknown|unconfirmed/.test(v)) return null;
  if (/reverse/.test(v)) return 'reverseHolofoil';
  if (/1st|first edition/.test(v)) return /holo/.test(v) ? '1stEditionHolofoil' : '1stEditionNormal';
  if (/non.?holo|normal/.test(v)) return 'normal';
  if (/holo|illustration|rainbow/.test(v)) return 'holofoil';
  if (/normal|unlimited|non-holo/.test(v)) return 'normal';
  return null;
}
