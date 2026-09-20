import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Fingerprint,
  Gem,
  Layers,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Vault as VaultIcon,
} from "lucide-react";

import HoloSlab, { type SlabConfig } from "@/components/HoloSlab";
import { cardById } from "@/lib/data";
import { useVca } from "@/lib/store";
import type { CatalogCard, GradeLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

const usd = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `$${Math.round(n).toLocaleString("en-US")}`;

interface VaultEntry {
  id: string;
  serial: string;
  kind: "digital" | "physical" | "raw";
  card: CatalogCard | null;
  cardName: string;
  cardSet: string;
  cardArt: string;
  grade: string | null;
  value: number;
  mintedAt: string;
  owner: string;
}

type VaultFilter = "all" | "digital" | "physical" | "raw";

const FILTERS: { id: VaultFilter; label: string }[] = [
  { id: "all", label: "ALL ASSETS" },
  { id: "digital", label: "DIGITAL SLABS" },
  { id: "physical", label: "NFC PHYSICAL" },
  { id: "raw", label: "RAW CARDS" },
];

const gradeRing = (grade: string | null, kind: VaultEntry["kind"]): string => {
  if (grade === "VCA 10") return "from-holo-gold/60";
  if (grade === "VCA 9") return "from-holo-cyan/60";
  if (grade === "VCA 8") return "from-white/30";
  return kind === "physical" ? "from-holo-gold/40" : "from-holo-magenta/50";
};

/** Eased count-up for hero numbers. */
function useCountUp(target: number, duration = 1300): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

/** Pointer-tracking 3D tilt wrapper. */
function Tilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState({ rx: 0, ry: 0, gl: 50, gt: 50 });
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setT({ rx: (0.5 - py) * 14, ry: (px - 0.5) * 16, gl: px * 100, gt: py * 100 });
  };
  return (
    <div ref={ref} className={cn("perspective-1200", className)} onPointerMove={onMove} onPointerLeave={() => setT({ rx: 0, ry: 0, gl: 50, gt: 50 })}>
      <div
        className="relative transition-transform duration-150 ease-out"
        style={{ transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg)`, transformStyle: "preserve-3d" }}
      >
        {children}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 hover:opacity-100"
          style={{ background: `radial-gradient(45% 45% at ${t.gl}% ${t.gt}%, rgba(232,57,74,0.14), transparent 70%)` }}
        />
      </div>
    </div>
  );
}

function SlabCard({ entry, index }: { entry: VaultEntry; index: number }) {
  const to = entry.card ? `/card/${entry.card.id}` : undefined;
  const body = (
    <div className={cn("h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b to-panel", gradeRing(entry.grade, entry.kind))}>
      <div className="relative aspect-[3/3.4] w-full overflow-hidden">
        {entry.cardArt ? (
          <img src={entry.cardArt} alt={entry.cardName} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center bg-black/40">
            <Gem className="h-8 w-8 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-transparent" />
        <span
          className={cn(
            "absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[8px] font-bold backdrop-blur",
            entry.kind === "digital"
              ? "bg-holo-magenta/20 text-holo-magenta ring-1 ring-holo-magenta/40"
              : entry.kind === "physical"
                ? "bg-holo-gold/20 text-holo-gold ring-1 ring-holo-gold/40"
                : "bg-holo-cyan/20 text-holo-cyan ring-1 ring-holo-cyan/40",
          )}
        >
          {entry.kind === "digital" ? <Sparkles className="h-2.5 w-2.5" /> : entry.kind === "physical" ? <Fingerprint className="h-2.5 w-2.5" /> : <Layers className="h-2.5 w-2.5" />}
          {entry.kind === "digital" ? "DIGITAL SLAB" : entry.kind === "physical" ? "NFC SLAB" : "RAW"}
        </span>
        {entry.grade && (
          <span className="absolute right-2 top-2 rounded-full bg-void/85 px-2 py-0.5 font-mono text-[9px] font-bold text-holo-gold ring-1 ring-holo-gold/40 backdrop-blur">
            {entry.grade}
          </span>
        )}
      </div>
      <div className="space-y-1 px-3 pb-3 pt-2">
        <p className="truncate font-display text-xs font-extrabold text-white">{entry.cardName}</p>
        <p className="truncate text-[10px] text-white/40">{entry.cardSet}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="font-mono text-[9px] tracking-wider text-holo-cyan/90">{entry.serial}</span>
          <span className="font-display text-sm font-extrabold text-white">{usd(entry.value)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-up" style={{ animationDelay: `${Math.min(index, 10) * 55}ms` }}>
      <Tilt>
        {to ? (
          <Link to={to} className="block">
            {body}
          </Link>
        ) : (
          body
        )}
      </Tilt>
    </div>
  );
}

const DEFAULT_SLAB_CONFIG: SlabConfig = {
  labelStyle: "gold",
  holo: 55,
  environment: "nebula",
  lightTint: "#e8394a",
  cardOffset: 0,
  showGrade: true,
  autoSpin: true,
};

export default function Vault() {
  const { slabs, myItems, scanHistory, currentUser, backendReady } = useVca();
  const [filter, setFilter] = useState<VaultFilter>("all");

  const slabEntries: VaultEntry[] = useMemo(
    () =>
      slabs.map((s) => {
        const c = cardById(s.cardId);
        const value =
          s.grade === "VCA 10" ? (c?.prices.g10 ?? 0) : s.grade === "VCA 9" ? (c?.prices.g9 ?? 0) : s.grade === "VCA 8" ? (c?.prices.g8 ?? 0) : (c?.prices.raw ?? 0);
        return {
          id: s.id,
          serial: s.serial,
          kind: s.kind,
          card: c ?? null,
          cardName: c?.name ?? "Unlisted card",
          cardSet: c?.set ?? "Awaiting catalog match",
          cardArt: c?.artUrl ?? "",
          grade: s.grade,
          value: s.kind === "physical" && !s.grade ? 0 : value,
          mintedAt: s.createdAt,
          owner: s.ownerName,
        };
      }),
    [slabs],
  );

  const rawEntries: VaultEntry[] = useMemo(
    () =>
      myItems()
        .filter((i) => i.slab === "none")
        .map((i) => {
          const c = cardById(i.cardId);
          return {
            id: i.id,
            serial: i.serial ?? "—",
            kind: "raw" as const,
            card: c ?? null,
            cardName: c?.name ?? "Unknown",
            cardSet: c?.set ?? "—",
            cardArt: c?.artUrl ?? "",
            grade: i.grade,
            value: c ? (i.grade === "VCA 10" ? c.prices.g10 : i.grade === "VCA 9" ? c.prices.g9 : i.grade === "VCA 8" ? c.prices.g8 : c.prices.raw) : 0,
            mintedAt: i.addedAt,
            owner: currentUser.displayName,
          };
        }),
    [myItems, currentUser.displayName],
  );

  const all = useMemo(() => [...slabEntries, ...rawEntries], [slabEntries, rawEntries]);
  const shown = filter === "all" ? all : all.filter((e) => e.kind === filter);
  const totalValue = all.reduce((sum, e) => sum + e.value, 0);
  const animatedTotal = useCountUp(totalValue);

  const featured = useMemo(
    () => [...slabEntries].filter((e) => e.card).sort((a, b) => b.value - a.value)[0],
    [slabEntries],
  );

  const scanStats = useMemo(() => {
    const total = scanHistory.length;
    const passed = scanHistory.filter((s) => s.verdict === "authentic").length;
    const fakes = scanHistory.filter((s) => s.verdict === "counterfeit").length;
    const verified = scanHistory.filter((s) => s.verifiedProduct).length;
    return { total, passed, fakes, verified };
  }, [scanHistory]);

  return (
    <div className="space-y-5">
      {/* hero */}
      <div className="holo-frame relative overflow-hidden rounded-3xl p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
        <div className="starfield pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1">
            <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.25em] text-holo-gold">
              <VaultIcon className="h-3.5 w-3.5" /> VCA VAULT · OFFICIAL GRADED SLAB PORTFOLIO
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              <span className="holo-text">{usd(animatedTotal)}</span>
            </h1>
            <p className="mt-1 text-[12px] text-white/50">
              Total estimated portfolio value · {slabEntries.length} minted slabs · {rawEntries.length} raw cards
            </p>
            <div className="mt-4 grid max-w-md grid-cols-3 gap-2">
              <HeroStat icon={Sparkles} label="DIGITAL" value={String(slabEntries.filter((e) => e.kind === "digital").length)} accent="text-holo-magenta" />
              <HeroStat icon={Fingerprint} label="NFC" value={String(slabEntries.filter((e) => e.kind === "physical").length)} accent="text-holo-gold" />
              <HeroStat icon={ShieldCheck} label="PASSED" value={`${scanStats.passed}/${scanStats.total || 0}`} accent="text-holo-mint" />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-white/35">
              {backendReady ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-holo-mint" /> SYNCED · MANAGED POSTGRES
                </>
              ) : (
                <>LOCAL SESSION · DATABASE NOT CONFIGURED</>
              )}
            </p>
          </div>

          {/* featured interactive slab */}
          {featured?.card && (
            <div className="w-full max-w-sm self-center">
              <p className="mb-2 flex items-center justify-between font-mono text-[9px] tracking-[0.2em] text-white/40">
                <span>FEATURED SLAB · DRAG TO ROTATE</span>
                <span className="text-holo-gold">{usd(featured.value)}</span>
              </p>
              <HoloSlab card={featured.card} grade={(featured.grade as GradeLabel | null) ?? null} serial={featured.serial} config={DEFAULT_SLAB_CONFIG} />
            </div>
          )}
        </div>
      </div>

      {/* scan intelligence */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <ScanStat icon={ScanLine} label="TOTAL SCANS" value={String(scanStats.total)} accent="text-holo-cyan" />
        <ScanStat icon={ShieldCheck} label="PASSED SCREEN" value={String(scanStats.passed)} accent="text-holo-mint" />
        <ScanStat icon={ShieldAlert} label="COUNTERFEITS CAUGHT" value={String(scanStats.fakes)} accent="text-red-400" />
        <ScanStat icon={BadgeCheck} label="REAL-PRODUCT VERIFIED" value={String(scanStats.verified)} accent="text-holo-gold" />
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold tracking-wider transition-all active:scale-95",
              filter === f.id
                ? "bg-gradient-to-r from-holo-cyan to-holo-violet text-void shadow-[0_0_18px_rgba(61,107,232,0.35)]"
                : "border border-white/10 bg-white/4 text-white/50 hover:text-white",
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 font-mono text-[9px] text-white/30">
          <TrendingUp className="h-3 w-3" /> {shown.length} ASSETS
        </span>
      </div>

      {/* asset grid */}
      {shown.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((e, i) => (
            <SlabCard key={`${e.kind}-${e.id}`} entry={e} index={i} />
          ))}
        </div>
      ) : (
        <div className="glass rounded-3xl p-10 text-center">
          <Gem className="mx-auto h-10 w-10 text-white/15" />
          <p className="mt-3 text-sm font-bold text-white/70">Nothing here yet</p>
          <p className="mt-1 text-[12px] text-white/40">Scan a card and mint a digital slab to build your vault.</p>
          <Link
            to="/scanner"
            className="mt-4 inline-block rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet px-5 py-2 text-xs font-bold text-void transition-transform active:scale-95"
          >
            OPEN SCANNER
          </Link>
        </div>
      )}

      <p className="text-center text-[10px] leading-relaxed text-white/30">
        Values are estimated market figures — not guaranteed sale prices. Slabs, grades and scan history persist in the
        VCA managed database.
      </p>
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, accent }: { icon: typeof Sparkles; label: string; value: string; accent: string }) {
  return (
    <div className="glass rounded-2xl p-3">
      <Icon className={cn("h-4 w-4", accent)} />
      <p className="mt-1.5 font-display text-base font-extrabold text-white">{value}</p>
      <p className="text-[8px] font-bold tracking-[0.18em] text-white/35">{label}</p>
    </div>
  );
}

function ScanStat({ icon: Icon, label, value, accent }: { icon: typeof ScanLine; label: string; value: string; accent: string }) {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
        <Icon className={cn("h-4 w-4", accent)} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-base font-extrabold text-white">{value}</p>
        <p className="truncate text-[8px] font-bold tracking-[0.16em] text-white/35">{label}</p>
      </div>
    </div>
  );
}
