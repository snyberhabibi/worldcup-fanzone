import { NextRequest, NextResponse, after } from "next/server";
import {
  appendVote,
  getVoteLog,
  tallyFromLog,
  getSession,
  appendSmsLog,
} from "@/lib/google-sheets";
import { cached } from "@/lib/cache";
import {
  getMatch,
  matchup as matchupOf,
  resolveTeam,
  isSlotOpen,
  isSlotEnded,
  slotGamesOf,
} from "@/lib/games";
import { normalizePhone, isValidUSPhone, sanitizeFirstName } from "@/lib/format";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { sendSms, welcomeSms, repeatVoteSms } from "@/lib/quo";
import { notifyCrm, signupMessage } from "@/lib/slack";
import type { VoteRecord, Side } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!rateLimit(`vote:${clientIp(req)}`, 15, 60_000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
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
    const stored = await cached("session-row", 1500, () => getSession());
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

    // Read the log fresh ONCE for this response — it must reflect the row we
    // just appended so the returned tally and the once-per-slot SMS gate below
    // are accurate (esp. stacked voting, where a phone votes for 2+ games in
    // seconds). We intentionally do NOT bust the shared "votelog" cache here:
    // the projector's /api/tally and /api/entrants polls reconcile within their
    // own ~3s TTL, so a single goal-celebration burst no longer forces every
    // board poll into an uncached full-sheet re-read on top of the vote writes.
    const log = await getVoteLog();
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
        if (firstEver) {
          const r = await sendSms(phone, welcomeSms());
          await appendSmsLog({
            ts: new Date().toISOString(),
            phone,
            type: "welcome",
            status: r.ok ? (r.skipped ? "dry-run" : "sent") : "failed",
            detail: r.error || "",
          }).catch(() => {});
          await notifyCrm(
            signupMessage(firstName, phone, teamName, matchupOf(match))
          ).catch(() => {});
        } else {
          const r = await sendSms(phone, repeatVoteSms(teamName));
          await appendSmsLog({
            ts: new Date().toISOString(),
            phone,
            type: "repeat",
            status: r.ok ? (r.skipped ? "dry-run" : "sent") : "failed",
            detail: r.error || "",
          }).catch(() => {});
        }
      });
    }

    return NextResponse.json({ ok: true, tally });
  } catch (e) {
    console.error("vote POST", e);
    return NextResponse.json({ error: "failed to record vote" }, { status: 500 });
  }
}
