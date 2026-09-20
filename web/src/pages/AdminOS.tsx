import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Bot,
  BrainCircuit,
  Database,
  FileStack,
  Gem,
  LogOut,
  Boxes,
  Microscope,
  Package,
  PackageCheck,
  Puzzle,
  Radar,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Terminal,
  Trash2,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

import { ACTIVITY, CATALOG, cardById } from "@/lib/data";
import { EXTENSIONS, useExtensionToggles } from "@/lib/extensions";
import { hasLivePricing } from "@/lib/prices";
import {
  deleteMemoryById,
  getAllMemories,
  recallMemories,
  storeMemory,
  type MemoryEntry,
} from "@/lib/vcaos/agentMemory";
import {
  ensurePriceDatabase,
  getAutonomousTasks,
  syncPokemonPrices,
} from "@/lib/vcaos/priceSync";
import {
  deleteDynamicTool,
  executeDynamicTool,
  getDynamicTools,
  type DynamicToolMetadata,
} from "@/lib/vcaos/toolRegistry";
import { TOOL_CONTEXT, TOOL_SAMPLE_ARGS } from "@/lib/vcaos/toolContext";
import { useVca } from "@/lib/store";
import type { GradeLabel, ScanHistoryRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import ForensicsDashboard from "@/components/ForensicsDashboard";
import CardInspectionLab from "@/components/CardInspectionLab";

/**
 * VCA OS — the admin operating system.
 * Gated behind the admin account (two2@email.com). Mirrors the VCAcomputer
 * OS concept: system telemetry, product database, grading queue, scan
 * forensics and the ExtendAPI-style extension registry.
 */

const ADMIN_EMAIL = "two2@email.com";
const ADMIN_PASSWORD = "vcaadmin";
const SESSION_KEY = "vca-os-session";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

type Tab =
  | "overview"
  | "cards"
  | "submissions"
  | "grading"
  | "scans"
  | "inspection"
  | "forensics"
  | "backend"
  | "extensions";

const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "cards", label: "Card Database", icon: Database },
  { id: "submissions", label: "Submissions", icon: FileStack },
  { id: "grading", label: "Grading Queue", icon: Gem },
  { id: "scans", label: "Scan Forensics", icon: ScanLine },
  { id: "inspection", label: "Card Inspection", icon: Microscope },
  { id: "forensics", label: "Forensic Bench", icon: Radar },
  { id: "backend", label: "Backend Core", icon: Bot },
  { id: "extensions", label: "Extensions", icon: Puzzle },
];

export default function AdminOS() {
  const [session, setSession] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });

  const logout = () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setSession(null);
  };

  if (!session) return <AdminLogin onSuccess={(email) => setSession(email)} />;

  return (
    <div className="min-h-[70vh] space-y-4">
      {/* OS top bar */}
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-holo-cyan/25 to-holo-violet/20 ring-1 ring-holo-cyan/30">
          <Terminal className="h-4.5 w-4.5 text-holo-cyan" />
        </span>
        <div className="mr-auto">
          <p className="font-display text-sm font-extrabold tracking-wide text-white">
            VCA OS <span className="text-holo-cyan">26.9</span>
          </p>
          <p className="font-mono text-[9px] tracking-wider text-white/40">ADMIN OPERATING SYSTEM · {session.toUpperCase()}</p>
        </div>
        <OsClock />
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/70 transition-colors hover:bg-white/10"
        >
          <LogOut className="h-3 w-3" /> LOG OUT
        </button>
      </div>

      {/* tab rail + content */}
      <TabContent />
    </div>
  );
}

/* ------------------------------ login gate ------------------------------ */

function AdminLogin({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const login = () => {
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      try {
        localStorage.setItem(SESSION_KEY, email.trim().toLowerCase());
      } catch {
        // session stays in-memory only
      }
      onSuccess(email.trim().toLowerCase());
    } else {
      setError(true);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="glass animate-fade-up relative overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
        <div className="relative">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-holo-cyan/25 to-holo-violet/20 ring-1 ring-holo-cyan/30">
            <Terminal className="h-6 w-6 text-holo-cyan" />
          </span>
          <p className="mt-4 font-mono text-[10px] font-bold tracking-[0.3em] text-holo-cyan">RESTRICTED ACCESS</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-white">
            VCA OS <span className="text-holo-cyan">26.9</span>
          </h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/50">
            Sign in with the VCA admin account to access the operating system: platform telemetry, product database,
            grading queue and extension registry.
          </p>

          <div className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block font-mono text-[9px] font-bold tracking-wider text-white/45">ADMIN EMAIL</label>
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(false);
                }}
                type="email"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-[13px] text-white outline-none focus:border-holo-cyan/50"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[9px] font-bold tracking-wider text-white/45">PASSWORD</label>
              <input
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && login()}
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-[13px] text-white outline-none placeholder:text-white/25 focus:border-holo-cyan/50"
              />
            </div>
            {error && <p className="text-[11px] font-bold text-red-400">Access denied — invalid admin credentials.</p>}
            <button
              onClick={login}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-holo-cyan to-holo-violet py-3 font-display text-sm font-extrabold text-void transition-transform hover:brightness-110 active:scale-[0.98]"
            >
              <ShieldCheck className="h-4 w-4" /> BOOT VCA OS
            </button>
            <p className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center font-mono text-[10px] leading-relaxed text-white/40">
              demo access · {ADMIN_EMAIL} / vcaadmin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- OS chrome ------------------------------- */

function TabRail({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-bold transition-all active:scale-95",
            tab === id ? "border-holo-cyan/60 bg-holo-cyan/15 text-holo-cyan" : "border-white/12 bg-white/5 text-white/55 hover:text-white",
          )}
        >
          <Icon className="h-3.5 w-3.5" /> {label}
        </button>
      ))}
    </div>
  );
}

function OsClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span className="hidden rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[10px] font-bold text-holo-mint sm:block">
      {now.toLocaleTimeString("en-US", { hour12: false })}
    </span>
  );
}

/* ------------------------------ tab content ------------------------------ */

function TabContent() {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <>
      <TabRail tab={tab} setTab={setTab} />
      <div className="mt-4">
        {tab === "overview" && <OverviewTab />}
        {tab === "cards" && <CardsTab />}
        {tab === "submissions" && <SubmissionsTab />}
        {tab === "grading" && <GradingTab />}
        {tab === "scans" && <ScansTab />}
        {tab === "inspection" && <CardInspectionLab />}
        {tab === "forensics" && <ForensicsDashboard />}
        {tab === "backend" && <BackendTab />}
        {tab === "extensions" && <ExtensionsTab />}
      </div>
    </>
  );
}

function StatTile({ icon: Icon, label, value, accent, sub }: { icon: typeof Activity; label: string; value: string; accent: string; sub: string }) {
  return (
    <div className="glass rounded-2xl p-3.5">
      <Icon className={cn("h-4 w-4", accent)} />
      <p className="mt-2 font-display text-xl font-extrabold text-white">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-0.5 font-mono text-[9px] text-white/30">{sub}</p>
    </div>
  );
}

function OverviewTab() {
  const { users, slabs, scanHistory, backendReady } = useVca();
  const vaultValue = useMemo(
    () =>
      slabs.reduce((sum, s) => {
        const c = cardById(s.cardId);
        if (!c) return sum;
        if (s.grade === "VCA 10") return sum + c.prices.g10;
        if (s.grade === "VCA 9") return sum + c.prices.g9;
        if (s.grade === "VCA 8") return sum + c.prices.g8;
        return sum + c.prices.raw;
      }, 0),
    [slabs],
  );

  const systems = [
    { label: "Supabase Postgres", status: backendReady ? "ONLINE" : "STANDBY", ok: backendReady },
    { label: "PokeTCG Product Catalog (v2)", status: "ONLINE", ok: true },
    { label: "JustTCG Graded Pricing", status: hasLivePricing() ? "ONLINE" : "KEY MISSING", ok: hasLivePricing() },
    { label: "AI Vision Engine", status: "ONLINE", ok: true },
    { label: "VCA NEWS Wire", status: backendReady ? "ONLINE" : "EDGE FN LIVE", ok: true },
    { label: "VCA Computer Backend Core", status: "ONLINE", ok: true },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={Users} label="Collectors" value={String(users.length)} accent="text-holo-cyan" sub="seed network" />
        <StatTile icon={Database} label="Real Cards" value={String(CATALOG.length)} accent="text-holo-mint" sub="verified products" />
        <StatTile icon={Gem} label="Slabs Minted" value={String(slabs.length)} accent="text-holo-magenta" sub="digital + NFC" />
        <StatTile icon={ScanLine} label="Scans Run" value={String(scanHistory.length)} accent="text-holo-violet" sub="forensic records" />
        <StatTile icon={Activity} label="Vault Value" value={usd(vaultValue)} accent="text-holo-gold" sub="est. market" />
        <StatTile icon={Boxes} label="Extensions" value={String(EXTENSIONS.length)} accent="text-holo-cyan" sub="registry v1.0" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass rounded-3xl p-4">
          <p className="font-display text-sm font-bold tracking-wide text-white/90">SYSTEM HEALTH</p>
          <div className="mt-3 space-y-2">
            {systems.map((s) => (
              <div key={s.label} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", s.ok ? "bg-holo-mint shadow-[0_0_8px_rgba(52,231,181,0.8)]" : "bg-holo-gold")} />
                <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white/80">{s.label}</p>
                <span className={cn("font-mono text-[9px] font-bold tracking-wider", s.ok ? "text-holo-mint" : "text-holo-gold")}>{s.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-3xl p-4">
          <p className="font-display text-sm font-bold tracking-wide text-white/90">NETWORK ACTIVITY</p>
          <div className="mt-3 space-y-2">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <Terminal className="h-3.5 w-3.5 shrink-0 text-holo-cyan/60" />
                <p className="min-w-0 flex-1 truncate text-[12px] text-white/70">{a.text}</p>
                <span className="shrink-0 font-mono text-[9px] text-white/35">{a.time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CardsTab() {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((c) => !q || c.name.toLowerCase().includes(q) || c.set.toLowerCase().includes(q) || c.number.includes(q));
  }, [query]);

  return (
    <section className="glass rounded-3xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
          <Database className="h-4 w-4 text-holo-mint" /> PRODUCT DATABASE · REAL POKÉMON TCG
        </p>
        <span className="rounded-full border border-holo-mint/40 bg-holo-mint/10 px-2.5 py-1 font-mono text-[9px] font-bold text-holo-mint">
          {CATALOG.length} VERIFIED PRODUCTS
        </span>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, set or number…"
        className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-holo-cyan/50"
      />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[11px]">
          <thead>
            <tr className="font-mono text-[9px] uppercase tracking-wider text-white/40">
              <th className="pb-2 pr-2 font-bold">Card</th>
              <th className="pb-2 pr-2 font-bold">Set</th>
              <th className="pb-2 pr-2 font-bold">#</th>
              <th className="pb-2 pr-2 font-bold">Rarity</th>
              <th className="pb-2 pr-2 font-bold">Raw</th>
              <th className="pb-2 pr-2 font-bold">PSA 10</th>
              <th className="pb-2 pr-2 font-bold">PSA 9</th>
              <th className="pb-2 font-bold">PSA 8</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-white/5 transition-colors hover:bg-white/[0.03]">
                <td className="py-2.5 pr-2">
                  <Link to={`/card/${c.id}`} className="flex items-center gap-2.5">
                    <img src={c.artUrl} alt={c.name} className="h-9 w-7 rounded object-cover ring-1 ring-white/15" />
                    <span className="font-bold text-white hover:text-holo-cyan">{c.name}</span>
                  </Link>
                </td>
                <td className="py-2.5 pr-2 text-white/55">{c.set}</td>
                <td className="py-2.5 pr-2 font-mono text-white/55">{c.number}</td>
                <td className="py-2.5 pr-2 text-white/55">{c.rarity}</td>
                <td className="py-2.5 pr-2 font-mono text-white/85">{usd(c.prices.raw)}</td>
                <td className="py-2.5 pr-2 font-mono font-bold text-holo-gold">{usd(c.prices.g10)}</td>
                <td className="py-2.5 pr-2 font-mono text-white/70">{usd(c.prices.g9)}</td>
                <td className="py-2.5 font-mono text-white/70">{usd(c.prices.g8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2.5 text-[10px] leading-relaxed text-white/35">
        Official artwork and product data via pokemontcg.io v2 · raw prices = TCGPlayer market · graded prices refresh
        live from JustTCG when the API key is configured. Estimates only, not guaranteed sale prices.
      </p>
    </section>
  );
}

function GradingTab() {
  const { slabs, gradeSlab } = useVca();
  const pending = slabs.filter((s) => s.kind === "physical" && !s.grade);
  const graded = slabs.filter((s) => s.grade);

  return (
    <div className="space-y-4">
      <section className="glass rounded-3xl p-4">
        <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
          <Gem className="h-4 w-4 text-holo-gold" /> GRADING QUEUE · {pending.length} AWAITING CERTIFICATION
        </p>
        {pending.length === 0 ? (
          <p className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-center text-xs text-white/40">
            Queue clear — every submitted card has been certified.
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {pending.map((s) => {
              const c = cardById(s.cardId);
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-holo-gold/25 bg-holo-gold/[0.06] px-3.5 py-3">
                  {c && <img src={c.artUrl} alt={c.name} className="h-12 w-9 rounded object-cover ring-1 ring-white/15" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-white">{c?.name ?? "Unknown card"}</p>
                    <p className="font-mono text-[10px] text-white/45">
                      {s.serial} · {c?.set ?? "—"} · owner {s.ownerName} · submitted {s.createdAt}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {(["VCA 10", "VCA 9", "VCA 8"] as GradeLabel[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => gradeSlab(s.id, g)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[10px] font-bold transition-all active:scale-95",
                          g === "VCA 10"
                            ? "border-holo-gold/50 bg-holo-gold/15 text-holo-gold hover:bg-holo-gold/25"
                            : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10",
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="glass rounded-3xl p-4">
        <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
          <ShieldCheck className="h-4 w-4 text-holo-mint" /> CERTIFIED SLABS · LEDGER
        </p>
        <div className="mt-3 space-y-2">
          {graded.map((s) => {
            const c = cardById(s.cardId);
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5">
                {c && <img src={c.artUrl} alt={c.name} className="h-9 w-7 rounded object-cover ring-1 ring-white/15" />}
                <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white/80">
                  {c?.name ?? "Unknown"} <span className="font-normal text-white/40">· {s.ownerName}</span>
                </p>
                <span className="font-mono text-[10px] text-white/40">{s.serial}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] font-bold",
                    s.kind === "physical" ? "bg-holo-gold/15 text-holo-gold" : "bg-holo-magenta/15 text-holo-magenta",
                  )}
                >
                  {s.grade}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const VERDICT_STYLE: Record<ScanHistoryRecord["verdict"], string> = {
  authentic: "border-holo-mint/40 bg-holo-mint/10 text-holo-mint",
  suspect: "border-holo-gold/40 bg-holo-gold/10 text-holo-gold",
  counterfeit: "border-red-500/40 bg-red-500/10 text-red-400",
};

function ScansTab() {
  const { scanHistory } = useVca();
  return (
    <section className="glass rounded-3xl p-4">
      <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
        <ScanLine className="h-4 w-4 text-holo-violet" /> SCAN FORENSICS · {scanHistory.length} RECORDS
      </p>
      {scanHistory.length === 0 ? (
        <p className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-center text-xs text-white/40">
          No scans recorded yet — run the card scanner to populate the forensic ledger.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {scanHistory.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-white">{r.cardName}</p>
                <p className="font-mono text-[10px] text-white/45">
                  {r.setName} · #{r.number} · {r.rarity}
                </p>
              </div>
              {r.verifiedProduct && (
                <span className="flex items-center gap-1 rounded-full border border-holo-mint/40 bg-holo-mint/10 px-2.5 py-1 font-mono text-[9px] font-bold text-holo-mint">
                  <ShieldCheck className="h-3 w-3" /> REAL PRODUCT
                </span>
              )}
              <span className="font-mono text-[10px] text-white/50">{r.confidence}% conf</span>
              <span className="font-mono text-[9px] text-white/35">{new Date(r.createdAt).toLocaleString()}</span>
              <span className={cn("rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase", VERDICT_STYLE[r.verdict])}>
                {r.verdict}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ExtensionsTab() {
  const { toggles, toggle } = useExtensionToggles();
  return (
    <section className="glass rounded-3xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
          <Puzzle className="h-4 w-4 text-holo-cyan" /> EXTENSION REGISTRY · EXTENDAPI v1.0
        </p>
        <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[9px] font-bold text-white/50">
          {EXTENSIONS.filter((e) => toggles[e.id]).length} / {EXTENSIONS.length} ENABLED
        </span>
      </div>
      <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
        {EXTENSIONS.map((ext) => {
          const enabled = toggles[ext.id];
          return (
            <div key={ext.id} className={cn("rounded-2xl border p-3.5 transition-colors", enabled ? "border-holo-cyan/25 bg-holo-cyan/[0.05]" : "border-white/8 bg-white/[0.03]")}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-white">
                    {ext.name}
                    <span className="rounded-full bg-white/8 px-2 py-0.5 font-mono text-[8px] font-bold text-white/50">v{ext.version}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-[8px] font-bold uppercase",
                        ext.status === "live" ? "bg-holo-mint/15 text-holo-mint" : ext.status === "key-required" ? "bg-holo-gold/15 text-holo-gold" : "bg-white/10 text-white/45",
                      )}
                    >
                      {ext.status}
                    </span>
                  </p>
                  <p className="font-mono text-[9px] text-white/40">{ext.vendor}</p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">{ext.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ext.methods.map((m) => (
                      <span key={m} className="rounded-md bg-black/40 px-1.5 py-0.5 font-mono text-[8.5px] text-holo-cyan/70 ring-1 ring-white/10">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => toggle(ext.id)}
                  aria-label={`${enabled ? "Disable" : "Enable"} ${ext.name}`}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    enabled ? "bg-holo-cyan/70" : "bg-white/15",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                      enabled ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2.5 text-[10px] leading-relaxed text-white/35">
        ExtendAPI pattern: every extension registers versioned methods; enabled methods are exposed to the platform and
        toggles persist across sessions. Social features run on the OSSN v10 bridge.
      </p>
    </section>
  );
}

/* ----------------------------- backend core ----------------------------- */

function BackendTab() {
  return (
    <div className="space-y-4">
      <MemoryPanel />
      <ToolsPanel />
      <PriceSyncPanel />
    </div>
  );
}

function PanelHeader({ icon: Icon, title, badge }: { icon: typeof Activity; title: string; badge?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white/90">
        <Icon className="h-4 w-4 text-holo-cyan" /> {title}
      </p>
      {badge && (
        <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[9px] font-bold text-white/50">
          {badge}
        </span>
      )}
    </div>
  );
}

function MemoryPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemoryEntry[]>(() => getAllMemories().slice(0, 8));
  const [newKey, setNewKey] = useState("");
  const [newContent, setNewContent] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const r = recallMemories(query);
    setResults(r.query.trim() ? r.memories : getAllMemories().slice(0, 8));
  }, [query, refresh]);

  const add = () => {
    if (!newKey.trim() || !newContent.trim()) return;
    storeMemory({ category: "semantic", key: newKey.trim(), content: newContent.trim(), importance: 6, tags: ["admin"] });
    setNewKey("");
    setNewContent("");
    setRefresh((n) => n + 1);
  };

  return (
    <section className="glass rounded-3xl p-4">
      <PanelHeader icon={BrainCircuit} title="AGENT MEMORY" badge={`${getAllMemories().length} ENTRIES`} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Recall: search memory by keyword…"
        className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-holo-cyan/50"
      />
      <div className="mt-2.5 space-y-2">
        {results.map((m) => (
          <div key={m.id} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-white">
                <span className="font-mono text-holo-cyan">{m.key}</span>
                <span className="rounded-full bg-white/8 px-2 py-0.5 font-mono text-[8px] font-bold uppercase text-white/50">{m.category}</span>
                <span className="font-mono text-[9px] text-holo-gold">imp {m.importance}/10</span>
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/60">{m.content}</p>
            </div>
            <button
              onClick={() => {
                deleteMemoryById(m.id);
                setRefresh((n) => n + 1);
              }}
              aria-label={`Delete memory ${m.key}`}
              className="shrink-0 rounded-lg p-1.5 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {results.length === 0 && (
          <p className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-center text-xs text-white/40">
            No memories match “{query}”.
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="memory_key"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-[12px] text-white outline-none placeholder:text-white/30 focus:border-holo-cyan/50 sm:w-48"
        />
        <input
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="What should the agent remember?"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/30 focus:border-holo-cyan/50"
        />
        <button
          onClick={add}
          className="rounded-xl bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-2 text-[11px] font-bold text-void transition-transform active:scale-95"
        >
          STORE
        </button>
      </div>
    </section>
  );
}

function ToolsPanel() {
  const [tools, setTools] = useState<DynamicToolMetadata[]>(() => getDynamicTools());
  const [output, setOutput] = useState<{ tool: string; result: string } | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  const refresh = () => setTools(getDynamicTools());

  const run = async (tool: DynamicToolMetadata) => {
    setRunning(tool.name);
    setOutput(null);
    const args = TOOL_SAMPLE_ARGS[tool.name] ?? {};
    const result = await executeDynamicTool(tool.name, args, TOOL_CONTEXT);
    setOutput({ tool: tool.name, result: JSON.stringify(result, null, 2) });
    setRunning(null);
    refresh();
  };

  return (
    <section className="glass rounded-3xl p-4">
      <PanelHeader icon={Wrench} title="DYNAMIC TOOL REGISTRY" badge={`${tools.length} TOOLS`} />
      <div className="mt-3 space-y-2">
        {tools.map((t) => (
          <div key={t.name} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-white">
                <span className="font-mono text-holo-mint">{t.name}</span>
                <span className="rounded-full bg-white/8 px-2 py-0.5 font-mono text-[8px] font-bold uppercase text-white/50">{t.author}</span>
                <span className="font-mono text-[9px] text-white/40">{t.executionCount} runs</span>
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/55">{t.description}</p>
            </div>
            <button
              onClick={() => run(t)}
              disabled={running !== null}
              className="flex items-center gap-1.5 rounded-full border border-holo-cyan/40 bg-holo-cyan/10 px-3 py-1.5 text-[10px] font-bold text-holo-cyan transition-all hover:bg-holo-cyan/20 active:scale-95 disabled:opacity-40"
            >
              <RefreshCw className={cn("h-3 w-3", running === t.name && "animate-spin")} />
              {running === t.name ? "RUNNING" : "RUN"}
            </button>
            <button
              onClick={() => {
                deleteDynamicTool(t.name);
                refresh();
              }}
              aria-label={`Delete tool ${t.name}`}
              className="shrink-0 rounded-lg p-1.5 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      {output && (
        <pre className="no-scrollbar mt-2.5 max-h-56 overflow-auto rounded-xl border border-holo-cyan/25 bg-black/50 p-3 font-mono text-[10.5px] leading-relaxed text-holo-mint">
          {`$ ${output.tool}\n${output.result}`}
        </pre>
      )}
      <p className="mt-2 text-[10px] text-white/35">
        Tools execute in a sandboxed runtime with platform context (real catalog lookup + pricing). Sample arguments are
        injected per tool.
      </p>
    </section>
  );
}

function PriceSyncPanel() {
  const [db, setDb] = useState(() => ensurePriceDatabase());
  const [tasks, setTasks] = useState(() => getAutonomousTasks());
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: CATALOG.length });

  const runSync = async () => {
    setSyncing(true);
    setProgress({ done: 0, total: CATALOG.length });
    const result = await syncPokemonPrices("manual", (done, total) => setProgress({ done, total }));
    setDb(result);
    setTasks(getAutonomousTasks());
    setSyncing(false);
  };

  return (
    <section className="glass rounded-3xl p-4">
      <PanelHeader
        icon={RefreshCw}
        title="AUTONOMOUS PRICE SYNC"
        badge={db.lastSyncTimestamp ? `LAST SYNC ${new Date(db.lastSyncTimestamp).toLocaleTimeString()}` : "NEVER SYNCED"}
      />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="font-mono text-[8.5px] font-bold uppercase tracking-wider text-white/40">Cards tracked</p>
          <p className="font-display text-base font-extrabold text-white">{db.totalCardsTracked}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="font-mono text-[8.5px] font-bold uppercase tracking-wider text-white/40">Live synced</p>
          <p className="font-display text-base font-extrabold text-holo-mint">
            {Object.values(db.cards).filter((c) => !c.source.includes("bundled")).length}
          </p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="font-mono text-[8.5px] font-bold uppercase tracking-wider text-white/40">Sync logs</p>
          <p className="font-display text-base font-extrabold text-white">{db.syncLogs.length}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="font-mono text-[8.5px] font-bold uppercase tracking-wider text-white/40">Active tasks</p>
          <p className="font-display text-base font-extrabold text-holo-cyan">{tasks.filter((t) => t.status === "active").length}</p>
        </div>
      </div>
      {syncing && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet transition-all"
              style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-white/50">
            Syncing real market data… {progress.done}/{progress.total}
          </p>
        </div>
      )}
      <button
        onClick={runSync}
        disabled={syncing}
        className="mt-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-holo-cyan to-holo-violet px-4 py-2.5 text-[11px] font-bold text-void transition-transform active:scale-95 disabled:opacity-50"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
        {syncing ? "SYNCING…" : "RUN FULL SYNC NOW"}
      </button>
      <div className="mt-3 space-y-2">
        {tasks.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-holo-mint shadow-[0_0_8px_rgba(52,231,181,0.8)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-white/85">{t.name}</p>
              <p className="font-mono text-[9px] text-white/40">
                every {t.intervalMinutes}m · {t.runCount} runs {t.lastRun ? `· last ${new Date(t.lastRun).toLocaleTimeString()}` : ""}
              </p>
            </div>
            {t.lastResultSummary && <p className="w-full truncate font-mono text-[9px] text-holo-mint/70">{t.lastResultSummary}</p>}
          </div>
        ))}
      </div>
      {db.syncLogs[0] && (
        <p className="mt-2 font-mono text-[10px] text-white/40">{db.syncLogs[0].summary}</p>
      )}
    </section>
  );
}

/* --------------------------- submissions intake --------------------------- */

const SUBMISSION_TINT: Record<string, string> = {
  SUBMITTED: "text-holo-violet bg-holo-violet/15 border-holo-violet/30",
  RECEIVED: "text-holo-cyan bg-holo-cyan/15 border-holo-cyan/30",
  INSPECTING: "text-holo-gold bg-holo-gold/15 border-holo-gold/30",
  GRADING: "text-holo-gold bg-holo-gold/15 border-holo-gold/30",
  GRADED: "text-holo-mint bg-holo-mint/15 border-holo-mint/30",
  SHIPPED: "text-white bg-white/10 border-white/25",
};

function SubmissionsTab() {
  const { submissions, updateSubmissionStatus, certifySubmission, cardById } = useVca();

  const inHouse = submissions.filter((s) => s.status !== "SUBMITTED" && s.status !== "SHIPPED").length;
  const awaiting = submissions.filter((s) => s.status === "SUBMITTED").length;
  const shipped = submissions.filter((s) => s.status === "SHIPPED").length;
  const declaredTotal = submissions.reduce((sum, s) => sum + s.declaredValue, 0);

  return (
    <div className="space-y-4">
      {/* intake stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={FileStack} label="Awaiting Accept" value={String(awaiting)} accent="text-holo-violet" sub="new submissions" />
        <StatTile icon={Package} label="In Facility" value={String(inHouse)} accent="text-holo-cyan" sub="received → grading" />
        <StatTile icon={PackageCheck} label="Graded" value={String(submissions.filter((s) => s.status === "GRADED").length)} accent="text-holo-mint" sub="ready to ship" />
        <StatTile icon={Truck} label="Shipped" value={String(shipped)} accent="text-white/70" sub={`$${declaredTotal.toLocaleString("en-US")} declared`} />
      </div>

      {submissions.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <FileStack className="mx-auto h-8 w-8 text-white/25" />
          <p className="mt-3 font-display text-sm font-bold text-white/70">No grading submissions yet</p>
          <p className="mt-1 text-[11px] text-white/40">
            When collectors submit cards from the Grading page they appear here for acceptance.
          </p>
        </div>
      )}

      {submissions.map((s) => {
        const c = cardById(s.cardId);
        return (
          <div key={s.id} className="glass rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              {(s.cardArt || c?.artUrl) && (
                <img src={s.cardArt || c?.artUrl} alt={s.cardName} className="h-16 w-12 rounded-lg object-cover ring-1 ring-white/15" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold tracking-wider text-holo-cyan">{s.id}</span>
                  <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[8px] font-bold tracking-wider", SUBMISSION_TINT[s.status])}>
                    {s.status}
                  </span>
                  {s.certSerial && (
                    <span className="rounded-full border border-holo-gold/40 bg-holo-gold/10 px-2 py-0.5 font-mono text-[8px] font-bold text-holo-gold">
                      {s.finalGrade} · {s.certSerial}
                    </span>
                  )}
                </div>
                <p className="truncate font-display text-sm font-bold text-white">{s.cardName}</p>
                <p className="truncate text-[10px] text-white/45">
                  {s.ownerName} · {s.tier.toUpperCase()} · self-assessed {s.declaredCondition} · declared ${s.declaredValue.toLocaleString("en-US")}
                </p>
                <p className="truncate font-mono text-[9px] text-white/35">
                  {s.contactEmail} · ship to: {s.shippingName}, {s.shippingAddress}
                </p>
                {s.notes && <p className="mt-1 line-clamp-2 text-[10px] italic text-white/40">“{s.notes}”</p>}
              </div>
            </div>

            {/* admin actions */}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
              {s.status === "SUBMITTED" && (
                <ActionButton
                  icon={PackageCheck}
                  label="ACCEPT INTO FACILITY"
                  onClick={() => updateSubmissionStatus(s.id, "RECEIVED", "Package arrived at VCA facility — sealed intake scan logged.")}
                />
              )}
              {s.status === "RECEIVED" && (
                <ActionButton
                  icon={ShieldCheck}
                  label="START FORENSIC INSPECTION"
                  onClick={() => updateSubmissionStatus(s.id, "INSPECTING", "Card on the bench — 25-tool forensic pipeline queued.")}
                />
              )}
              {s.status === "INSPECTING" && (
                <ActionButton
                  icon={Gem}
                  label="MOVE TO GRADING LINE"
                  onClick={() => updateSubmissionStatus(s.id, "GRADING", "Final grade deliberation in progress.")}
                />
              )}
              {s.status === "GRADING" && (
                <>
                  <span className="font-mono text-[9px] tracking-wider text-white/40">ISSUE CERT:</span>
                  {(["VCA 10", "VCA 9", "VCA 8"] as GradeLabel[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => certifySubmission(s.id, g)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold transition-all active:scale-95",
                        g === "VCA 10"
                          ? "bg-holo-gold/20 text-holo-gold ring-1 ring-holo-gold/40 hover:bg-holo-gold/30"
                          : "bg-white/8 text-white/75 ring-1 ring-white/15 hover:bg-white/15",
                      )}
                    >
                      {g.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
              {s.status === "GRADED" && (
                <ActionButton
                  icon={Truck}
                  label="MARK SHIPPED"
                  onClick={() => updateSubmissionStatus(s.id, "SHIPPED", `Slab + cert ${s.certSerial} returned to ${s.shippingName}. Tracking emailed.`)}
                />
              )}
              {s.status === "SHIPPED" && <span className="font-mono text-[9px] text-white/35">COMPLETE — no further action required.</span>}
            </div>

            {/* latest timeline note */}
            {s.events.length > 0 && (
              <p className="mt-2 font-mono text-[9px] text-white/35">
                LOG · {new Date(s.events[s.events.length - 1].at).toLocaleString()} — {s.events[s.events.length - 1].note ?? s.events[s.events.length - 1].status}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick }: { icon: typeof Activity; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-holo-cyan to-holo-violet px-3.5 py-1.5 font-mono text-[10px] font-bold text-void transition-all hover:brightness-110 active:scale-95"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
