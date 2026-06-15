import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cached, bust, TALLY_TTL_MS, SESSION_TTL_MS } from "@/lib/cache";

// Manual deferred so we can test singleflight without racing the event loop:
// keep an fn's promise pending, fire a second concurrent read, then resolve.
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Each test gets its own key space; the cache module is a shared singleton, so
// also bust() in beforeEach to guarantee a clean store across tests.
beforeEach(() => {
  bust();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  bust();
});

describe("TTL constants", () => {
  it("exports the documented TTLs", () => {
    expect(TALLY_TTL_MS).toBe(3000);
    expect(SESSION_TTL_MS).toBe(5000);
  });
});

describe("cached — memoization within the TTL", () => {
  it("calls fn once for repeated reads inside the TTL", async () => {
    const fn = vi.fn(async () => "v1");

    const a = await cached("k", 1000, fn);
    const b = await cached("k", 1000, fn);
    const c = await cached("k", 1000, fn);

    expect(a).toBe("v1");
    expect(b).toBe("v1");
    expect(c).toBe("v1");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("still serves the cached value just before the TTL boundary", async () => {
    const fn = vi.fn(async () => "v1");
    await cached("k", 1000, fn);

    // Advance to one ms short of expiry — entry is kept (exp > Date.now()).
    vi.advanceTimersByTime(999);
    const again = await cached("k", 1000, fn);

    expect(again).toBe("v1");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("cached — refetch after the TTL expires", () => {
  it("re-runs fn once the TTL has elapsed", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");

    const first = await cached("k", 1000, fn);
    expect(first).toBe("v1");

    // Push past the TTL. Stored exp is Date.now()+ttl, kept only while exp > now,
    // so advancing by exactly the TTL makes exp === now → treated as expired.
    vi.advanceTimersByTime(1000);

    const second = await cached("k", 1000, fn);
    expect(second).toBe("v2");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("cached — isolation by key", () => {
  it("does not share values across distinct keys", async () => {
    const fnA = vi.fn(async () => "A");
    const fnB = vi.fn(async () => "B");

    const a = await cached("a", 1000, fnA);
    const b = await cached("b", 1000, fnB);

    expect(a).toBe("A");
    expect(b).toBe("B");
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(1);

    // Re-reading each key still hits its own cached entry, not the other's.
    expect(await cached("a", 1000, fnA)).toBe("A");
    expect(await cached("b", 1000, fnB)).toBe("B");
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(1);
  });
});

describe("cached — singleflight (concurrent misses share one fn call)", () => {
  it("two concurrent misses for the same key run fn exactly once", async () => {
    const d = deferred<string>();
    const fn = vi.fn(() => d.promise);

    // Fire both reads WITHOUT awaiting between them — both are misses and the
    // second should latch onto the first's in-flight promise.
    const p1 = cached("k", 1000, fn);
    const p2 = cached("k", 1000, fn);

    expect(fn).toHaveBeenCalledTimes(1);

    d.resolve("shared");
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe("shared");
    expect(r2).toBe("shared");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("clears the in-flight entry after settle so the next miss refetches", async () => {
    const d1 = deferred<string>();
    const fn = vi
      .fn<() => Promise<string>>()
      .mockImplementationOnce(() => d1.promise)
      .mockResolvedValueOnce("v2");

    const p1 = cached("k", 1000, fn);
    d1.resolve("v1");
    expect(await p1).toBe("v1");

    // The resolved value is now cached; expire it and confirm a fresh call runs.
    vi.advanceTimersByTime(1000);
    expect(await cached("k", 1000, fn)).toBe("v2");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not cache a rejected in-flight call (in-flight is cleared in finally)", async () => {
    const d1 = deferred<string>();
    const fn = vi
      .fn<() => Promise<string>>()
      .mockImplementationOnce(() => d1.promise)
      .mockResolvedValueOnce("recovered");

    const p1 = cached("k", 1000, fn);
    d1.reject(new Error("boom"));
    await expect(p1).rejects.toThrow("boom");

    // No store entry was written, and the in-flight map was cleared, so the
    // next read is a fresh miss (no TTL advance needed).
    const retry = await cached("k", 1000, fn);
    expect(retry).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("bust", () => {
  it("drops keys matching the prefix so the next read refetches", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");

    await cached("tally:19", 10_000, fn);
    bust("tally:");

    expect(await cached("tally:19", 10_000, fn)).toBe("v2");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("leaves non-matching keys cached when busting by prefix", async () => {
    const tallyFn = vi.fn(async () => "tally");
    const sessionFn = vi.fn(async () => "session");

    await cached("tally:19", 10_000, tallyFn);
    await cached("session:abc", 10_000, sessionFn);

    bust("tally:");

    // session:* survives → still cached, fn not re-run.
    expect(await cached("session:abc", 10_000, sessionFn)).toBe("session");
    expect(sessionFn).toHaveBeenCalledTimes(1);
  });

  it("clears everything when called with no prefix", async () => {
    const fnA = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("A1")
      .mockResolvedValueOnce("A2");
    const fnB = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("B1")
      .mockResolvedValueOnce("B2");

    await cached("a", 10_000, fnA);
    await cached("b", 10_000, fnB);

    bust();

    expect(await cached("a", 10_000, fnA)).toBe("A2");
    expect(await cached("b", 10_000, fnB)).toBe("B2");
    expect(fnA).toHaveBeenCalledTimes(2);
    expect(fnB).toHaveBeenCalledTimes(2);
  });

  it("prefix is a startsWith match, not an exact-key match", async () => {
    const exactFn = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("exact1")
      .mockResolvedValueOnce("exact2");
    const childFn = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("child1")
      .mockResolvedValueOnce("child2");

    await cached("tally", 10_000, exactFn);
    await cached("tally:19", 10_000, childFn);

    bust("tally");

    // Both "tally" and "tally:19" start with "tally" → both dropped.
    expect(await cached("tally", 10_000, exactFn)).toBe("exact2");
    expect(await cached("tally:19", 10_000, childFn)).toBe("child2");
    expect(exactFn).toHaveBeenCalledTimes(2);
    expect(childFn).toHaveBeenCalledTimes(2);
  });
});
