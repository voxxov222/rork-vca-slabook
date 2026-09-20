import { useMemo, useState } from "react";
import { Gauge, RotateCcw, ShieldCheck, Stamp } from "lucide-react";

import ForensicRadar, { type ForensicSubgrades } from "@/components/ForensicRadar";
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

interface Borders {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
interface QuadScores {
  a: number;
  b: number;
  c: number;
  d: number;
}

interface ForensicInputs {
  borders: Borders;
  corners: QuadScores;
  edges: QuadScores;
  scratches: number;
  indentations: number;
  holo: number;
  cmyk: number;
  colorDeltaIdx: number;
}

const DEFAULT_INPUTS: ForensicInputs = {
  borders: { left: 52, right: 48, top: 51, bottom: 49 },
  corners: { a: 9.5, b: 9.5, c: 9.0, d: 9.5 },
  edges: { a: 9.5, b: 9.5, c: 9.5, d: 9.0 },
  scratches: 0,
  indentations: 0,
  holo: 98,
  cmyk: 98.5,
  colorDeltaIdx: 3,
};

interface Certificate {
  serial: string;
  hash: string;
  gradeLabel: string;
  overallGrade: number;
  subgrades: ForensicSubgrades;
  centeringLabel: string;
  issuedAt: string;
}

function FxSlider({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between font-mono text-[9.5px] font-bold uppercase tracking-wider text-white/45">
        {label}
        <span className="font-mono text-holo-cyan">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-400"
      />
    </label>
  );
}

function SubgradeChip({ value }: { value: number }) {
  const tone =
    value >= 9.5 ? "text-holo-mint border-holo-mint/40 bg-holo-mint/10" : value >= 8.5 ? "text-holo-cyan border-holo-cyan/40 bg-holo-cyan/10" : "text-holo-gold border-holo-gold/40 bg-holo-gold/10";
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-extrabold", tone)}>
      {value.toFixed(1)}
    </span>
  );
}

/**
 * Admin forensics dashboard: interactive 5-category grading bench. Measurements
 * feed the VCA forensic core live; results render as a radar chart, category
 * breakdown, weighted overall grade, and an issuable VCA certificate.
 */
export default function ForensicsDashboard() {
  const [inputs, setInputs] = useState<ForensicInputs>(DEFAULT_INPUTS);
  const [cert, setCert] = useState<Certificate | null>(null);

  const setBorders = (k: keyof Borders, v: number) => setInputs((s) => ({ ...s, borders: { ...s.borders, [k]: v } }));
  const setCorners = (k: keyof QuadScores, v: number) => setInputs((s) => ({ ...s, corners: { ...s.corners, [k]: v } }));
  const setEdges = (k: keyof QuadScores, v: number) => setInputs((s) => ({ ...s, edges: { ...s.edges, [k]: v } }));

  const centering = useMemo(
    () => calculateCentering(inputs.borders.left, inputs.borders.right, inputs.borders.top, inputs.borders.bottom),
    [inputs.borders],
  );
  const corners = useMemo(
    () => inspectFourCorners(inputs.corners.a, inputs.corners.b, inputs.corners.c, inputs.corners.d),
    [inputs.corners],
  );
  const edges = useMemo(
    () => inspectFourEdges(inputs.edges.a, inputs.edges.b, inputs.edges.c, inputs.edges.d),
    [inputs.edges],
  );
  const surface = useMemo(
    () => analyzeSurface(inputs.scratches, inputs.indentations, inputs.holo),
    [inputs.scratches, inputs.indentations, inputs.holo],
  );
  const print = useMemo(
    () => analyzePrintQuality(inputs.cmyk, inputs.colorDeltaIdx / 100),
    [inputs.cmyk, inputs.colorDeltaIdx],
  );

  const subgrades: ForensicSubgrades = {
    centering: centering.subgrade,
    corners: corners.subgrade,
    edges: edges.subgrade,
    surface: surface.subgrade,
    print: print.subgrade,
  };
  const overall = calculateOverallGrade(subgrades);

  const issueCertificate = () => {
    const serial = generateVcaSerial();
    setCert({
      serial,
      hash: generateTamperProofHash({ grade: overall.gradeLabel, centering: centering.lrRatioLabel, serial }),
      gradeLabel: overall.gradeLabel,
      overallGrade: overall.overallGrade,
      subgrades,
      centeringLabel: centering.lrRatioLabel,
      issuedAt: new Date().toISOString(),
    });
  };

  const categories: { name: string; value: number; detail: string }[] = [
    {
      name: "Centering",
      value: centering.subgrade,
      detail: `${centering.lrRatioLabel} L/R · ${centering.tbRatioLabel} T/B${centering.meetsGemMint10 ? " · gem 10 eligible" : ""}`,
    },
    {
      name: "Corners",
      value: corners.subgrade,
      detail: `weakest ${Math.min(...Object.values(inputs.corners)).toFixed(1)} · avg ${(Object.values(inputs.corners).reduce((a, b) => a + b, 0) / 4).toFixed(2)}`,
    },
    {
      name: "Edges",
      value: edges.subgrade,
      detail: `weakest ${Math.min(...Object.values(inputs.edges)).toFixed(1)} · avg ${(Object.values(inputs.edges).reduce((a, b) => a + b, 0) / 4).toFixed(2)}`,
    },
    {
      name: "Surface",
      value: surface.subgrade,
      detail: `${inputs.scratches} scratches · ${inputs.indentations} indentations · holo ${inputs.holo}%`,
    },
    {
      name: "Print",
      value: print.subgrade,
      detail: `CMYK ${inputs.cmyk.toFixed(1)}% · Δcolor ${(inputs.colorDeltaIdx / 100).toFixed(2)}`,
    },
  ];

  const colorDelta = inputs.colorDeltaIdx / 100;

  return (
    <div className="space-y-4">
      {/* radar + overall grade */}
      <section className="glass rounded-3xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
            <Gauge className="h-4 w-4 text-holo-cyan" /> FORENSIC GRADING BENCH
          </p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-holo-mint/30 bg-holo-mint/10 px-2.5 py-1 font-mono text-[9px] font-bold text-holo-mint">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-holo-mint" /> LIVE
            </span>
            <button
              onClick={() => {
                setInputs(DEFAULT_INPUTS);
                setCert(null);
              }}
              aria-label="Reset measurements"
              className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-2.5 py-1 font-mono text-[9px] font-bold text-white/50 transition-colors hover:text-white"
            >
              <RotateCcw className="h-3 w-3" /> RESET
            </button>
          </div>
        </div>

        <div className="mt-2 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-2">
            <ForensicRadar subgrades={subgrades} />
          </div>

          <div className="flex flex-col justify-between gap-3">
            <div className="rounded-2xl border border-holo-cyan/25 bg-gradient-to-br from-holo-cyan/10 via-transparent to-holo-violet/10 p-4 text-center">
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/45">Overall grade</p>
              <p className="holo-text font-display text-5xl font-black leading-tight">{overall.overallGrade.toFixed(1)}</p>
              <p className="font-display text-sm font-bold tracking-wide text-white/90">{overall.gradeLabel}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {categories.map((c) => (
                  <SubgradeChip key={c.name} value={c.value} />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              {categories.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-bold text-white/85">{c.name}</p>
                    <p className="truncate font-mono text-[9px] text-white/40">{c.detail}</p>
                  </div>
                  <SubgradeChip value={c.value} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* measurement controls */}
      <section className="glass rounded-3xl p-4">
        <p className="font-display text-sm font-bold tracking-wide text-white/90">MEASUREMENT CONTROLS</p>
        <div className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/35">Borders (mm)</p>
            <FxSlider label="Left border" value={inputs.borders.left} min={20} max={80} display={`${inputs.borders.left}`} onChange={(v) => setBorders("left", v)} />
            <FxSlider label="Right border" value={inputs.borders.right} min={20} max={80} display={`${inputs.borders.right}`} onChange={(v) => setBorders("right", v)} />
            <FxSlider label="Top border" value={inputs.borders.top} min={20} max={80} display={`${inputs.borders.top}`} onChange={(v) => setBorders("top", v)} />
            <FxSlider label="Bottom border" value={inputs.borders.bottom} min={20} max={80} display={`${inputs.borders.bottom}`} onChange={(v) => setBorders("bottom", v)} />
          </div>

          <div className="space-y-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/35">Corners (½ steps)</p>
            <FxSlider label="Top-Left corner" value={inputs.corners.a} min={6} max={10} step={0.5} display={inputs.corners.a.toFixed(1)} onChange={(v) => setCorners("a", v)} />
            <FxSlider label="Top-Right corner" value={inputs.corners.b} min={6} max={10} step={0.5} display={inputs.corners.b.toFixed(1)} onChange={(v) => setCorners("b", v)} />
            <FxSlider label="Bottom-Left corner" value={inputs.corners.c} min={6} max={10} step={0.5} display={inputs.corners.c.toFixed(1)} onChange={(v) => setCorners("c", v)} />
            <FxSlider label="Bottom-Right corner" value={inputs.corners.d} min={6} max={10} step={0.5} display={inputs.corners.d.toFixed(1)} onChange={(v) => setCorners("d", v)} />
          </div>

          <div className="space-y-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/35">Edges (½ steps)</p>
            <FxSlider label="Top edge" value={inputs.edges.a} min={6} max={10} step={0.5} display={inputs.edges.a.toFixed(1)} onChange={(v) => setEdges("a", v)} />
            <FxSlider label="Bottom edge" value={inputs.edges.b} min={6} max={10} step={0.5} display={inputs.edges.b.toFixed(1)} onChange={(v) => setEdges("b", v)} />
            <FxSlider label="Left edge" value={inputs.edges.c} min={6} max={10} step={0.5} display={inputs.edges.c.toFixed(1)} onChange={(v) => setEdges("c", v)} />
            <FxSlider label="Right edge" value={inputs.edges.d} min={6} max={10} step={0.5} display={inputs.edges.d.toFixed(1)} onChange={(v) => setEdges("d", v)} />
          </div>

          <div className="space-y-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/35">Surface & Print</p>
            <FxSlider label="Scratches" value={inputs.scratches} min={0} max={5} display={`${inputs.scratches}`} onChange={(v) => setInputs((s) => ({ ...s, scratches: v }))} />
            <FxSlider label="Indentations" value={inputs.indentations} min={0} max={3} display={`${inputs.indentations}`} onChange={(v) => setInputs((s) => ({ ...s, indentations: v }))} />
            <FxSlider label="Holo integrity" value={inputs.holo} min={85} max={100} display={`${inputs.holo}%`} onChange={(v) => setInputs((s) => ({ ...s, holo: v }))} />
            <FxSlider label="CMYK rosette match" value={inputs.cmyk} min={90} max={100} step={0.5} display={`${inputs.cmyk.toFixed(1)}%`} onChange={(v) => setInputs((s) => ({ ...s, cmyk: v }))} />
            <FxSlider label="Color histogram Δ" value={inputs.colorDeltaIdx} min={0} max={15} display={colorDelta.toFixed(2)} onChange={(v) => setInputs((s) => ({ ...s, colorDeltaIdx: v }))} />
          </div>
        </div>

        <button
          onClick={issueCertificate}
          className="mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-holo-cyan to-holo-violet px-5 py-2.5 text-[11px] font-bold text-void transition-transform active:scale-95"
        >
          <Stamp className="h-3.5 w-3.5" /> ISSUE VCA CERTIFICATE
        </button>

        {cert && (
          <div className="mt-3 rounded-2xl border border-holo-mint/30 bg-holo-mint/[0.05] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-display text-sm font-extrabold text-holo-mint">
                <ShieldCheck className="h-4 w-4" /> {cert.gradeLabel} · {cert.overallGrade.toFixed(1)}
              </p>
              <p className="font-mono text-[9px] text-white/40">{new Date(cert.issuedAt).toLocaleString()}</p>
            </div>
            <p className="mt-2 font-mono text-[11px] text-white/70">
              SERIAL <span className="font-bold text-holo-cyan">{cert.serial}</span>
            </p>
            <p className="mt-1 break-all font-mono text-[10px] text-white/50">
              HASH {cert.hash} · CENTERING {cert.centeringLabel}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(cert.subgrades).map(([k, v]) => (
                <span key={k} className="rounded-full bg-white/8 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-white/60">
                  {k} {v.toFixed(1)}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
