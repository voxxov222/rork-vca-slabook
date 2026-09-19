import { BACKEND_URL, anonKey, isBackendReady } from "./supabase";

/**
 * VCA NEWS feed — official Pokemon TCG headlines aggregated by the
 * `vca-news` edge function (live sources with a curated wire fallback).
 */

export interface VcaNewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  date: string | null;
}

export interface VcaNewsFeed {
  live: boolean;
  source: string;
  items: VcaNewsItem[];
}

export const FALLBACK_NEWS: VcaNewsItem[] = [
  {
    id: "f1",
    title: "Pokemon TCG: Prismatic Evolutions wave continues across retailers",
    summary: "Eevee-themed special expansion keeps selling through — watch for official restocks.",
    url: "https://www.pokemon.com/us/pokemon-news",
    source: "POKEMON.COM",
    date: null,
  },
  {
    id: "f2",
    title: "VCA Vault: digital slab minting volume hits a new weekly high",
    summary: "Collectors minted more verified VCA 10 slabs this week than any week this quarter.",
    url: "https://www.pokemon.com/us/pokemon-news",
    source: "VCA WIRE",
    date: null,
  },
  {
    id: "f3",
    title: "Base Set holo values hold firm as raw copies get authenticated",
    summary: "WOTC-era holos remain the backbone of graded portfolio value, market data shows.",
    url: "https://www.pokemon.com/us/pokemon-news",
    source: "MARKET WIRE",
    date: null,
  },
  {
    id: "f4",
    title: "Counterfeit screening: rosette-pattern check catches new fake wave",
    summary: "VCA vision screening flagged a rise in reproduction holos — verify before buying.",
    url: "https://www.pokemon.com/us/pokemon-news",
    source: "VCA LABS",
    date: null,
  },
  {
    id: "f5",
    title: "NFC physical slabs now activate on tap",
    summary: "Tap any NFC slab to a phone to open its verified digital profile instantly.",
    url: "https://www.pokemon.com/us/pokemon-news",
    source: "VCA WIRE",
    date: null,
  },
];

/** Fetches the live feed; always resolves (never throws) with a usable feed. */
export async function fetchVcaNews(): Promise<VcaNewsFeed> {
  if (!isBackendReady) return { live: false, source: "VCA WIRE", items: FALLBACK_NEWS };
  try {
    const res = await fetch(`${BACKEND_URL}/functions/v1/vca-news`, {
      headers: { apikey: anonKey ?? "" },
    });
    if (!res.ok) throw new Error(`news HTTP ${res.status}`);
    const json = (await res.json()) as {
      live?: boolean;
      source?: string;
      items?: { title?: string; summary?: string; url?: string; source?: string; date?: string | null }[];
    };
    const items = (json.items ?? [])
      .filter((n) => n.title)
      .map((n, i) => ({
        id: `n-${i}`,
        title: String(n.title),
        summary: String(n.summary ?? ""),
        url: String(n.url ?? "https://www.pokemon.com/us/pokemon-news"),
        source: String(n.source ?? "VCA WIRE"),
        date: n.date ?? null,
      }));
    if (!items.length) throw new Error("news feed empty");
    return { live: Boolean(json.live), source: String(json.source ?? "VCA WIRE"), items };
  } catch {
    return { live: false, source: "VCA WIRE", items: FALLBACK_NEWS };
  }
}
