/**
 * Tiny in-process TTL cache for DB query results.
 * Prevents redundant SQLite reads when the browser makes several
 * requests in quick succession (tab focus, SSE event, manual refresh).
 */

type Entry = { value: unknown; expires: number };
const store = new Map<string, Entry>();

export function withCache<T>(key: string, ttlMs: number, fn: () => T): T {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = fn();
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

export function invalidateCache(): void {
  store.clear();
}
