import { Info } from "lucide-react";

import type { LivePrices } from "@/lib/prices";
import type { CatalogCard } from "@/lib/types";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const ROWS = [
  { label: "RAW", key: "raw" as const, sub: "Ungraded", color: "from-slate-400/60 to-slate-500/30" },
  { label: "VCA 8", key: "g8" as const, sub: "Near Mint / Mint", color: "from-holo-violet/70 to-holo-violet/20" },
  { label: "VCA 9", key: "g9" as const, sub: "Mint", color: "from-holo-cyan/80 to-holo-cyan/25" },
  { label: "VCA 10", key: "g10" as const, sub: "Gem Mint", color: "from-holo-gold to-holo-gold/25" },
];

type PriceKey = (typeof ROWS)[number]["key"];

interface PriceLadderProps {
  card: CatalogCard;
  /** Live market snapshot — when present it overrides the bundled index values. */
  live?: LivePrices | null;
  loading?: boolean;
}

export default function PriceLadder({ card, live, loading }: PriceLadderProps) {
  const val = (key: PriceKey) =>
    live && Number.isFinite(live[key]) ? live[key] : card.prices[key];
  const max = Math.max(...ROWS.map((r) => val(r.key)));
  const isLive = Boolean(live);

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold tracking-wide text-white/90">ESTIMATED MARKET VALUE</h3>
        {isLive ? (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-holo-mint">
            <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-holo-mint shadow-[0_0_8px_rgba(53,224,161,0.9)]" />
            LIVE · {live!.source.split(" ")[0].toUpperCase()}
          </span>
        ) : loading ? (
          <span className="flex items-center gap-1 text-[10px] text-white/40">
            <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-holo-cyan" /> SYNCING…
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-white/40">
            <Info className="h-3 w-3" /> estimate only
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {ROWS.map((r, i) => (
          <div key={r.key} className="group">
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
              <span className="font-display font-bold text-white/85">{r.label}</span>
              <span className="text-white/40">{r.sub}</span>
              <span className={`ml-auto font-mono font-bold ${i === 3 ? "text-holo-gold" : "text-holo-cyan"}`}>
                {usd(val(r.key))}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${r.color} transition-all duration-1000 group-hover:brightness-125`}
                style={{ width: `${Math.max((val(r.key) / max) * 100, 6)}%`, transitionDelay: `${i * 90}ms` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 border-t border-white/5 pt-2.5 text-[10px] leading-relaxed text-white/35">
        Estimated market value — not a guaranteed sale price.{" "}
        {isLive
          ? `Source: ${live!.source} · updated ${live!.updatedAt}. `
          : `Source: ${card.priceSource} · ${card.priceDate}. `}
        Prices reflect recent comparable sales and condition assessment, which may differ from a final VCA grade.
      </p>
    </div>
  );
}
