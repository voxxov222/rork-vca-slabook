/**
 * VCA Agent Memory — ported from voxxov222/Vcacomputer
 * (src/lib/agentMemory.ts), browser-adapted: the Node fs JSON store becomes a
 * localStorage-backed store with the same API surface.
 */

export interface MemoryEntry {
  id: string;
  category: "episodic" | "semantic" | "procedure" | "preference" | "entity" | "pokemon_insight";
  key: string;
  content: string;
  /** 1 to 10 */
  importance: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  accessCount: number;
  lastAccessedAt: string;
  metadata?: Record<string, unknown>;
}

export interface AgentMemoryStore {
  version: string;
  lastUpdated: string;
  totalMemories: number;
  memories: MemoryEntry[];
}

export interface RecallResult {
  memories: MemoryEntry[];
  totalMatches: number;
  query: string;
}

const STORAGE_KEY = "vca-os-agent-memory";

/** Default foundational knowledge memories, carried over from Vcacomputer. */
const DEFAULT_MEMORIES: MemoryEntry[] = [
  {
    id: "mem-core-identity",
    category: "semantic",
    key: "agent_identity",
    content:
      "VCA Autonomous Systems backend: live Pokémon pricing intelligence, forensic grading, dynamic tool creation and self-improving market sync for the Slabook platform.",
    importance: 10,
    tags: ["system", "identity", "vca", "architecture"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessCount: 1,
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: "mem-pokemon-pricing-engine",
    category: "procedure",
    key: "pokemon_price_sync_procedure",
    content:
      "To update Pokémon card market prices, run the Autonomous Price Sync. It pulls real raw market + PSA 10/9/8 valuation from pokemontcg.io and JustTCG with trend and volatility metrics.",
    importance: 9,
    tags: ["pokemon", "pricing", "procedure", "tcg"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessCount: 1,
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: "mem-tool-authoring",
    category: "procedure",
    key: "dynamic_tool_creation_rule",
    content:
      "New tools can be authored via registerDynamicTool. Tools are validated, persisted into the registry, and immediately executable with a platform context (catalog lookup, pricing).",
    importance: 9,
    tags: ["tools", "developer", "registry"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessCount: 1,
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: "mem-vca-standards",
    category: "semantic",
    key: "vca_grading_standards",
    content:
      "VCA forensic grading inspects 4 core subgrades: Centering, Corners, Edges and Surface (+ Print). Grades range 1–10 (Pristine 10, Gem Mint 10, Mint 9). Counterfeit detection checks dot patterns, rosette registration, foil texture and cardstock core.",
    importance: 9,
    tags: ["vca", "grading", "authenticity", "forensics"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessCount: 1,
    lastAccessedAt: new Date().toISOString(),
  },
];

const fallbackStore = (): AgentMemoryStore => ({
  version: "2.0.0",
  lastUpdated: new Date().toISOString(),
  totalMemories: DEFAULT_MEMORIES.length,
  memories: [...DEFAULT_MEMORIES],
});

function loadStore(): AgentMemoryStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AgentMemoryStore;
      if (Array.isArray(parsed.memories)) return parsed;
    }
  } catch {
    // fall through to defaults
  }
  return fallbackStore();
}

function saveStore(store: AgentMemoryStore): void {
  store.lastUpdated = new Date().toISOString();
  store.totalMemories = store.memories.length;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage unavailable — keep in-memory only
  }
}

export function ensureMemoryStore(): AgentMemoryStore {
  return loadStore();
}

export function getAllMemories(): MemoryEntry[] {
  return loadStore().memories;
}

export function storeMemory(entry: {
  category: MemoryEntry["category"];
  key: string;
  content: string;
  importance?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): MemoryEntry {
  const store = loadStore();
  const now = new Date().toISOString();
  const existingIndex = store.memories.findIndex(
    (m) => m.key.toLowerCase() === entry.key.toLowerCase(),
  );

  if (existingIndex >= 0) {
    const existing = store.memories[existingIndex];
    const updated: MemoryEntry = {
      ...existing,
      category: entry.category,
      content: entry.content,
      importance: entry.importance ?? existing.importance,
      tags: Array.from(new Set([...(existing.tags ?? []), ...(entry.tags ?? [])])),
      updatedAt: now,
      accessCount: existing.accessCount + 1,
      lastAccessedAt: now,
      metadata: { ...existing.metadata, ...entry.metadata },
    };
    store.memories[existingIndex] = updated;
    saveStore(store);
    return updated;
  }

  const newEntry: MemoryEntry = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: entry.category,
    key: entry.key,
    content: entry.content,
    importance: entry.importance ?? 5,
    tags: entry.tags ?? ["general"],
    createdAt: now,
    updatedAt: now,
    accessCount: 1,
    lastAccessedAt: now,
    metadata: entry.metadata,
  };

  store.memories.unshift(newEntry);
  saveStore(store);
  return newEntry;
}

export function recallMemories(query: string, category?: string, limit = 6): RecallResult {
  const store = loadStore();
  const qTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const scored = store.memories
    .filter((m) => !category || category === "all" || m.category === category)
    .map((m) => {
      let score = 0;
      const text = `${m.key} ${m.content} ${m.tags.join(" ")} ${m.category}`.toLowerCase();
      if (query.trim() && text.includes(query.toLowerCase())) score += 15;
      for (const tok of qTokens) {
        if (text.includes(tok)) score += 4;
      }
      score += (m.importance || 5) * 0.5;
      return { memory: m, score };
    })
    .filter((item) => qTokens.length === 0 || item.score > 2)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, limit).map((s) => {
    s.memory.accessCount = (s.memory.accessCount ?? 0) + 1;
    s.memory.lastAccessedAt = new Date().toISOString();
    return s.memory;
  });

  if (top.length) saveStore(store);

  return { memories: top, totalMatches: scored.length, query };
}

export function deleteMemoryById(id: string): boolean {
  const store = loadStore();
  const before = store.memories.length;
  store.memories = store.memories.filter((m) => m.id !== id);
  if (store.memories.length !== before) {
    saveStore(store);
    return true;
  }
  return false;
}
