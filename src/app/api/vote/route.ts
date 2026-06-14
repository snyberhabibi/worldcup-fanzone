import { NextRequest, NextResponse, after } from "next/server";
import {
  appendVote,
  getVoteLog,
  tallyFromLog,
  getSession,
} from "@/lib/google-sheets";
import { cached, VOTELOG_TTL_MS, SESSION_TTL_MS } from "@/lib/cache";
import {
  getMatch,
  matchup as matchupOf,
  resolveTeam,
  isSlotOpen,
  isSlotEnded,
  slotGamesOf,
} from "@/lib/games";
import { normalizePhone, isValidUSPhone, sanitizeFirstName } from "@/lib/format";
import { sendSms, welcomeSms, repeatVoteSms } from "@/lib/quo";
import { notifyCrm, signupMessage, alertOps } from "@/lib/slack";
import type { VoteRecord, Side } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // headroom for the Sheets call chain + after() SMS under load

export async function POST(req: NextRequest) {
  // No vote-throttling by design: a single venue (100–200 attendees) all share
  // the café's one NAT IP, so any per-IP cap would 429 legitimate voters. The
  // real dedup is per-phone-per-game, enforced when tallying. (The PIN-guarded
  // /api/draw and /api/admin/verify keep their limits — those guard the console,
  // never customers.)
  try {
    const body = await req.json();
    const matchId = Number(body.matchId);
    const side: Side = body.side === "away" ? "away" : "home";
    const firstName = sanitizeFirstName(String(body.firstName || ""));
    const phone = normalizePhone(String(body.phone || ""));

    const match = getMatch(matchId);
    if (!match)
      return NextResponse.json({ error: "invalid matchId" }, { status: 400 });
    if (!firstName)
      return NextResponse.json({ error: "firstName required" }, { status: 400 });
    if (!isValidUSPhone(phone))
      return NextResponse.json({ error: "invalid phone" }, { status: 400 });

    // Voting for this game is closed if its slot is past halftime (auto), unless
    // the barista has a manual open/closed override on the pinned slot. The
    // manual "open" override never reaches past a slot's full-time end, so a
    // barista pinning a finished game to spin its raffle can't also collect
    // stale late votes into the pool.
    const now = new Date();
    const stored = await cached("session-row", SESSION_TTL_MS, () => getSession());
    const inPinnedSlot =
      stored?.pinnedMatchId != null &&
      slotGamesOf(stored.pinnedMatchId).some((g) => g.id === matchId);
    const open =
      inPinnedSlot && stored?.manualStatus && !isSlotEnded(matchId, now)
        ? stored.manualStatus === "open"
        : isSlotOpen(matchId, now);
    if (!open)
      return NextResponse.json({ error: "voting_closed" }, { status: 400 });

    const teamCode = side === "home" ? match.homeTeam : match.awayTeam;
    const teamName = resolveTeam(teamCode).name;
    const record: VoteRecord = {
      ts: now.toISOString(),
      matchId,
      matchup: matchupOf(match),
      side,
      teamCode,
      teamName,
      firstName,
      phone,
      consent: true, // voting = consent (disclosed at entry, opt-out via STOP)
    };

    await appendVote(record);

    // Under load the Sheets API throttles hard (multi-second reads), so we must
    // NOT read the full log fresh on every vote — that was making each vote take
    // 5-12s and cascading the whole app down. Read via the shared cache and fold
    // in THIS vote optimistically for the response; the board's tally polls
    // converge from the same cache within its TTL.
    const base = await cached("votelog", VOTELOG_TTL_MS, () => getVoteLog());
    const log = base.some(
      (v) => v.ts === record.ts && v.phone === record.phone && v.matchId === matchId
    )
      ? base
      : base.concat(record);
    const tally = tallyFromLog(log, matchId);

    // SMS policy — text at most once per voting slot per phone, never blocks:
    //  • first vote EVER  → full welcome SMS + Slack CRM "new sign-up" ping
    //  • returning voter  → short "your vote is IN" confirmation
    //  • extra games in the same slot (stacked voting) → no extra text
    const phoneVotes = log.filter((v) => v.phone === phone);
    const firstEver = phoneVotes.length === 1;
    const slotIds = slotGamesOf(matchId).map((g) => g.id);
    const firstInSlot = phoneVotes.filter((v) => slotIds.includes(v.matchId)).length === 1;
    if (firstInSlot) {
      after(async () => {
        // The KioskSms audit-row write was removed from the hot path to protect
        // the Sheets WRITE quota under load (it competed 1:1 with vote appends
        // and pushed a burst past ~60 writes/min). SMS still sends; the Slack
        // CRM ping still fires. Restore appendSmsLog from git if the audit trail
        // is needed once write throughput is no longer the bottleneck.
        if (firstEver) {
          await sendSms(phone, welcomeSms());
          await notifyCrm(
            signupMessage(firstName, phone, teamName, matchupOf(match))
          ).catch(() => {});
        } else {
          await sendSms(phone, repeatVoteSms(teamName));
        }
      });
    }

    return NextResponse.json({ ok: true, tally });
  } catch (e) {
    console.error("vote POST", e);
    after(() => alertOps("a vote failed to record (Sheets write)"));
    return NextResponse.json({ error: "failed to record vote" }, { status: 500 });
  }
}
