import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────
// Capture next/server's after() callbacks so we can run + assert the SMS-log
// side effects (they normally fire post-response). Keep NextRequest/NextResponse
// real.
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
  getEntrants: vi.fn(async () => [] as { firstName: string; phone: string; side: string }[]),
  appendWinner: vi.fn(async () => {}),
  getAllWinners: vi.fn(async () => [] as { matchId: number; phone: string }[]),
  getSession: vi.fn(async () => null),
  setSession: vi.fn(async () => {}),
  appendSmsLog: vi.fn(async () => {}),
}));

// Cache: bust is a noop.
vi.mock("@/lib/cache", () => ({
  bust: vi.fn(),
}));

// Match catalog — a positive integer id is a real match.
vi.mock("@/lib/games", () => ({
  getMatch: (id: number) =>
    Number.isFinite(id) && id > 0 ? { id, homeTeam: "USA", awayTeam: "PAR" } : undefined,
  matchup: (m: { homeTeam: string; awayTeam: string }) => `${m.homeTeam} vs ${m.awayTeam}`,
}));

vi.mock("@/lib/quo", () => ({
  sendSms: vi.fn(async () => ({ ok: true })),
  winnerSms: () => "WINNER_COPY",
}));

vi.mock("@/lib/slack", () => ({
  alertOps: vi.fn(async () => {}),
}));

vi.mock("@/lib/auth", () => ({
  checkPin: vi.fn(() => true),
}));

vi.mock("@/lib/ratelimit", () => ({
  rateLimit: vi.fn(() => true),
  clientIp: vi.fn(() => "ip"),
}));

import { POST } from "@/app/api/draw/route";
import * as db from "@/lib/db";
import * as quo from "@/lib/quo";
import * as slack from "@/lib/slack";
import { checkPin } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

function req(body: unknown) {
  return new Request("http://localhost/api/draw", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

// Three entrants in first-seen order. Indexes 0,1,2 → the winnerIndex returned
// to the board is the pick's position in THIS full ordering.
const ENTRANTS = [
  { firstName: "Ana", phone: "4693165859", side: "home" },
  { firstName: "Ben", phone: "2145551234", side: "away" }, // reserved 555
  { firstName: "Cam", phone: "9725550000", side: "home" }, // reserved 555
];

beforeEach(() => {
  hoisted.afterCbs.length = 0;
  vi.restoreAllMocks();
  vi.mocked(checkPin).mockReturnValue(true);
  vi.mocked(rateLimit).mockReturnValue(true);
  vi.mocked(db.getEntrants).mockResolvedValue(ENTRANTS);
  vi.mocked(db.getAllWinners).mockResolvedValue([]);
  vi.mocked(db.getSession).mockResolvedValue(null);
  vi.mocked(db.appendWinner).mockResolvedValue(undefined);
  vi.mocked(db.setSession).mockResolvedValue(undefined);
  vi.mocked(db.appendSmsLog).mockResolvedValue(undefined);
  vi.mocked(quo.sendSms).mockResolvedValue({ ok: true });
});

describe("POST /api/draw — auth + rate limit", () => {
  it("401 when checkPin is false", async () => {
    vi.mocked(checkPin).mockReturnValue(false);
    const res = await POST(req({ matchId: 19 }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
    expect(db.getEntrants).not.toHaveBeenCalled();
  });

  it("429 when rateLimit is false", async () => {
    vi.mocked(rateLimit).mockReturnValue(false);
    const res = await POST(req({ matchId: 19 }));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("too_many_requests");
    expect(db.getEntrants).not.toHaveBeenCalled();
  });
});

describe("POST /api/draw — validation + empty states", () => {
  it("400 on invalid matchId", async () => {
    const res = await POST(req({ matchId: 0 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid matchId");
    expect(db.getEntrants).not.toHaveBeenCalled();
  });

  it("no_entrants when getEntrants is empty", async () => {
    vi.mocked(db.getEntrants).mockResolvedValue([]);
    const res = await POST(req({ matchId: 19 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, reason: "no_entrants" });
    expect(db.appendWinner).not.toHaveBeenCalled();
  });

  it("all_won when every entrant already won this game", async () => {
    vi.mocked(db.getAllWinners).mockResolvedValue(
      ENTRANTS.map((e) => ({ matchId: 19, phone: e.phone }))
    );
    const res = await POST(req({ matchId: 19 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, reason: "all_won" });
    expect(db.appendWinner).not.toHaveBeenCalled();
    expect(quo.sendSms).not.toHaveBeenCalled();
  });
});

describe("POST /api/draw — valid draw", () => {
  it("picks an eligible entrant, logs the winner, broadcasts to the board", async () => {
    // Force the pick to the first eligible entrant (Ana, index 0).
    vi.spyOn(Math, "random").mockReturnValue(0);
    const res = await POST(req({ matchId: 19 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.draw).toMatchObject({
      matchId: 19,
      winnerIndex: 0,
      firstName: "Ana",
      phoneMasked: "(•••) •••-5859",
      poolSize: 3,
    });
    expect(typeof json.draw.nonce).toBe("string");

    expect(db.appendWinner).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.appendWinner).mock.calls[0][0]).toMatchObject({
      matchId: 19,
      matchup: "USA vs PAR",
      firstName: "Ana",
      phone: "4693165859",
    });

    expect(db.setSession).toHaveBeenCalledTimes(1);
    const session = vi.mocked(db.setSession).mock.calls[0][0];
    expect(session.lastDraw).toMatchObject({
      matchId: 19,
      winnerIndex: 0,
      phoneMasked: "(•••) •••-5859",
      poolSize: 3,
    });
    expect(typeof session.lastDraw?.nonce).toBe("string");
  });

  it("the chosen winner is always one not already won this game", async () => {
    // Ana already won game 19 → only Ben & Cam are eligible.
    vi.mocked(db.getAllWinners).mockResolvedValue([{ matchId: 19, phone: "4693165859" }]);
    const res = await POST(req({ matchId: 19 }));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(["2145551234", "9725550000"]).toContain(
      vi.mocked(db.appendWinner).mock.calls[0][0].phone
    );
    expect(json.draw.firstName).not.toBe("Ana");
  });

  it("winnerIndex is the pick's position in the FULL first-seen order, not the eligible subset", async () => {
    // Ana (index 0) already won → eligible = [Ben, Cam]. Pick the first eligible
    // (Ben), whose full-order index is 1 — NOT 0.
    vi.mocked(db.getAllWinners).mockResolvedValue([{ matchId: 19, phone: "4693165859" }]);
    vi.spyOn(Math, "random").mockReturnValue(0);
    const res = await POST(req({ matchId: 19 }));
    const json = await res.json();
    expect(json.draw.firstName).toBe("Ben");
    expect(json.draw.winnerIndex).toBe(1);
    expect(json.draw.poolSize).toBe(3);
  });
});

describe("POST /api/draw — winner SMS gating", () => {
  it("texts the winner once (status sent) when they have NOT won anything ever", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // Ana — real phone, never won
    const res = await POST(req({ matchId: 19 }));
    const json = await res.json();
    expect(json.smsStatus).toBe("sent");
    expect(quo.sendSms).toHaveBeenCalledTimes(1);
    expect(quo.sendSms).toHaveBeenCalledWith("4693165859", "WINNER_COPY");
    await flushAfter();
    expect(db.appendSmsLog).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "4693165859", type: "winner", status: "sent" })
    );
  });

  it("skips the winner SMS when the pick already won SOMETHING before (different game)", async () => {
    // Ana already won game 7 (a different game). She's still eligible for game 19
    // (wonThisGame only blocks the same matchId), but must NOT be re-texted.
    vi.mocked(db.getAllWinners).mockResolvedValue([{ matchId: 7, phone: "4693165859" }]);
    vi.spyOn(Math, "random").mockReturnValue(0); // Ana
    const res = await POST(req({ matchId: 19 }));
    const json = await res.json();
    expect(json.draw.firstName).toBe("Ana");
    expect(json.smsStatus).toBe("skipped");
    expect(quo.sendSms).not.toHaveBeenCalled();
    await flushAfter();
    expect(db.appendSmsLog).not.toHaveBeenCalled();
  });

  it("does NOT text a reserved 555 winner (smsStatus skipped, load-test safe)", async () => {
    // Single reserved-555 entrant → guaranteed pick.
    vi.mocked(db.getEntrants).mockResolvedValue([
      { firstName: "Ben", phone: "2145551234", side: "away" },
    ]);
    const res = await POST(req({ matchId: 19 }));
    const json = await res.json();
    expect(json.draw.firstName).toBe("Ben");
    expect(json.smsStatus).toBe("skipped");
    expect(quo.sendSms).not.toHaveBeenCalled();
    expect(db.appendWinner).toHaveBeenCalledTimes(1); // win still recorded
    await flushAfter();
    expect(db.appendSmsLog).not.toHaveBeenCalled();
  });

  it("reports smsStatus failed when the send fails (and logs failed)", async () => {
    vi.mocked(quo.sendSms).mockResolvedValue({ ok: false, error: "http-400" });
    vi.spyOn(Math, "random").mockReturnValue(0); // Ana — real phone, never won
    const res = await POST(req({ matchId: 19 }));
    const json = await res.json();
    expect(json.smsStatus).toBe("failed");
    expect(quo.sendSms).toHaveBeenCalledTimes(1);
    await flushAfter();
    expect(db.appendSmsLog).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "4693165859", type: "winner", status: "failed", detail: "http-400" })
    );
  });
});

describe("POST /api/draw — failure path", () => {
  it("500 + alertOps when a DB write throws", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.mocked(db.appendWinner).mockRejectedValue(new Error("supabase down"));
    const res = await POST(req({ matchId: 19 }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("failed to draw");
    await flushAfter();
    expect(slack.alertOps).toHaveBeenCalledTimes(1);
  });
});
