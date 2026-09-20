import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bot, BrainCircuit, RefreshCw, Terminal, Wrench, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { getAllMemories, recallMemories, type MemoryEntry } from "@/lib/vcaos/agentMemory";
import { ensurePriceDatabase, syncPokemonPrices } from "@/lib/vcaos/priceSync";
import { TOOL_CONTEXT, TOOL_SAMPLE_ARGS } from "@/lib/vcaos/toolContext";
import { executeDynamicTool, getDynamicTools, type DynamicToolMetadata } from "@/lib/vcaos/toolRegistry";

const SESSION_KEY = "vca-os-session";
const CATALOG_SIZE = 29;

function DrawerSection({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: typeof Bot;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <p className="flex items-center gap-2 font-mono text-[9.5px] font-bold uppercase tracking-widest text-white/50">
        <Icon className="h-3.5 w-3.5 text-holo-cyan" /> {title}
        {badge && <span className="ml-auto font-mono text-[8.5px] text-white/35">{badge}</span>}
      </p>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

function ToolRunner() {
  const [tools, setTools] = useState<DynamicToolMetadata[]>(() => getDynamicTools());
  const [selected, setSelected] = useState<string>(() => getDynamicTools()[0]?.name ?? "");
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!selected) return;
    setRunning(true);
    setOutput(null);
    const result = await executeDynamicTool(selected, TOOL_SAMPLE_ARGS[selected] ?? {}, TOOL_CONTEXT);
    setOutput(JSON.stringify(result, null, 2));
    setRunning(false);
    setTools(getDynamicTools());
  };

  return (
    <DrawerSection icon={Wrench} title="Dynamic Tools" badge={`${tools.length} registered`}>
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setOutput(null);
          }}
          aria-label="Select VCA Computer tool"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-2.5 py-2 font-mono text-[10.5px] text-white outline-none focus:border-holo-cyan/50"
        >
          {tools.map((t) => (
            <option key={t.name} value={t.name} className="bg-void">
              {t.name}
            </option>
          ))}
        </select>
        <button
          onClick={run}
          disabled={running || !selected}
          aria-label="Run selected tool"
          className="shrink-0 rounded-xl bg-gradient-to-r from-holo-cyan to-holo-violet px-3.5 py-2 text-[10px] font-bold text-void transition-transform active:scale-95 disabled:opacity-50"
        >
          {running ? "…" : "RUN"}
        </button>
      </div>
      {output && (
        <pre className="no-scrollbar mt-2 max-h-44 overflow-auto rounded-xl border border-holo-cyan/25 bg-black/50 p-2.5 font-mono text-[9.5px] leading-relaxed text-holo-mint">
          {output}
        </pre>
      )}
    </DrawerSection>
  );
}

function MemoryRecall() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemoryEntry[]>(() => getAllMemories().slice(0, 3));

  useEffect(() => {
    const r = recallMemories(query);
    setResults(r.query.trim() ? r.memories.slice(0, 4) : getAllMemories().slice(0, 3));
  }, [query]);

  return (
    <DrawerSection icon={BrainCircuit} title="Agent Memory" badge={`${getAllMemories().length} entries`}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Recall by keyword…"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white outline-none placeholder:text-white/30 focus:border-holo-cyan/50"
      />
      <div className="mt-2 space-y-1.5">
        {results.map((m) => (
          <div key={m.id} className="rounded-xl border border-white/8 bg-white/[0.02] px-2.5 py-2">
            <p className="font-mono text-[10px] font-bold text-holo-cyan">{m.key}</p>
            <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-white/55">{m.content}</p>
          </div>
        ))}
        {results.length === 0 && <p className="py-1 text-center text-[10.5px] text-white/40">No memories match.</p>}
      </div>
    </DrawerSection>
  );
}

function PriceSync() {
  const [db, setDb] = useState(() => ensurePriceDatabase());
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: CATALOG_SIZE });

  const run = async () => {
    setSyncing(true);
    setProgress({ done: 0, total: CATALOG_SIZE });
    const result = await syncPokemonPrices("manual", (done, total) => setProgress({ done, total }));
    setDb(result);
    setSyncing(false);
  };

  return (
    <DrawerSection
      icon={RefreshCw}
      title="Price Sync"
      badge={db.lastSyncTimestamp ? new Date(db.lastSyncTimestamp).toLocaleTimeString() : "never"}
    >
      <button
        onClick={run}
        disabled={syncing}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-holo-cyan/40 bg-holo-cyan/10 px-3 py-2 text-[10.5px] font-bold text-holo-cyan transition-all hover:bg-holo-cyan/20 active:scale-95 disabled:opacity-50"
      >
        <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
        {syncing ? `SYNCING ${progress.done}/${progress.total}…` : "SYNC LIVE PRICES NOW"}
      </button>
      {syncing && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-holo-cyan to-holo-violet transition-all"
            style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
          />
        </div>
      )}
    </DrawerSection>
  );
}

/**
 * Admin-only popup side menu with the VCA Computer tools: dynamic tool runner,
 * agent memory recall, live price sync, and a shortcut into the full VCA OS.
 * Renders a floating launcher button only when an admin session exists.
 */
export default function VcaComputerDrawer() {
  const [isAdmin, setIsAdmin] = useState(() => Boolean(localStorage.getItem(SESSION_KEY)));
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const location = useLocation();

  /* re-check the admin session on every route change (login can happen mid-session) */
  useEffect(() => {
    setIsAdmin(Boolean(localStorage.getItem(SESSION_KEY)));
  }, [location.pathname]);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!isAdmin) return null;

  return (
    <>
      {/* floating launcher */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open VCA Computer tools"
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-holo-cyan via-holo-violet to-holo-magenta shadow-[0_0_30px_rgba(61,107,232,0.45)] transition-transform hover:scale-105 active:scale-90 lg:bottom-6 lg:right-6"
      >
        <Bot className="h-6 w-6 text-void" strokeWidth={2.4} />
      </button>

      {/* drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className={cn(
              "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
              shown ? "opacity-100" : "opacity-0",
            )}
            onClick={() => setOpen(false)}
          />
          <aside
            className={cn(
              "glass-strong absolute inset-y-0 right-0 flex w-[340px] max-w-[88vw] flex-col shadow-2xl transition-transform duration-300 ease-out",
              shown ? "translate-x-0" : "translate-x-full",
            )}
            role="dialog"
            aria-label="VCA Computer tools"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
              <p className="flex items-center gap-2 font-display text-xs font-bold tracking-wider text-white">
                <Bot className="h-4 w-4 text-holo-cyan" /> VCA COMPUTER
                <span className="flex items-center gap-1 rounded-full border border-holo-mint/30 bg-holo-mint/10 px-2 py-0.5 font-mono text-[8px] font-bold text-holo-mint">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-holo-mint" /> ONLINE
                </span>
              </p>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close VCA Computer tools"
                className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/8 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
              <ToolRunner />
              <MemoryRecall />
              <PriceSync />
            </div>

            <div className="border-t border-white/10 p-3.5">
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 text-[10.5px] font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Terminal className="h-3.5 w-3.5 text-holo-cyan" /> OPEN FULL VCA OS
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
