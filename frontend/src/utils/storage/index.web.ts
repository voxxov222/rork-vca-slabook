// Web key-value storage backed by localStorage with an in-memory fallback
// (e.g. SSR / private mode where localStorage may throw).
const memoryCache = new Map<string, string>();

export async function getItem(key: string): Promise<string | null> {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    // fall through
  }
  return memoryCache.has(key) ? memoryCache.get(key)! : null;
}

export async function setItem(key: string, value: string): Promise<void> {
  memoryCache.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // memory only
  }
}

export async function removeItem(key: string): Promise<void> {
  memoryCache.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
