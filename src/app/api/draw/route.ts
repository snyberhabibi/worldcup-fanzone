import { NextRequest, NextResponse, after } from "next/server";
import {
  getVoteLog,
  entrantsFromLog,
  appendWinner,
  getAllWinners,
  getSession,
  setSession,
  appendSmsLog,
} from "@/lib/google-sheets";
import { bust } from "@/lib/cache";
import { getMatch, matchup as matchupOf } from "@/lib/games";
import { maskPhone } from "@/lib/format";
import { checkPin } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { sendSms, winnerSms } from "@/lib/quo";
import { alertOps } from "@/lib/slack";
import type { DrawResult, Winner } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Barista spins the wheel. Winner is chosen server-side, excluding anyone who
// already won THIS game (multiple prizes per game → no double-winners), logged
// to KioskWinners, and broadcast to the board (masked). winnerIndex is the
// winner's position in the FULL first-seen entrant order so the board's reel
// (which shows every entrant) lands correctly.
export async function POST(req: NextRequest) {
  if (!checkPin(req))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`draw:${clientIp(req)}`, 30, 60_000))
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
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

    const allWinners = await getAllWinners();
    const wonThisGame = new Set(allWinners.filter((w) => w.matchId === matchId).map((w) => w.phone));
    const wonAnything = new Set(allWinners.map((w) => w.phone));

    const eligible = entrants.filter((e) => !wonThisGame.has(e.phone));
    if (eligible.length === 0)
      return NextResponse.json({ ok: false, reason: "all_won" });

    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    const winnerIndex = entrants.findIndex((e) => e.phone === pick.phone);
    const ts = new Date().toISOString();
    const mu = matchupOf(match);

    await appendWinner({ ts, matchId, matchup: mu, firstName: pick.firstName, phone: pick.phone } satisfies Winner);

    const draw: DrawResult = {
      nonce: `${matchId}-${Date.now()}-${winnerIndex}`,
      matchId,
      winnerIndex,
      firstName: pick.firstName,
      phoneMasked: maskPhone(pick.phone),
      poolSize: entrants.length,
    };

    const cur = await getSession();
    await setSession({
      pinnedMatchId: cur?.pinnedMatchId ?? null,
      manualStatus: cur?.manualStatus ?? "",
      pinSticky: cur?.pinSticky ?? false,
      updatedAt: ts,
      lastDraw: draw,
    });
    bust("session-row");
    // NB: do NOT bust "votelog" — a draw doesn't change votes, and busting it
    // forced the next tally/entrants poll into a cold full-log read mid-spin.

    // Winner SMS — once per phone ever (first win delivers the YALLA10 code).
    // Sent synchronously (not in after()) so the barista sees delivery status in
    // the console and can read the code aloud / re-spin if it failed — this is
    // the one message with real money attached. The board's wheel already spun
    // off the session lastDraw written above, so this await never delays the
    // on-screen reveal. Subsequent wins on an already-won phone aren't re-texted.
    let smsStatus: "sent" | "failed" | "dry-run" | "skipped" = "skipped";
    if (!wonAnything.has(pick.phone)) {
      const r = await sendSms(pick.phone, winnerSms());
      smsStatus = r.ok ? (r.skipped ? "dry-run" : "sent") : "failed";
      after(() =>
        appendSmsLog({
          ts: new Date().toISOString(),
          phone: pick.phone,
          type: "winner",
          status: smsStatus,
          detail: r.error || "",
        }).catch(() => {})
      );
    }

    return NextResponse.json({ ok: true, draw, smsStatus });
  } catch (e) {
    console.error("draw POST", e);
    after(() => alertOps("a raffle draw failed"));
    return NextResponse.json({ error: "failed to draw" }, { status: 500 });
  }
}
