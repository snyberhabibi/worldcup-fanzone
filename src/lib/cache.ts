// Tiny in-memory TTL cache shared across requests on a warm Fluid Compute
// instance. Keeps the projector's 2s polling from hammering the Sheets API.

type Entry = { exp: number; val: unknown };

const store = new Map<string, Entry>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.exp > now) return hit.val as T;
  const val = await fn();
  store.set(key, { exp: now + ttlMs, val });
  return val;
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
