import { NextRequest, NextResponse } from "next/server";
import {
  getVoteLog,
  entrantsFromLog,
  appendWinner,
  getSession,
  setSession,
} from "@/lib/google-sheets";
import { bust } from "@/lib/cache";
import { getMatch, matchup as matchupOf, pickDefaultMatchId } from "@/lib/games";
import { maskPhone } from "@/lib/format";
import { checkPin } from "@/lib/auth";
import type { DrawResult, SessionState, Winner } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Barista taps "spin the wheel" on the kiosk → winner is chosen server-side,
// logged to KioskWinners (full phone, private), and broadcast to the board via
// the session's lastDraw (masked). The board animates to winnerIndex.
export async function POST(req: NextRequest) {
  if (!checkPin(req))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const matchId = Number(body.matchId);
    const match = getMatch(matchId);
    if (!match)
      return NextResponse.json({ error: "invalid matchId" }, { status: 400 });

    const log = await getVoteLog();
    const entrants = entrantsFromLog(log, matchId);
    if (entrants.length === 0)
      return NextResponse.json({ ok: false, reason: "no_entrants" });

    const index = Math.floor(Math.random() * entrants.length);
    const winner = entrants[index];
    const ts = new Date().toISOString();
    const mu = matchupOf(match);

    const winnerRow: Winner = {
      ts,
      matchId,
      matchup: mu,
      firstName: winner.firstName,
      phone: winner.phone,
    };
    await appendWinner(winnerRow);

    const draw: DrawResult = {
      nonce: `${matchId}-${Date.now()}-${index}`,
      matchId,
      winnerIndex: index,
      firstName: winner.firstName,
      phoneMasked: maskPhone(winner.phone),
      poolSize: entrants.length,
    };

    const cur =
      (await getSession()) ??
      ({
        matchId: pickDefaultMatchId(new Date()),
        status: "open",
        updatedAt: "",
        lastDraw: null,
      } satisfies SessionState);
    await setSession({
      matchId: cur.matchId,
      status: cur.status,
      updatedAt: ts,
      lastDraw: draw,
    });
    bust("session-row");
    // Ensure the board's entrant-pool fetch reads the same log the draw indexed.
    bust("votelog");

    return NextResponse.json({ ok: true, draw });
  } catch (e) {
    console.error("draw POST", e);
    return NextResponse.json({ error: "failed to draw" }, { status: 500 });
  }
}
