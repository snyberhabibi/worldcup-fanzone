import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────
// The tally route schedules a Slack alert via next/server's after() on a DB
// read failure. Capture those callbacks so we can run + assert them; keep
// NextRequest/NextResponse real (the routes read req.nextUrl.searchParams and
// return NextResponse.json).
const hoisted = vi.hoisted(() => ({ afterCbs: [] as Array<() => unknown> }));
vi.mock("next/server", async (orig) => {
  const actual = await orig<typeof import("next/server")>();
  return { ...actual, after: (cb: () => unknown) => void hoisted.afterCbs.push(cb) };
});
async function flushAfter() {
  for (const cb of hoisted.afterCbs.splice(0)) await cb();
}

// Supabase data layer — all stubbed.
vi.mock("@/lib/db", () => ({
  getTally: vi.fn(async () => ({ matchId: 19, home: 0, away: 0, total: 0 })),
  getEntrants: vi.fn(async () => []),
  voterStats: vi.fn(async () => ({
    totalVoteRows: 0,
    distinctPhonesAll: 0,
    distinctVoters: 0,
    realVoteRows: 0,
    gamesWithRealVotes: 0,
  })),
}));

// Cache: call straight through (no memoization) for deterministic tests.
vi.mock("@/lib/cache", () => ({
  cached: (_k: string, _ttl: number, fn: () => unknown) => fn(),
  TALLY_TTL_MS: 3000,
}));

// Only valid (positive-int) match ids resolve — drives the 400 validation path.
vi.mock("@/lib/games", () => ({
  getMatch: (id: number) =>
    Number.isFinite(id) && id > 0 ? { id, homeTeam: "USA", awayTeam: "PAR" } : undefined,
}));

// Slack alert (tally DB-failure path).
vi.mock("@/lib/slack", () => ({
  alertOps: vi.fn(async () => {}),
}));

// PIN guard for the stats route.
vi.mock("@/lib/auth", () => ({
  checkPin: vi.fn(() => false),
}));

// @/lib/format stays REAL — entrants masking goes through the actual maskPhone.

import { NextRequest } from "next/server";
import { GET as tallyGET } from "@/app/api/tally/route";
import { GET as entrantsGET } from "@/app/api/entrants/route";
import { GET as statsGET } from "@/app/api/admin/stats/route";
import * as db from "@/lib/db";
import * as slack from "@/lib/slack";
import { checkPin } from "@/lib/auth";

function get(path: string, headers?: Record<string, string>) {
  return new NextRequest(`http://localhost${path}`, { headers });
}

beforeEach(() => {
  hoisted.afterCbs.length = 0;
  vi.clearAllMocks();
  vi.mocked(db.getTally).mockResolvedValue({ matchId: 19, home: 0, away: 0, total: 0 });
  vi.mocked(db.getEntrants).mockResolvedValue([]);
  vi.mocked(db.voterStats).mockResolvedValue({
    totalVoteRows: 0,
    distinctPhonesAll: 0,
    distinctVoters: 0,
    realVoteRows: 0,
    gamesWithRealVotes: 0,
  });
  vi.mocked(checkPin).mockReturnValue(false);
});

// ── /api/tally ───────────────────────────────────────────────────────────────
describe("GET /api/tally", () => {
  it("400 when matchId is missing", async () => {
    const res = await tallyGET(get("/api/tally"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("valid matchId required");
    expect(db.getTally).not.toHaveBeenCalled();
  });

  it("400 when matchId is not a known match", async () => {
    const res = await tallyGET(get("/api/tally?matchId=0"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("valid matchId required");
    expect(db.getTally).not.toHaveBeenCalled();
  });

  it("returns {matchId, home, away, total} from getTally", async () => {
    vi.mocked(db.getTally).mockResolvedValue({ matchId: 19, home: 7, away: 3, total: 10 });
    const res = await tallyGET(get("/api/tally?matchId=19"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ matchId: 19, home: 7, away: 3, total: 10 });
    expect(vi.mocked(db.getTally).mock.calls[0][0]).toBe(19);
  });

  it("DB read failure → 200 with zeros (board never shows an error) + schedules an ops alert", async () => {
    vi.mocked(db.getTally).mockRejectedValue(new Error("supabase down"));
    const res = await tallyGET(get("/api/tally?matchId=19"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ matchId: 19, home: 0, away: 0, total: 0 });
    // alertOps is fired via after(), so it hasn't run until we flush.
    expect(slack.alertOps).not.toHaveBeenCalled();
    await flushAfter();
    expect(slack.alertOps).toHaveBeenCalledTimes(1);
  });
});

// ── /api/entrants ──────────────────────────────────────────────────────────--
describe("GET /api/entrants", () => {
  it("400 when matchId is missing/invalid", async () => {
    const res = await entrantsGET(get("/api/entrants"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("valid matchId required");
    expect(db.getEntrants).not.toHaveBeenCalled();
  });

  it("returns entrants in first-seen order with phones MASKED (last-4 only)", async () => {
    vi.mocked(db.getEntrants).mockResolvedValue([
      { firstName: "Yusuf", phone: "4693165859", side: "home" },
      { firstName: "Mona", phone: "2145550100", side: "away" },
    ]);
    const res = await entrantsGET(get("/api/entrants?matchId=19"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matchId).toBe(19);
    expect(body.count).toBe(2);
    // First-seen order preserved.
    expect(body.entrants.map((e: { firstName: string }) => e.firstName)).toEqual(["Yusuf", "Mona"]);
    // Phones masked to last-4 only (real maskPhone).
    expect(body.entrants[0]).toEqual({
      firstName: "Yusuf",
      phoneMasked: "(•••) •••-5859",
      side: "home",
    });
    expect(body.entrants[1].phoneMasked).toBe("(•••) •••-0100");
    // No raw 10-digit number leaks anywhere in the response payload.
    expect(JSON.stringify(body)).not.toMatch(/\d{7,}/);
    expect(JSON.stringify(body)).not.toContain("4693165859");
    expect(JSON.stringify(body)).not.toContain("2145550100");
  });

  it("empty pool → count 0, empty entrants", async () => {
    vi.mocked(db.getEntrants).mockResolvedValue([]);
    const res = await entrantsGET(get("/api/entrants?matchId=19"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ matchId: 19, count: 0, entrants: [] });
  });

  it("DB read failure → 200 with empty pool", async () => {
    vi.mocked(db.getEntrants).mockRejectedValue(new Error("supabase down"));
    const res = await entrantsGET(get("/api/entrants?matchId=19"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ matchId: 19, count: 0, entrants: [] });
  });
});

// ── /api/admin/stats ─────────────────────────────────────────────────────────
describe("GET /api/admin/stats", () => {
  it("401 without a valid PIN", async () => {
    vi.mocked(checkPin).mockReturnValue(false);
    const res = await statsGET(get("/api/admin/stats"));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
    expect(db.voterStats).not.toHaveBeenCalled();
  });

  it("returns the voterStats shape with a valid PIN", async () => {
    vi.mocked(checkPin).mockReturnValue(true);
    vi.mocked(db.voterStats).mockResolvedValue({
      totalVoteRows: 1200,
      distinctPhonesAll: 400,
      distinctVoters: 312,
      realVoteRows: 980,
      gamesWithRealVotes: 11,
    });
    const res = await statsGET(get("/api/admin/stats"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      totalVoteRows: 1200,
      distinctPhonesAll: 400,
      distinctVoters: 312,
      realVoteRows: 980,
      gamesWithRealVotes: 11,
    });
    expect(typeof body.at).toBe("string");
    expect(Number.isNaN(Date.parse(body.at))).toBe(false);
  });

  it("voterStats throws → 500 with the error message", async () => {
    vi.mocked(checkPin).mockReturnValue(true);
    vi.mocked(db.voterStats).mockRejectedValue(new Error("boom"));
    const res = await statsGET(get("/api/admin/stats"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("boom");
  });
});
