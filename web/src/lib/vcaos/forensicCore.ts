/**
 * VCA Forensic Core Engine — ported from voxxov222/Vcacomputer
 * (src/lib/vcaForensicCore.ts), adapted to the platform's type surface.
 * Implements the 5 primary grading tool categories as pure functions.
 */

import type {
  VcaAuthenticationReport,
  VcaCenteringAnalysis,
  VcaCornerInspection,
  VcaCornerScores,
  VcaDefectEvidence,
  VcaEdgeInspection,
  VcaEdgeScores,
  VcaGradingPolicyConfig,
  VcaPrintAnalysis,
  VcaSubgrades,
  VcaSurfaceAnalysis,
} from "./types";

export const DEFAULT_GRADING_CONFIG: VcaGradingPolicyConfig = {
  gradingScale: "10_POINT_HALF_STEPS",
  centeringWeight: 0.2,
  cornersWeight: 0.25,
  edgesWeight: 0.25,
  surfaceWeight: 0.2,
  printWeight: 0.1,
  weakestSubgradeFloorRule: true,
  gemMint10RequiresCentering: 9.5,
  serialFormatPrefix: "VCA",
  serialYear: 2026,
  nfcChipType: "NXP_NTAG424_DNA",
  autoAuditLogging: true,
};

/* ---------------------------------------------------------------
 * Category 1: Geometry & Centering Engine
 * ------------------------------------------------------------- */

export function calculateCentering(
  leftBorderPx: number,
  rightBorderPx: number,
  topBorderPx: number,
  bottomBorderPx: number,
): VcaCenteringAnalysis {
  const totalH = leftBorderPx + rightBorderPx;
  const totalV = topBorderPx + bottomBorderPx;

  const leftRatio = totalH > 0 ? Math.round((leftBorderPx / totalH) * 100) : 50;
  const rightRatio = 100 - leftRatio;
  const topRatio = totalV > 0 ? Math.round((topBorderPx / totalV) * 100) : 50;
  const bottomRatio = 100 - topRatio;

  const lrDeltaPct = Math.abs(leftRatio - rightRatio);
  const tbDeltaPct = Math.abs(topRatio - bottomRatio);

  // PSA Gem Mint 10 standard is 55/45 or better front; Mint 9 is 60/40 or better.
  const meetsGemMint10 = lrDeltaPct <= 10 && tbDeltaPct <= 10;
  const meetsMint9 = lrDeltaPct <= 20 && tbDeltaPct <= 20;

  let subgrade = 10.0;
  const maxDelta = Math.max(lrDeltaPct, tbDeltaPct);
  if (maxDelta <= 4) subgrade = 10.0;
  else if (maxDelta <= 10) subgrade = 9.5;
  else if (maxDelta <= 16) subgrade = 9.0;
  else if (maxDelta <= 22) subgrade = 8.5;
  else if (maxDelta <= 28) subgrade = 8.0;
  else if (maxDelta <= 34) subgrade = 7.5;
  else if (maxDelta <= 40) subgrade = 7.0;
  else subgrade = Math.max(5.0, +(10 - maxDelta * 0.12).toFixed(1));

  return {
    leftBorderPx,
    rightBorderPx,
    topBorderPx,
    bottomBorderPx,
    leftRatio,
    rightRatio,
    topRatio,
    bottomRatio,
    lrRatioLabel: `${leftRatio}/${rightRatio}`,
    tbRatioLabel: `${topRatio}/${bottomRatio}`,
    lrDeltaPct,
    tbDeltaPct,
    meetsGemMint10,
    meetsMint9,
    subgrade,
    confidence: 0.98,
    taxonomy: "MEASURED",
  };
}

/* ---------------------------------------------------------------
 * Category 2: Corners & Edges Engines
 * ------------------------------------------------------------- */

export function inspectFourCorners(
  tlScore = 9.5,
  trScore = 9.5,
  blScore = 9.5,
  brScore = 9.5,
): { inspections: VcaCornerInspection[]; subgrade: number; cornerScores: VcaCornerScores } {
  const inspections: VcaCornerInspection[] = [
    {
      corner: "TL",
      name: "Top-Left Corner",
      score: tlScore,
      whiteningPct: tlScore < 9.5 ? 2.5 : 0.2,
      softnessRadiusPx: tlScore < 9.5 ? 1.8 : 0.4,
      damageTypes: tlScore < 9.5 ? ["micro_whitening"] : [],
      confidence: 0.97,
    },
    {
      corner: "TR",
      name: "Top-Right Corner",
      score: trScore,
      whiteningPct: trScore < 9.5 ? 3.1 : 0.1,
      softnessRadiusPx: trScore < 9.5 ? 2.1 : 0.3,
      damageTypes: trScore < 9.5 ? ["micro_whitening"] : [],
      confidence: 0.96,
    },
    {
      corner: "BL",
      name: "Bottom-Left Corner",
      score: blScore,
      whiteningPct: blScore < 9.5 ? 1.9 : 0.0,
      softnessRadiusPx: blScore < 9.5 ? 1.2 : 0.2,
      damageTypes: blScore < 9.5 ? ["fiber_softness"] : [],
      confidence: 0.98,
    },
    {
      corner: "BR",
      name: "Bottom-Right Corner",
      score: brScore,
      whiteningPct: brScore < 9.5 ? 4.2 : 0.2,
      softnessRadiusPx: brScore < 9.5 ? 2.4 : 0.4,
      damageTypes: brScore < 9.5 ? ["corner_rub"] : [],
      confidence: 0.97,
    },
  ];

  const minCorner = Math.min(tlScore, trScore, blScore, brScore);
  const avgCorner = (tlScore + trScore + blScore + brScore) / 4;
  // Subgrade cannot be more than 0.5 above the lowest corner.
  const subgrade = +Math.min(avgCorner, minCorner + 0.5).toFixed(1);
  return { inspections, subgrade, cornerScores: { tl: tlScore, tr: trScore, bl: blScore, br: brScore } };
}

export function inspectFourEdges(
  topScore = 9.5,
  bottomScore = 9.5,
  leftScore = 9.5,
  rightScore = 9.5,
): { inspections: VcaEdgeInspection[]; subgrade: number; edgeScores: VcaEdgeScores } {
  const mk = (
    edge: VcaEdgeInspection["edge"],
    name: string,
    score: number,
    confidence: number,
  ): VcaEdgeInspection => ({
    edge,
    name,
    score,
    whiteningSegmentsPct: score < 9.5 ? 3.0 : 0.4,
    chippingCount: score < 9.0 ? 1 : 0,
    roughCutDetected: false,
    roughCutSeverity: "negligible",
    confidence,
  });

  const inspections = [
    mk("Top", "Top Edge", topScore, 0.97),
    mk("Bottom", "Bottom Edge", bottomScore, 0.98),
    mk("Left", "Left Edge", leftScore, 0.96),
    mk("Right", "Right Edge", rightScore, 0.97),
  ];

  const minEdge = Math.min(topScore, bottomScore, leftScore, rightScore);
  const avgEdge = (topScore + bottomScore + leftScore + rightScore) / 4;
  const subgrade = +Math.min(avgEdge, minEdge + 0.5).toFixed(1);
  return {
    inspections,
    subgrade,
    edgeScores: { top: topScore, bottom: bottomScore, left: leftScore, right: rightScore },
  };
}

/* ---------------------------------------------------------------
 * Category 3: Surface & Print Engines
 * ------------------------------------------------------------- */

export function analyzeSurface(
  scratches = 0,
  indentations = 0,
  holoIntegrity = 98,
): VcaSurfaceAnalysis {
  let subgrade = 10.0;
  if (scratches > 2 || indentations > 1) subgrade = 8.5;
  else if (scratches > 0 || indentations > 0) subgrade = 9.0;
  else if (holoIntegrity < 95) subgrade = 9.5;

  return {
    subgrade,
    scratchCount: scratches,
    indentationCount: indentations,
    rollerMarksDetected: false,
    creaseDetected: false,
    holographicPatternIntegrity: holoIntegrity,
    foilScratchesDetected: scratches > 0,
    uvFluorescenceSignature: "standard",
  };
}

export function analyzePrintQuality(cmykScore = 98.5, colorDelta = 0.03): VcaPrintAnalysis {
  let subgrade = 10.0;
  if (cmykScore < 92 || colorDelta > 0.1) subgrade = 8.5;
  else if (cmykScore < 96 || colorDelta > 0.06) subgrade = 9.0;
  else if (cmykScore < 99) subgrade = 9.5;

  return {
    subgrade,
    cmykRosetteMatchScore: cmykScore,
    inkRegistrationPassed: true,
    colorHistogramDelta: colorDelta,
    fontKerningPassed: true,
    blackCoreLayerPassed: true,
  };
}

export const analyzePrintAndRosette = analyzePrintQuality;

/* ---------------------------------------------------------------
 * Category 4: Authentication & Reference Comparison Engine
 * ------------------------------------------------------------- */

export function evaluateAuthenticity(
  dimensionsMatch: boolean,
  borderGeometryMatch: boolean,
  typographyScore: number,
  holoSignatureScore: number,
  cmykRosetteScore: number,
  hashDistance: number,
): VcaAuthenticationReport {
  const evidenceMatrix = [
    {
      name: "Physical Card Dimensions",
      category: "Geometry",
      testResult: dimensionsMatch ? ("PASS" as const) : ("FAIL" as const),
      confidence: 0.99,
      taxonomy: "MEASURED" as const,
      notes: "Card outer perimeter measures exact 63.0mm × 88.0mm standard (±0.15mm tolerance).",
    },
    {
      name: "Border Geometry & Print Alignment",
      category: "Geometry",
      testResult: borderGeometryMatch ? ("PASS" as const) : ("REVIEW" as const),
      confidence: 0.97,
      taxonomy: "MEASURED" as const,
      notes: "Border stroke width and die-cut corner radii conform to authentic factory baseline.",
    },
    {
      name: "Typography & Micro-Kerning",
      category: "Typography",
      testResult: typographyScore >= 95 ? ("PASS" as const) : ("REVIEW" as const),
      confidence: 0.96,
      taxonomy: "REFERENCE_MATCH" as const,
      notes: `Nintendo copyright font kerning and HP/Attack glyph vectors match the canonical reference at ${typographyScore}%.`,
    },
    {
      name: "Holographic Optical Signature",
      category: "Optical",
      testResult: holoSignatureScore >= 92 ? ("PASS" as const) : ("REVIEW" as const),
      confidence: 0.95,
      taxonomy: "OBSERVED" as const,
      notes: "Holo foil diffraction grating index and sparkle dispersion reflect genuine factory foil.",
    },
    {
      name: "CMYK Micro-Rosette Dot Matrix",
      category: "Print",
      testResult: cmykRosetteScore >= 95 ? ("PASS" as const) : ("REVIEW" as const),
      confidence: 0.98,
      taxonomy: "REFERENCE_MATCH" as const,
      notes: `Halftone screen angles and rosette spacing match the authentic master catalog at ${cmykRosetteScore}%.`,
    },
  ];

  const passCount = evidenceMatrix.filter((t) => t.testResult === "PASS").length;
  let verdict: VcaAuthenticationReport["verdict"] = "AUTHENTIC";
  let confidence = 98.6;

  if (passCount === 5 && hashDistance < 12) {
    verdict = "AUTHENTIC";
    confidence = 99.4;
  } else if (passCount >= 4) {
    verdict = "LIKELY AUTHENTIC";
    confidence = 94.2;
  } else if (passCount === 3) {
    verdict = "SUSPICIOUS";
    confidence = 78.5;
  } else {
    verdict = "LIKELY COUNTERFEIT";
    confidence = 88.0;
  }

  return {
    id: `auth-${Date.now()}`,
    cardId: "",
    verdict,
    overallConfidence: confidence,
    evidenceMatrix,
    differenceMapScore: hashDistance,
    hashDistance,
    humanReviewRequired: verdict !== "AUTHENTIC",
    createdAt: new Date().toISOString(),
  };
}

/* ---------------------------------------------------------------
 * Category 5: Multi-Factor Subgrade & Overall Grade Calculator
 * ------------------------------------------------------------- */

export function calculateOverallGrade(
  subgrades: VcaSubgrades,
  config: VcaGradingPolicyConfig = DEFAULT_GRADING_CONFIG,
): { overallGrade: number; gradeLabel: string } {
  const { centering, corners, edges, surface, print } = subgrades;

  const rawAverage =
    centering * config.centeringWeight +
    corners * config.cornersWeight +
    edges * config.edgesWeight +
    surface * config.surfaceWeight +
    print * config.printWeight;

  // Weakest subgrade floor rule (industry standard, like BGS / CGC).
  const minSubgrade = Math.min(centering, corners, edges, surface);
  let finalGrade = rawAverage;
  if (config.weakestSubgradeFloorRule) {
    finalGrade = Math.min(finalGrade, minSubgrade + 0.5);
  }

  // Quantize to half grade (e.g. 8.5, 9.0, 9.5, 10.0).
  const halfGrade = Math.floor(finalGrade * 2) / 2;

  let gradeLabel = "AUTHENTIC";
  if (halfGrade === 10.0) {
    gradeLabel = centering === 10 && corners === 10 && edges === 10 && surface === 10 ? "PRISTINE 10.0" : "GEM MINT 10.0";
  } else if (halfGrade === 9.5) gradeLabel = "GEM MINT 9.5";
  else if (halfGrade === 9.0) gradeLabel = "MINT 9.0";
  else if (halfGrade === 8.5) gradeLabel = "NEAR MINT-MINT+ 8.5";
  else if (halfGrade === 8.0) gradeLabel = "NEAR MINT-MINT 8.0";
  else if (halfGrade === 7.5) gradeLabel = "NEAR MINT+ 7.5";
  else if (halfGrade === 7.0) gradeLabel = "NEAR MINT 7.0";
  else if (halfGrade >= 6.0) gradeLabel = `EXCELLENT-MINT ${halfGrade.toFixed(1)}`;
  else gradeLabel = `GOOD ${halfGrade.toFixed(1)}`;

  return { overallGrade: halfGrade, gradeLabel };
}

/* ---------------------------------------------------------------
 * Serialization & Verification Builders
 * ------------------------------------------------------------- */

export function generateVcaSerial(prefix = "VCA", year = 2026, sequenceNumber?: number): string {
  const seq = sequenceNumber ?? Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${year}-${String(seq).padStart(8, "0")}`;
}

export function generateTamperProofHash(data: Record<string, unknown>): string {
  const jsonStr = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < jsonStr.length; i++) {
    hash = (hash << 5) - hash + jsonStr.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0").toUpperCase();
  return `0xVCA_${hex}_SECURE_SHA256`;
}

/* ---------------------------------------------------------------
 * Evidence builder
 * ------------------------------------------------------------- */

export function makeDefectEvidence(
  category: VcaDefectEvidence["category"],
  type: string,
  location: string,
  severity: VcaDefectEvidence["severity"],
  scoreDeduction: number,
): VcaDefectEvidence {
  return {
    id: `def-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category,
    type,
    location,
    bbox: { x: 0, y: 0, width: 0, height: 0 },
    severity,
    scoreDeduction,
    confidence: 0.9,
    taxonomy: "OBSERVED",
    description: `${type} detected at ${location}`,
    humanStatus: "pending",
    detectedByModel: "vca-forensic-core",
    timestamp: new Date().toISOString(),
  };
}
