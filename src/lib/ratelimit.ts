// Best-effort in-memory rate limiter (per warm instance — not globally
// distributed, but a real deterrent against spam/brute-force on a single venue).

type Hit = { count: number; reset: number };
const store = new Map<string, Hit>();

/** Returns true if allowed, false if the key has exceeded `max` within `windowMs`. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const h = store.get(key);
  if (!h || h.reset < now) {
    store.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (h.count >= max) return false;
  h.count++;
  return true;
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
