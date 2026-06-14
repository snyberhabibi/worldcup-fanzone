import { NextRequest, NextResponse, after } from "next/server";
import { getVoteLog, tallyFromLog } from "@/lib/google-sheets";
import { cached, VOTELOG_TTL_MS } from "@/lib/cache";
import { getMatch } from "@/lib/games";
import { alertOps } from "@/lib/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const idParam = req.nextUrl.searchParams.get("matchId");
  const matchId = Number(idParam);
  if (!idParam || !getMatch(matchId))
    return NextResponse.json({ error: "valid matchId required" }, { status: 400 });
  try {
    const log = await cached("votelog", VOTELOG_TTL_MS, () => getVoteLog());
    return NextResponse.json(tallyFromLog(log, matchId));
  } catch (e) {
    console.error("tally GET", e);
    after(() => alertOps("tally read failed (Sheets) — board may show 0-0"));
    return NextResponse.json({ matchId, home: 0, away: 0, total: 0 });
  }
}
