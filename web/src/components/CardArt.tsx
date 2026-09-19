import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Heart, ShieldCheck } from "lucide-react";

import RarityBadge, { rarityFor } from "@/components/RarityBadge";
import { cn } from "@/lib/utils";
import type { CatalogCard, GradeLabel } from "@/lib/types";

const TYPE_STYLE: Record<CatalogCard["type"], { glow: string; chip: string; aura: string }> = {
  Fire: { glow: "rgba(255,120,60,0.45)", chip: "bg-orange-500/20 text-orange-300 border-orange-400/30", aura: "from-orange-500/30" },
  Water: { glow: "rgba(60,140,255,0.45)", chip: "bg-sky-500/20 text-sky-300 border-sky-400/30", aura: "from-sky-500/30" },
  Grass: { glow: "rgba(80,220,120,0.4)", chip: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30", aura: "from-emerald-500/30" },
  Electric: { glow: "rgba(255,210,60,0.45)", chip: "bg-yellow-500/20 text-yellow-200 border-yellow-400/30", aura: "from-yellow-400/30" },
  Psychic: { glow: "rgba(190,110,255,0.45)", chip: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/30", aura: "from-fuchsia-500/30" },
  Fighting: { glow: "rgba(230,145,60,0.45)", chip: "bg-amber-600/20 text-amber-300 border-amber-500/30", aura: "from-amber-600/30" },
  Darkness: { glow: "rgba(110,80,200,0.5)", chip: "bg-violet-900/30 text-violet-300 border-violet-500/30", aura: "from-violet-800/40" },
  Colorless: { glow: "rgba(210,210,225,0.4)", chip: "bg-zinc-500/20 text-zinc-200 border-zinc-400/30", aura: "from-zinc-400/30" },
};

/** Max rotation (deg) on pointer hover. */
const MAX_TILT = 9;
/** Max rotation (deg) from device orientation — subtler so scrolling stays comfortable. */
const DEVICE_MAX_TILT = 6;

interface TiltState {
  rx: number;
  ry: number;
  /** Glare focal point, 0–100 (%). */
  gx: number;
  gy: number;
  active: boolean;
}

const REST: TiltState = { rx: 0, ry: 0, gx: 50, gy: 50, active: false };

interface CardArtProps {
  card: CatalogCard;
  grade?: GradeLabel | null;
  serial?: string | null;
  className?: string;
  interactive?: boolean;
  showMeta?: boolean;
  showRarity?: boolean;
  onClick?: () => void;
}

/**
 * Renders a stylized holographic trading card from catalog data + generated artwork.
 * Parallax 3D tilt follows the pointer on hover and the gyroscope on tilt-capable
 * devices, with a moving holo sheen + glare, simulating a real holo card in light.
 */
export default function CardArt({ card, grade, serial, className, interactive = true, showMeta = true, showRarity = false, onClick }: CardArtProps) {
  const style = TYPE_STYLE[card.type];
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerActive = useRef(false);
  const reducedMotion = useRef(false);
  const [tilt, setTilt] = useState<TiltState>(REST);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Device tilt: gyroscope drives a gentle parallax whenever the pointer isn't in control.
  useEffect(() => {
    if (!interactive) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (pointerActive.current || reducedMotion.current) return;
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      if (Math.abs(gamma) < 0.5 && Math.abs(beta - 40) < 0.5) {
        setTilt(REST);
        return;
      }
      const ry = Math.max(-DEVICE_MAX_TILT, Math.min(DEVICE_MAX_TILT, gamma / 4));
      const rx = Math.max(-DEVICE_MAX_TILT, Math.min(DEVICE_MAX_TILT, (beta - 40) / 5));
      setTilt({ rx, ry, gx: 50 + ry * 2.5, gy: 50 - rx * 2.5, active: true });
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [interactive]);

  const applyPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || reducedMotion.current || e.pointerType === "touch") return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    pointerActive.current = true;
    setTilt({
      rx: (py - 0.5) * MAX_TILT * 2,
      ry: (0.5 - px) * MAX_TILT * 2,
      gx: px * 100,
      gy: py * 100,
      active: true,
    });
  };

  const resetTilt = () => {
    pointerActive.current = false;
    setTilt(REST);
  };

  const rarity = showRarity ? rarityFor(card, grade) : null;

  return (
    <div
      ref={rootRef}
      onClick={onClick}
      onPointerMove={applyPointer}
      onPointerLeave={resetTilt}
      className={cn(
        "group relative aspect-[3/4.2] w-full overflow-hidden rounded-xl border border-[#8c98ab]/25 bg-panel",
        "shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]",
        interactive && "cursor-pointer",
        className,
      )}
      style={{
        boxShadow: interactive
          ? tilt.active
            ? "0 26px 55px -18px rgba(0,0,0,0.9)"
            : undefined
          : `0 8px 30px -12px ${style.glow}`,
        transform: tilt.active
          ? `perspective(900px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg) scale(1.03)`
          : undefined,
        transition: "transform 180ms ease-out, box-shadow 300ms ease",
        willChange: "transform",
      }}
    >
      {/* type aura */}
      <div className={cn("pointer-events-none absolute inset-0 z-0 bg-gradient-to-br to-transparent opacity-70", style.aura)} />

      {/* artwork with parallax depth + moving light */}
      <div className="absolute inset-[5%] z-10 overflow-hidden rounded-lg ring-1 ring-[#cfd8e6]/20">
        <img
          src={card.artUrl}
          alt={card.name}
          loading="lazy"
          className="h-full w-full object-cover"
          style={{
            transform: tilt.active
              ? `translate(${(50 - tilt.gx) * 0.07}%, ${(50 - tilt.gy) * 0.07}%) scale(1.08)`
              : "scale(1.02)",
            transition: "transform 220ms ease-out",
          }}
        />
        {/* holo sheen sweep follows the light source */}
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(180,240,255,0.25)_46%,rgba(255,170,255,0.2)_54%,transparent_70%)] bg-[length:220%_220%] transition-opacity duration-500"
          style={{ backgroundPosition: `${tilt.gx}% ${tilt.gy}%`, opacity: tilt.active ? 1 : 0 }}
        />
        {/* pointer glare */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(140px circle at ${tilt.gx}% ${tilt.gy}%, rgba(210,245,255,0.28), rgba(255,190,255,0.12) 45%, transparent 65%)`,
            opacity: tilt.active ? 1 : 0,
          }}
        />
      </div>

      {/* top row */}
      <div className="absolute inset-x-[5%] top-[5.5%] z-20 flex items-center justify-between px-1.5">
        <span className={cn("rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md", style.chip)}>
          {card.type}
        </span>
        {grade ? (
          <span className="rounded-md border border-holo-cyan/40 bg-holo-cyan/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-holo-cyan backdrop-blur-md">
            {grade}
          </span>
        ) : (
          <span className="rounded-md border border-white/15 bg-black/40 px-1.5 py-0.5 font-mono text-[9px] font-medium text-white/70 backdrop-blur-md">
            RAW
          </span>
        )}
      </div>

      {/* meta bar */}
      {showMeta && (
        <div className="absolute inset-x-[5%] bottom-[5%] z-20 rounded-lg border border-[#8c98ab]/15 bg-black/70 px-2.5 py-1.5 backdrop-blur-md">
          <div className="flex items-baseline justify-between gap-1">
            <p className="truncate font-display text-[11px] font-bold text-[#eaf2ff]">{card.name}</p>
            <p className="shrink-0 font-mono text-[9px] text-[#8c98ab]">{card.number}</p>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-1">
            <p className="truncate text-[9px] font-medium text-white/55">
              {card.set} · {card.year}
            </p>
            {serial ? (
              <p className="shrink-0 font-mono text-[8px] text-holo-cyan/80">{serial}</p>
            ) : (
              <span className="flex items-center gap-0.5 text-[8px] text-holo-mint/80">
                <ShieldCheck className="h-2.5 w-2.5" /> verified
              </span>
            )}
          </div>
        </div>
      )}

      {/* rarity badge — bottom corner, tier derived from grade + market value */}
      {rarity && (
        <RarityBadge
          tier={rarity}
          className={cn("absolute right-[7.5%] z-30", showMeta ? "bottom-[calc(5%+2.9rem)]" : "bottom-[8%]")}
        />
      )}

      {interactive && (
        <div className="pointer-events-none absolute right-2 top-2 z-20 opacity-0 transition-opacity group-hover:opacity-100">
          <Heart className="h-3.5 w-3.5 fill-holo-magenta text-holo-magenta drop-shadow-[0_0_6px_rgba(255,79,216,0.8)]" />
        </div>
      )}
    </div>
  );
}
