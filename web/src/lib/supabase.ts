import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Managed Postgres (Supabase) client. Credentials are provisioned by Rork
 * (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY). When the backend
 * is not configured every db helper degrades gracefully to local-only state.
 */
const url = import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
export const anonKey = (import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ?? "";

export const BACKEND_URL = url ?? "";

export const isBackendReady = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isBackendReady ? createClient(url!, anonKey!) : null;
