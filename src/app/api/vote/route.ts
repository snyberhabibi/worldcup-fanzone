import { NextRequest, NextResponse, after } from "next/server";
import {
  appendVote,
  getVoteLog,
  tallyFromLog,
  getSession,
  appendSmsLog,
} from "@/lib/google-sheets";
import { cached, bust } from "@/lib/cache";
import {
  getMatch,
  matchup as matchupOf,
  resolveTeam,
  isSlotOpen,
  slotGamesOf,
} from "@/lib/games";
import { normalizePhone, isValidUSPhone, sanitizeFirstName } from "@/lib/format";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { sendSms, welcomeSms } from "@/lib/quo";
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
    // the barista has a manual open/closed override on the pinned slot.
    const now = new Date();
    const stored = await cached("session-row", 1500, () => getSession());
    const inPinnedSlot =
      stored?.pinnedMatchId != null &&
      slotGamesOf(stored.pinnedMatchId).some((g) => g.id === matchId);
    const open =
      inPinnedSlot && stored?.manualStatus
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
    bust("votelog");

    const log = await getVoteLog();
    const tally = tallyFromLog(log, matchId);

    // First-ever vote for this phone = a new sign-up: welcome SMS + Slack CRM
    // ping. Deduped (repeat voters don't retrigger). Never blocks the vote.
    const firstEver = log.filter((v) => v.phone === phone).length === 1;
    if (firstEver) {
      after(async () => {
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
      });
    }

    return NextResponse.json({ ok: true, tally });
  } catch (e) {
    console.error("vote POST", e);
    return NextResponse.json({ error: "failed to record vote" }, { status: 500 });
  }
}
