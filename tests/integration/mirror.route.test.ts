import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VoteRecord } from "@/types";

// ── Mocks ───────────────────────────────────────────────────────────────────
// Capture next/server's after() callbacks (the route only schedules one on the
// error path — alertOps). Keep NextRequest/NextResponse real so the handler can
// read headers and build JSON responses normally.
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
  getAllVotes: vi.fn(async () => [] as VoteRecord[]),
  getAllWinnersFull: vi.fn(async () => [] as unknown[]),
}));

// Google Sheets mirror writers — all stubbed; we assert what they're called with.
vi.mock("@/lib/google-sheets", () => ({
  mirrorVotesToSheet: vi.fn(async () => {}),
  mirrorWinnersToSheet: vi.fn(async () => {}),
  mirrorUniqueVotersToSheet: vi.fn(async () => {}),
}));

vi.mock("@/lib/slack", () => ({
  alertOps: vi.fn(async () => {}),
}));

import { GET } from "@/app/api/cron/mirror-to-sheet/route";
import * as db from "@/lib/db";
import * as sheets from "@/lib/google-sheets";
import * as slack from "@/lib/slack";

const SECRET = "s3cr3t-cron";

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/cron/mirror-to-sheet", {
    method: "GET",
    headers,
  }) as unknown as Parameters<typeof GET>[0];
}

// Minimal VoteRecord with the fields uniqueVoterRows reads (phone, firstName, ts).
function vote(phone: string, firstName: string, ts: string, matchId = 1): VoteRecord {
  return {
    ts,
    matchId,
    matchup: "USA vs PAR",
    side: "home",
    teamCode: "USA",
    teamName: "USA",
    firstName,
    phone,
    consent: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.afterCbs.length = 0;
  vi.unstubAllEnvs();
  vi.mocked(db.getAllVotes).mockResolvedValue([]);
  vi.mocked(db.getAllWinnersFull).mockResolvedValue([] as never);
});

describe("GET /api/cron/mirror-to-sheet — auth (fails closed)", () => {
  it("401 when CRON_SECRET is unset, even with a Bearer header", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(req({ authorization: "Bearer anything" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
    expect(db.getAllVotes).not.toHaveBeenCalled();
    expect(sheets.mirrorVotesToSheet).not.toHaveBeenCalled();
  });

  it("401 with a wrong Bearer token", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
    expect(sheets.mirrorUniqueVotersToSheet).not.toHaveBeenCalled();
  });

  it("401 when the Authorization header is missing entirely", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
  });
});

describe("GET /api/cron/mirror-to-sheet — authorized mirror", () => {
  it("with the correct Bearer secret → calls all three mirror fns and returns counts", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.mocked(db.getAllVotes).mockResolvedValue([
      vote("4693165859", "Yusuf", "2026-06-13T10:00:00.000Z"),
      vote("2145551234", "Sam", "2026-06-13T11:00:00.000Z"),
    ]);
    vi.mocked(db.getAllWinnersFull).mockResolvedValue([
      { ts: "2026-06-13T12:00:00.000Z", matchId: 1, matchup: "USA vs PAR", firstName: "Yusuf", phone: "4693165859" },
    ] as never);

    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // counts: 2 votes, 1 winner, 2 distinct voters
    expect(body.mirrored).toEqual({ votes: 2, winners: 1, uniqueVoters: 2 });

    expect(sheets.mirrorVotesToSheet).toHaveBeenCalledTimes(1);
    expect(sheets.mirrorWinnersToSheet).toHaveBeenCalledTimes(1);
    expect(sheets.mirrorUniqueVotersToSheet).toHaveBeenCalledTimes(1);

    // votes/winners passed straight through from the db reads
    expect(vi.mocked(sheets.mirrorVotesToSheet).mock.calls[0][0]).toHaveLength(2);
    expect(vi.mocked(sheets.mirrorWinnersToSheet).mock.calls[0][0]).toHaveLength(1);
  });

  it("computes distinct-voter rows: one row per phone, gamesVoted = count, sorted by first-seen", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    // Three distinct phones. Bravo (first seen 09:00) votes 3 games; Alpha
    // (first seen 10:00) votes 2; Charlie (first seen 11:30) votes 1.
    // Rows are intentionally out of ts order to prove the sort + min/max logic.
    vi.mocked(db.getAllVotes).mockResolvedValue([
      vote("4690000001", "Alpha", "2026-06-13T10:00:00.000Z", 1),
      vote("4690000002", "Bravo", "2026-06-13T09:00:00.000Z", 1),
      vote("4690000001", "Alpha", "2026-06-13T13:00:00.000Z", 2), // Alpha's later vote
      vote("4690000002", "Bravo", "2026-06-13T15:00:00.000Z", 2),
      vote("4690000002", "Bravo", "2026-06-13T12:00:00.000Z", 3), // Bravo middle vote
      vote("4690000003", "Charlie", "2026-06-13T11:30:00.000Z", 1),
    ]);

    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    expect((await res.json()).mirrored.uniqueVoters).toBe(3);

    const rows = vi.mocked(sheets.mirrorUniqueVotersToSheet).mock.calls[0][0];
    // One row per DISTINCT phone, in first-seen (earliest ts) order:
    // Bravo (09:00) → Alpha (10:00) → Charlie (11:30)
    expect(rows).toEqual([
      // [phone, firstName, gamesVoted, firstVoteAt, lastVoteAt]
      ["4690000002", "Bravo", "3", "2026-06-13T09:00:00.000Z", "2026-06-13T15:00:00.000Z"],
      ["4690000001", "Alpha", "2", "2026-06-13T10:00:00.000Z", "2026-06-13T13:00:00.000Z"],
      ["4690000003", "Charlie", "1", "2026-06-13T11:30:00.000Z", "2026-06-13T11:30:00.000Z"],
    ]);
  });

  it("handles the empty-data case (no votes / no winners)", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    expect((await res.json()).mirrored).toEqual({ votes: 0, winners: 0, uniqueVoters: 0 });
    expect(vi.mocked(sheets.mirrorUniqueVotersToSheet).mock.calls[0][0]).toEqual([]);
  });
});

describe("GET /api/cron/mirror-to-sheet — error path", () => {
  it("500 + schedules an ops alert when a mirror write throws", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.mocked(db.getAllVotes).mockResolvedValue([vote("4693165859", "Yusuf", "2026-06-13T10:00:00.000Z")]);
    vi.mocked(sheets.mirrorVotesToSheet).mockRejectedValueOnce(new Error("sheets down"));
    // Silence the route's console.error for this expected failure.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("mirror failed");

    // alertOps is fired inside an after() callback — not yet invoked.
    expect(slack.alertOps).not.toHaveBeenCalled();
    await flushAfter();
    expect(slack.alertOps).toHaveBeenCalledTimes(1);
    expect(vi.mocked(slack.alertOps).mock.calls[0][0]).toContain("sheets down");

    errSpy.mockRestore();
  });
});
