import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { cardById } from "@/lib/data";
import type { CatalogCard, CollectionItem } from "@/lib/types";

/**
 * Live market data services — REAL product, REAL prices.
 *
 * - pokemontcg.io v2: the real Pokémon TCG product database. Official artwork,
 *   set data, rarity, and TCGPlayer raw market prices. Free, no key, CORS-open.
 * - JustTCG v2: real graded market data (PSA 10/9/8) + price history, searched
 *   by real product name/set/number.
 * - PokeWallet: pokemon/card search index (enrichment)
 * - RapidAPI Pokedex: species stats (enrichment)
 *
 * Keys come from Vite public env vars (VITE_*). When a graded source is
 * unavailable, callers fall back to the bundled VCA Market Index estimates so
 * the UI always renders something honest and labeled.
 */

const PTCG_BASE = "https://api.pokemontcg.io/v2/cards";
const JUSTTCG_BASE = "https://api.justtcg.com/v2/cards";
const POKEWALLET_BASE = "https://api.pokewallet.io/search";
const POKEDEX_HOST = "pokedex-api-pokemon-data-stats.p.rapidapi.com";

const justTcgKey = import.meta.env.VITE_JUSTTCG_API_KEY as string | undefined;
const pokeWalletKey = import.meta.env.VITE_POKEWALLET_API_KEY as string | undefined;
const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY as string | undefined;

/** Live price snapshot for a single card. `NaN` marks a grade with no data. */
export interface LivePrices {
  raw: number;
  g10: number;
  g9: number;
  g8: number;
  /** Most recent price points (unix seconds, USD) — prefer graded gem-mint series. */
  history: { t: number; p: number }[];
  /** Raw (ungraded) market price points from the last 90 days (unix seconds, USD). */
  rawHistory: { t: number; p: number }[];
  updatedAt: string;
  source: string;
}

/** Minimal card descriptor the pricing engine needs. */
export type PriceCard = Pick<CatalogCard, "id" | "name" | "number" | "set" | "tcgCardId">;

interface JtcMarket {
  region: string;
  currency: string;
  price: number;
  updated_at: number;
  price_history?: { t: number; p: number }[];
}

interface JtcVariant {
  type?: string;
  condition?: string;
  printing?: string;
  grading?: { company?: string; grade?: string | number } | null;
  markets?: JtcMarket[];
}

interface JtcCardRow {
  name?: string;
  number?: string;
  rarity?: string;
  set?: { id?: string; name?: string };
  variants?: JtcVariant[];
}

/* ------------------------------- pokemontcg.io ------------------------------ */

interface PtcgPrice {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
}

interface PtcgCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  set?: { id: string; name: string; releaseDate?: string };
  tcgplayer?: { prices?: Record<string, PtcgPrice> };
}

async function fetchJson<T>(url: string, headers: Record<string, string>, timeoutMs = 12000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Real TCGPlayer raw market price for a pokemontcg.io card id (no key needed). */
export async function fetchPokeTcgRaw(ptcgId: string): Promise<{ raw: number; updatedAt: string } | null> {
  if (!ptcgId) return null;
  const json = await fetchJson<{ data?: PtcgCard[] }>(
    `${PTCG_BASE}?id=${encodeURIComponent(ptcgId)}&pageSize=1`,
    {},
    10000,
  );
  const card = json?.data?.[0];
  const prices = card?.tcgplayer?.prices;
  if (!card || !prices) return null;
  const entry =
    prices.holofoil ?? prices.normal ?? prices.reverseHolofoil ?? Object.values(prices)[0];
  const raw = entry?.market ?? entry?.mid;
  if (!raw || !Number.isFinite(raw)) return null;
  return { raw, updatedAt: card.set?.releaseDate ?? "today" };
}

/* --------------------------------- JustTCG --------------------------------- */

const usdMarket = (v: JtcVariant): JtcMarket | undefined =>
  v.markets?.find((m) => m.currency === "USD") ?? v.markets?.[0];

const gradedPrice = (variants: JtcVariant[], grade: string): number => {
  const matches = variants.filter(
    (v) => v.type === "graded" && String(v.grading?.grade ?? "") === grade && usdMarket(v),
  );
  const pick = matches.find((v) => v.grading?.company === "PSA") ?? matches[0];
  return pick ? usdMarket(pick)!.price : Number.NaN;
};

const digitsOf = (s: string) => (s.match(/\d+/)?.[0] ?? "");
const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const kebab = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

interface JtcGradedResult {
  raw: number;
  g10: number;
  g9: number;
  g8: number;
  history: { t: number; p: number }[];
  rawHistory: { t: number; p: number }[];
  updatedAt: string;
}

/** Searches JustTCG v2 by real product name + set + number for graded PSA prices. */
async function fetchJustTcgGraded(card: PriceCard): Promise<JtcGradedResult | null> {
  if (!justTcgKey) return null;
  const num = digitsOf(card.number);
  const setSlug = kebab(card.set);
  // JustTCG set ids carry a game suffix, e.g. "base-set-pokemon".
  const attempts = [`${setSlug}-pokemon`, setSlug];
  for (const slug of attempts) {
    try {
      const json = await fetchJson<{ data?: JtcCardRow[] }>(
        `${JUSTTCG_BASE}?game=pokemon&name=${encodeURIComponent(card.name)}&set=${encodeURIComponent(slug)}&graded=include`,
        { "x-api-key": justTcgKey },
        14000,
      );
      const rows = json?.data ?? [];
      const row =
        rows.find((r) => digitsOf(String(r.number ?? "")) === num && normName(String(r.name ?? "")) === normName(card.name)) ??
        rows.find((r) => digitsOf(String(r.number ?? "")) === num) ??
        rows.find((r) => normName(String(r.name ?? "")) === normName(card.name)) ??
        rows[0];
      const variants = row?.variants ?? [];
      if (!variants.length) continue;

      const rawVariants = variants.filter((v) => v.type === "raw" && usdMarket(v));
      const nm =
        rawVariants.find((v) => v.condition === "Near Mint") ??
        rawVariants.find((v) => v.condition === "Lightly Played");
      const raw = nm
        ? usdMarket(nm)!.price
        : rawVariants.length
          ? rawVariants.reduce((sum, v) => sum + (usdMarket(v)?.price ?? 0), 0) / rawVariants.length
          : Number.NaN;

      const g10 = gradedPrice(variants, "10");
      const g9 = gradedPrice(variants, "9");
      const g8 = gradedPrice(variants, "8");
      if (!Number.isFinite(raw) && !Number.isFinite(g10)) continue;

      const historyVariant =
        variants.find(
          (v) =>
            v.type === "graded" &&
            String(v.grading?.grade ?? "") === "10" &&
            (usdMarket(v)?.price_history?.length ?? 0) > 1,
        ) ??
        nm ??
        rawVariants[0] ??
        variants[0];
      const history = (usdMarket(historyVariant)?.price_history ?? []).slice(-30);

      /* Raw near-mint price series, trimmed to the trailing 90 days. */
      const cutoff = Date.now() / 1000 - 90 * 24 * 60 * 60;
      const rawHistory = (usdMarket(nm ?? rawVariants[0] ?? variants[0])?.price_history ?? []).filter(
        (pt) => pt.t >= cutoff,
      );

      const ts = usdMarket(historyVariant)?.updated_at;
      const updatedAt = ts
        ? new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "today";

      return { raw, g10, g9, g8, history, rawHistory, updatedAt };
    } catch {
      // try the next set-slug variant
    }
  }
  return null;
}

/**
 * Fetches live prices for a real card: raw TCGPlayer market from
 * pokemontcg.io, graded PSA 10/9/8 from JustTCG. Returns null when neither
 * source has usable data.
 */
export async function fetchLivePrices(card: PriceCard | undefined): Promise<LivePrices | null> {
  if (!card) return null;
  const [ptcg, jtc] = await Promise.all([
    fetchPokeTcgRaw(card.tcgCardId).catch(() => null),
    justTcgKey ? fetchJustTcgGraded(card).catch(() => null) : Promise.resolve(null),
  ]);

  const raw = ptcg?.raw ?? (jtc ? jtc.raw : Number.NaN);
  const g10 = jtc ? jtc.g10 : Number.NaN;
  const g9 = jtc ? jtc.g9 : Number.NaN;
  const g8 = jtc ? jtc.g8 : Number.NaN;
  if (!Number.isFinite(raw) && !Number.isFinite(g10)) return null;

  const sources = [ptcg ? "pokemontcg.io · TCGPlayer market" : null, jtc ? "JustTCG graded market" : null].filter(
    (s): s is string => Boolean(s),
  );
  const updatedAt = jtc?.updatedAt ?? ptcg?.updatedAt ?? "today";

  return {
    raw,
    g10,
    g9,
    g8,
    history: jtc?.history ?? [],
    rawHistory: jtc?.rawHistory ?? [],
    updatedAt,
    source: sources.join(" + ") || "VCA Market Index",
  };
}

/** React Query hook — live prices with 5-minute staleness, falls back to null on failure. */
export function useLivePrices(card: CatalogCard | undefined) {
  return useQuery({
    queryKey: ["liveprices", card?.id],
    queryFn: () => fetchLivePrices(card),
    enabled: Boolean(card),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Searches the PokeWallet pokemon index (cards, sets, species). */
export async function searchPokeWallet(query: string): Promise<unknown | null> {
  if (!pokeWalletKey || !query.trim()) return null;
  return fetchJson(`${POKEWALLET_BASE}?q=${encodeURIComponent(query)}`, {
    "X-API-Key": pokeWalletKey,
  });
}

/** Fetches pokemon species stats from the RapidAPI pokedex for identification enrichment. */
export async function fetchPokemonStats(name: string): Promise<unknown | null> {
  if (!rapidApiKey || !name.trim()) return null;
  return fetchJson(`https://${POKEDEX_HOST}/api/pokemon/${encodeURIComponent(name.trim().toLowerCase())}`, {
    "x-rapidapi-key": rapidApiKey,
    "x-rapidapi-host": POKEDEX_HOST,
  });
}

export const hasLivePricing = () => Boolean(justTcgKey);

/* ---------------------- real product verification ---------------------- */

/** A real product record from the JustTCG database (verified card data). */
export interface RealCardCandidate {
  slug: string;
  name: string;
  setName: string;
  number: string;
  rarity: string;
  raw: number | null;
  psa10: number | null;
}

const realCache = new Map<string, { at: number; cards: RealCardCandidate[] }>();
const REAL_TTL = 10 * 60 * 1000;

const realPrice = (variants: JtcVariant[], kind: "raw" | "psa10"): number | null => {
  if (kind === "psa10") {
    const g = gradedPrice(variants, "10");
    return Number.isFinite(g) ? g : null;
  }
  const rawVariants = variants.filter((v) => v.type === "raw" && usdMarket(v));
  const nm = rawVariants.find((v) => v.condition === "Near Mint") ?? rawVariants[0];
  return nm ? usdMarket(nm)!.price : null;
};

const toCandidate = (c: JtcCardRow): RealCardCandidate => ({
  slug: String(c.number ?? c.name ?? ""),
  name: String(c.name ?? "").trim(),
  setName: String(c.set?.name ?? "").trim(),
  number: String(c.number ?? "").trim(),
  rarity: String(c.rarity ?? "").trim(),
  raw: realPrice(c.variants ?? [], "raw"),
  psa10: realPrice(c.variants ?? [], "psa10"),
});

/**
 * Verifies an AI identification against the real product database (JustTCG).
 * Browses the identified set and fuzzy-matches by card name, so the scanner
 * only ever confirms identifications that exist as real products.
 */
export async function searchRealCards(setName: string, cardName: string): Promise<RealCardCandidate[]> {
  if (!justTcgKey || !setName.trim() || !cardName.trim()) return [];
  const setSlug = kebab(setName);
  const cached = realCache.get(setSlug);
  let cards: RealCardCandidate[];
  if (cached && Date.now() - cached.at < REAL_TTL) {
    cards = cached.cards;
  } else {
    // JustTCG set ids carry a game suffix, e.g. "base-set-pokemon".
    const attempts = [`${setSlug}-pokemon`, setSlug];
    cards = [];
    for (const slug of attempts) {
      try {
        const json = await fetchJson<{ data?: JtcCardRow[] }>(
          `${JUSTTCG_BASE}?game=pokemon&set=${encodeURIComponent(slug)}&limit=400`,
          { "x-api-key": justTcgKey },
          14000,
        );
        cards = (json?.data ?? []).map(toCandidate);
        if (cards.length) break;
      } catch {
        // try next slug variant
      }
    }
    realCache.set(setSlug, { at: Date.now(), cards });
  }
  if (!cards.length) return [];
  const target = normName(cardName);
  return cards.filter((c) => {
    const cn = normName(c.name);
    return cn.includes(target) || target.includes(cn);
  });
}

/** Picks the best real-product match for an identification (number match wins). */
export function pickRealMatch(
  candidates: RealCardCandidate[],
  number: string,
  name: string,
): RealCardCandidate | null {
  if (!candidates.length) return null;
  const digits = (s: string) => (s.match(/\d+/g) ?? []).join("/");
  const numNorm = digits(number);
  const byNumber = numNorm ? candidates.find((c) => digits(c.number) === numNorm) : undefined;
  if (byNumber) return byNumber;
  return candidates.find((c) => normName(c.name) === normName(name)) ?? candidates[0];
}

/**
 * Collection value across grades: sums live prices where available
 * (pokemontcg.io raw + JustTCG graded) and falls back to the bundled VCA
 * Market Index per item.
 */
export function useLiveCollectionValue(items: CollectionItem[]) {
  const cards = useMemo(() => {
    const seen = new Map<string, CatalogCard>();
    for (const item of items) {
      const card = cardById(item.cardId);
      if (card) seen.set(card.id, card);
    }
    return Array.from(seen.values());
  }, [items]);

  const queries = useQueries({
    queries: cards.map((card) => ({
      queryKey: ["liveprices", card.id],
      queryFn: () => fetchLivePrices(card),
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  });

  return useMemo(() => {
    let total = 0;
    let liveCount = 0;
    for (const item of items) {
      const card = cardById(item.cardId);
      if (!card) continue;
      const key =
        item.grade === "VCA 10" ? "g10" : item.grade === "VCA 9" ? "g9" : item.grade === "VCA 8" ? "g8" : "raw";
      const idx = cards.findIndex((c) => c.id === card.id);
      const live = idx >= 0 ? queries[idx]?.data : undefined;
      const price = live && Number.isFinite(live[key]) ? live[key] : card.prices[key];
      if (live && Number.isFinite(live[key])) liveCount += 1;
      total += price;
    }
    return { total, liveCount, isLive: liveCount > 0 };
  }, [items, cards, queries]);
}
