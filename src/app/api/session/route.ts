import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/google-sheets";
import { cached, bust } from "@/lib/cache";
import {
  currentSlotGames,
  slotGamesOf,
  getMatch,
  isSlotOpen,
  isSlotEnded,
} from "@/lib/games";
import { checkPin } from "@/lib/auth";
import type { SessionState, SessionStatus, StoredSession } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY: StoredSession = { pinnedMatchId: null, manualStatus: "", updatedAt: "", lastDraw: null };

// Derive the live slot + status from the clock, honouring a barista pin/pause
// until that slot ends (then auto-progression resumes).
async function effectiveSession(): Promise<SessionState> {
  const now = new Date();
  const stored = await cached("session-row", 1000, () => getSession());

  let games;
  let manual: SessionStatus | "" = "";
  if (stored?.pinnedMatchId && getMatch(stored.pinnedMatchId) && !isSlotEnded(stored.pinnedMatchId, now)) {
    games = slotGamesOf(stored.pinnedMatchId);
    manual = stored.manualStatus || "";
  } else {
    games = currentSlotGames(now);
  }

  const matchIds = games.map((g) => g.id);
  const autoStatus: SessionStatus = matchIds.length && isSlotOpen(matchIds[0], now) ? "open" : "closed";
  const status: SessionStatus = manual || autoStatus;

  let lastDraw = stored?.lastDraw ?? null;
  if (lastDraw && !matchIds.includes(lastDraw.matchId)) lastDraw = null;

  return { matchIds, status, updatedAt: stored?.updatedAt ?? "", lastDraw };
}

export async function GET() {
  try {
    return NextResponse.json(await effectiveSession());
  } catch (e) {
    console.error("session GET", e);
    return NextResponse.json({
      matchIds: currentSlotGames(new Date()).map((g) => g.id),
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
    const now = new Date();
    const cur = (await getSession()) ?? EMPTY;
    const next: StoredSession = { ...cur, updatedAt: now.toISOString() };

    // Barista pins a game → feature its (1+ game) slot.
    if (body.matchId != null) {
      const id = Number(body.matchId);
      if (!getMatch(id))
        return NextResponse.json({ error: "invalid matchId" }, { status: 400 });
      next.pinnedMatchId = id;
      next.manualStatus = "";
      next.lastDraw = null;
    }
    // Resume automatic progression.
    if (body.clearPin || body.auto) {
      next.pinnedMatchId = null;
      next.manualStatus = "";
    }
    // Pause / resume voting (pins the current slot so the override sticks to it).
    if (body.status === "open" || body.status === "closed") {
      next.manualStatus = body.status;
      if (next.pinnedMatchId == null) next.pinnedMatchId = currentSlotGames(now)[0]?.id ?? null;
    }
    if (body.clearDraw) next.lastDraw = null;

    await setSession(next);
    bust("session-row");
    return NextResponse.json(await effectiveSession());
  } catch (e) {
    console.error("session POST", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
