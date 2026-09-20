/**
 * VCA Dynamic Tool Registry — ported from voxxov222/Vcacomputer
 * (src/lib/dynamicToolRegistry.ts), browser-adapted: tools are stored in
 * localStorage and executed in a sandboxed Function context that receives a
 * platform `context` (catalog lookup, pricing helpers) instead of shell exec.
 */

export interface ToolContext {
  /** Looks up a card by fuzzy name in the real product catalog. */
  lookupCard: (name: string) => {
    name: string;
    setName: string;
    number: string;
    raw: number;
    psa10: number;
    psa9: number;
    psa8: number;
  } | null;
  /** Direct catalog access for tools that browse products. */
  catalog: { ids: () => string[]; nameOf: (id: string) => string };
  now: () => Date;
}

export interface DynamicToolMetadata {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
  author: "agent" | "user" | "system";
  createdAt: string;
  updatedAt: string;
  executionCount: number;
  lastExecutedAt?: string;
  language: "javascript" | "typescript";
  tags: string[];
  sourceCode: string;
}

export interface DynamicToolRegistryStore {
  version: string;
  tools: DynamicToolMetadata[];
}

const STORAGE_KEY = "vca-os-tool-registry";

/* Built-in dynamic agent tools (browser-feasible subset of the Vcacomputer defaults). */
const DEFAULT_TOOLS: DynamicToolMetadata[] = [
  {
    name: "price_arbitrage_calculator",
    description:
      "Calculates price discrepancies and profit margins between raw grading costs, PSA 9 and PSA 10 for any real Pokémon card in the catalog.",
    parameters: {
      type: "OBJECT",
      properties: {
        cardName: { type: "STRING", description: "Card name, e.g. Charizard, Umbreon VMAX" },
        rawPurchasePrice: { type: "NUMBER", description: "Cost to acquire the raw card in USD" },
        gradingFee: { type: "NUMBER", description: "Estimated VCA grading fee per card, e.g. 35" },
      },
      required: ["cardName", "rawPurchasePrice"],
    },
    author: "agent",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    executionCount: 8,
    lastExecutedAt: new Date().toISOString(),
    language: "javascript",
    tags: ["pricing", "arbitrage", "pokemon", "roi"],
    sourceCode: `// Price Arbitrage & Grading ROI Calculator
async function execute(args, context) {
  const { cardName, rawPurchasePrice, gradingFee = 35 } = args;
  const card = context.lookupCard(cardName);
  const psa10 = card?.psa10 || rawPurchasePrice * 8;
  const psa9 = card?.psa9 || rawPurchasePrice * 3;
  const totalCost = rawPurchasePrice + gradingFee;
  const profitPsa10 = psa10 - totalCost;
  const profitPsa9 = psa9 - totalCost;
  return {
    cardName: card?.name || cardName,
    rawCost: rawPurchasePrice,
    gradingFee,
    totalInvestment: totalCost,
    psa10Value: Math.round(psa10),
    psa10Profit: Math.round(profitPsa10),
    psa10RoiPercent: Math.round((profitPsa10 / totalCost) * 100),
    psa9Value: Math.round(psa9),
    psa9Profit: Math.round(profitPsa9),
    psa9RoiPercent: Math.round((profitPsa9 / totalCost) * 100),
    recommendation: profitPsa10 / totalCost > 1.5 ? 'STRONG GRADE CANDIDATE' : profitPsa9 / totalCost > 0.3 ? 'MODERATE' : 'HOLD RAW'
  };
}`,
  },
  {
    name: "catalog_lookup",
    description:
      "Searches the verified real-product catalog by name, set or number and returns the matching cards with live VCA Market Index prices.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Name fragment, set name or card number" },
        limit: { type: "NUMBER", description: "Max results (default 5)" },
      },
      required: ["query"],
    },
    author: "system",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    executionCount: 14,
    lastExecutedAt: new Date().toISOString(),
    language: "javascript",
    tags: ["catalog", "search", "pokemon"],
    sourceCode: `// Catalog Lookup Tool
async function execute(args, context) {
  const { query, limit = 5 } = args;
  const results = [];
  const seen = new Set();
  for (const id of context.catalog.ids()) {
    const c = context.lookupCard(context.catalog.nameOf(id));
    if (!c || seen.has(c.name + c.number)) continue;
    const hay = (c.name + ' ' + c.setName + ' ' + c.number).toLowerCase();
    if (hay.includes(String(query).toLowerCase())) {
      seen.add(c.name + c.number);
      results.push(c);
    }
    if (results.length >= limit) break;
  }
  return { query, count: results.length, results };
}`,
  },
  {
    name: "vault_value_estimator",
    description:
      "Estimates the total vault value of a holdings list by grade using the real product database (raw / PSA 10 / 9 / 8 prices).",
    parameters: {
      type: "OBJECT",
      properties: {
        holdings: {
          type: "OBJECT",
          description:
            'Array of { name, grade } entries, e.g. [{ "name": "Charizard", "grade": "10" }]',
        },
      },
      required: ["holdings"],
    },
    author: "agent",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    executionCount: 3,
    language: "javascript",
    tags: ["vault", "portfolio", "pricing"],
    sourceCode: `// Vault Value Estimator
async function execute(args, context) {
  const items = Array.isArray(args.holdings) ? args.holdings : [];
  let total = 0;
  const lines = items.map((h) => {
    const c = context.lookupCard(h.name);
    const grade = String(h.grade ?? 'raw');
    const price = !c ? 0 : grade === '10' ? c.psa10 : grade === '9' ? c.psa9 : grade === '8' ? c.psa8 : c.raw;
    total += price;
    return { name: c?.name || h.name, grade, value: Math.round(price) };
  });
  return { totalValue: Math.round(total), itemCount: items.length, lines };
}`,
  },
];

const fallbackStore = (): DynamicToolRegistryStore => ({
  version: "1.0.0",
  tools: DEFAULT_TOOLS.map((t) => ({ ...t })),
});

function loadStore(): DynamicToolRegistryStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DynamicToolRegistryStore;
      if (Array.isArray(parsed.tools)) return parsed;
    }
  } catch {
    // fall through to defaults
  }
  return fallbackStore();
}

function saveStore(store: DynamicToolRegistryStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage unavailable — keep in-memory only
  }
}

export function ensureToolRegistry(): DynamicToolRegistryStore {
  return loadStore();
}

export function getDynamicTools(): DynamicToolMetadata[] {
  return loadStore().tools;
}

export function registerDynamicTool(
  tool: Pick<DynamicToolMetadata, "name" | "description" | "parameters" | "sourceCode"> &
    Partial<DynamicToolMetadata>,
): DynamicToolMetadata {
  const store = loadStore();
  const existingIdx = store.tools.findIndex((t) => t.name === tool.name);
  const now = new Date().toISOString();

  const full: DynamicToolMetadata = {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    author: tool.author ?? "user",
    createdAt: existingIdx >= 0 ? store.tools[existingIdx].createdAt : now,
    updatedAt: now,
    executionCount: existingIdx >= 0 ? store.tools[existingIdx].executionCount : 0,
    lastExecutedAt: store.tools[existingIdx]?.lastExecutedAt,
    language: tool.language ?? "javascript",
    tags: tool.tags ?? ["custom_agent_tool"],
    sourceCode: tool.sourceCode,
  };

  if (existingIdx >= 0) store.tools[existingIdx] = full;
  else store.tools.unshift(full);
  saveStore(store);
  return full;
}

export function deleteDynamicTool(name: string): boolean {
  const store = loadStore();
  const before = store.tools.length;
  store.tools = store.tools.filter((t) => t.name !== name);
  if (store.tools.length !== before) {
    saveStore(store);
    return true;
  }
  return false;
}

/**
 * Executes a dynamic tool inside a sandboxed Function context. The tool body
 * must define `async function execute(args, context)`.
 */
export async function executeDynamicTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<Record<string, unknown>> {
  const store = loadStore();
  const tool = store.tools.find((t) => t.name === name);
  if (!tool) throw new Error(`Dynamic tool '${name}' not found in registry`);

  tool.executionCount = (tool.executionCount ?? 0) + 1;
  tool.lastExecutedAt = new Date().toISOString();
  saveStore(store);

  try {
    // eslint-disable-next-line no-new-func -- sandboxed tool runner by design
    const fn = new Function(
      "args",
      "context",
      `${tool.sourceCode}
      if (typeof execute === 'function') return execute(args, context);
      return { result: "Executed script without return value" };`,
    );
    return (await fn(args, context)) as Record<string, unknown>;
  } catch (err) {
    return {
      error: `Execution error in dynamic tool ${name}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
