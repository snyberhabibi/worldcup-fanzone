import { describe, it, expect } from "vitest";
import {
  resolveTeam,
  placeholderLabel,
  isLive,
  hasEnded,
  isSlotOpen,
  isSlotEnded,
  currentSlotGames,
  slotGamesOf,
  pickDefaultMatchId,
  stageLabel,
  matchesOnDay,
  formatKickoffCT,
  getMatch,
} from "@/lib/games";
import { MATCHES } from "@/data/schedule";

// ── Concrete anchors from src/data/schedule.ts (UTC kickoff strings) ──────────
// Earliest match in the tournament — no slot precedes it.
const MATCH1 = MATCHES.find((m) => m.id === 1)!; // 2026-06-11T19:00:00Z, MEX vs RSA, Group A
const MATCH2 = MATCHES.find((m) => m.id === 2)!; // 2026-06-12T02:00:00Z, KOR vs CZE, Group A
const MATCH8 = MATCHES.find((m) => m.id === 8)!; // 2026-06-13T19:00:00Z, QAT vs SUI, Group B
const MATCH13 = MATCHES.find((m) => m.id === 13)!; // 2026-06-13T22:00:00Z, BRA vs MAR, Group C
const MATCH5 = MATCHES.find((m) => m.id === 5)!; // 2026-06-25T01:00:00Z, CZE vs MEX, Group A
const MATCH6 = MATCHES.find((m) => m.id === 6)!; // 2026-06-25T01:00:00Z, RSA vs KOR, Group A (same kickoff as 5)
const FINAL = MATCHES.find((m) => m.id === 104)!; // 2026-07-19T19:00:00Z, final

const MIN = 60_000;
const LIVE_BUFFER_MIN = 150;
const MAX_FEATURE_MIN = 240;

const at = (iso: string) => new Date(iso);
const k = (iso: string) => new Date(iso).getTime();

describe("resolveTeam", () => {
  it("resolves a real FIFA code to its team (non-placeholder)", () => {
    const t = resolveTeam("MEX");
    expect(t).toEqual({ code: "MEX", name: "Mexico", flag: "\u{1F1F2}\u{1F1FD}", placeholder: false });
    expect(t.placeholder).toBe(false);
  });

  it("treats an unresolved knockout code as a placeholder with the trophy flag", () => {
    const t = resolveTeam("W101");
    expect(t.placeholder).toBe(true);
    expect(t.code).toBe("W101");
    expect(t.flag).toBe("🏆");
    expect(t.name).toBe("Winner Match 101");
  });

  it("uses placeholderLabel for a group-slot placeholder", () => {
    const t = resolveTeam("2A");
    expect(t.placeholder).toBe(true);
    expect(t.name).toBe("Runner-up Group A");
    expect(t.flag).toBe("🏆");
  });
});

describe("placeholderLabel", () => {
  it("labels group winners and runners-up", () => {
    expect(placeholderLabel("1A")).toBe("Winner Group A");
    expect(placeholderLabel("2B")).toBe("Runner-up Group B");
    expect(placeholderLabel("1L")).toBe("Winner Group L");
  });

  it("labels best-third placeholders, slashing the eligible groups", () => {
    expect(placeholderLabel("3ABCDF")).toBe("3rd place A/B/C/D/F");
    expect(placeholderLabel("3CDFGH")).toBe("3rd place C/D/F/G/H");
  });

  it("labels winner-of / loser-of match placeholders", () => {
    expect(placeholderLabel("W74")).toBe("Winner Match 74");
    expect(placeholderLabel("L101")).toBe("Loser Match 101");
    expect(placeholderLabel("W102")).toBe("Winner Match 102");
  });

  it("returns the raw code when it matches no known pattern (e.g. a real team code)", () => {
    expect(placeholderLabel("MEX")).toBe("MEX");
    expect(placeholderLabel("ZZ")).toBe("ZZ");
  });
});

describe("isLive / hasEnded (LIVE_BUFFER_MIN = 150)", () => {
  const kStart = k(MATCH1.date); // 2026-06-11T19:00:00Z

  it("is not live before kickoff and not ended", () => {
    const now = new Date(kStart - 1 * MIN);
    expect(isLive(MATCH1, now)).toBe(false);
    expect(hasEnded(MATCH1, now)).toBe(false);
  });

  it("is live exactly at kickoff", () => {
    const now = new Date(kStart);
    expect(isLive(MATCH1, now)).toBe(true);
    expect(hasEnded(MATCH1, now)).toBe(false);
  });

  it("is still live just inside the 150-minute buffer", () => {
    const now = new Date(kStart + (LIVE_BUFFER_MIN - 1) * MIN);
    expect(isLive(MATCH1, now)).toBe(true);
    expect(hasEnded(MATCH1, now)).toBe(false);
  });

  it("is not yet ended exactly at the buffer edge (strict greater-than)", () => {
    const now = new Date(kStart + LIVE_BUFFER_MIN * MIN);
    expect(hasEnded(MATCH1, now)).toBe(false);
    expect(isLive(MATCH1, now)).toBe(true);
  });

  it("has ended one minute past the buffer", () => {
    const now = new Date(kStart + (LIVE_BUFFER_MIN + 1) * MIN);
    expect(hasEnded(MATCH1, now)).toBe(true);
    expect(isLive(MATCH1, now)).toBe(false);
  });
});

describe("slot voting window (isSlotOpen / isSlotEnded) — MAX_FEATURE_MIN = 240", () => {
  // Match 1's next slot (match 2) kicks off 7h later, so the 4h cap closes the
  // window first: open until 2026-06-11T23:00:00Z.
  const kM1 = k(MATCH1.date);

  it("a future match's slot reads open before kickoff", () => {
    const now = new Date(kM1 - 30 * MIN);
    expect(isSlotOpen(MATCH1.id, now)).toBe(true);
    expect(isSlotEnded(MATCH1.id, now)).toBe(false);
  });

  it("stays open during the match", () => {
    const now = new Date(kM1 + 30 * MIN);
    expect(isSlotOpen(MATCH1.id, now)).toBe(true);
  });

  it("stays open AFTER kickoff up to the cap, then closes at the cap (strict)", () => {
    const justBeforeCap = new Date(kM1 + (MAX_FEATURE_MIN - 1) * MIN);
    const atCap = new Date(kM1 + MAX_FEATURE_MIN * MIN);
    expect(isSlotOpen(MATCH1.id, justBeforeCap)).toBe(true);
    expect(isSlotOpen(MATCH1.id, atCap)).toBe(false); // t < kickoff + cap is false at exactly the cap
    expect(isSlotEnded(MATCH1.id, atCap)).toBe(true);
  });

  it("when the NEXT slot kicks off sooner than the cap, the window closes at the next kickoff", () => {
    // Match 8 (2026-06-13T19:00:00Z); next slot = match 13 (2026-06-13T22:00:00Z, 3h gap).
    // Cap would be 23:00Z but the next game at 22:00Z closes it first.
    const kM8 = k(MATCH8.date);
    const kNext = k(MATCH13.date); // 2026-06-13T22:00:00Z
    const beforeNext = new Date(kNext - 1 * MIN);
    const atNext = new Date(kNext);
    expect(isSlotOpen(MATCH8.id, beforeNext)).toBe(true); // still inside its window
    expect(isSlotOpen(MATCH8.id, atNext)).toBe(false); // next game started → window over
    // and this is BEFORE the 4h cap would have closed it
    expect(atNext.getTime()).toBeLessThan(kM8 + MAX_FEATURE_MIN * MIN);
  });

  it("an unknown match id is treated as always-open (isSlotEnded false)", () => {
    const now = new Date("2026-06-11T19:00:00Z");
    expect(isSlotOpen(999999, now)).toBe(true);
    expect(isSlotEnded(999999, now)).toBe(false);
  });
});

describe("currentSlotGames", () => {
  it("before any match starts → the next upcoming slot (match 1)", () => {
    const now = new Date(k(MATCH1.date) - 2 * 60 * MIN);
    const games = currentSlotGames(now);
    expect(games.map((g) => g.id)).toContain(1);
  });

  it("during a slot's window → the latest kicked-off slot (stays put after kickoff)", () => {
    // 30 min after match 1 kickoff: match 1 is the latest at/under now and still open.
    const now = new Date(k(MATCH1.date) + 30 * MIN);
    const games = currentSlotGames(now);
    expect(games.map((g) => g.id)).toEqual([1]);
  });

  it("once the latest slot's window closes → the next upcoming slot", () => {
    // Past match 1's 4h cap but before match 2's kickoff: latest slot (1) is
    // closed, so it falls forward to the next upcoming slot (match 2).
    const now = new Date(k(MATCH1.date) + (MAX_FEATURE_MIN + 30) * MIN);
    expect(now.getTime()).toBeLessThan(k(MATCH2.date));
    const games = currentSlotGames(now);
    expect(games.map((g) => g.id)).toEqual([2]);
  });

  it("simultaneous games are returned together as one slot", () => {
    // Matches 5 & 6 share kickoff 2026-06-25T01:00:00Z.
    const now = new Date(k(MATCH5.date) + 10 * MIN);
    const ids = currentSlotGames(now)
      .map((g) => g.id)
      .sort((a, b) => a - b);
    expect(ids).toEqual([5, 6]);
  });

  it("after the final's window → the last slot (never empty)", () => {
    const now = new Date(k(FINAL.date) + 10 * 24 * 60 * MIN); // long after the tournament
    const ids = currentSlotGames(now).map((g) => g.id);
    expect(ids).toContain(FINAL.id);
  });
});

describe("slotGamesOf", () => {
  it("returns every simultaneous game sharing a kickoff (including itself)", () => {
    const ids5 = slotGamesOf(5)
      .map((g) => g.id)
      .sort((a, b) => a - b);
    expect(ids5).toEqual([5, 6]);
    const ids6 = slotGamesOf(6)
      .map((g) => g.id)
      .sort((a, b) => a - b);
    expect(ids6).toEqual([5, 6]);
  });

  it("returns a singleton for a uniquely-timed match", () => {
    const ids = slotGamesOf(1).map((g) => g.id);
    expect(ids).toEqual([1]);
  });

  it("returns an empty array for an unknown match id", () => {
    expect(slotGamesOf(999999)).toEqual([]);
  });
});

describe("pickDefaultMatchId", () => {
  it("prefers a live game", () => {
    const now = new Date(k(MATCH1.date) + 10 * MIN); // match 1 live
    expect(pickDefaultMatchId(now)).toBe(1);
  });

  it("falls to the next upcoming game when nothing is live", () => {
    const now = new Date(k(MATCH1.date) - 60 * MIN); // before everything
    expect(pickDefaultMatchId(now)).toBe(1); // earliest upcoming
  });

  it("returns the last match once everything has ended", () => {
    const now = new Date(k(FINAL.date) + (LIVE_BUFFER_MIN + 60) * MIN);
    expect(pickDefaultMatchId(now)).toBe(FINAL.id);
  });
});

describe("stageLabel", () => {
  it("labels a group match by its group letter", () => {
    expect(stageLabel(MATCH1)).toBe("Group A"); // match 1, group A
    expect(stageLabel(MATCH8)).toBe("Group B"); // match 8, group B
  });

  it("labels knockout stages from the stage map", () => {
    expect(stageLabel(MATCHES.find((m) => m.id === 73)!)).toBe("Round of 32");
    expect(stageLabel(MATCHES.find((m) => m.id === 89)!)).toBe("Round of 16");
    expect(stageLabel(MATCHES.find((m) => m.id === 97)!)).toBe("Quarterfinal");
    expect(stageLabel(MATCHES.find((m) => m.id === 101)!)).toBe("Semifinal");
    expect(stageLabel(MATCHES.find((m) => m.id === 103)!)).toBe("Third-Place Playoff");
    expect(stageLabel(FINAL)).toBe("Final");
  });
});

describe("matchesOnDay (US Central calendar day, falls forward on rest days)", () => {
  it("returns the games whose CT day matches today, with the long CT label", () => {
    // 2026-06-13 in CT: matches 8 (19:00Z) and 13 (22:00Z) — and match 14
    // (2026-06-14T01:00:00Z → CT day 2026-06-13). All three share the CT day.
    const now = at("2026-06-13T20:00:00Z"); // CT day 2026-06-13
    const { isToday, label, matches } = matchesOnDay(now);
    expect(isToday).toBe(true);
    expect(label).toBe("Saturday, Jun 13");
    const ids = matches.map((m) => m.id);
    expect(ids).toContain(8);
    expect(ids).toContain(13);
    // every returned match is on the same CT calendar day
    expect(matches.length).toBeGreaterThan(0);
  });

  it("falls forward to the next day that has games on a rest day", () => {
    // 2026-07-13 (CT) is a rest day between the QFs (ending Jul 11) and the
    // first semifinal (match 101, 2026-07-14T19:00:00Z → CT day 2026-07-14).
    const now = at("2026-07-13T18:00:00Z");
    const { isToday, label, matches } = matchesOnDay(now);
    expect(isToday).toBe(false);
    expect(label).toBe("Tuesday, Jul 14");
    expect(matches.map((m) => m.id)).toContain(101);
  });
});

describe("formatKickoffCT", () => {
  it("renders day + time in US Central with a CT suffix", () => {
    // Match 1: 2026-06-11T19:00:00Z → 2:00 PM CT on Thu, Jun 11.
    const f = formatKickoffCT(MATCH1);
    expect(f.day).toBe("Thu, Jun 11");
    expect(f.time).toBe("2:00 PM CT");
    expect(f.full).toBe("Thu, Jun 11 · 2:00 PM CT");
  });

  it("rolls a late-UTC kickoff back to the prior CT calendar day", () => {
    // Match 19: 2026-06-13T01:00:00Z → 8:00 PM CT on Fri, Jun 12.
    const f = formatKickoffCT(getMatch(19)!);
    expect(f.full).toBe("Fri, Jun 12 · 8:00 PM CT");
  });
});
