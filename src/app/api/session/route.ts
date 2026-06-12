import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/google-sheets";
import { cached, bust } from "@/lib/cache";
import { pickDefaultMatchId, getMatch } from "@/lib/games";
import { checkPin } from "@/lib/auth";
import type { SessionState } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stored session if a barista has picked a game, else the game nearest now. */
async function currentSession(): Promise<SessionState> {
  const row = await cached("session-row", 1000, () => getSession());
  if (row && getMatch(row.matchId)) return row;
  return {
    matchId: pickDefaultMatchId(new Date()),
    status: "open",
    updatedAt: "",
    // Don't carry a draw from an invalid/absent session — it belongs to a
    // game we're no longer on, which would mislead the board's wheel.
    lastDraw: null,
  };
}

export async function GET() {
  try {
    return NextResponse.json(await currentSession());
  } catch (e) {
    console.error("session GET", e);
    // Degrade gracefully: a computed default keeps both screens alive even
    // if Sheets is briefly unreachable.
    return NextResponse.json({
      matchId: pickDefaultMatchId(new Date()),
      status: "open",
      updatedAt: "",
      lastDraw: null,
    } satisfies SessionState);
  }
}

export async function POST(req: NextRequest) {
  if (!checkPin(req))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const cur = await currentSession();
    const next: SessionState = {
      matchId: body.matchId != null ? Number(body.matchId) : cur.matchId,
      status:
        body.status === "closed"
          ? "closed"
          : body.status === "open"
            ? "open"
            : cur.status,
      updatedAt: new Date().toISOString(),
      lastDraw: cur.lastDraw,
    };
    // Switching games clears any previous draw result.
    if (body.matchId != null && Number(body.matchId) !== cur.matchId)
      next.lastDraw = null;
    if (body.clearDraw) next.lastDraw = null;
    if (!getMatch(next.matchId))
      return NextResponse.json({ error: "invalid matchId" }, { status: 400 });

    await setSession(next);
    bust("session-row");
    return NextResponse.json(next);
  } catch (e) {
    console.error("session POST", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
