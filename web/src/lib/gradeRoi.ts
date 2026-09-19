/**
 * ShouldISlab grading-ROI engine (after the open-source shouldislab skill).
 *
 * Answers "should I grade this card?" with math, not a guess:
 * - models every grade scenario (PSA 10 / 9 / 8) against total cost-in
 *   (raw value + grading service fee + shipping),
 * - applies era awareness (vintage gems lower but premiums run bigger),
 * - issues a verdict: SLAB IT / SKIP IT / MAYBE.
 *
 * Key insight encoded here: most modern cards grade PSA 9, not 10 — tools
 * that only show PSA 10 upside mislead collectors.
 */

export type SlabVerdict = "SLAB IT" | "SKIP IT" | "MAYBE";

export type GradeScenarioGrade = "PSA 10" | "PSA 9" | "PSA 8";

/** PSA service tiers + ~$10 shipping/insurance. */
export const GRADING_TIERS = [
  { id: "bulk", label: "PSA Bulk · $25 + ship", cost: 35 },
  { id: "regular", label: "PSA Regular · $75 + ship", cost: 85 },
  { id: "express", label: "PSA Express/Vintage · $150 + ship", cost: 160 },
] as const;

export interface GradeScenario {
  grade: GradeScenarioGrade;
  gradedValue: number;
  /** Total capital at risk: raw value + grading cost. */
  costIn: number;
  profit: number;
  /** Profit / cost-in, %. */
  roi: number;
}

export interface GradeRoiInput {
  name: string;
  set: string;
  year: number;
  raw: number;
  g10: number;
  g9: number;
  g8: number;
  gradingCost: number;
}

export interface GradeRoiResult {
  scenarios: GradeScenario[];
  verdict: SlabVerdict;
  headline: string;
  rationale: string[];
  gradingCost: number;
  costIn: number;
  era: "vintage" | "modern";
}

/**
 * Computes per-grade P/L and ROI, then issues the verdict:
 * - SLAB IT — PSA 9 (the base case) is profitable
 * - MAYBE   — PSA 9 is roughly break-even but PSA 10 has meaningful upside
 * - SKIP IT — only PSA 10 profits (or the card is too cheap to justify grading)
 */
export function computeGradeRoi(input: GradeRoiInput): GradeRoiResult {
  const costIn = Math.max(1, input.raw + input.gradingCost);
  const scenario = (grade: GradeScenarioGrade, gradedValue: number): GradeScenario => ({
    grade,
    gradedValue: gradedValue,
    costIn,
    profit: gradedValue - costIn,
    roi: ((gradedValue - costIn) / costIn) * 100,
  });
  const scenarios: GradeScenario[] = [
    scenario("PSA 10", input.g10),
    scenario("PSA 9", input.g9),
    scenario("PSA 8", input.g8),
  ];
  const g10Profit = scenarios[0].profit;
  const g9Profit = scenarios[1].profit;
  const era: GradeRoiResult["era"] = input.year <= 2002 ? "vintage" : "modern";

  let verdict: SlabVerdict;
  let headline: string;
  if (input.raw < 20 && g9Profit <= 0) {
    verdict = "SKIP IT";
    headline = "Raw value too low — grading costs swallow any upside";
  } else if (g9Profit > 0) {
    verdict = "SLAB IT";
    headline = "Profitable even at PSA 9 — the likely outcome";
  } else if (Math.abs(g9Profit) <= costIn * 0.15 && g10Profit >= costIn * 0.4) {
    verdict = "MAYBE";
    headline = "PSA 9 is break-even, but PSA 10 has real upside";
  } else {
    verdict = "SKIP IT";
    headline = "Only PSA 10 turns a profit — the math says keep it raw";
  }

  const rationale: string[] = [];
  rationale.push(
    era === "vintage"
      ? "Vintage era (pre-2003): gem rates run ~20–30% at PSA 10, but graded premiums are the largest."
      : "Modern era: gem rates run ~35–50% at PSA 10, but graded premiums are thinner.",
  );
  const premium = input.raw > 0 ? input.g10 / input.raw : 0;
  if (premium > 0 && premium < 1.8) {
    rationale.push("Graded premium is thin — selling raw likely beats grading after fees and wait time.");
  } else if (premium >= 4) {
    rationale.push("PSA 10 premium is wide — but check the PSA population report; high gem pops compress premiums.");
  }
  if (verdict === "MAYBE") {
    rationale.push("Only send if centering and surface are visibly clean — otherwise keep it raw.");
  }
  if (verdict === "SLAB IT") {
    rationale.push("Even the mid outcome pays — the downside is capped and the gem outcome compounds.");
  }
  rationale.push("Inspect centering and edge whitening under bright light first — the #1 PSA 10 killer.");
  rationale.push(`Total cost-in = raw value + $${input.gradingCost} grading (service fee + shipping/insurance).`);

  return { scenarios, verdict, headline, rationale, gradingCost: input.gradingCost, costIn, era };
}
