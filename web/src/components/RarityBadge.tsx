import { Gem } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CatalogCard, GradeLabel } from "@/lib/types";

export type RarityTierName = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export interface RarityTier {
  name: RarityTierName;
  /** Upper bound (inclusive) of estimated VCA 10 market value for this tier, in USD. */
  max: number;
  chip: string;
}

/** Tiers are derived from the card's estimated VCA 10 market value, then adjusted by grade. */
const TIERS: RarityTier[] = [
  {
    name: "Common",
    max: 300,
    chip: "border-white/25 bg-black/60 text-white/75",
  },
  {
    name: "Uncommon",
    max: 450,
    chip: "border-holo-mint/40 bg-holo-mint/12 text-holo-mint shadow-[0_0_12px_rgba(52,231,181,0.25)]",
  },
  {
    name: "Rare",
    max: 650,
    chip: "border-holo-cyan/45 bg-holo-cyan/12 text-holo-cyan shadow-[0_0_12px_rgba(79,209,255,0.3)]",
  },
  {
    name: "Epic",
    max: 900,
    chip: "border-holo-violet/45 bg-holo-violet/15 text-holo-violet shadow-[0_0_14px_rgba(167,110,255,0.35)]",
  },
  {
    name: "Legendary",
    max: Number.POSITIVE_INFINITY,
    chip: "border-holo-gold/50 bg-gradient-to-r from-holo-gold/25 via-holo-magenta/20 to-holo-gold/25 text-holo-gold shadow-[0_0_16px_rgba(255,184,61,0.4)]",
  },
];

/**
 * Resolves the display tier for a card: base tier comes from the estimated
 * VCA 10 market value, then grade shifts it — a gem-mint VCA 10 bumps the tier
 * up, a well-loved VCA 8 steps it down.
 */
export function rarityFor(card: CatalogCard, grade?: GradeLabel | null): RarityTier {
  let idx = TIERS.findIndex((t) => card.prices.g10 <= t.max);
  if (idx < 0) idx = TIERS.length - 1;
  if (grade === "VCA 10") idx = Math.min(idx + 1, TIERS.length - 1);
  else if (grade === "VCA 8") idx = Math.max(idx - 1, 0);
  return TIERS[idx];
}

/** Small holographic rarity pill rendered over the bottom corner of a card. */
export default function RarityBadge({ tier, className }: { tier: RarityTier; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-display text-[8px] font-extrabold uppercase tracking-[0.18em] backdrop-blur-md",
        tier.chip,
        className,
      )}
    >
      <Gem
        className={cn(
          "h-2.5 w-2.5",
          tier.name === "Legendary" && "drop-shadow-[0_0_5px_rgba(255,184,61,0.9)]",
        )}
      />
      {tier.name}
    </span>
  );
}
