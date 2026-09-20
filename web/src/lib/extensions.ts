import { useCallback, useState } from "react";

/**
 * VCA OS extension registry — modeled on OpenSourceSocialNetwork's ExtendAPI
 * pattern: a versioned, token-gated method registry where integrations
 * register capabilities that the platform can enable/disable at runtime.
 */

export interface VcaExtension {
  id: string;
  name: string;
  vendor: string;
  version: string;
  description: string;
  /** ExtendAPI-style method surface exposed by this extension. */
  methods: string[];
  defaultEnabled: boolean;
  status: "live" | "key-required" | "standby";
}

export const EXTENSIONS: VcaExtension[] = [
  {
    id: "ossn-social",
    name: "OSSN Social Bridge",
    vendor: "OpenSourceSocialNetwork",
    version: "10.0",
    description: "Newsfeed, likes, comments, friends, notifications — the OSSN v10 social feature set mirrored natively in Slabook.",
    methods: ["newsfeed.list", "newsfeed.post", "like.toggle", "comment.add", "friend.request", "notification.list"],
    defaultEnabled: true,
    status: "live",
  },
  {
    id: "ossn-extendapi",
    name: "ExtendAPI Gateway",
    vendor: "OSSN ExtendAPI",
    version: "1.0",
    description: "Versioned method registry (v1.0) that lets any extension register handlers and expose them to the platform.",
    methods: ["v1.0/register", "v1.0/methods", "v1.0/invoke"],
    defaultEnabled: true,
    status: "live",
  },
  {
    id: "pokemontcg-catalog",
    name: "PokeTCG Product Catalog",
    vendor: "pokemontcg.io",
    version: "v2",
    description: "The real Pokémon TCG product database — official artwork, set data, rarity and TCGPlayer raw market prices. No key required.",
    methods: ["cards.get", "cards.search", "sets.list"],
    defaultEnabled: true,
    status: "live",
  },
  {
    id: "justtcg-pricing",
    name: "JustTCG Graded Pricing",
    vendor: "JustTCG",
    version: "v2",
    description: "Live graded market data — PSA 10/9/8 sold-market prices and price history keyed by real product.",
    methods: ["prices.raw", "prices.graded", "prices.history"],
    defaultEnabled: true,
    status: "key-required",
  },
  {
    id: "shouldislab",
    name: "ShouldISlab ROI Engine",
    vendor: "KeWang0622 / shouldislab",
    version: "1.0",
    description: "Grading ROI math for every scenario (PSA 10/9/8) with SLAB IT / SKIP IT / MAYBE verdicts and era-aware gem-rate guidance.",
    methods: ["roi.compute", "verdict.grade", "era.heuristics"],
    defaultEnabled: true,
    status: "live",
  },
  {
    id: "vca-news",
    name: "VCA NEWS Wire",
    vendor: "VCA",
    version: "26.9",
    description: "Edge-function wire aggregating official Pokémon TCG news into the live dashboard ticker.",
    methods: ["news.headlines"],
    defaultEnabled: true,
    status: "live",
  },
  {
    id: "pokewallet-search",
    name: "PokeWallet Search",
    vendor: "PokeWallet",
    version: "v1",
    description: "Pokemon/card search index used to enrich scanner identifications.",
    methods: ["search.query"],
    defaultEnabled: false,
    status: "key-required",
  },
  {
    id: "rapidapi-pokedex",
    name: "RapidAPI Pokedex",
    vendor: "RapidAPI",
    version: "v1",
    description: "Species stats enrichment for scanner results (types, abilities, flavor data).",
    methods: ["species.stats"],
    defaultEnabled: false,
    status: "key-required",
  },
  {
    id: "vca-agent-memory",
    name: "VCA Agent Memory",
    vendor: "VCA Computer",
    version: "2.0.0",
    description: "Persistent episodic/semantic memory store for the platform's autonomous agent — store, recall, boost-by-importance and audit every memory entry.",
    methods: ["memory.store", "memory.recall", "memory.list", "memory.delete"],
    defaultEnabled: true,
    status: "live",
  },
  {
    id: "vca-tool-registry",
    name: "Dynamic Tool Registry",
    vendor: "VCA Computer",
    version: "1.0.0",
    description: "Register, execute and manage sandboxed dynamic agent tools (arbitrage math, catalog lookups, vault estimation) with full execution telemetry.",
    methods: ["tools.register", "tools.execute", "tools.list", "tools.delete"],
    defaultEnabled: true,
    status: "live",
  },
  {
    id: "vca-forensic-core",
    name: "Forensic Grading Core",
    vendor: "VCA Computer",
    version: "26.9",
    description: "The 5-category forensic engine: centering geometry, corner/edge inspection, surface & print analysis, authenticity verdicts, overall grade calculator, serials and tamper-proof hashes.",
    methods: ["grade.centering", "grade.subgrades", "grade.overall", "cert.serial", "cert.hash"],
    defaultEnabled: true,
    status: "live",
  },
  {
    id: "vca-price-sync",
    name: "Autonomous Price Sync",
    vendor: "VCA Computer",
    version: "2.0.0",
    description: "Autonomous pricing loop — syncs the real catalog (raw + PSA 10/9/8) into snapshot storage on schedule or on demand, with volatility indexing and sync logs.",
    methods: ["prices.sync", "prices.snapshot", "tasks.schedule", "tasks.list"],
    defaultEnabled: true,
    status: "live",
  },
  {
    id: "ebay-sync",
    name: "eBay Marketplace Sync",
    vendor: "eBay",
    version: "v1",
    description: "Lists slabs to eBay, pulls sold comps and syncs order data into the dashboard.",
    methods: ["listing.create", "comps.sold", "orders.sync"],
    defaultEnabled: false,
    status: "standby",
  },
];

const STORAGE_KEY = "vca-ext-toggles";

const loadToggles = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...Object.fromEntries(EXTENSIONS.map((e) => [e.id, e.defaultEnabled])), ...(JSON.parse(raw) as Record<string, boolean>) };
  } catch {
    // fall through to defaults
  }
  return Object.fromEntries(EXTENSIONS.map((e) => [e.id, e.defaultEnabled]));
};

/** Extension enable/disable toggles, persisted to localStorage for the VCA OS. */
export function useExtensionToggles() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(loadToggles);

  const toggle = useCallback((id: string) => {
    setToggles((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable — keep in-memory only
      }
      return next;
    });
  }, []);

  return { toggles, toggle };
}
