import { NextRequest, NextResponse, after } from "next/server";
import {
  appendVote,
  getTally,
  getSession,
  countPhoneVotes,
  countPhoneVotesInMatches,
} from "@/lib/db";
import { cached, SESSION_TTL_MS } from "@/lib/cache";
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

    // SMS gate — read counts BEFORE the upsert. With one row per phone+game, a
    // re-vote doesn't add a row, so post-upsert counts can't tell a new voter
    // from a re-voter; the prior count can. firstEver = no prior votes anywhere;
    // firstInSlot = no prior vote among the current slot's games (so stacked
    // voting + re-votes never re-trigger the text).
    const slotIds = slotGamesOf(matchId).map((g) => g.id);
    const [priorTotal, priorInSlot] = await Promise.all([
      countPhoneVotes(phone),
      countPhoneVotesInMatches(phone, slotIds),
    ]);

    await appendVote(record); // UPSERT — latest pick per phone+game, no write cap

    // Tally straight from Postgres, scoped + indexed to this match — fast even
    // under a 300-voter surge (no full-log read).
    const tally = await getTally(matchId);
    const firstEver = priorTotal === 0;
    const firstInSlot = priorInSlot === 0;
    if (firstInSlot) {
      after(async () => {
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
    after(() => alertOps("a vote failed to record (Supabase write)"));
    return NextResponse.json({ error: "failed to record vote" }, { status: 500 });
  }
}
