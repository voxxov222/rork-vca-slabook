import { isBackendReady, supabase } from "./supabase";
import type { ProfileBlockDef, ProfileMediaItem, ScanHistoryRecord, VaultSlabRow } from "./types";

/**
 * Managed Postgres (Supabase) data access. Every helper degrades to a safe
 * no-op (empty result / silent skip) when the backend is not configured, so
 * the UI keeps working offline with local state.
 */

export const USER_KEY = "demo";

const T = {
  slabs: "vca_slabs",
  blocks: "vca_profile_blocks",
  media: "vca_profile_media",
  scans: "vca_scan_history",
} as const;

/* ------------------------------ slabs ------------------------------ */

interface SlabDbRow {
  client_id: string;
  serial: string;
  kind: string;
  card_id: string | null;
  card_name: string;
  card_set: string | null;
  card_art: string | null;
  grade: string | null;
  value: number | null;
  owner_name: string;
  minted_at: string;
}

const slabFromRow = (r: SlabDbRow): VaultSlabRow => ({
  clientId: r.client_id,
  serial: r.serial,
  kind: r.kind === "physical" ? "physical" : "digital",
  cardId: r.card_id,
  cardName: r.card_name,
  cardSet: r.card_set,
  cardArt: r.card_art,
  grade: r.grade,
  value: Number(r.value ?? 0),
  ownerName: r.owner_name,
  mintedAt: r.minted_at,
});

export async function listVaultSlabs(): Promise<VaultSlabRow[]> {
  if (!isBackendReady || !supabase) return [];
  const { data, error } = await supabase.from(T.slabs).select("*").order("minted_at", { ascending: false }).limit(200);
  if (error) {
    console.warn("[db] slab load failed:", error.message);
    return [];
  }
  return (data as SlabDbRow[]).map(slabFromRow);
}

export async function upsertVaultSlab(row: VaultSlabRow): Promise<void> {
  if (!isBackendReady || !supabase) return;
  const { error } = await supabase.from(T.slabs).upsert(
    {
      client_id: row.clientId,
      serial: row.serial,
      kind: row.kind,
      card_id: row.cardId,
      card_name: row.cardName,
      card_set: row.cardSet,
      card_art: row.cardArt,
      grade: row.grade,
      value: row.value,
      owner_name: row.ownerName,
      minted_at: row.mintedAt,
    },
    { onConflict: "client_id" },
  );
  if (error) console.warn("[db] slab save failed:", error.message);
}

/* --------------------------- profile blocks --------------------------- */

export async function listProfileBlocks(): Promise<ProfileBlockDef[]> {
  if (!isBackendReady || !supabase) return [];
  const { data, error } = await supabase
    .from(T.blocks)
    .select("client_id, kind, position")
    .eq("user_key", USER_KEY)
    .order("position", { ascending: true });
  if (error) {
    console.warn("[db] blocks load failed:", error.message);
    return [];
  }
  return ((data as { client_id: string; kind: string }[]) ?? []).map((r) => ({ id: r.client_id, kind: r.kind as ProfileBlockDef["kind"] }));
}

export async function saveProfileBlocks(blocks: ProfileBlockDef[]): Promise<void> {
  if (!isBackendReady || !supabase) return;
  const del = await supabase.from(T.blocks).delete().eq("user_key", USER_KEY);
  if (del.error) {
    console.warn("[db] blocks reset failed:", del.error.message);
    return;
  }
  const ins = await supabase.from(T.blocks).insert(
    blocks.map((b, i) => ({ client_id: b.id, user_key: USER_KEY, kind: b.kind, position: i })),
  );
  if (ins.error) console.warn("[db] blocks save failed:", ins.error.message);
}

/* --------------------------- profile media --------------------------- */

interface MediaDbRow {
  client_id: string;
  media_type: string;
  title: string;
  url: string;
  caption: string | null;
}

export async function listProfileMedia(): Promise<ProfileMediaItem[]> {
  if (!isBackendReady || !supabase) return [];
  const { data, error } = await supabase
    .from(T.media)
    .select("*")
    .eq("user_key", USER_KEY)
    .order("position", { ascending: true })
    .limit(100);
  if (error) {
    console.warn("[db] media load failed:", error.message);
    return [];
  }
  return ((data as MediaDbRow[]) ?? []).map((r) => ({
    id: r.client_id,
    mediaType: r.media_type === "link" ? "link" : "image",
    title: r.title,
    url: r.url,
    caption: r.caption,
  }));
}

export async function insertProfileMedia(item: ProfileMediaItem, position: number): Promise<void> {
  if (!isBackendReady || !supabase) return;
  const { error } = await supabase.from(T.media).upsert(
    {
      client_id: item.id,
      user_key: USER_KEY,
      media_type: item.mediaType,
      title: item.title,
      url: item.url,
      caption: item.caption ?? null,
      position,
    },
    { onConflict: "client_id" },
  );
  if (error) console.warn("[db] media save failed:", error.message);
}

export async function deleteProfileMedia(id: string): Promise<void> {
  if (!isBackendReady || !supabase) return;
  const { error } = await supabase.from(T.media).delete().eq("client_id", id);
  if (error) console.warn("[db] media delete failed:", error.message);
}

/* ---------------------------- scan history ---------------------------- */

interface ScanDbRow {
  client_id: string;
  card_name: string | null;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  verdict: string | null;
  confidence: number | null;
  matched_card_id: string | null;
  verified_product: boolean | null;
  created_at: string;
}

const scanFromRow = (r: ScanDbRow): ScanHistoryRecord => ({
  id: r.client_id,
  cardName: r.card_name ?? "Unknown",
  setName: r.set_name ?? "—",
  number: r.number ?? "—",
  rarity: r.rarity ?? "—",
  verdict: (r.verdict as ScanHistoryRecord["verdict"]) ?? "suspect",
  confidence: r.confidence ?? 0,
  matchedCardId: r.matched_card_id,
  verifiedProduct: Boolean(r.verified_product),
  createdAt: r.created_at,
});

export async function listScanHistory(): Promise<ScanHistoryRecord[]> {
  if (!isBackendReady || !supabase) return [];
  const { data, error } = await supabase
    .from(T.scans)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn("[db] scan load failed:", error.message);
    return [];
  }
  return ((data as ScanDbRow[]) ?? []).map(scanFromRow);
}

export async function insertScanRecord(rec: ScanHistoryRecord): Promise<void> {
  if (!isBackendReady || !supabase) return;
  const { error } = await supabase.from(T.scans).upsert(
    {
      client_id: rec.id,
      card_name: rec.cardName,
      set_name: rec.setName,
      number: rec.number,
      rarity: rec.rarity,
      verdict: rec.verdict,
      confidence: rec.confidence,
      matched_card_id: rec.matchedCardId,
      verified_product: rec.verifiedProduct,
    },
    { onConflict: "client_id" },
  );
  if (error) console.warn("[db] scan save failed:", error.message);
}
