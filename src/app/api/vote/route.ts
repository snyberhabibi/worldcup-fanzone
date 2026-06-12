import { NextRequest, NextResponse } from "next/server";
import { appendVote, getVoteLog, tallyFromLog } from "@/lib/google-sheets";
import { bust } from "@/lib/cache";
import { getMatch, matchup as matchupOf, resolveTeam } from "@/lib/games";
import { normalizePhone, isValidUSPhone, sanitizeFirstName } from "@/lib/format";
import type { VoteRecord, Side } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const matchId = Number(body.matchId);
    const side: Side = body.side === "away" ? "away" : "home";
    const firstName = sanitizeFirstName(String(body.firstName || ""));
    const phone = normalizePhone(String(body.phone || ""));
    const consent = Boolean(body.consent);

    const match = getMatch(matchId);
    if (!match)
      return NextResponse.json({ error: "invalid matchId" }, { status: 400 });
    if (!firstName)
      return NextResponse.json({ error: "firstName required" }, { status: 400 });
    if (!isValidUSPhone(phone))
      return NextResponse.json({ error: "invalid phone" }, { status: 400 });

    const teamCode = side === "home" ? match.homeTeam : match.awayTeam;
    const record: VoteRecord = {
      ts: new Date().toISOString(),
      matchId,
      matchup: matchupOf(match),
      side,
      teamCode,
      teamName: resolveTeam(teamCode).name,
      firstName,
      phone,
      consent,
    };

    await appendVote(record);
    bust("votelog");

    // Return the fresh tally so the kiosk can confirm the write landed.
    const log = await getVoteLog();
    return NextResponse.json({ ok: true, tally: tallyFromLog(log, matchId) });
  } catch (e) {
    console.error("vote POST", e);
    return NextResponse.json(
      { error: "failed to record vote" },
      { status: 500 }
    );
  }
}
