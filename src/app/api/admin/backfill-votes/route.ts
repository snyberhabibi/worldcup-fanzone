import { NextRequest, NextResponse, after } from "next/server";
import { getVoteLog, getAllWinnersFull } from "@/lib/google-sheets";
import { backfillVotes, backfillWinners } from "@/lib/db";
import { bust } from "@/lib/cache";
import { checkPin } from "@/lib/auth";
import { normalizePhone, isValidUSPhone, isTestPhone } from "@/lib/format";
import { alertOps } from "@/lib/slack";
import type { VoteRecord, Winner } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Reads ~all of KioskVotes + KioskWinners + bulk existing-key reads + chunked inserts.
export const maxDuration = 60;

// ONE-TIME data recovery (remove this route after running). The Supabase cutover
// (f520159, 2026-06-14 08:00 CDT) deployed with EMPTY votes + winners tables, so
// every returning voter's first post-cutover vote read countPhoneVotes()===0 →
// firstEver → a false re-welcome SMS + false CRM signup. This replays the
// pre-cutover KioskVotes (+ KioskWinners, so the draw dedup knows prior winners)
// into Supabase so those counts read > 0 and the re-welcomes stop.
//
// Guarded by the kiosk PIN (x-kiosk-pin) — chosen so it can run immediately
// mid-incident without provisioning a new secret. The op is idempotent and
// non-destructive (only inserts keys not already present; sends NO SMS; never
// overwrites a live post-cutover row), and the route is deleted once verified.
// GET = dry-run preview (no writes); POST = execute.

/** Normalize phones + drop invalid/555 test rows. The live vote path normalizes
 *  (vote/route.ts) and counts on the normalized phone, so the backfill MUST
 *  normalize too or returning voters won't match → they'd still be re-welcomed. */
function cleanVotes(raw: VoteRecord[]): { rows: VoteRecord[]; dropped: number } {
  const rows: VoteRecord[] = [];
  let dropped = 0;
  for (const v of raw) {
    const phone = normalizePhone(v.phone);
    if (!isValidUSPhone(phone) || isTestPhone(phone)) {
      dropped++;
      continue;
    }
    rows.push({ ...v, phone });
  }
  return { rows, dropped };
}

function cleanWinners(raw: Winner[]): { rows: Winner[]; dropped: number } {
  const rows: Winner[] = [];
  let dropped = 0;
  for (const w of raw) {
    const phone = normalizePhone(w.phone);
    if (!isValidUSPhone(phone) || isTestPhone(phone)) {
      dropped++;
      continue;
    }
    rows.push({ ...w, phone });
  }
  return { rows, dropped };
}

export async function GET(req: NextRequest) {
  if (!checkPin(req))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const [rawVotes, rawWinners] = await Promise.all([getVoteLog(), getAllWinnersFull()]);
    const votes = cleanVotes(rawVotes);
    const winners = cleanWinners(rawWinners);
    return NextResponse.json({
      ok: true,
      dryRun: true,
      votes: { sheetRows: rawVotes.length, cleanRows: votes.rows.length, droppedInvalidOrTest: votes.dropped },
      winners: { sheetRows: rawWinners.length, cleanRows: winners.rows.length, droppedInvalidOrTest: winners.dropped },
      note: "POST (same x-kiosk-pin) to execute. Existing Supabase rows are skipped.",
    });
  } catch (e) {
    console.error("[backfill] dry-run", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkPin(req))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const [rawVotes, rawWinners] = await Promise.all([getVoteLog(), getAllWinnersFull()]);
    const votes = cleanVotes(rawVotes);
    const winners = cleanWinners(rawWinners);

    // Votes first (the actual re-welcome fix), then winners (double-pay guard).
    const voteResult = await backfillVotes(votes.rows);
    const winnerResult = await backfillWinners(winners.rows);

    // Stale 0-0 tallies / empty entrant pools are cached up to TALLY_TTL_MS on
    // each warm instance; clear them so the next poll reflects the backfill.
    bust("tally:");
    bust("entrants:");
    bust("session-row");

    const summary = {
      ok: true,
      votes: { sheetRows: rawVotes.length, droppedInvalidOrTest: votes.dropped, ...voteResult },
      winners: { sheetRows: rawWinners.length, droppedInvalidOrTest: winners.dropped, ...winnerResult },
      at: new Date().toISOString(),
    };
    after(() =>
      alertOps(
        `Backfill complete — votes: +${voteResult.inserted} (skipped ${voteResult.skipped}); ` +
          `winners: +${winnerResult.inserted} (skipped ${winnerResult.skipped}). ` +
          `Returning voters now read countPhoneVotes>0; re-welcomes should stop.`
      ).catch(() => {})
    );
    return NextResponse.json(summary);
  } catch (e) {
    console.error("[backfill]", e);
    after(() =>
      alertOps(
        `Backfill FAILED: ${e instanceof Error ? e.message : "unknown"}. ` +
          `Do NOT set CRON_SECRET — the Sheet still holds the only pre-cutover history.`
      ).catch(() => {})
    );
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}
