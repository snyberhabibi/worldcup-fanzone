import { NextRequest, NextResponse, after } from "next/server";
import { getTally } from "@/lib/db";
import { cached, TALLY_TTL_MS } from "@/lib/cache";
import { getMatch } from "@/lib/games";
import { alertOps } from "@/lib/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const idParam = req.nextUrl.searchParams.get("matchId");
  const matchId = Number(idParam);
  if (!idParam || !getMatch(matchId))
    return NextResponse.json({ error: "valid matchId required" }, { status: 400 });
  try {
    const tally = await cached(`tally:${matchId}`, TALLY_TTL_MS, () => getTally(matchId));
    return NextResponse.json(tally);
  } catch (e) {
    console.error("tally GET", e);
    after(() => alertOps("tally read failed (Supabase) — board may show 0-0"));
    return NextResponse.json({ matchId, home: 0, away: 0, total: 0 });
  }
}
