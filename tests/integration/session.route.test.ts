import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────
// Capture next/server's after() callbacks (the GET error path schedules an
// alertOps via after()). Keep NextRequest/NextResponse real.
const hoisted = vi.hoisted(() => ({ afterCbs: [] as Array<() => unknown> }));
vi.mock("next/server", async (orig) => {
  const actual = await orig<typeof import("next/server")>();
  return { ...actual, after: (cb: () => unknown) => void hoisted.afterCbs.push(cb) };
});
async function flushAfter() {
  for (const cb of hoisted.afterCbs.splice(0)) await cb();
}

// Supabase data layer — stubbed.
vi.mock("@/lib/db", () => ({
  getSession: vi.fn(async () => null),
  setSession: vi.fn(async () => {}),
}));

// Cache: pass straight through (no memoization), bust is a spy noop.
vi.mock("@/lib/cache", () => ({
  cached: (_k: string, _ttl: number, fn: () => unknown) => fn(),
  bust: vi.fn(() => {}),
  SESSION_TTL_MS: 5000,
}));

// PIN guard — controlled per test.
vi.mock("@/lib/auth", () => ({
  checkPin: vi.fn(() => true),
}));

vi.mock("@/lib/slack", () => ({
  alertOps: vi.fn(async () => {}),
}));

// @/lib/games stays REAL — the route derives matchIds from the live clock.
import { GET, POST } from "@/app/api/session/route";
import * as db from "@/lib/db";
import { bust } from "@/lib/cache";
import { checkPin } from "@/lib/auth";
import * as slack from "@/lib/slack";
import { currentSlotGames, getMatch } from "@/lib/games";
import type { StoredSession, DrawResult } from "@/types";

// Real, clock-derived current slot for "now" — used to assert GET output and to
// pick valid / out-of-slot match ids dynamically (so the test is date-stable).
function currentIds(): number[] {
  return currentSlotGames(new Date()).map((g) => g.id);
}
function validPinId(): number {
  return currentIds()[0];
}
// A real match id that is NOT in the current slot (for the lastDraw-drop case).
function idOutsideCurrentSlot(): number {
  const cur = new Set(currentIds());
  for (let id = 1; id <= 104; id++) if (getMatch(id) && !cur.has(id)) return id;
  throw new Error("no match outside current slot");
}
const INVALID_ID = 99999; // not a real match

function postReq(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/session", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

const draw = (matchId: number): DrawResult => ({
  nonce: "n1",
  matchId,
  winnerIndex: 0,
  firstName: "Yusuf",
  phoneMasked: "(•••) •••-5859",
  poolSize: 5,
});

beforeEach(() => {
  hoisted.afterCbs.length = 0;
  vi.clearAllMocks();
  vi.mocked(checkPin).mockReturnValue(true);
  vi.mocked(db.getSession).mockResolvedValue(null);
  vi.mocked(db.setSession).mockResolvedValue(undefined);
});

describe("GET /api/session", () => {
  it("returns the effective session shape derived from the live clock", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      matchIds: currentIds(),
      status: expect.stringMatching(/^(open|closed)$/),
      pinned: false,
      updatedAt: "",
      lastDraw: null,
    });
    // No stored session → no pin → clock-derived slot.
    expect(body.matchIds.length).toBeGreaterThan(0);
  });

  it("surfaces a stored sticky pin + draw in the effective session", async () => {
    const pin = validPinId();
    const stored: StoredSession = {
      pinnedMatchId: pin,
      manualStatus: "",
      pinSticky: true,
      updatedAt: "2026-06-15T12:00:00.000Z",
      lastDraw: draw(pin),
    };
    vi.mocked(db.getSession).mockResolvedValue(stored);

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.pinned).toBe(true);
    expect(body.matchIds).toContain(pin);
    expect(body.updatedAt).toBe("2026-06-15T12:00:00.000Z");
    expect(body.lastDraw).toMatchObject({ matchId: pin });
  });

  it("falls back to a clock-derived OPEN session (200, not 500) when getSession throws", async () => {
    vi.mocked(db.getSession).mockRejectedValue(new Error("supabase down"));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      matchIds: currentIds(),
      status: "open",
      pinned: false,
      updatedAt: "",
      lastDraw: null,
    });
  });

  it("alerts ops (via after) on the getSession failure fallback", async () => {
    vi.mocked(db.getSession).mockRejectedValue(new Error("supabase down"));
    await GET();
    expect(slack.alertOps).not.toHaveBeenCalled(); // scheduled via after(), not yet run
    await flushAfter();
    expect(slack.alertOps).toHaveBeenCalledTimes(1);
    expect(vi.mocked(slack.alertOps).mock.calls[0][0]).toMatch(/clock fallback/i);
  });

  it("drops a lastDraw whose matchId is not in the current slot", async () => {
    const stale = idOutsideCurrentSlot();
    const stored: StoredSession = {
      pinnedMatchId: null,
      manualStatus: "",
      pinSticky: false,
      updatedAt: "x",
      lastDraw: draw(stale),
    };
    vi.mocked(db.getSession).mockResolvedValue(stored);

    const res = await GET();
    const body = await res.json();
    expect(body.matchIds).not.toContain(stale);
    expect(body.lastDraw).toBeNull();
  });
});

describe("POST /api/session — auth", () => {
  it("401 without a valid PIN, and never touches the store", async () => {
    vi.mocked(checkPin).mockReturnValue(false);
    const res = await POST(postReq({ auto: true }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(db.setSession).not.toHaveBeenCalled();
    expect(db.getSession).not.toHaveBeenCalled();
    expect(bust).not.toHaveBeenCalled();
  });
});

describe("POST /api/session — pinning a game", () => {
  it("sets a sticky pin for a valid matchId and clears any prior draw", async () => {
    const pin = validPinId();
    const res = await POST(postReq({ matchId: pin }));
    expect(res.status).toBe(200);

    expect(db.setSession).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(db.setSession).mock.calls[0][0] as StoredSession;
    expect(saved.pinnedMatchId).toBe(pin);
    expect(saved.pinSticky).toBe(true);
    expect(saved.manualStatus).toBe("");
    expect(saved.lastDraw).toBeNull();
    expect(typeof saved.updatedAt).toBe("string");
    expect(saved.updatedAt).not.toBe("");

    expect(bust).toHaveBeenCalledWith("session-row");
  });

  it("400 invalid matchId — no write, no bust", async () => {
    const res = await POST(postReq({ matchId: INVALID_ID }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid matchId" });
    expect(db.setSession).not.toHaveBeenCalled();
    expect(bust).not.toHaveBeenCalled();
  });

  it("merges onto the existing stored session (preserves untouched fields)", async () => {
    const stale = idOutsideCurrentSlot();
    vi.mocked(db.getSession).mockResolvedValue({
      pinnedMatchId: stale,
      manualStatus: "closed",
      pinSticky: true,
      updatedAt: "old",
      lastDraw: draw(stale),
    });
    const pin = validPinId();
    await POST(postReq({ matchId: pin }));
    const saved = vi.mocked(db.setSession).mock.calls[0][0] as StoredSession;
    expect(saved.pinnedMatchId).toBe(pin); // overwritten
    expect(saved.manualStatus).toBe(""); // reset by the pin branch
    expect(saved.lastDraw).toBeNull(); // cleared by the pin branch
  });
});

describe("POST /api/session — clearing the pin (Auto)", () => {
  it("auto:true clears pin/manualStatus/pinSticky", async () => {
    vi.mocked(db.getSession).mockResolvedValue({
      pinnedMatchId: validPinId(),
      manualStatus: "closed",
      pinSticky: true,
      updatedAt: "old",
      lastDraw: null,
    });
    const res = await POST(postReq({ auto: true }));
    expect(res.status).toBe(200);
    const saved = vi.mocked(db.setSession).mock.calls[0][0] as StoredSession;
    expect(saved.pinnedMatchId).toBeNull();
    expect(saved.manualStatus).toBe("");
    expect(saved.pinSticky).toBe(false);
    expect(bust).toHaveBeenCalledWith("session-row");
  });

  it("clearPin:true clears the pin the same way", async () => {
    vi.mocked(db.getSession).mockResolvedValue({
      pinnedMatchId: validPinId(),
      manualStatus: "open",
      pinSticky: true,
      updatedAt: "old",
      lastDraw: null,
    });
    await POST(postReq({ clearPin: true }));
    const saved = vi.mocked(db.setSession).mock.calls[0][0] as StoredSession;
    expect(saved.pinnedMatchId).toBeNull();
    expect(saved.pinSticky).toBe(false);
  });
});

describe("POST /api/session — manual open/closed", () => {
  it("status:'closed' sets manualStatus and a TRANSIENT current-slot pin", async () => {
    const res = await POST(postReq({ status: "closed" }));
    expect(res.status).toBe(200);
    const saved = vi.mocked(db.setSession).mock.calls[0][0] as StoredSession;
    expect(saved.manualStatus).toBe("closed");
    // No prior pin → scopes the pause to the current slot via a transient pin.
    expect(saved.pinnedMatchId).toBe(currentSlotGames(new Date())[0]?.id ?? null);
    expect(saved.pinSticky).toBe(false);
    expect(bust).toHaveBeenCalledWith("session-row");
  });

  it("status:'open' sets manualStatus open", async () => {
    const res = await POST(postReq({ status: "open" }));
    expect(res.status).toBe(200);
    const saved = vi.mocked(db.setSession).mock.calls[0][0] as StoredSession;
    expect(saved.manualStatus).toBe("open");
  });

  it("does NOT override an existing sticky pin when pausing voting", async () => {
    const sticky = idOutsideCurrentSlot();
    vi.mocked(db.getSession).mockResolvedValue({
      pinnedMatchId: sticky,
      manualStatus: "",
      pinSticky: true,
      updatedAt: "old",
      lastDraw: null,
    });
    await POST(postReq({ status: "closed" }));
    const saved = vi.mocked(db.setSession).mock.calls[0][0] as StoredSession;
    expect(saved.manualStatus).toBe("closed");
    expect(saved.pinnedMatchId).toBe(sticky); // kept; not replaced by current slot
    expect(saved.pinSticky).toBe(true);
  });

  it("ignores an out-of-enum status value (no manual override set)", async () => {
    const res = await POST(postReq({ status: "paused" }));
    expect(res.status).toBe(200);
    const saved = vi.mocked(db.setSession).mock.calls[0][0] as StoredSession;
    expect(saved.manualStatus).toBe(""); // unchanged from EMPTY
    expect(saved.pinnedMatchId).toBeNull();
  });
});

describe("POST /api/session — clearDraw", () => {
  it("clearDraw:true nulls lastDraw and writes through", async () => {
    const pin = validPinId();
    vi.mocked(db.getSession).mockResolvedValue({
      pinnedMatchId: pin,
      manualStatus: "",
      pinSticky: true,
      updatedAt: "old",
      lastDraw: draw(pin),
    });
    const res = await POST(postReq({ clearDraw: true }));
    expect(res.status).toBe(200);
    const saved = vi.mocked(db.setSession).mock.calls[0][0] as StoredSession;
    expect(saved.lastDraw).toBeNull();
    expect(db.setSession).toHaveBeenCalledTimes(1);
    expect(bust).toHaveBeenCalledWith("session-row");
  });
});

describe("POST /api/session — failure", () => {
  it("500 when setSession throws", async () => {
    vi.mocked(db.setSession).mockRejectedValue(new Error("db write failed"));
    const res = await POST(postReq({ auto: true }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "failed" });
  });
});
