import { describe, expect, it, vi, afterEach } from 'vitest';
import { collectorNumber, printingOf, sameProduct } from '@/lib/identity';
import { pickRealMatch, fetchPokeTcgRaw, fetchLivePrices, type RealCardCandidate } from '@/lib/prices';
import { CATALOG } from '@/lib/data';
const candidate = (setName: string, number: string): RealCardCandidate => ({ slug: setName + number, name: 'Pikachu', setName, number, rarity: 'Rare', raw: null, psa10: null });
afterEach(() => vi.unstubAllGlobals());
describe('strict product identity', () => {
  it('retains TG/GG prefixes but normalizes padding', () => { expect(collectorNumber('TG04/TG30')).toBe('TG4'); expect(collectorNumber('004/102')).toBe('4'); expect(collectorNumber('SV004/SV122')).toBe('SV4'); });
  it('does not confuse the same collector number across sets', () => { expect(sameProduct({ name: 'Charizard', set: 'Base Set', number: '4/102' }, { name: 'Charizard', set: 'Base Set 2', number: '4/130' })).toBe(false); });
  it('requires all identity fields', () => { expect(sameProduct({ name: 'Pikachu', set: '', number: '4' }, { name: 'Pikachu', set: '', number: '4' })).toBe(false); });
  it('does not fall back to a name or first candidate', () => { expect(pickRealMatch([candidate('Base', '58')], '25', 'Pikachu')).toBeNull(); });
  it('rejects ambiguous candidates', () => { expect(pickRealMatch([candidate('Base', '58'), candidate('Other', '58')], '58', 'Pikachu')).toBeNull(); });
  it('can disambiguate using the set', () => { expect(pickRealMatch([candidate('Base', '58'), candidate('Other', '58')], '58/102', 'Pikachu', 'Base Set')?.setName).toBe('Base'); });
  it('does not mistake non-holo or first editions for holo', () => { expect(printingOf({ variant: 'Normal / Non-holo' })).toBe('normal'); expect(printingOf({ variant: '1st Edition Normal' })).toBe('1stEditionNormal'); expect(printingOf({ variant: 'Reverse Holofoil' })).toBe('reverseHolofoil'); expect(printingOf({ variant: 'Shadowless' })).toBeNull(); });
});
describe('price safeguards', () => {
  it('uses direct card endpoint and price update date, never set release date', async () => { const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 'base1-4', set: { releaseDate: '1999/01/09' }, tcgplayer: { updatedAt: '2026/09/20', prices: { holofoil: { market: 919.98 } } } } }), { status: 200 })); vi.stubGlobal('fetch', fetcher); const result = await fetchPokeTcgRaw('base1-4', 'holofoil'); expect(fetcher.mock.calls[0][0]).toBe('https://api.pokemontcg.io/v2/cards/base1-4'); expect(result).toEqual({ raw: 919.98, updatedAt: '2026/09/20' }); });
  it('does not use a different printing when requested variant is absent', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 'base1-4', tcgplayer: { prices: { holofoil: { market: 919.98 } } } } })))); expect(await fetchPokeTcgRaw('base1-4', 'reverseHolofoil')).toBeNull(); });
  it('does not attach English prices to another language', async () => { const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); expect(await fetchLivePrices({ ...CATALOG[0], language: 'Japanese' })).toBeNull(); expect(fetcher).not.toHaveBeenCalled(); });
  it('does not price an unconfirmed variant', async () => { const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); expect(await fetchLivePrices({ ...CATALOG[0], variant: 'Unconfirmed' })).toBeNull(); expect(fetcher).not.toHaveBeenCalled(); });
  it('leaves unavailable grades missing when only raw pricing exists', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'base1-4', localId: '4', name: 'Charizard', set: { name: 'Base Set' }, pricing: { tcgplayer: { unit: 'USD', updated: '2026-09-20T22:00:00Z', holofoil: { marketPrice: 919.98 } } } })))); const result = await fetchLivePrices(CATALOG[0]); expect(result?.raw).toBe(919.98); expect(Number.isNaN(result?.g10)).toBe(true); expect(result?.evidence?.raw?.updatedAt).toBe('2026-09-20'); expect(result?.history).toEqual([]); });
});
