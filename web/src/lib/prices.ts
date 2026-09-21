import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { CATALOG, cardById } from './data';
import { collectorNumber, normalizeIdentity, normalizeSet, printingOf, sameProduct } from './identity';
import type { CatalogCard, CollectionItem } from './types';
import { supabase } from './supabase';

export interface PriceEvidence { source: string; updatedAt: string; currency: 'USD'; printing: string; condition: string }
/** Missing prices remain NaN; source/date applies separately to each value. */
export interface LivePrices {
  raw: number; g10: number; g9: number; g8: number;
  history: { t: number; p: number }[]; rawHistory: { t: number; p: number }[];
  updatedAt: string; source: string;
  evidence?: Partial<Record<'raw' | 'g10' | 'g9' | 'g8', PriceEvidence>>;
  rawConditions?: Record<string, { price: number; evidence: PriceEvidence }>;
}
export type PriceCard = Pick<CatalogCard, 'id' | 'name' | 'number' | 'set' | 'tcgCardId'> & Partial<Pick<CatalogCard, 'variant' | 'language' | 'tcgdexId'>>;
const PTCG = 'https://api.pokemontcg.io/v2/cards';
const DEX = 'https://api.tcgdex.net/v2/en';
interface DexBrief { id: string; localId: string; name: string; image?: string }
interface DexCard extends DexBrief { rarity?: string; types?: string[]; set: { id: string; name: string; cardCount?: { official?: number } }; pricing?: { tcgplayer?: { unit?: string; updated?: string; [key: string]: unknown } } }
const dexCache = new Map<string, DexCard>();
async function dexCard(id: string, signal?: AbortSignal): Promise<DexCard> { const cached = dexCache.get(id); if (cached) return cached; const card = await json<DexCard>(`${DEX}/cards/${encodeURIComponent(id)}`, {}, signal); if (dexCache.size > 200) dexCache.clear(); dexCache.set(id, card); return card; }
async function searchDex(name: string, setName: string, number: string, signal?: AbortSignal): Promise<RealCardCandidate[]> {
  const [briefs, sets] = await Promise.all([json<DexBrief[]>(`${DEX}/cards?name=${encodeURIComponent(name)}`, {}, signal), json<{ id: string; name: string }[]>(`${DEX}/sets`, {}, signal)]);
  const setNames = new Map(sets.map(s => [s.id, s.name]));
  const matching = briefs.filter(b => (!setName || normalizeSet(setNames.get(b.id.slice(0, b.id.lastIndexOf('-'))) ?? '') === normalizeSet(setName)) && (!number || collectorNumber(b.localId) === collectorNumber(number)));
  const cards = await Promise.all(matching.slice(0, 24).map(b => dexCard(b.id, signal).catch(() => null)));
  return cards.filter((c): c is DexCard => Boolean(c)).map(c => {
    const converted = product({ id: c.id, name: c.name, number: c.localId, rarity: c.rarity, types: c.types, images: { large: c.image ? `${c.image}/high.webp` : '' }, set: { id: c.set.id, name: c.set.name, printedTotal: c.set.cardCount?.official } });
    converted.tcgdexId = c.id; converted.tcgCardId = '';
    return { slug: c.id, name: c.name, setName: c.set.name, number: c.localId, rarity: c.rarity ?? 'Unknown', raw: null, psa10: null, card: converted };
  });
}
async function fetchGraded(card: PriceCard): Promise<{ data?: Row[] } | null> {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getSession(); if (!auth.session) return null;
  const result = await supabase.functions.invoke('vca-graded-prices', { body: { name: card.name, set: card.set } });
  return result.error ? null : result.data as { data?: Row[] };
}
async function fetchDexRaw(card: PriceCard, printing: string): Promise<{ raw: number; updatedAt: string; source: string } | null> {
  const id = card.tcgdexId ?? card.tcgCardId.replace(/^jungle-/, 'base2-').replace(/^fossil-/, 'base3-').replace(/^teamrocket-/, 'base5-');
  if (!id) return null;
  const row = await dexCard(id);
  if (!sameProduct(card, { name: row.name, set: row.set.name, number: row.localId })) return null;
  const market = row.pricing?.tcgplayer; if (market?.unit !== 'USD') return null;
  const field = ({ normal: 'normal', holofoil: 'holofoil', reverseHolofoil: 'reverse-holofoil', '1stEditionNormal': '1st-edition', '1stEditionHolofoil': '1st-edition-holofoil' } as Record<string, string>)[printing];
  const value = (market[field] as { marketPrice?: number } | undefined)?.marketPrice;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? { raw: value, updatedAt: market.updated?.slice(0, 10) ?? 'Date unavailable', source: 'TCGPlayer via TCGdex' } : null;
}

async function json<T>(url: string, headers: Record<string, string> = {}, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(16000);
  const response = await fetch(url, { headers, signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (!response.ok) throw new Error(response.status === 429 ? 'Card service is busy. Please retry shortly.' : 'Card service is unavailable. Please retry.');
  return response.json() as Promise<T>;
}
interface PtcgCard {
  id: string; name: string; number: string; rarity?: string; types?: string[];
  images?: { small?: string; large?: string };
  set: { id: string; name: string; printedTotal?: number; releaseDate?: string };
  tcgplayer?: { updatedAt?: string; prices?: Record<string, { market?: number }> };
}
export interface RealCardCandidate { slug: string; name: string; setName: string; number: string; rarity: string; raw: number | null; psa10: number | null; card?: CatalogCard }
function product(c: PtcgCard): CatalogCard {
  const local = CATALOG.find(x => x.tcgCardId === c.id);
  return { id: local?.id ?? c.id, name: c.name, pokemon: c.name, set: c.set.name, number: c.number + (c.set.printedTotal ? `/${c.set.printedTotal}` : ''), rarity: (c.rarity ?? 'Rare') as CatalogCard['rarity'], year: Number(c.set.releaseDate?.slice(0, 4)) || 0, language: 'English', variant: 'Unconfirmed', type: (c.types?.[0] ?? 'Colorless') as CatalogCard['type'], artKey: 'abyss', artUrl: c.images?.large ?? c.images?.small ?? '', tcgCardId: c.id, prices: { raw: NaN, g10: NaN, g9: NaN, g8: NaN }, priceDate: 'Unavailable', priceSource: 'No verified price', history: [], historyMetric: 'VCA 10' };
}
/** English catalog search across the provider, not just bundled examples. */
export async function searchRealCards(setName: string, name: string, signal?: AbortSignal, number = ''): Promise<RealCardCandidate[]> {
  if (!name.trim()) return [];
  try { return await searchDex(name, setName, number, signal); } catch { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); }
  const clean = name.replace(/[^\p{L}\p{N} .'-]/gu, '').slice(0, 80);
  const q = `name:"${clean}"${setName.trim() ? ` set.name:"${setName.replace(/[^\p{L}\p{N} .'-]/gu, '')}"` : ''}`;
  const result = await json<{ data?: PtcgCard[] }>(`${PTCG}?q=${encodeURIComponent(q)}&pageSize=100`, {}, signal);
  return (result.data ?? []).map(c => ({ slug: c.id, name: c.name, setName: c.set.name, number: c.number, rarity: c.rarity ?? 'Unknown', raw: null, psa10: null, card: product(c) }));
}
/** Never select the first result or discard collector-number prefixes. */
export function pickRealMatch(candidates: RealCardCandidate[], number: string, name: string, setName?: string): RealCardCandidate | null {
  const hits = candidates.filter(c => collectorNumber(c.number) === collectorNumber(number) && normalizeIdentity(c.name) === normalizeIdentity(name) && (!setName || sameProduct({ name, number, set: setName }, { name: c.name, number: c.number, set: c.setName })));
  return hits.length === 1 ? hits[0] : null;
}
export async function fetchPokeTcgRaw(id: string, printing = 'holofoil'): Promise<{ raw: number; updatedAt: string } | null> {
  if (!id) return null;
  const result = await json<{ data?: PtcgCard }>(`${PTCG}/${encodeURIComponent(id)}`);
  if (result.data?.id !== id) return null;
  const raw = result.data.tcgplayer?.prices?.[printing]?.market;
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? { raw, updatedAt: result.data.tcgplayer?.updatedAt ?? 'Date unavailable' } : null;
}
interface Market { currency: string; price: number; updated_at?: number; price_history?: { t: number; p: number }[] }
interface Variant { type?: string; condition?: string; printing?: string; language?: string; grading?: { company?: string; grade?: string | number }; markets?: Market[] }
interface Row { name?: string; number?: string; set?: { name?: string }; variants?: Variant[] }
const usdMarket = (v: Variant): Market | undefined => v.markets?.find(m => m.currency === 'USD' && Number.isFinite(m.price) && m.price > 0);
const printingMatches = (actual: string, selected: string): boolean => {
  const a = normalizeIdentity(actual); const s = normalizeIdentity(selected);
  const known: Record<string, string[]> = { normal: ['normal', 'nonholo', 'unlimited'], holofoil: ['holo', 'holofoil', 'unlimitedholo'], reverseholofoil: ['reverseholo', 'reverseholofoil'], '1steditionholofoil': ['1steditionholo', '1steditionholofoil'], '1steditionnormal': ['1stedition', '1steditionnormal'] };
  return known[s]?.includes(a) ?? false;
};
export async function fetchLivePrices(card: PriceCard | undefined): Promise<LivePrices | null> {
  if (!card || !/^english/i.test(card.language ?? 'English')) return null;
  const printing = printingOf({ variant: card.variant ?? 'Unconfirmed' });
  if (!printing) return null;
  const [rawResult, graded] = await Promise.all([
    fetchDexRaw(card, printing).catch(() => null).then(async dex => { if (dex) return dex; const raw = await fetchPokeTcgRaw(card.tcgCardId, printing).catch(() => null); return raw ? { ...raw, source: 'TCGPlayer via pokemontcg.io' } : null; }),
    fetchGraded(card).catch(() => null),
  ]);
  const rows = graded?.data?.filter(r => sameProduct(card, { name: r.name ?? '', set: r.set?.name ?? '', number: r.number ?? '' })) ?? [];
  const variants = rows.length === 1 ? (rows[0].variants ?? []).filter(v => printingMatches(v.printing ?? '', printing) && (!v.language || /^english$/i.test(v.language))) : [];
  const result: LivePrices = { raw: rawResult?.raw ?? NaN, g10: NaN, g9: NaN, g8: NaN, history: [], rawHistory: [], updatedAt: rawResult?.updatedAt ?? 'Date unavailable', source: 'Market comparisons', evidence: {} };
  if (rawResult) result.evidence!.raw = { source: rawResult.source, updatedAt: rawResult.updatedAt, currency: 'USD', printing, condition: 'Provider market aggregate (not condition-specific)' };
  for (const grade of ['10', '9', '8'] as const) {
    const matches = variants.filter(v => v.type === 'graded' && v.grading?.company?.toUpperCase() === 'PSA' && String(v.grading?.grade) === grade && usdMarket(v));
    if (matches.length !== 1) continue;
    const market = usdMarket(matches[0])!;
    const field = `g${grade}` as 'g10' | 'g9' | 'g8';
    result[field] = market.price;
    const updatedAt = market.updated_at ? new Date(market.updated_at * 1000).toISOString().slice(0, 10) : 'Date unavailable';
    result.evidence![field] = { source: 'JustTCG · PSA', updatedAt, currency: 'USD', printing, condition: `PSA ${grade}` };
    if (grade === '10') result.history = (market.price_history ?? []).filter(p => Number.isFinite(p.p) && p.p > 0).sort((a, b) => a.t - b.t);
  }
  result.rawConditions = {};
  for (const condition of ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged']) {
    const quotes = variants.filter(v => v.type === 'raw' && v.condition === condition && usdMarket(v));
    if (quotes.length !== 1) continue;
    const market = usdMarket(quotes[0])!;
    result.rawConditions[condition] = { price: market.price, evidence: { source: 'JustTCG', updatedAt: market.updated_at ? new Date(market.updated_at * 1000).toISOString().slice(0, 10) : 'Date unavailable', currency: 'USD', printing, condition } };
  }
  const rawVariants = variants.filter(v => v.type === 'raw' && v.condition === 'Near Mint' && usdMarket(v));
  if (rawVariants.length === 1) {
    const market = usdMarket(rawVariants[0])!;
    result.rawHistory = (market.price_history ?? []).filter(p => Number.isFinite(p.p) && p.p > 0).sort((a, b) => a.t - b.t);
    if (!rawResult) {
      result.raw = market.price;
      result.evidence!.raw = { source: 'JustTCG', updatedAt: market.updated_at ? new Date(market.updated_at * 1000).toISOString().slice(0, 10) : 'Date unavailable', currency: 'USD', printing, condition: 'Near Mint' };
    }
  }
  return [result.raw, result.g8, result.g9, result.g10].some(Number.isFinite) ? result : null;
}
export function useLivePrices(card: CatalogCard | undefined) {
  return useQuery({ queryKey: ['liveprices', card?.id, card?.variant, card?.language], queryFn: () => fetchLivePrices(card), enabled: Boolean(card), staleTime: 300000, retry: 1 });
}
export const hasLivePricing = (): boolean => true;
export async function searchPokeWallet(_query: string): Promise<null> { return null; }
export async function fetchPokemonStats(_name: string): Promise<null> { return null; }
/** No cross-grader substitution; VCA-certified cards do not inherit PSA sale values. */
export function useLiveCollectionValue(items: CollectionItem[]) {
  const cards = useMemo(() => [...new Map(items.map(i => [i.cardId, cardById(i.cardId)])).values()].filter((c): c is CatalogCard => Boolean(c)), [items]);
  const queries = useQueries({ queries: cards.map(card => ({ queryKey: ['liveprices', card.id, card.variant, card.language], queryFn: () => fetchLivePrices(card), staleTime: 300000 })) });
  let total = 0; let liveCount = 0;
  for (const item of items) {
    const index = cards.findIndex(c => c.id === item.cardId); const raw = queries[index]?.data?.raw;
    if (!item.grade && typeof raw === 'number' && Number.isFinite(raw)) { total += raw * item.quantity; liveCount += 1; }
  }
  return { total, liveCount, isLive: liveCount > 0, missingCount: items.length - liveCount };
}
