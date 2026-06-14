import { NextRequest, NextResponse, after } from "next/server";
import { getAllVotes, getAllWinnersFull } from "@/lib/db";
import {
  mirrorVotesToSheet,
  mirrorWinnersToSheet,
  mirrorUniqueVotersToSheet,
} from "@/lib/google-sheets";
import { alertOps } from "@/lib/slack";
import type { VoteRecord } from "@/types";

// Distinct voters across all votes → roster rows. Row count = total unique
// users who've ever voted; gamesVoted = how many games each backed.
function uniqueVoterRows(votes: VoteRecord[]): string[][] {
  const byPhone = new Map<
    string,
    { phone: string; firstName: string; games: number; first: string; last: string }
  >();
  for (const v of votes) {
    const e = byPhone.get(v.phone);
    if (!e) {
      byPhone.set(v.phone, { phone: v.phone, firstName: v.firstName, games: 1, first: v.ts, last: v.ts });
    } else {
      e.games++;
      if (v.ts < e.first) e.first = v.ts;
      if (v.ts > e.last) e.last = v.ts;
    }
  }
  return [...byPhone.values()]
    .sort((a, b) => (a.first < b.first ? -1 : 1)) // first-seen order
    .map((e) => [e.phone, e.firstName, String(e.games), e.first, e.last]);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Periodic mirror: snapshot the current Supabase votes + winners into the Google
// Sheet so results stay readable there. Vercel Cron (see vercel.json) hits this
// and includes `Authorization: Bearer ${CRON_SECRET}` when set. Also hittable
// on-demand with the same header (?…) to refresh the Sheet immediately.
// Fails CLOSED: no CRON_SECRET ⇒ denied. Never blocks the live app (separate
// route); on error it alerts and 500s.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return (req.headers.get("authorization") || "") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const [votes, winners] = await Promise.all([getAllVotes(), getAllWinnersFull()]);
    const unique = uniqueVoterRows(votes);
    await mirrorVotesToSheet(votes);
    await mirrorWinnersToSheet(winners);
    await mirrorUniqueVotersToSheet(unique);
    return NextResponse.json({
      ok: true,
      mirrored: { votes: votes.length, winners: winners.length, uniqueVoters: unique.length },
    });
  } catch (e) {
    console.error("mirror-to-sheet", e);
    after(() => alertOps(`Sheet mirror failed: ${e instanceof Error ? e.message : "unknown"}`));
    return NextResponse.json({ error: "mirror failed" }, { status: 500 });
  }
}
