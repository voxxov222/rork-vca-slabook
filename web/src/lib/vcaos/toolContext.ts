import { CATALOG, cardById } from "@/lib/data";

import type { ToolContext } from "./toolRegistry";

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Shared sandboxed tool execution context for the VCA Computer dynamic tool
 * registry — used by the VCA OS backend core and the quick-access drawer.
 * Gives tools real platform capabilities: live catalog lookup and pricing.
 */
export const TOOL_CONTEXT: ToolContext = {
  lookupCard: (name) => {
    const target = normName(name);
    const card =
      CATALOG.find((c) => normName(c.name) === target) ??
      CATALOG.find((c) => normName(c.name).includes(target) || target.includes(normName(c.name)));
    if (!card) return null;
    return {
      name: card.name,
      setName: card.set,
      number: card.number,
      raw: card.prices.raw,
      psa10: card.prices.g10,
      psa9: card.prices.g9,
      psa8: card.prices.g8,
    };
  },
  catalog: {
    ids: () => CATALOG.map((c) => c.id),
    nameOf: (id) => cardById(id)?.name ?? id,
  },
  now: () => new Date(),
};

/** Sample arguments injected per tool when run from the admin surfaces. */
export const TOOL_SAMPLE_ARGS: Record<string, Record<string, unknown>> = {
  price_arbitrage_calculator: { cardName: "Charizard", rawPurchasePrice: 880, gradingFee: 85 },
  catalog_lookup: { query: "charizard", limit: 5 },
  vault_value_estimator: {
    holdings: [
      { name: "Charizard", grade: "10" },
      { name: "Umbreon VMAX", grade: "9" },
      { name: "Pikachu ex", grade: "raw" },
    ],
  },
};
