import { NextRequest, NextResponse, after } from "next/server";
import { getAllVotes, getAllWinnersFull } from "@/lib/db";
import { mirrorVotesToSheet, mirrorWinnersToSheet } from "@/lib/google-sheets";
import { alertOps } from "@/lib/slack";

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
    await mirrorVotesToSheet(votes);
    await mirrorWinnersToSheet(winners);
    return NextResponse.json({ ok: true, mirrored: { votes: votes.length, winners: winners.length } });
  } catch (e) {
    console.error("mirror-to-sheet", e);
    after(() => alertOps(`Sheet mirror failed: ${e instanceof Error ? e.message : "unknown"}`));
    return NextResponse.json({ error: "mirror failed" }, { status: 500 });
  }
}
