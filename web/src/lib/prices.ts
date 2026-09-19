import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { cardById } from "@/lib/data";
import type { CollectionItem } from "@/lib/types";

/**
 * Live market data services.
 *
 * - JustTCG: real-time card prices (raw + graded) and price history
 * - PokeWallet: pokemon/card search index
 * - RapidAPI Pokedex: pokemon species stats for identification enrichment
 *
 * Keys come from Vite public env vars (VITE_*). When a key is missing or a
 * request fails, callers fall back to the bundled VCA Market Index data so
 * the UI always renders something honest and labeled.
 */

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
  updatedAt: string;
  source: string;
}

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

const usdMarket = (v: JtcVariant): JtcMarket | undefined =>
  v.markets?.find((m) => m.currency === "USD") ?? v.markets?.[0];

const gradedPrice = (variants: JtcVariant[], grade: string): number => {
  const matches = variants.filter(
    (v) => v.type === "graded" && String(v.grading?.grade ?? "") === grade && usdMarket(v),
  );
  const pick = matches.find((v) => v.grading?.company === "PSA") ?? matches[0];
  return pick ? usdMarket(pick)!.price : Number.NaN;
};

/** Fetches live prices for a JustTCG card slug. Returns null when no usable data. */
export async function fetchLivePrices(tcgCardId: string): Promise<LivePrices | null> {
  if (!justTcgKey || !tcgCardId) return null;
  const json = await fetchJson<{ data?: { variants?: JtcVariant[] }[] }>(
    `${JUSTTCG_BASE}?card_id=${encodeURIComponent(tcgCardId)}&graded=include`,
    { "x-api-key": justTcgKey },
  );
  const variants = json?.data?.[0]?.variants ?? [];
  if (!variants.length) return null;

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
  if (!Number.isFinite(raw) && !Number.isFinite(g10)) return null;

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

  const ts = usdMarket(historyVariant)?.updated_at;
  const updatedAt = ts
    ? new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "today";

  return { raw, g10, g9, g8, history, updatedAt, source: "JustTCG live market data" };
}

/** React Query hook — live prices with 5-minute staleness, falls back to null on failure. */
export function useLivePrices(tcgCardId: string | undefined) {
  return useQuery({
    queryKey: ["justtcg", tcgCardId],
    queryFn: () => fetchLivePrices(tcgCardId!),
    enabled: Boolean(justTcgKey && tcgCardId),
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

/**
 * Collection value across grades: sums live JustTCG prices where available
 * and falls back to the bundled VCA Market Index per item.
 */
export function useLiveCollectionValue(items: CollectionItem[]) {
  const slugs = useMemo(
    () =>
      Array.from(
        new Set(items.map((i) => cardById(i.cardId)?.tcgCardId).filter((s): s is string => Boolean(s))),
      ),
    [items],
  );
  const queries = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ["justtcg", slug],
      queryFn: () => fetchLivePrices(slug),
      enabled: Boolean(justTcgKey),
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
      const idx = slugs.indexOf(card.tcgCardId);
      const live = idx >= 0 ? queries[idx]?.data : undefined;
      const price = live && Number.isFinite(live[key]) ? live[key] : card.prices[key];
      if (live && Number.isFinite(live[key])) liveCount += 1;
      total += price;
    }
    return { total, liveCount, isLive: liveCount > 0 && Boolean(justTcgKey) };
  }, [items, slugs, queries]);
}
