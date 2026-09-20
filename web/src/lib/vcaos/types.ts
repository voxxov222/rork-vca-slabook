/**
 * VCA Computer backend types — ported from voxxov222/Vcacomputer
 * (src/types/vcaGrading.ts), trimmed to the surface the platform uses.
 */

export type VcaAuthVerdict =
  | "AUTHENTIC"
  | "LIKELY AUTHENTIC"
  | "SUSPICIOUS"
  | "LIKELY COUNTERFEIT"
  | "COUNTERFEIT"
  | "INCONCLUSIVE";

export type VcaEvidenceTaxonomy =
  | "OBSERVED"
  | "MEASURED"
  | "REFERENCE_MATCH"
  | "INFERRED"
  | "POSSIBLE"
  | "UNKNOWN"
  | "INCONCLUSIVE";

export type DefectSeverity = "negligible" | "minor" | "moderate" | "major" | "critical";

export interface VcaBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VcaDefectEvidence {
  id: string;
  category: "centering" | "corner" | "edge" | "surface" | "print" | "optical" | "auth";
  type: string;
  location: string;
  bbox: VcaBoundingBox;
  severity: DefectSeverity;
  scoreDeduction: number;
  confidence: number;
  taxonomy: VcaEvidenceTaxonomy;
  description: string;
  humanStatus: "pending" | "accepted" | "rejected" | "modified";
  detectedByModel: string;
  timestamp: string;
}

export interface VcaCenteringAnalysis {
  leftBorderPx: number;
  rightBorderPx: number;
  topBorderPx: number;
  bottomBorderPx: number;
  leftRatio: number;
  rightRatio: number;
  topRatio: number;
  bottomRatio: number;
  lrRatioLabel: string;
  tbRatioLabel: string;
  lrDeltaPct: number;
  tbDeltaPct: number;
  meetsGemMint10: boolean;
  meetsMint9: boolean;
  subgrade: number;
  confidence: number;
  taxonomy: VcaEvidenceTaxonomy;
}

export interface VcaCornerInspection {
  corner: "TL" | "TR" | "BL" | "BR";
  name: string;
  score: number;
  whiteningPct: number;
  softnessRadiusPx: number;
  damageTypes: string[];
  confidence: number;
}

export interface VcaCornerScores {
  tl: number;
  tr: number;
  bl: number;
  br: number;
}

export interface VcaEdgeInspection {
  edge: "Top" | "Bottom" | "Left" | "Right";
  name: string;
  score: number;
  whiteningSegmentsPct: number;
  chippingCount: number;
  roughCutDetected: boolean;
  roughCutSeverity: DefectSeverity;
  confidence: number;
}

export interface VcaEdgeScores {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface VcaSurfaceAnalysis {
  subgrade: number;
  scratchCount: number;
  indentationCount: number;
  rollerMarksDetected: boolean;
  creaseDetected: boolean;
  holographicPatternIntegrity: number;
  foilScratchesDetected: boolean;
  uvFluorescenceSignature: "standard" | "anomalous" | "untested";
}

export interface VcaPrintAnalysis {
  subgrade: number;
  cmykRosetteMatchScore: number;
  inkRegistrationPassed: boolean;
  colorHistogramDelta: number;
  fontKerningPassed: boolean;
  blackCoreLayerPassed: boolean;
}

export interface VcaSubgrades {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  print: number;
}

export interface VcaGradingPolicyConfig {
  gradingScale: string;
  centeringWeight: number;
  cornersWeight: number;
  edgesWeight: number;
  surfaceWeight: number;
  printWeight: number;
  weakestSubgradeFloorRule: boolean;
  gemMint10RequiresCentering: number;
  serialFormatPrefix: string;
  serialYear: number;
  nfcChipType: string;
  autoAuditLogging: boolean;
}

export interface VcaAuthTest {
  name: string;
  category: string;
  testResult: "PASS" | "REVIEW" | "FAIL";
  confidence: number;
  taxonomy: VcaEvidenceTaxonomy;
  notes: string;
}

export interface VcaAuthenticationReport {
  id: string;
  cardId: string;
  verdict: VcaAuthVerdict;
  overallConfidence: number;
  evidenceMatrix: VcaAuthTest[];
  differenceMapScore: number;
  hashDistance: number;
  humanReviewRequired: boolean;
  createdAt: string;
}
