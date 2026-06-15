import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────
// Capture next/server's after() callbacks so we can run + assert the SMS side
// effects (they normally fire post-response). Keep NextRequest/NextResponse real.
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
  appendVote: vi.fn(async () => {}),
  getSession: vi.fn(async () => null),
  countPhoneVotes: vi.fn(async () => 0),
  countPhoneVotesInMatches: vi.fn(async () => 0),
  hasSeenWelcome: vi.fn(async () => false),
  appendSmsLog: vi.fn(async () => {}),
}));

// Cache: call straight through (no memoization) for deterministic tests.
vi.mock("@/lib/cache", () => ({
  cached: (_k: string, _ttl: number, fn: () => unknown) => fn(),
  SESSION_TTL_MS: 5000,
}));

// Slot/voting logic — controlled per test (the math itself is unit-tested separately).
vi.mock("@/lib/games", () => ({
  getMatch: (id: number) =>
    Number.isFinite(id) && id > 0 ? { id, homeTeam: "USA", awayTeam: "PAR" } : undefined,
  matchup: (m: { homeTeam: string; awayTeam: string }) => `${m.homeTeam} vs ${m.awayTeam}`,
  resolveTeam: (code: string) => ({ code, name: code, flag: "🏳️", placeholder: false }),
  isSlotOpen: vi.fn(() => true),
  isSlotEnded: vi.fn(() => false),
  slotGamesOf: (id: number) => [{ id }],
}));

vi.mock("@/lib/quo", () => ({
  sendSms: vi.fn(async () => ({ ok: true })),
  welcomeSms: () => "WELCOME_COPY",
  repeatVoteSms: (team: string) => `REPEAT_${team}`,
}));

vi.mock("@/lib/slack", () => ({
  notifyCrm: vi.fn(async () => ({ ok: true })),
  signupMessage: () => "SIGNUP_MSG",
  alertOps: vi.fn(async () => {}),
}));

import { POST } from "@/app/api/vote/route";
import * as db from "@/lib/db";
import * as quo from "@/lib/quo";
import * as slack from "@/lib/slack";
import { isSlotOpen, isSlotEnded } from "@/lib/games";

function req(body: unknown) {
  return new Request("http://localhost/api/vote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}
const VALID = { matchId: 19, side: "home", firstName: "Yusuf", phone: "4693165859" };

beforeEach(() => {
  hoisted.afterCbs.length = 0;
  vi.mocked(isSlotOpen).mockReturnValue(true);
  vi.mocked(db.countPhoneVotes).mockResolvedValue(0);
  vi.mocked(db.countPhoneVotesInMatches).mockResolvedValue(0);
  vi.mocked(db.hasSeenWelcome).mockResolvedValue(false);
  vi.mocked(quo.sendSms).mockResolvedValue({ ok: true });
});

describe("POST /api/vote — validation", () => {
  it("400 on invalid matchId", async () => {
    const res = await POST(req({ ...VALID, matchId: 0 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid matchId");
  });
  it("400 on missing firstName", async () => {
    const res = await POST(req({ ...VALID, firstName: "" }));
    expect(res.status).toBe(400);
  });
  it("400 on invalid phone", async () => {
    const res = await POST(req({ ...VALID, phone: "123" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid phone");
  });
  it("400 voting_closed when the slot is closed", async () => {
    vi.mocked(isSlotOpen).mockReturnValue(false);
    const res = await POST(req(VALID));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("voting_closed");
    expect(db.appendVote).not.toHaveBeenCalled();
  });
});

describe("POST /api/vote — recording", () => {
  it("records the vote and returns ok", async () => {
    const res = await POST(req(VALID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(db.appendVote).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.appendVote).mock.calls[0][0]).toMatchObject({
      matchId: 19,
      side: "home",
      phone: "4693165859",
      firstName: "Yusuf",
      consent: true,
    });
  });
  it("reads the SMS-gate counts BEFORE the upsert (re-welcome guard)", async () => {
    await POST(req(VALID));
    const order = vi.mocked(db.countPhoneVotes).mock.invocationCallOrder[0];
    const upsert = vi.mocked(db.appendVote).mock.invocationCallOrder[0];
    expect(order).toBeLessThan(upsert);
  });
});

describe("POST /api/vote — SMS gating", () => {
  it("first-ever voter → welcome SMS + CRM signup", async () => {
    await POST(req(VALID));
    await flushAfter();
    expect(quo.sendSms).toHaveBeenCalledWith("4693165859", "WELCOME_COPY");
    expect(slack.notifyCrm).toHaveBeenCalledTimes(1);
    expect(db.appendSmsLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: "welcome", status: "sent" })
    );
  });

  it("returning voter, first in this slot → repeat-vote SMS, no welcome/CRM", async () => {
    vi.mocked(db.countPhoneVotes).mockResolvedValue(3); // voted before
    await POST(req(VALID));
    await flushAfter();
    expect(quo.sendSms).toHaveBeenCalledWith("4693165859", "REPEAT_USA");
    expect(slack.notifyCrm).not.toHaveBeenCalled();
  });

  it("already voted in this slot → no SMS at all (re-vote / stacked)", async () => {
    vi.mocked(db.countPhoneVotesInMatches).mockResolvedValue(2);
    await POST(req(VALID));
    await flushAfter();
    expect(quo.sendSms).not.toHaveBeenCalled();
    expect(slack.notifyCrm).not.toHaveBeenCalled();
  });

  it("reserved 555 number → never texts or CRMs (load-test safe)", async () => {
    await POST(req({ ...VALID, phone: "4695550123" }));
    await flushAfter();
    expect(db.appendVote).toHaveBeenCalledTimes(1); // vote still records
    expect(quo.sendSms).not.toHaveBeenCalled();
    expect(slack.notifyCrm).not.toHaveBeenCalled();
  });

  it("firstEver count but already welcomed (sms_log) → NO re-welcome (the bug we fixed)", async () => {
    vi.mocked(db.hasSeenWelcome).mockResolvedValue(true);
    await POST(req(VALID));
    await flushAfter();
    expect(quo.sendSms).toHaveBeenCalledWith("4693165859", "REPEAT_USA");
    expect(quo.sendSms).not.toHaveBeenCalledWith("4693165859", "WELCOME_COPY");
    expect(slack.notifyCrm).not.toHaveBeenCalled();
  });

  it("welcome SMS fails → logs failed and does NOT post to CRM", async () => {
    vi.mocked(quo.sendSms).mockResolvedValue({ ok: false, error: "http-400" });
    await POST(req(VALID));
    await flushAfter();
    expect(slack.notifyCrm).not.toHaveBeenCalled();
    expect(db.appendSmsLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: "welcome", status: "failed" })
    );
  });
});

describe("POST /api/vote — barista manual override on the pinned slot", () => {
  // session pins match 19 (== the slot game being voted, since slotGamesOf mock
  // returns [{id: pinnedMatchId}]); manualStatus then decides open/closed —
  // UNLESS the slot has ended, in which case the override is ignored.
  const pinned = (manualStatus: "open" | "closed") => ({
    pinnedMatchId: 19,
    manualStatus,
    pinSticky: true,
    updatedAt: "",
    lastDraw: null,
  });

  it("manual 'closed' override rejects the vote even when the clock says open", async () => {
    vi.mocked(db.getSession).mockResolvedValue(pinned("closed"));
    vi.mocked(isSlotEnded).mockReturnValue(false);
    vi.mocked(isSlotOpen).mockReturnValue(true); // clock would allow it
    const res = await POST(req(VALID));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("voting_closed");
    expect(db.appendVote).not.toHaveBeenCalled();
  });

  it("manual 'open' is IGNORED once the slot has ended → no stale late votes", async () => {
    vi.mocked(db.getSession).mockResolvedValue(pinned("open"));
    vi.mocked(isSlotEnded).mockReturnValue(true); // slot is over (pinned only to spin its raffle)
    vi.mocked(isSlotOpen).mockReturnValue(false); // clock agrees it's closed
    const res = await POST(req(VALID));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("voting_closed");
  });

  it("manual 'open' mid-slot accepts the vote", async () => {
    vi.mocked(db.getSession).mockResolvedValue(pinned("open"));
    vi.mocked(isSlotEnded).mockReturnValue(false);
    vi.mocked(isSlotOpen).mockReturnValue(false); // clock alone would close it; override opens it
    const res = await POST(req(VALID));
    expect(res.status).toBe(200);
    expect(db.appendVote).toHaveBeenCalledTimes(1);
  });
});
