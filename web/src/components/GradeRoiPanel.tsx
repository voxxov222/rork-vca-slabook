import { useMemo, useState } from "react";
import { AlertTriangle, Calculator, CheckCircle2, HelpCircle, XCircle } from "lucide-react";

import { GRADING_TIERS, computeGradeRoi, type SlabVerdict } from "@/lib/gradeRoi";
import type { LivePrices } from "@/lib/prices";
import type { CatalogCard } from "@/lib/types";
import { cn } from "@/lib/utils";

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const VERDICT_STYLE: Record<SlabVerdict, { chip: string; icon: typeof CheckCircle2; glow: string }> = {
  "SLAB IT": { chip: "border-holo-mint/50 bg-holo-mint/15 text-holo-mint", icon: CheckCircle2, glow: "shadow-[0_0_24px_rgba(52,231,181,0.35)]" },
  MAYBE: { chip: "border-holo-gold/50 bg-holo-gold/15 text-holo-gold", icon: HelpCircle, glow: "shadow-[0_0_24px_rgba(255,179,64,0.3)]" },
  "SKIP IT": { chip: "border-red-500/50 bg-red-500/15 text-red-400", icon: XCircle, glow: "shadow-[0_0_24px_rgba(239,68,68,0.3)]" },
};

interface GradeRoiPanelProps {
  card: CatalogCard;
  live: LivePrices | null;
}

/**
 * "Should I slab this?" — the ShouldISlab grading-ROI panel.
 * Models every grade scenario (PSA 10/9/8) against total cost-in and issues
 * a verdict with the math shown, not just a guess.
 */
export default function GradeRoiPanel({ card, live }: GradeRoiPanelProps) {
  const [tierId, setTierId] = useState<string>("bulk");
  const tier = GRADING_TIERS.find((t) => t.id === tierId) ?? GRADING_TIERS[0];

  /* Live prices win when finite; bundled estimates are the honest fallback. */
  const values = useMemo(
    () => ({
      raw: live && Number.isFinite(live.raw) ? live.raw : card.prices.raw,
      g10: live && Number.isFinite(live.g10) ? live.g10 : card.prices.g10,
      g9: live && Number.isFinite(live.g9) ? live.g9 : card.prices.g9,
      g8: live && Number.isFinite(live.g8) ? live.g8 : card.prices.g8,
    }),
    [live, card.prices],
  );

  const roi = useMemo(
    () => computeGradeRoi({ name: card.name, set: card.set, year: card.year, ...values, gradingCost: tier.cost }),
    [card.name, card.set, card.year, values, tier.cost],
  );

  const style = VERDICT_STYLE[roi.verdict];
  const VerdictIcon = style.icon;

  return (
    <section className="glass animate-fade-up rounded-3xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
          <Calculator className="h-4 w-4 text-holo-cyan" /> SHOULD I SLAB? · GRADING ROI ENGINE
        </p>
        <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[9px] font-bold tracking-wider text-white/50">
          PSA 10 · 9 · 8 SCENARIOS
        </span>
      </div>

      {/* grading tier selector */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {GRADING_TIERS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTierId(t.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[10px] font-bold transition-all active:scale-95",
              t.id === tierId ? "border-holo-cyan/60 bg-holo-cyan/15 text-holo-cyan" : "border-white/12 bg-white/5 text-white/55 hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* verdict stamp */}
      <div className={cn("mt-4 flex flex-wrap items-center gap-3 rounded-2xl border p-4", style.chip, style.glow)}>
        <VerdictIcon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="font-display text-xl font-extrabold tracking-tight">{roi.verdict}</p>
          <p className="text-[11px] font-semibold text-white/70">{roi.headline}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-mono text-[9px] tracking-wider text-white/45">TOTAL COST IN</p>
          <p className="font-display text-lg font-extrabold text-white">{usd(roi.costIn)}</p>
        </div>
      </div>

      {/* ROI table */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-[11px]">
          <thead>
            <tr className="font-mono text-[9px] uppercase tracking-wider text-white/40">
              <th className="pb-2 pr-2 font-bold">Grade</th>
              <th className="pb-2 pr-2 font-bold">Graded Value</th>
              <th className="pb-2 pr-2 font-bold">Cost In</th>
              <th className="pb-2 pr-2 font-bold">P/L</th>
              <th className="pb-2 font-bold">ROI</th>
            </tr>
          </thead>
          <tbody>
            {roi.scenarios.map((s) => (
              <tr key={s.grade} className="border-t border-white/5">
                <td className="py-2.5 pr-2 font-mono font-bold text-white">{s.grade}</td>
                <td className="py-2.5 pr-2 font-mono text-white/85">{usd(s.gradedValue)}</td>
                <td className="py-2.5 pr-2 font-mono text-white/50">{usd(s.costIn)}</td>
                <td className={cn("py-2.5 pr-2 font-mono font-bold", s.profit >= 0 ? "text-holo-mint" : "text-red-400")}>
                  {s.profit >= 0 ? "+" : "−"}{usd(Math.abs(s.profit))}
                </td>
                <td className={cn("py-2.5 font-mono font-bold", s.profit >= 0 ? "text-holo-mint" : "text-red-400")}>
                  {s.profit >= 0 ? "+" : "−"}{Math.abs(Math.round(s.roi))}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* rationale */}
      <div className="mt-3 space-y-1.5 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
        {roi.rationale.map((line) => (
          <p key={line} className="flex items-start gap-2 text-[11px] leading-relaxed text-white/55">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-holo-gold/70" />
            {line}
          </p>
        ))}
      </div>

      <p className="mt-2.5 text-[10px] leading-relaxed text-white/35">
        Prices: {live ? live.source : card.priceSource} ({live?.updatedAt ?? card.priceDate}) — estimates only, not
        guaranteed sale prices. Verdicts are decision support, not financial advice.
      </p>
    </section>
  );
}
