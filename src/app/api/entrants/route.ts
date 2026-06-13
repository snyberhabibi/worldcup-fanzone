import { NextRequest, NextResponse } from "next/server";
import { getVoteLog, entrantsFromLog } from "@/lib/google-sheets";
import { cached } from "@/lib/cache";
import { getMatch } from "@/lib/games";
import { maskPhone } from "@/lib/format";
import type { Entrant } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public-safe entrant pool for the board's spin-the-wheel. Phones are masked;
// the order matches the server's draw indexing so the wheel lands correctly.
export async function GET(req: NextRequest) {
  const idParam = req.nextUrl.searchParams.get("matchId");
  const matchId = Number(idParam);
  if (!idParam || !getMatch(matchId))
    return NextResponse.json({ error: "valid matchId required" }, { status: 400 });
  try {
    const log = await cached("votelog", 3000, () => getVoteLog());
    const entrants: Entrant[] = entrantsFromLog(log, matchId).map((e) => ({
      firstName: e.firstName,
      phoneMasked: maskPhone(e.phone),
      side: e.side,
    }));
    return NextResponse.json({ matchId, count: entrants.length, entrants });
  } catch (e) {
    console.error("entrants GET", e);
    return NextResponse.json({ matchId, count: 0, entrants: [] });
  }
}
