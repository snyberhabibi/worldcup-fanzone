import { NextRequest, NextResponse, after } from "next/server";
import {
  appendVote,
  getSession,
  countPhoneVotes,
  countPhoneVotesInMatches,
  hasSeenWelcome,
  appendSmsLog,
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
import { normalizePhone, isValidUSPhone, sanitizeFirstName, isTestPhone } from "@/lib/format";
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

    // No tally read here on purpose: no client consumes it (the board polls
    // /api/tally on its own, the kiosk/mobile only check res.ok), and a per-vote
    // getTally was a full per-match scan on the hot path — the dominant cost
    // under a concurrent surge. Dropping it keeps each vote to one upsert + two
    // indexed counts.
    const firstEver = priorTotal === 0;
    const firstInSlot = priorInSlot === 0;
    // Reserved/fictional 555 numbers never reach a handset → skip SMS + CRM
    // entirely (also lets us load-test with synthetic voters firing no texts).
    if (firstInSlot && !isTestPhone(phone)) {
      after(async () => {
        // Double gate on the welcome: vote-count says firstEver AND the durable
        // sms_log has no prior welcome for this phone. The sms_log check is the
        // safety net that survives any future reset of the votes table (e.g. the
        // empty-Supabase cutover that caused this incident) — without it, a
        // returning voter whose count reads 0 gets re-welcomed. We also LOG the
        // welcome here so the gate has data going forward (previously welcomes
        // were never logged, so the log was blind to them).
        if (firstEver && !(await hasSeenWelcome(phone))) {
          const r = await sendSms(phone, welcomeSms());
          const status = r.ok ? (r.skipped ? "dry-run" : "sent") : "failed";
          await appendSmsLog({ phone, type: "welcome", status, detail: r.error || "" }).catch(
            () => {}
          );
          if (r.ok) {
            await notifyCrm(
              signupMessage(firstName, phone, teamName, matchupOf(match))
            ).catch(() => {});
          }
        } else {
          await sendSms(phone, repeatVoteSms(teamName));
        }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("vote POST", e);
    after(() => alertOps("a vote failed to record (Supabase write)"));
    return NextResponse.json({ error: "failed to record vote" }, { status: 500 });
  }
}
