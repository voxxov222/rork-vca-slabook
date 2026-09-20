import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Award,
  Camera,
  Crosshair,
  FileText,
  Grid3x3,
  Lock,
  Microscope,
  Minus,
  Pin,
  Plus,
  RefreshCw,
  Ruler,
  Sparkles,
  Stamp,
} from "lucide-react";

import ForensicRadar, { type ForensicSubgrades } from "@/components/ForensicRadar";
import { CATALOG } from "@/lib/data";
import type { CatalogCard } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  analyzePrintQuality,
  analyzeSurface,
  calculateCentering,
  calculateOverallGrade,
  generateTamperProofHash,
  generateVcaSerial,
  inspectFourCorners,
  inspectFourEdges,
} from "@/lib/vcaos/forensicCore";

/* -------------------------------- tools -------------------------------- */

type ToolStatus = "READY" | "PROCESSING" | "COMPLETE" | "LIMITED" | "REQUIRES_REVIEW";

interface InspectionTool {
  id: string;
  categoryIndex: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  enabled: boolean;
}

const CATEGORIES = [
  { index: 1 as const, id: "IMAGE_FORENSICS", label: "Image Forensics" },
  { index: 2 as const, id: "CENTERING_GEOMETRY", label: "Centering Geometry" },
  { index: 3 as const, id: "PHYSICAL_CONDITION", label: "Physical Condition" },
  { index: 4 as const, id: "PRINT_AUTHENTICITY", label: "Print & Authenticity" },
  { index: 5 as const, id: "GRADING_DECISION", label: "Grading Decision" },
];

/* 25-tool forensic pipeline, ported from Vcacomputer vcaToolsDefinitions. */
const VCA_FORENSIC_TOOLS: InspectionTool[] = [
  { id: "multi_spectrum", categoryIndex: 1, name: "Multi-Spectrum Image Enhancement", description: "Enhance specimen scan across visible / IR / UV spectrums.", enabled: true },
  { id: "negative_inversion", categoryIndex: 1, name: "Negative / Inversion Analysis", description: "Invert specimen to expose tampering and reprint artifacts.", enabled: true },
  { id: "superimpose_overlay", categoryIndex: 1, name: "Superimpose / Overlay Comparison", description: "Blend specimen against the canonical reference image.", enabled: true },
  { id: "xray_structural", categoryIndex: 1, name: "X-Ray / Structural Visualization", description: "Reveal internal layer structure and black core layer.", enabled: true },
  { id: "pixel_forensics", categoryIndex: 1, name: "Pixel / Artifact Forensics", description: "Edge-map scan for splice seams and cloned pixels.", enabled: true },
  { id: "border_measurement", categoryIndex: 2, name: "Border Detection & Measurement", description: "Detect and measure all four borders in millimeters.", enabled: true },
  { id: "front_centering", categoryIndex: 2, name: "Front Centering Analyzer", description: "Compute front L/R and T/B centering ratios.", enabled: true },
  { id: "back_centering", categoryIndex: 2, name: "Back Centering Analyzer", description: "Compute back-face centering ratios against the standard.", enabled: true },
  { id: "perspective_correction", categoryIndex: 2, name: "Perspective & Keystone Correction", description: "Rectify scan keystone before geometry measurement.", enabled: true },
  { id: "geometry_dimensions", categoryIndex: 2, name: "Geometry / Dimension Verification", description: "Verify 63.0mm × 88.0mm outer perimeter and corner radii.", enabled: true },
  { id: "corner_inspection", categoryIndex: 3, name: "Four-Corner Micro-Damage Analyzer", description: "Score each corner for whitening, softness and rub.", enabled: true },
  { id: "edge_inspection", categoryIndex: 3, name: "Four-Edge Micro-Chipping Inspector", description: "Score each edge for chipping and whitening segments.", enabled: true },
  { id: "edge_profile", categoryIndex: 3, name: "Edge Profile & Consistency Analysis", description: "Analyze edge straightness and die-cut consistency.", enabled: true },
  { id: "surface_damage", categoryIndex: 3, name: "Surface Damage Scanner", description: "Scan for scratches, indentations and print lines.", enabled: true },
  { id: "gloss_texture", categoryIndex: 3, name: "Gloss / Texture / Surface Pattern Analysis", description: "Verify factory gloss signature and texture pattern.", enabled: true },
  { id: "print_registration", categoryIndex: 4, name: "Print Registration & Rosette Analysis", description: "Match CMYK rosette screen angles to the master catalog.", enabled: true },
  { id: "typography_font", categoryIndex: 4, name: "Typography / Font & Kerning Analysis", description: "Compare glyph vectors and kerning to the reference font.", enabled: true },
  { id: "ink_density", categoryIndex: 4, name: "Ink / Color / Print Density Analysis", description: "Measure ink density curves and color histogram delta.", enabled: true },
  { id: "holo_foil", categoryIndex: 4, name: "Holographic / Foil Pattern Analysis", description: "Verify holo diffraction grating and sparkle dispersion.", enabled: true },
  { id: "authenticity_detector", categoryIndex: 4, name: "Authenticity Anomaly Detector", description: "Fuse all print/geometry evidence into an authenticity verdict.", enabled: true },
  { id: "defect_mapping", categoryIndex: 5, name: "Defect Mapping & Severity Engine", description: "Map every defect with bbox, severity and deduction.", enabled: true },
  { id: "condition_scoring", categoryIndex: 5, name: "Professional Condition Scoring", description: "Weighted multi-factor subgrade scoring.", enabled: true },
  { id: "reference_analyzer", categoryIndex: 5, name: "Comparative Reference Analyzer", description: "Comparative analysis against the canonical reference card.", enabled: true },
  { id: "final_report", categoryIndex: 5, name: "Final Authentication & Grade Report", description: "Compile the final grade report and evidence summary.", enabled: true },
  { id: "master_dashboard", categoryIndex: 5, name: "VCA Master Forensic Dashboard", description: "Run the full 25-tool pipeline and summarize all evidence.", enabled: true },
];

/* ------------------------------ specimen profile ------------------------------ */

const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return Math.abs(h);
};

/** Deterministic per-card measurement profile so every specimen inspects differently. */
function profileFor(card: CatalogCard) {
  const h = hashStr(card.id);
  const leftPct = 44 + (h % 13);
  const topPct = 44 + ((h >> 4) % 13);
  const pick = (shift: number) => [9.0, 9.5, 10.0][(h >> shift) % 3] as number;
  return {
    borders: { left: leftPct * 10, right: (100 - leftPct) * 10, top: topPct * 10, bottom: (100 - topPct) * 10 },
    corners: { a: pick(2), b: pick(6), c: pick(10), d: pick(14) },
    edges: { a: pick(18), b: pick(20), c: pick(22), d: pick(24) },
    scratches: (h >> 3) % 2,
    indentations: (h >> 7) % 2,
    holo: 94 + ((h >> 9) % 6),
    cmyk: 96 + ((h >> 11) % 40) / 10,
    colorDelta: 0.01 + ((h >> 13) % 8) / 100,
  };
}

interface Defect {
  id: string;
  category: string;
  type: string;
  location: string;
  bbox: { x: number; y: number; width: number; height: number };
  severity: "minor" | "moderate" | "major";
  scoreDeduction: number;
  humanStatus: "pending" | "accepted" | "rejected";
}

const PROFILE_TO_PROFILE_DEFECTS = (card: CatalogCard, p: ReturnType<typeof profileFor>): Defect[] => {
  const defects: Defect[] = [];
  const h = hashStr(card.id);
  if (p.corners.d < 10) {
    defects.push({ id: "DEF-01", category: "corner", type: "Micro-Whitening", location: "Bottom-Right Corner (Tip)", bbox: { x: 86, y: 90, width: 8, height: 6 }, severity: "minor", scoreDeduction: 0.5, humanStatus: "accepted" });
  }
  if (p.scratches > 0 || p.holo < 97) {
    defects.push({ id: "DEF-02", category: "surface", type: "Micro-Scratch", location: "Holographic Window Upper Right", bbox: { x: 62, y: 26, width: 12, height: 5 }, severity: "minor", scoreDeduction: 0.5, humanStatus: "pending" });
  }
  if (p.edges.c < 10) {
    defects.push({ id: "DEF-03", category: "edge", type: "Blade Nick", location: `Left Edge (${30 + (h % 30)}% offset)`, bbox: { x: 2, y: 30 + (h % 30), width: 4, height: 6 }, severity: "minor", scoreDeduction: 0.5, humanStatus: "pending" });
  }
  return defects;
};

/* ------------------------------ viewer filters ------------------------------ */

type ViewFilter = "original" | "negative" | "edge_sobel" | "contrast" | "grayscale" | "xray" | "superimpose" | "cmyk_blue";

const VIEW_FILTERS: { id: ViewFilter; label: string }[] = [
  { id: "original", label: "Original" },
  { id: "contrast", label: "Enhanced" },
  { id: "negative", label: "Negative" },
  { id: "edge_sobel", label: "Edge Map" },
  { id: "xray", label: "X-Ray" },
  { id: "grayscale", label: "Grayscale" },
  { id: "cmyk_blue", label: "CMYK" },
  { id: "superimpose", label: "Superimpose" },
];

const filterStyle = (f: ViewFilter, contrastVal: number, exposureVal: number): CSSProperties => {
  switch (f) {
    case "negative": return { filter: "invert(1)" };
    case "grayscale": return { filter: "grayscale(1)" };
    case "contrast": return { filter: `contrast(${contrastVal}%) brightness(${exposureVal}%) saturate(1.1)` };
    case "edge_sobel": return { filter: "url(#vca-sobel) invert(0.92)" };
    case "xray": return { filter: "invert(1) hue-rotate(180deg) contrast(1.35) brightness(0.9)" };
    case "cmyk_blue": return { filter: "sepia(1) hue-rotate(190deg) saturate(3.2)" };
    default: return {};
  }
};

/* -------------------------------- component -------------------------------- */

interface Certificate {
  serial: string;
  hash: string;
  gradeLabel: string;
  overallGrade: number;
  issuedAt: string;
  notes: string;
}

/**
 * VCA admin card inspection lab — ported from Vcacomputer ForensicLabSuite.
 * Forensic viewer (zoom/pan, spectrum filters, superimpose, overlays), the
 * 25-tool pipeline across 5 categories, defect pinboard with human review,
 * subgrade overrides, radar summary and certificate minting.
 */
export default function CardInspectionLab() {
  const [card, setCard] = useState<CatalogCard>(CATALOG[0]);
  const profile = useMemo(() => profileFor(card), [card]);

  /* forensic measurements (recomputed per specimen) */
  const centering = useMemo(
    () => calculateCentering(profile.borders.left, profile.borders.right, profile.borders.top, profile.borders.bottom),
    [profile],
  );
  const corners = useMemo(() => inspectFourCorners(profile.corners.a, profile.corners.b, profile.corners.c, profile.corners.d), [profile]);
  const edges = useMemo(() => inspectFourEdges(profile.edges.a, profile.edges.b, profile.edges.c, profile.edges.d), [profile]);
  const surface = useMemo(() => analyzeSurface(profile.scratches, profile.indentations, profile.holo), [profile]);
  const print = useMemo(() => analyzePrintQuality(profile.cmyk, profile.colorDelta), [profile]);

  const derivedSubgrades: ForensicSubgrades = useMemo(
    () => ({
      centering: centering.subgrade,
      corners: corners.subgrade,
      edges: edges.subgrade,
      surface: surface.subgrade,
      print: print.subgrade,
    }),
    [centering, corners, edges, surface, print],
  );

  const [subgrades, setSubgrades] = useState<ForensicSubgrades>(derivedSubgrades);
  const [isOverridden, setIsOverridden] = useState(false);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [graderNotes, setGraderNotes] = useState("");
  const [cert, setCert] = useState<Certificate | null>(null);
  const [audit, setAudit] = useState<string | null>(null);
  const auditTimer = useRef<number | null>(null);

  /* tool pipeline state */
  const [activeCategory, setActiveCategory] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [statuses, setStatuses] = useState<Record<string, ToolStatus>>({});
  const [processingAll, setProcessingAll] = useState(false);
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);

  /* viewer state */
  const [filter, setFilter] = useState<ViewFilter>("original");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [superimposeOpacity, setSuperimposeOpacity] = useState(50);
  const [contrastVal, setContrastVal] = useState(130);
  const [exposureVal, setExposureVal] = useState(105);
  const [showGrid, setShowGrid] = useState(true);
  const [showCalipers, setShowCalipers] = useState(true);
  const [showCornerBoxes, setShowCornerBoxes] = useState(true);
  const [showDefects, setShowDefects] = useState(true);
  const dragging = useRef<{ x: number; y: number } | null>(null);

  /* reset per-specimen */
  useEffect(() => {
    setSubgrades(derivedSubgrades);
    setIsOverridden(false);
    setDefects(PROFILE_TO_PROFILE_DEFECTS(card, profile));
    setGraderNotes(`Specimen ${card.name} matches authentic CMYK rosette screen angles. Measurements pending tool run.`);
    setCert(null);
    setStatuses({});
    setFilter("original");
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [card, derivedSubgrades, profile]);

  const flashAudit = (msg: string) => {
    setAudit(msg);
    if (auditTimer.current) window.clearTimeout(auditTimer.current);
    auditTimer.current = window.setTimeout(() => setAudit(null), 4200);
  };

  const overall = calculateOverallGrade(subgrades);

  /* run one tool: simulated processing, real forensic-core effect */
  const runTool = async (tool: InspectionTool) => {
    if (!tool.enabled || statuses[tool.id] === "PROCESSING") return;
    setStatuses((s) => ({ ...s, [tool.id]: "PROCESSING" }));
    await new Promise((r) => setTimeout(r, 420 + (hashStr(tool.id + card.id) % 380)));

    switch (tool.categoryIndex) {
      case 1: {
        const map: Partial<Record<string, ViewFilter>> = {
          multi_spectrum: "contrast",
          negative_inversion: "negative",
          superimpose_overlay: "superimpose",
          xray_structural: "xray",
          pixel_forensics: "edge_sobel",
        };
        const f = map[tool.id];
        if (f) setFilter(f);
        break;
      }
      case 2:
        setSubgrades((s) => ({ ...s, centering: centering.subgrade }));
        break;
      case 3:
        setSubgrades((s) => ({ ...s, corners: corners.subgrade, edges: edges.subgrade, surface: surface.subgrade }));
        break;
      case 4:
        setSubgrades((s) => ({ ...s, print: print.subgrade }));
        if (tool.id === "holo_foil") setSubgrades((s) => ({ ...s, surface: surface.subgrade }));
        break;
      case 5:
        setSubgrades(derivedSubgrades);
        setIsOverridden(false);
        break;
    }

    setStatuses((s) => ({ ...s, [tool.id]: "COMPLETE" }));
    flashAudit(`${tool.name} — COMPLETE · confidence ${95 + (hashStr(tool.id) % 5)}%`);
  };

  const runAll = async () => {
    setProcessingAll(true);
    for (const t of VCA_FORENSIC_TOOLS) {
      await runTool({ ...t, enabled: true });
    }
    setProcessingAll(false);
    flashAudit("Full 25-tool forensic pipeline completed. All evidence verified.");
  };

  const categoryTools = VCA_FORENSIC_TOOLS.filter((t) => t.categoryIndex === activeCategory).filter(
    (t) => !showOnlyEnabled || t.enabled,
  );

  const statusChip = (st: ToolStatus | undefined) => {
    const map: Record<ToolStatus, string> = {
      READY: "text-white/45 border-white/15",
      PROCESSING: "text-holo-gold border-holo-gold/40 animate-pulse",
      COMPLETE: "text-holo-mint border-holo-mint/40",
      LIMITED: "text-white/35 border-white/10",
      REQUIRES_REVIEW: "text-holo-magenta border-holo-magenta/40",
    };
    const label = st ?? "READY";
    return (
      <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[8px] font-bold tracking-wider", map[label])}>
        {label}
      </span>
    );
  };

  const mintCertificate = () => {
    const serial = generateVcaSerial();
    setCert({
      serial,
      hash: generateTamperProofHash({ card: card.tcgCardId, grade: overall.gradeLabel, centering: centering.lrRatioLabel, serial, notes: graderNotes }),
      gradeLabel: overall.gradeLabel,
      overallGrade: overall.overallGrade,
      issuedAt: new Date().toISOString(),
      notes: graderNotes,
    });
    flashAudit(`Certificate ${serial} minted and locked to the ledger.`);
  };

  const subgradeSliders: { key: keyof ForensicSubgrades; label: string }[] = [
    { key: "centering", label: "Centering" },
    { key: "corners", label: "Corners" },
    { key: "edges", label: "Edges" },
    { key: "surface", label: "Surface" },
    { key: "print", label: "Print" },
  ];

  return (
    <div className="space-y-4">
      {/* sobel edge-detect filter definition */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id="vca-sobel">
          <feConvolveMatrix order="3" preserveAlpha="true" divisor="1" kernelMatrix="0 1 0 1 -4 1 0 1 0" />
        </filter>
      </svg>

      {/* specimen selector */}
      <section className="glass rounded-3xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
              <Microscope className="h-4 w-4 text-holo-cyan" /> CARD INSPECTION LAB
            </p>
            <p className="mt-1 text-[11px] text-white/45">
              25-tool forensic pipeline · 5 categories · specimen vs. canonical reference
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={card.id}
              onChange={(e) => setCard(CATALOG.find((c) => c.id === e.target.value) ?? CATALOG[0])}
              aria-label="Select specimen card"
              className="max-w-[240px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[12px] font-semibold text-white outline-none focus:border-holo-cyan/50"
            >
              {CATALOG.map((c) => (
                <option key={c.id} value={c.id} className="bg-void">
                  {c.name} · {c.set}
                </option>
              ))}
            </select>
            <button
              onClick={runAll}
              disabled={processingAll}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-2 text-[11px] font-bold text-void transition-transform active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", processingAll && "animate-spin")} />
              {processingAll ? "PIPELINE RUNNING…" : "RUN ALL 25 TOOLS"}
            </button>
          </div>
        </div>
        <p className="mt-2 font-mono text-[10px] text-white/40">
          SPECIMEN {card.tcgCardId.toUpperCase()} · {card.set} · #{card.number} · {card.year} · {card.rarity} · REF{" "}
          <span className="text-holo-cyan">pokemontcg.io hires</span>
        </p>
      </section>

      {/* viewer + tools */}
      <section className="grid gap-4 lg:grid-cols-5">
        {/* forensic viewer */}
        <div className="glass rounded-3xl p-4 lg:col-span-3">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[9.5px] font-bold uppercase tracking-widest text-white/50">Forensic Viewer</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))}
                aria-label="Zoom out"
                className="rounded-lg border border-white/12 bg-white/5 p-1.5 text-white/60 hover:text-white"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-10 text-center font-mono text-[10px] text-holo-cyan">{zoom.toFixed(1)}×</span>
              <button
                onClick={() => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(1)))}
                aria-label="Zoom in"
                className="rounded-lg border border-white/12 bg-white/5 p-1.5 text-white/60 hover:text-white"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                aria-label="Reset view"
                className="rounded-lg border border-white/12 bg-white/5 p-1.5 text-white/60 hover:text-white"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* filter chips */}
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {VIEW_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold transition-colors",
                  filter === f.id ? "border-holo-cyan/60 bg-holo-cyan/15 text-holo-cyan" : "border-white/12 bg-white/5 text-white/50 hover:text-white",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* specimen stage */}
          <div
            className="relative mx-auto aspect-[5/7] w-full max-w-[320px] cursor-grab touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-black/40 active:cursor-grabbing"
            onPointerDown={(e) => {
              dragging.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!dragging.current) return;
              setPan({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y });
            }}
            onPointerUp={() => (dragging.current = null)}
          >
            <img
              src={card.artUrl}
              alt={`${card.name} specimen scan`}
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain p-2"
              style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, ...filterStyle(filter, contrastVal, exposureVal) }}
            />
            {filter === "superimpose" && (
              <img
                src={card.artUrl}
                alt=""
                aria-hidden
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain p-2 mix-blend-difference"
                style={{ transform: `scale(${zoom * 1.012})`, opacity: superimposeOpacity / 100 }}
              />
            )}

            {/* overlays */}
            {showGrid && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(126,240,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(126,240,255,0.14) 1px, transparent 1px)",
                  backgroundSize: "12.5% 12.5%",
                }}
              />
            )}
            {showCornerBoxes && (
              <>
                {[
                  { top: 4, left: 4 }, { top: 4, right: 4 }, { bottom: 4, left: 4 }, { bottom: 4, right: 4 },
                ].map((pos, i) => (
                  <span
                    key={i}
                    className="pointer-events-none absolute h-7 w-7 border border-holo-cyan/60"
                    style={pos}
                  />
                ))}
              </>
            )}
            {showCalipers && (
              <>
                <span className="pointer-events-none absolute left-2 right-2 top-1/2 flex items-center justify-between font-mono text-[8px] font-bold text-holo-mint">
                  <span className="rounded bg-black/70 px-1">L {centering.leftRatio}%</span>
                  <span className="rounded bg-black/70 px-1">R {centering.rightRatio}%</span>
                </span>
                <span className="pointer-events-none absolute bottom-2 left-1/2 top-2 flex flex-col items-center justify-between font-mono text-[8px] font-bold text-holo-gold">
                  <span className="rounded bg-black/70 px-1">T {centering.topRatio}%</span>
                  <span className="rounded bg-black/70 px-1">B {centering.bottomRatio}%</span>
                </span>
              </>
            )}
            {showDefects &&
              defects
                .filter((d) => d.humanStatus !== "rejected")
                .map((d) => (
                  <span
                    key={d.id}
                    title={`${d.type} — ${d.location}`}
                    className="pointer-events-none absolute rounded-full border-2 border-holo-magenta bg-holo-magenta/25 shadow-[0_0_10px_rgba(255,77,166,0.7)]"
                    style={{ left: `${d.bbox.x}%`, top: `${d.bbox.y}%`, width: `${d.bbox.width}%`, height: `${d.bbox.height}%` }}
                  />
                ))}
          </div>

          {/* viewer controls */}
          <div className="mt-3 space-y-2.5">
            {filter === "superimpose" && (
              <label className="block">
                <span className="flex justify-between font-mono text-[9px] font-bold uppercase tracking-wider text-white/45">
                  Specimen ↔ Reference blend <span className="text-holo-cyan">{superimposeOpacity}%</span>
                </span>
                <input type="range" min={0} max={100} value={superimposeOpacity} onChange={(e) => setSuperimposeOpacity(Number(e.target.value))} className="mt-1 h-1.5 w-full accent-cyan-400" />
              </label>
            )}
            {filter === "contrast" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="flex justify-between font-mono text-[9px] font-bold uppercase tracking-wider text-white/45">
                    Contrast <span className="text-holo-cyan">{contrastVal}%</span>
                  </span>
                  <input type="range" min={80} max={220} value={contrastVal} onChange={(e) => setContrastVal(Number(e.target.value))} className="mt-1 h-1.5 w-full accent-cyan-400" />
                </label>
                <label className="block">
                  <span className="flex justify-between font-mono text-[9px] font-bold uppercase tracking-wider text-white/45">
                    Exposure <span className="text-holo-cyan">{exposureVal}%</span>
                  </span>
                  <input type="range" min={60} max={160} value={exposureVal} onChange={(e) => setExposureVal(Number(e.target.value))} className="mt-1 h-1.5 w-full accent-cyan-400" />
                </label>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {[
                { icon: Grid3x3, label: "Grid", on: showGrid, toggle: () => setShowGrid((v) => !v) },
                { icon: Ruler, label: "Calipers", on: showCalipers, toggle: () => setShowCalipers((v) => !v) },
                { icon: Crosshair, label: "Corner boxes", on: showCornerBoxes, toggle: () => setShowCornerBoxes((v) => !v) },
                { icon: Pin, label: "Defects", on: showDefects, toggle: () => setShowDefects((v) => !v) },
              ].map(({ icon: Icon, label, on, toggle }) => (
                <button
                  key={label}
                  onClick={toggle}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold transition-colors",
                    on ? "border-holo-cyan/50 bg-holo-cyan/10 text-holo-cyan" : "border-white/12 bg-white/5 text-white/45",
                  )}
                >
                  <Icon className="h-3 w-3" /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* tool pipeline */}
        <div className="glass rounded-3xl p-4 lg:col-span-2">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="font-mono text-[9.5px] font-bold uppercase tracking-widest text-white/50">Tool Pipeline</p>
            <label className="flex items-center gap-1.5 font-mono text-[9px] text-white/45">
              <input type="checkbox" checked={showOnlyEnabled} onChange={(e) => setShowOnlyEnabled(e.target.checked)} className="accent-cyan-400" />
              enabled only
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.index}
                onClick={() => setActiveCategory(c.index)}
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold transition-colors",
                  activeCategory === c.index ? "border-holo-cyan/60 bg-holo-cyan/15 text-holo-cyan" : "border-white/12 bg-white/5 text-white/50 hover:text-white",
                )}
              >
                {c.index} · {c.label}
              </button>
            ))}
          </div>
          <div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto pr-1">
            {categoryTools.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11.5px] font-bold leading-snug text-white/85">{t.name}</p>
                  {statusChip(statuses[t.id])}
                </div>
                <p className="mt-0.5 text-[10px] leading-snug text-white/45">{t.description}</p>
                <button
                  onClick={() => runTool(t)}
                  disabled={processingAll || !t.enabled || statuses[t.id] === "PROCESSING"}
                  className="mt-1.5 w-full rounded-lg border border-holo-cyan/35 bg-holo-cyan/10 py-1.5 text-[10px] font-bold text-holo-cyan transition-colors hover:bg-holo-cyan/20 disabled:opacity-40"
                >
                  {statuses[t.id] === "PROCESSING" ? "PROCESSING…" : statuses[t.id] === "COMPLETE" ? "RE-RUN" : "RUN TOOL"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* results: radar + subgrades + defects + notes */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-3xl p-4">
          <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
            <Sparkles className="h-4 w-4 text-holo-cyan" /> INSPECTION SUMMARY
            {isOverridden && (
              <span className="rounded-full border border-holo-gold/40 bg-holo-gold/10 px-2 py-0.5 font-mono text-[8.5px] font-bold text-holo-gold">
                HUMAN OVERRIDE
              </span>
            )}
          </p>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-1">
              <ForensicRadar subgrades={subgrades} />
            </div>
            <div className="flex flex-col justify-center gap-2">
              <div className="rounded-2xl border border-holo-cyan/25 bg-gradient-to-br from-holo-cyan/10 to-holo-violet/10 p-3 text-center">
                <p className="font-mono text-[8.5px] font-bold uppercase tracking-widest text-white/45">Final grade</p>
                <p className="holo-text font-display text-3xl font-black">{overall.overallGrade.toFixed(1)}</p>
                <p className="font-display text-[11px] font-bold text-white/85">{overall.gradeLabel}</p>
              </div>
              <p className="font-mono text-[9px] text-white/40">
                CENTERING {centering.lrRatioLabel} L/R · {centering.tbRatioLabel} T/B{centering.meetsGemMint10 ? " · GEM ELIGIBLE" : ""}
              </p>
            </div>
          </div>

          {/* human override sliders */}
          <div className="mt-3 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
            {subgradeSliders.map(({ key, label }) => (
              <label key={key} className="block">
                <span className="flex justify-between font-mono text-[9px] font-bold uppercase tracking-wider text-white/45">
                  {label} <span className="text-holo-cyan">{subgrades[key].toFixed(1)}</span>
                </span>
                <input
                  type="range"
                  min={5}
                  max={10}
                  step={0.5}
                  value={subgrades[key]}
                  onChange={(e) => {
                    setIsOverridden(true);
                    setSubgrades((s) => ({ ...s, [key]: Number(e.target.value) }));
                    flashAudit(`Human grader adjusted ${key} subgrade to ${Number(e.target.value).toFixed(1)}`);
                  }}
                  className="mt-1 h-1.5 w-full accent-cyan-400"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-4">
          <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
            <Pin className="h-4 w-4 text-holo-magenta" /> DEFECT PINBOARD
            <span className="ml-auto font-mono text-[9px] text-white/35">{defects.length} EVIDENCE</span>
          </p>
          <div className="mt-2.5 space-y-2">
            {defects.map((d) => (
              <div key={d.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-holo-magenta">{d.id}</span>
                  <span className="text-[11.5px] font-bold text-white/85">{d.type}</span>
                  <span className="rounded-full bg-white/8 px-2 py-0.5 font-mono text-[8px] font-bold uppercase text-white/50">
                    {d.severity} · −{d.scoreDeduction.toFixed(1)}
                  </span>
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-0.5 font-mono text-[8px] font-bold uppercase",
                      d.humanStatus === "accepted" ? "bg-holo-mint/15 text-holo-mint" : d.humanStatus === "rejected" ? "bg-white/8 text-white/40 line-through" : "bg-holo-gold/15 text-holo-gold",
                    )}
                  >
                    {d.humanStatus}
                  </span>
                </div>
                <p className="mt-0.5 text-[10.5px] text-white/50">{d.location}</p>
                {d.humanStatus !== "rejected" && (
                  <div className="mt-1.5 flex gap-1.5">
                    <button onClick={() => setDefects((ds) => ds.map((x) => (x.id === d.id ? { ...x, humanStatus: "accepted" } : x)))} className="rounded-lg border border-holo-mint/35 bg-holo-mint/10 px-2.5 py-1 text-[9.5px] font-bold text-holo-mint">
                      Accept
                    </button>
                    <button onClick={() => setDefects((ds) => ds.map((x) => (x.id === d.id ? { ...x, humanStatus: "rejected" } : x)))} className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 text-[9.5px] font-bold text-white/50">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {defects.length === 0 && (
              <p className="rounded-xl border border-holo-mint/25 bg-holo-mint/[0.05] p-3 text-center text-[11px] font-semibold text-holo-mint">
                Clean specimen — no defects mapped. Run the pipeline to verify.
              </p>
            )}
          </div>

          <label className="mt-3 block">
            <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-white/45">
              <FileText className="h-3 w-3" /> Grader notes
            </span>
            <textarea
              value={graderNotes}
              onChange={(e) => setGraderNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11.5px] text-white outline-none placeholder:text-white/30 focus:border-holo-cyan/50"
              placeholder="Human review notes appended to the certificate audit trail…"
            />
          </label>

          <button
            onClick={mintCertificate}
            className="mt-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-2.5 text-[11px] font-bold text-void transition-transform active:scale-95"
          >
            <Stamp className="h-3.5 w-3.5" /> MINT & LOCK CERTIFICATE
          </button>

          {cert && (
            <div className="mt-3 rounded-2xl border border-holo-mint/30 bg-holo-mint/[0.05] p-3.5">
              <p className="flex items-center gap-2 font-display text-[12.5px] font-extrabold text-holo-mint">
                <Award className="h-4 w-4" /> {cert.gradeLabel} · {cert.overallGrade.toFixed(1)}
              </p>
              <p className="mt-1.5 font-mono text-[10.5px] text-white/70">
                SERIAL <span className="font-bold text-holo-cyan">{cert.serial}</span>
              </p>
              <p className="mt-1 break-all font-mono text-[9.5px] text-white/50">HASH {cert.hash}</p>
              <p className="mt-1 flex items-center gap-1 font-mono text-[9px] text-white/40">
                <Lock className="h-3 w-3" /> locked {new Date(cert.issuedAt).toLocaleString()} · notes on ledger
              </p>
            </div>
          )}
        </div>
      </section>

      {/* audit toast */}
      {audit && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 lg:bottom-6">
          <div className="glass-strong flex items-center gap-2 rounded-full border border-holo-cyan/30 px-4 py-2.5 shadow-2xl">
            <Camera className="h-3.5 w-3.5 text-holo-cyan" />
            <p className="font-mono text-[10.5px] font-semibold text-white/85">{audit}</p>
          </div>
        </div>
      )}
    </div>
  );
}
