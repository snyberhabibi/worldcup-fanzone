import { NextRequest, NextResponse, after } from "next/server";
import { getSession, setSession } from "@/lib/google-sheets";
import { alertOps } from "@/lib/slack";
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

const EMPTY: StoredSession = {
  pinnedMatchId: null,
  manualStatus: "",
  pinSticky: false,
  updatedAt: "",
  lastDraw: null,
};

// Derive the live slot + status. By default the slot is clock-derived and
// auto-advances. A barista pin overrides that:
//   • sticky pin (barista explicitly jumped to a game) — honoured until they
//     press "Auto", even for a game whose slot has already ended (so they can
//     go back and spin a finished game's raffle);
//   • transient pin (auto-set when pausing voting) — honoured only until that
//     slot ends, so a forgotten pause can't freeze auto-progression all day.
async function effectiveSession(): Promise<SessionState> {
  const now = new Date();
  const stored = await cached("session-row", 1000, () => getSession());

  const pinId = stored?.pinnedMatchId ?? null;
  const honorPin =
    !!(pinId && getMatch(pinId)) &&
    (stored!.pinSticky || !isSlotEnded(pinId!, now));

  let games;
  let manual: SessionStatus | "" = "";
  if (honorPin) {
    games = slotGamesOf(pinId!);
    manual = stored!.manualStatus || "";
  } else {
    games = currentSlotGames(now);
  }

  const matchIds = games.map((g) => g.id);
  const autoStatus: SessionStatus = matchIds.length && isSlotOpen(matchIds[0], now) ? "open" : "closed";
  // A sticky pin keeps FEATURING a finished game's slot (so the barista can spin
  // its raffle), but voting for it is genuinely closed. The /api/vote route
  // ignores a manual "open" once the slot has ended, so clamp the reported
  // status the same way — otherwise the board/kiosk would advertise "VOTE NOW"
  // while every submission silently bounces with voting_closed.
  const manualUsable =
    manual && matchIds.length > 0 && !isSlotEnded(matchIds[0], now) ? manual : "";
  const status: SessionStatus = manualUsable || autoStatus;

  let lastDraw = stored?.lastDraw ?? null;
  if (lastDraw && !matchIds.includes(lastDraw.matchId)) lastDraw = null;

  return { matchIds, status, pinned: honorPin, updatedAt: stored?.updatedAt ?? "", lastDraw };
}

export async function GET() {
  try {
    return NextResponse.json(await effectiveSession());
  } catch (e) {
    console.error("session GET", e);
    after(() => alertOps("session read failed (Sheets) — board is on clock fallback"));
    return NextResponse.json({
      matchIds: currentSlotGames(new Date()).map((g) => g.id),
      status: "open",
      pinned: false,
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

    // Barista pins a game → feature its (1+ game) slot. Explicit = sticky.
    if (body.matchId != null) {
      const id = Number(body.matchId);
      if (!getMatch(id))
        return NextResponse.json({ error: "invalid matchId" }, { status: 400 });
      next.pinnedMatchId = id;
      next.manualStatus = "";
      next.pinSticky = true;
      next.lastDraw = null; // re-pinning clears any prior draw so the wheel won't replay
    }
    // Resume automatic progression.
    if (body.clearPin || body.auto) {
      next.pinnedMatchId = null;
      next.manualStatus = "";
      next.pinSticky = false;
    }
    // Pause / resume voting. Scopes to the current slot via a TRANSIENT pin
    // (auto-clears at slot end) — only if not already on an explicit sticky pin.
    if (body.status === "open" || body.status === "closed") {
      next.manualStatus = body.status;
      if (next.pinnedMatchId == null) {
        next.pinnedMatchId = currentSlotGames(now)[0]?.id ?? null;
        next.pinSticky = false;
      }
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
