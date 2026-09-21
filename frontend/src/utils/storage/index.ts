import { Platform } from 'react-native';

// Native (iOS/Android) key-value storage using expo-secure-store for small
// secure values, falling back to an in-memory cache for larger/plain values.
// The web variant lives in index.web.ts.
import * as SecureStore from 'expo-secure-store';

const memoryCache = new Map<string, string>();

// SecureStore keys must be alphanumeric + ".-_" only. Sanitize arbitrary keys.
function safeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function getItem(key: string): Promise<string | null> {
  const k = safeKey(key);
  try {
    const value = await SecureStore.getItemAsync(k);
    if (value !== null) return value;
  } catch {
    // fall through to memory cache
  }
  return memoryCache.has(k) ? memoryCache.get(k)! : null;
}

export async function setItem(key: string, value: string): Promise<void> {
  const k = safeKey(key);
  memoryCache.set(k, value);
  try {
    await SecureStore.setItemAsync(k, value);
  } catch {
    // value stays in memory cache only
  }
}

export async function removeItem(key: string): Promise<void> {
  const k = safeKey(key);
  memoryCache.delete(k);
  try {
    await SecureStore.deleteItemAsync(k);
  } catch {
    // ignore
  }
}
