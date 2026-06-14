// Tiny in-memory TTL cache shared across requests on a warm Fluid Compute
// instance. Keeps the projector's 2s polling from hammering the Sheets API.

type Entry = { exp: number; val: unknown };

const store = new Map<string, Entry>();

// Shared TTLs. Reads now hit Supabase (Postgres, fast + no throttle), so these
// are short — the cache mainly coalesces the board's per-game polls to keep DB
// request volume down, not to dodge a throttle like the old Sheets path did.
export const TALLY_TTL_MS = 3000; // per-match tally + entrants
export const SESSION_TTL_MS = 5000;

// In-flight loads per key, so concurrent cache misses share ONE underlying
// call instead of each firing its own (throttled) Sheets read — this stampede
// is what amplified the live overload at every TTL boundary.
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.exp > Date.now()) return hit.val as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const p = (async () => {
    try {
      const val = await fn();
      store.set(key, { exp: Date.now() + ttlMs, val });
      return val;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p as Promise<T>;
}

/** Invalidate everything, or just keys starting with `prefix` (call after writes). */
export function bust(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
