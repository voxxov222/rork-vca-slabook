import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, ZoomIn } from "lucide-react";

import type { CatalogCard, GradeLabel } from "@/lib/types";

export type LabelStyle = "classic" | "neon" | "gold";
export type Environment = "void" | "studio" | "nebula";

export interface SlabConfig {
  labelStyle: LabelStyle;
  holo: number; // 0..100 holographic intensity
  environment: Environment;
  lightTint: string; // hex
  cardOffset: number; // -20..20
  showGrade: boolean;
  autoSpin: boolean;
}

const ENV_BG: Record<Environment, string> = {
  void: "radial-gradient(60% 60% at 50% 40%, rgba(45,226,255,0.08), transparent 70%), #04060D",
  studio: "radial-gradient(60% 70% at 50% 30%, rgba(148,180,255,0.16), transparent 70%), linear-gradient(180deg, #0A1020, #05070E)",
  nebula: "radial-gradient(45% 55% at 30% 30%, rgba(255,79,216,0.16), transparent 70%), radial-gradient(50% 60% at 72% 68%, rgba(139,92,255,0.18), transparent 70%), #04060D",
};

const LABEL_STYLES: Record<LabelStyle, { frame: string; title: string; accent: string }> = {
  classic: { frame: "border-white/15 bg-black/80", title: "text-white", accent: "text-holo-cyan" },
  neon: { frame: "border-holo-cyan/50 bg-[rgba(6,20,34,0.9)] shadow-[0_0_18px_rgba(53,182,255,0.25)]", title: "text-holo-cyan", accent: "text-holo-violet" },
  gold: { frame: "border-holo-gold/50 bg-[rgba(24,18,6,0.9)] shadow-[0_0_18px_rgba(255,179,64,0.22)]", title: "text-holo-gold", accent: "text-holo-gold" },
};

interface HoloSlabProps {
  card: CatalogCard;
  grade: GradeLabel | null;
  serial: string | null;
  config: SlabConfig;
  className?: string;
}

/** Interactive 3D holographic slab — drag to rotate, wheel/slider to zoom. */
export default function HoloSlab({ card, grade, serial, config, className }: HoloSlabProps) {
  const [rot, setRot] = useState({ x: -8, y: 24 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const spinRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const label = LABEL_STYLES[config.labelStyle];

  /* auto-spin */
  useEffect(() => {
    if (!config.autoSpin || dragging) return;
    let raf: number;
    const tick = () => {
      setRot((r) => ({ ...r, y: r.y + 0.35 }));
      raf = requestAnimationFrame(tick);
      spinRef.current = raf;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [config.autoSpin, dragging]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      dragRef.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !dragRef.current) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current = { x: e.clientX, y: e.clientY };
      setRot((r) => ({
        x: Math.max(-60, Math.min(60, r.x - dy * 0.45)),
        y: r.y + dx * 0.5,
      }));
    },
    [dragging],
  );

  const endDrag = useCallback(() => {
    setDragging(false);
    dragRef.current = null;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.max(0.6, Math.min(1.6, z - e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const reset = () => {
    setRot({ x: -8, y: 24 });
    setZoom(1);
  };

  const gradeText = config.showGrade && grade ? grade : grade ? "" : "UNGRADED";

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="perspective-1200 relative flex h-[340px] w-full cursor-grab touch-none select-none items-center justify-center overflow-hidden rounded-3xl border border-white/8 sm:h-[420px]"
        style={{ background: ENV_BG[config.environment] }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onDoubleClick={reset}
      >
        {/* ambient light tint */}
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(50% 45% at 50% 35%, ${config.lightTint}22, transparent 70%)` }} />
        <div className="starfield pointer-events-none absolute inset-0 opacity-60" />

        <div
          className="preserve-3d relative"
          style={{
            transform: `scale(${zoom}) rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
            width: 200,
            height: 290,
            transition: dragging ? "none" : "transform 0.15s linear",
          }}
        >
          {/* slab thickness illusion — edge layers */}
          {[8, 5, 2].map((d) => (
            <div key={d} className="absolute inset-0 rounded-2xl bg-white/4 border border-white/8" style={{ transform: `translateZ(${-d}px)` }} />
          ))}

          {/* FRONT FACE */}
          <div className="preserve-3d absolute inset-0 overflow-hidden rounded-2xl border border-white/25 backface-hidden" style={{ transform: "translateZ(9px)", background: "linear-gradient(150deg, rgba(210,235,255,0.14), rgba(148,180,255,0.05) 40%, rgba(255,255,255,0.03))", backdropFilter: "blur(2px)", boxShadow: `0 30px 60px -20px rgba(0,0,0,0.85), inset 0 0 24px ${config.lightTint}14` }}>
            {/* corner screws */}
            {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos) => (
              <div key={pos} className={`absolute ${pos} h-1.5 w-1.5 rounded-full bg-white/30 ring-1 ring-white/40`} />
            ))}

            {/* the card inside */}
            <div className="absolute left-1/2 w-[168px] -translate-x-1/2 overflow-hidden rounded-lg" style={{ top: 12 + config.cardOffset }}>
              <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-lg ring-1 ring-[#cfd8e6]/20">
                <img src={card.artUrl} alt={card.name} draggable={false} className="h-full w-full object-cover" />
                {/* holographic foil over card */}
                <div
                  className="pointer-events-none absolute inset-0 mix-blend-color-dodge"
                  style={{
                    opacity: config.holo / 100,
                    background:
                      "conic-gradient(from 180deg at 50% 50%, rgba(53,182,255,0.5), rgba(126,240,255,0.45), rgba(143,160,187,0.4), rgba(255,179,64,0.35), rgba(53,182,255,0.5))",
                    animation: "holo-shift 6s ease-in-out infinite",
                    backgroundSize: "300% 300%",
                  }}
                />
                {/* glass reflection streak */}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.28)_0%,transparent_28%,transparent_72%,rgba(255,255,255,0.12)_100%)]" />
              </div>
            </div>

            {/* VCA label */}
            <div className={`absolute inset-x-2.5 bottom-2.5 rounded-lg border px-2.5 py-1.5 backdrop-blur-md ${label.frame}`}>
              <div className="flex items-center justify-between">
                <span className={`font-display text-[11px] font-extrabold tracking-[0.22em] ${label.title}`}>VCA</span>
                {gradeText && <span className={`font-mono text-[10px] font-bold ${label.accent}`}>{gradeText}</span>}
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-1">
                <span className="truncate font-display text-[10px] font-bold text-white/90">{card.name.toUpperCase()}</span>
                <span className="shrink-0 text-[8px] font-medium text-white/50">{card.set.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-white/50">
                  {card.number} · {card.rarity.toUpperCase()}
                </span>
                {grade === "VCA 10" && <span className="text-[7px] font-bold tracking-widest text-holo-gold/90">GEM MINT</span>}
              </div>
              {serial && <p className="mt-0.5 font-mono text-[8px] tracking-wider text-holo-cyan/90">{serial}</p>}
            </div>
          </div>

          {/* BACK FACE */}
          <div
            className="absolute inset-0 overflow-hidden rounded-2xl border border-white/20 backface-hidden"
            style={{ transform: "rotateY(180deg) translateZ(9px)", background: "linear-gradient(160deg, #0A1020, #060A16)" }}
          >
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="relative h-24 w-24">
                <div className="absolute inset-0 animate-spin-slow rounded-full border border-holo-cyan/40 border-t-holo-magenta border-r-holo-gold" />
                <div className="absolute inset-2 flex items-center justify-center rounded-full bg-panel">
                  <span className="font-display text-lg font-extrabold tracking-[0.2em] holo-text">VCA</span>
                </div>
              </div>
              <p className="px-6 text-center font-mono text-[8px] leading-relaxed text-white/40">
                VERIFIED COLLECTIBLE AUTHENTICATION
                <br />
                {serial ?? "AWAITING ISSUANCE"}
              </p>
              <div className="h-8 w-28 rounded bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.7)_0_2px,transparent_2px_5px)] opacity-60" />
            </div>
          </div>
        </div>

        {/* HUD */}
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 font-mono text-[9px] text-white/35">
          <RotateCcw className="h-3 w-3" /> drag to rotate · dbl-tap to reset
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 font-mono text-[9px] text-white/35">
          <ZoomIn className="h-3 w-3" /> {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* zoom slider */}
      <div className="mt-3 flex items-center gap-3 px-1">
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">zoom</span>
        <input
          type="range"
          min={60}
          max={160}
          value={Math.round(zoom * 100)}
          onChange={(e) => setZoom(Number(e.target.value) / 100)}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-holo-cyan"
        />
      </div>
    </div>
  );
}
