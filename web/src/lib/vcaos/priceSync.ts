/**
 * VCA Autonomous Price Sync — ported from voxxov222/Vcacomputer
 * (src/lib/autonomousPriceSync.ts), browser-adapted: instead of a Node-side
 * synthetic pricing engine it drives the platform's REAL pricing pipeline
 * (pokemontcg.io raw + JustTCG graded) and persists snapshots + task state
 * to localStorage.
 */

import { CATALOG, cardById } from "@/lib/data";
import { fetchLivePrices } from "@/lib/prices";
import type { CatalogCard } from "@/lib/types";

export interface CardMarketData {
  cardId: string;
  name: string;
  setName: string;
  collectorNumber: string;
  lastUpdated: string;
  source: string;
  pricing: { raw: number; psa10: number; psa9: number; psa8: number };
  trends: {
    sevenDayChangePercent: number | null;
    thirtyDayChangeChangePercent: number | null;
    volatilityIndex: "low" | "moderate" | "high" | "extreme";
    dataPoints: number;
  };
}

export interface MarketPriceDatabase {
  version: string;
  lastSyncTimestamp: string;
  totalCardsTracked: number;
  cards: Record<string, CardMarketData>;
  syncLogs: Array<{
    id: string;
    timestamp: string;
    cardsUpdated: number;
    trigger: "voice_agent" | "autonomous_cron" | "manual" | "price_alert";
    status: "success" | "partial" | "error";
    summary: string;
  }>;
}

export interface AutonomousTask {
  id: string;
  name: string;
  type: "price_sync" | "repo_audit" | "system_health" | "backup" | "custom";
  intervalMinutes: number;
  lastRun?: string;
  nextRun: string;
  status: "active" | "paused" | "running" | "failed";
  runCount: number;
  lastResultSummary?: string;
}

const DB_KEY = "vca-os-price-db";
const TASKS_KEY = "vca-os-autonomous-tasks";

const DEFAULT_TASKS: AutonomousTask[] = [
  {
    id: "task-price-sync",
    name: "Real-Time Pokémon Price Intelligence Sync",
    type: "price_sync",
    intervalMinutes: 15,
    nextRun: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    status: "active",
    runCount: 0,
  },
  {
    id: "task-sys-health",
    name: "Autonomous System Health Supervisor",
    type: "system_health",
    intervalMinutes: 60,
    nextRun: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: "active",
    runCount: 0,
  },
];

function loadDb(): MarketPriceDatabase {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as MarketPriceDatabase;
  } catch {
    // fall through to fresh db
  }
  return { version: "2.0.0", lastSyncTimestamp: "", totalCardsTracked: 0, cards: {}, syncLogs: [] };
}

function saveDb(db: MarketPriceDatabase): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // storage unavailable — in-memory only
  }
}

export function ensurePriceDatabase(): MarketPriceDatabase {
  return loadDb();
}

export function getAutonomousTasks(): AutonomousTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) return JSON.parse(raw) as AutonomousTask[];
  } catch {
    // fall through to defaults
  }
  return DEFAULT_TASKS.map((t) => ({ ...t }));
}

function saveTasks(tasks: AutonomousTask[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // storage unavailable — in-memory only
  }
}

export function scheduleAutonomousTask(
  name: string,
  type: AutonomousTask["type"],
  intervalMinutes: number,
): AutonomousTask {
  const tasks = getAutonomousTasks();
  const task: AutonomousTask = {
    id: `task-${Date.now()}`,
    name,
    type,
    intervalMinutes,
    nextRun: new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString(),
    status: "active",
    runCount: 0,
  };
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

export function markTaskRun(taskId: string, summary: string): void {
  const tasks = getAutonomousTasks();
  const t = tasks.find((x) => x.id === taskId);
  if (!t) return;
  t.lastRun = new Date().toISOString();
  t.nextRun = new Date(Date.now() + t.intervalMinutes * 60 * 1000).toISOString();
  t.runCount += 1;
  t.lastResultSummary = summary;
  saveTasks(tasks);
}

/** Volatility index from a price series (percent-change standard deviation). */
function volatilityFromSeries(series: number[]): CardMarketData["trends"]["volatilityIndex"] {
  if (series.length < 3) return "low";
  const changes: number[] = [];
  for (let i = 1; i < series.length; i++) {
    if (series[i - 1] > 0) changes.push(((series[i] - series[i - 1]) / series[i - 1]) * 100);
  }
  if (!changes.length) return "low";
  const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
  const sd = Math.sqrt(changes.reduce((a, b) => a + (b - mean) ** 2, 0) / changes.length);
  if (sd < 1) return "low";
  if (sd < 3) return "moderate";
  if (sd < 7) return "high";
  return "extreme";
}

function trendPercent(history: { t: number; p: number }[], days: number): number | null {
  const cutoff = Date.now() / 1000 - days * 24 * 60 * 60;
  const window = history.filter((pt) => pt.t >= cutoff);
  if (window.length < 2) return null;
  const first = window[0].p;
  const last = window[window.length - 1].p;
  if (!first) return null;
  return +(((last - first) / first) * 100).toFixed(1);
}

/**
 * Runs a full price sync across the real catalog: raw market from
 * pokemontcg.io, graded PSA 10/9/8 from JustTCG. Persisted with sync logs
 * and task bookkeeping, mirroring the Vcacomputer autonomous sync loop.
 */
export async function syncPokemonPrices(
  trigger: MarketPriceDatabase["syncLogs"][number]["trigger"] = "manual",
  onProgress?: (done: number, total: number, card: CatalogCard) => void,
): Promise<MarketPriceDatabase> {
  const db = loadDb();
  let updated = 0;

  for (let i = 0; i < CATALOG.length; i++) {
    const card = CATALOG[i];
    let live = null;
    try {
      live = await fetchLivePrices(card);
    } catch {
      // keep bundled prices for this card
    }
    const g10 = live && Number.isFinite(live.g10) ? live.g10 : card.prices.g10;
    const g9 = live && Number.isFinite(live.g9) ? live.g9 : card.prices.g9;
    const g8 = live && Number.isFinite(live.g8) ? live.g8 : card.prices.g8;
    const raw = live && Number.isFinite(live.raw) ? live.raw : card.prices.raw;

    db.cards[card.id] = {
      cardId: card.id,
      name: card.name,
      setName: card.set,
      collectorNumber: card.number,
      lastUpdated: new Date().toISOString(),
      source: live?.source ?? "VCA Market Index (bundled)",
      pricing: { raw, psa10: g10, psa9: g9, psa8: g8 },
      trends: {
        sevenDayChangePercent: live ? trendPercent(live.rawHistory, 7) : null,
        thirtyDayChangeChangePercent: live ? trendPercent(live.rawHistory, 30) : null,
        volatilityIndex: volatilityFromSeries(live?.rawHistory.map((p) => p.p) ?? []),
        dataPoints: live?.rawHistory.length ?? 0,
      },
    };
    if (live) updated += 1;
    onProgress?.(i + 1, CATALOG.length, card);
  }

  db.lastSyncTimestamp = new Date().toISOString();
  db.totalCardsTracked = Object.keys(db.cards).length;
  db.syncLogs.unshift({
    id: `sync-${Date.now()}`,
    timestamp: db.lastSyncTimestamp,
    cardsUpdated: updated,
    trigger,
    status: updated === CATALOG.length ? "success" : updated > 0 ? "partial" : "error",
    summary: `Synchronized ${updated}/${CATALOG.length} cards with live market data (raw + PSA 10/9/8).`,
  });
  db.syncLogs = db.syncLogs.slice(0, 25);
  saveDb(db);

  const task = getAutonomousTasks().find((t) => t.type === "price_sync");
  if (task) markTaskRun(task.id, db.syncLogs[0].summary);

  return db;
}

/** Convenience lookup used by tools and dashboards. */
export function getMarketData(cardId: string): CardMarketData | null {
  return loadDb().cards[cardId] ?? null;
}

/** Aggregate vault value from the latest synced snapshot. */
export function estimateVaultValue(): number {
  const db = loadDb();
  return Object.values(db.cards).reduce((sum, c) => sum + c.pricing.raw, 0);
}

export { cardById };
