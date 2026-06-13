import { NextRequest, NextResponse, after } from "next/server";
import {
  appendVote,
  getVoteLog,
  tallyFromLog,
  getSession,
  appendSmsLog,
} from "@/lib/google-sheets";
import { cached, bust } from "@/lib/cache";
import { getMatch, matchup as matchupOf, resolveTeam } from "@/lib/games";
import { normalizePhone, isValidUSPhone, sanitizeFirstName } from "@/lib/format";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { sendSms, welcomeSms } from "@/lib/quo";
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

    // Respect a paused/closed session (barista hit "pause voting").
    const session = await cached("session-row", 1500, () => getSession());
    if (session?.status === "closed") {
      return NextResponse.json({ error: "voting_closed" }, { status: 400 });
    }

    const teamCode = side === "home" ? match.homeTeam : match.awayTeam;
    const teamName = resolveTeam(teamCode).name;
    const record: VoteRecord = {
      ts: new Date().toISOString(),
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

    // Welcome SMS only on this phone's FIRST-EVER vote — dedup so repeat voters
    // never get re-texted. Runs after the response; can never block/fail a vote.
    const firstEver = log.filter((v) => v.phone === phone).length === 1;
    if (firstEver) {
      after(async () => {
        const r = await sendSms(phone, welcomeSms(teamName));
        await appendSmsLog({
          ts: new Date().toISOString(),
          phone,
          type: "welcome",
          status: r.ok ? (r.skipped ? "dry-run" : "sent") : "failed",
          detail: r.error || "",
        }).catch(() => {});
      });
    }

    return NextResponse.json({ ok: true, tally });
  } catch (e) {
    console.error("vote POST", e);
    return NextResponse.json({ error: "failed to record vote" }, { status: 500 });
  }
}
