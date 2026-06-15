// Supabase (Postgres) data layer — the LIVE read/write path for votes, winners,
// session, and the SMS log. This replaces Google Sheets on the hot path: votes
// UPSERT (no per-minute write cap → handles 300+ concurrent voters) and tallies
// are scoped, indexed SQL (never "read the whole log"). The Google Sheet is now
// just a periodic read-only MIRROR — see /api/cron/mirror-to-sheet.
//
// Uses the service/secret key: SERVER-SIDE ONLY, bypasses RLS. Never import this
// from a client component.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VoteRecord, Tally, Side, StoredSession, Winner, DrawResult } from "@/types";
import { isTestPhone } from "@/lib/format";

const SB_URL = (process.env.SUPABASE_URL || "").replace(/\\n/g, "").trim();
const SB_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/\\n/g, "").trim();

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!SB_URL || !SB_KEY) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  if (!client) client = createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// ── Votes ───────────────────────────────────────────
// Upsert on (phone, match_id): the latest pick wins, enforced by the DB. The
// insert payload omits created_at so a re-vote keeps its first-seen time → the
// raffle wheel's first-seen ordering stays stable.
export async function appendVote(v: VoteRecord): Promise<void> {
  const { error } = await sb()
    .from("votes")
    .upsert(
      {
        match_id: v.matchId,
        phone: v.phone,
        side: v.side,
        team_code: v.teamCode,
        team_name: v.teamName,
        first_name: v.firstName,
        matchup: v.matchup,
        consent: v.consent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "phone,match_id" }
    );
  if (error) throw new Error(`appendVote: ${error.message}`);
}

/** Live tally for one match — distinct voters (one row per phone via the upsert).
 *  Uses exact COUNT per side (head requests, no row transfer) rather than
 *  selecting and counting rows in JS: it's cheaper AND correct at any size.
 *  (Selecting rows is silently capped by Supabase's "Max rows" API setting —
 *  1000 by default — so a game with >1000 votes would otherwise undercount.) */
export async function getTally(matchId: number): Promise<Tally> {
  const countSide = async (side: Side) => {
    const { count, error } = await sb()
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("match_id", matchId)
      .eq("side", side);
    if (error) throw new Error(`getTally(${side}): ${error.message}`);
    return count ?? 0;
  };
  const [home, away] = await Promise.all([countSide("home"), countSide("away")]);
  return { matchId, home, away, total: home + away };
}

/** Entrants for one match in first-seen order — stable index for the wheel. */
export async function getEntrants(
  matchId: number
): Promise<{ firstName: string; phone: string; side: Side }[]> {
  const { data, error } = await sb()
    .from("votes")
    .select("first_name, phone, side")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .limit(50000);
  if (error) throw new Error(`getEntrants: ${error.message}`);
  return ((data ?? []) as { first_name: string; phone: string; side: Side }[]).map((r) => ({
    firstName: r.first_name,
    phone: r.phone,
    side: r.side,
  }));
}

/** Total games this phone has voted on (1 row per phone+match). Used post-upsert
 *  to decide first-ever (===1) and first-in-slot SMS gating. */
export async function countPhoneVotes(phone: string): Promise<number> {
  const { count, error } = await sb()
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("phone", phone);
  if (error) throw new Error(`countPhoneVotes: ${error.message}`);
  return count ?? 0;
}

export async function countPhoneVotesInMatches(phone: string, matchIds: number[]): Promise<number> {
  if (matchIds.length === 0) return 0;
  const { count, error } = await sb()
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("phone", phone)
    .in("match_id", matchIds);
  if (error) throw new Error(`countPhoneVotesInMatches: ${error.message}`);
  return count ?? 0;
}

/** Has this phone EVER been sent a 'welcome' SMS? Durable, append-only audit
 *  trail (sms_log) — survives any reset of the votes table, so it's the
 *  belt-and-suspenders gate that stops a re-welcome even if vote counts are
 *  ever 0 again. Returns false on query error so a genuine first-timer is
 *  never silently denied their welcome. */
export async function hasSeenWelcome(phone: string): Promise<boolean> {
  const { count, error } = await sb()
    .from("sms_log")
    .select("*", { count: "exact", head: true })
    .eq("phone", phone)
    .eq("type", "welcome");
  if (error) {
    console.error(`hasSeenWelcome: ${error.message}`);
    return false; // fail-open: don't suppress a legit first welcome on a read error
  }
  return (count ?? 0) > 0;
}

// ── One-time backfill (data recovery after the Supabase cutover) ────────────
// Replays pre-cutover votes from Google Sheets KioskVotes into Supabase.
// Idempotent + safe to re-run + safe to run mid-event:
//   • Caller MUST pass phones already normalized (10-digit) and 555/test rows
//     filtered out — see /api/admin/backfill-votes.
//   • created_at is set to each row's ORIGINAL ts on INSERT only, so the wheel's
//     first-seen ordering matches reality.
//   • We pre-read the existing (phone,match_id) pairs in ONE query and skip any
//     that already exist — this NEVER overwrites a row a live vote already wrote
//     post-cutover (so we can't clobber a voter's current pick or move their
//     first-seen time), and makes re-runs free.
export async function existingVoteKeys(): Promise<Set<string>> {
  const rows = await fetchAllRows<{ phone: string; match_id: number }>(
    "votes",
    "phone, match_id",
    "created_at"
  );
  return new Set(rows.map((r) => `${r.phone}|${r.match_id}`));
}

export async function backfillVotes(
  records: VoteRecord[]
): Promise<{ inserted: number; skipped: number; total: number }> {
  if (!records.length) return { inserted: 0, skipped: 0, total: 0 };

  const have = await existingVoteKeys();

  // Collapse duplicate (phone,match_id) the Sheet may hold (re-votes were
  // append-only there) → keep the EARLIEST ts so first-seen ordering is right.
  const earliest = new Map<string, VoteRecord>();
  for (const v of records) {
    const key = `${v.phone}|${v.matchId}`;
    if (have.has(key)) continue; // already in Supabase (post-cutover live row) → skip
    const prev = earliest.get(key);
    if (!prev || v.ts < prev.ts) earliest.set(key, v);
  }

  const toInsert = [...earliest.values()];
  const skipped = records.length - toInsert.length;
  if (!toInsert.length) return { inserted: 0, skipped, total: records.length };

  const payload = toInsert.map((v) => ({
    match_id: v.matchId,
    phone: v.phone,
    side: v.side,
    team_code: v.teamCode,
    team_name: v.teamName,
    first_name: v.firstName,
    matchup: v.matchup,
    consent: v.consent,
    created_at: v.ts, // CRITICAL: preserve original first-seen time for the wheel
    updated_at: v.ts,
  }));

  // Chunked plain INSERT (not upsert): every key is known-absent, so there is no
  // conflict to resolve. If a concurrent live vote races in a matching key, the
  // UNIQUE(phone,match_id) constraint rejects only that one row of the chunk —
  // we use ignoreDuplicates so the rest of the chunk still lands.
  let inserted = 0;
  const CHUNK = 500;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const slice = payload.slice(i, i + CHUNK);
    const { error } = await sb()
      .from("votes")
      .upsert(slice, { onConflict: "phone,match_id", ignoreDuplicates: true });
    if (error) throw new Error(`backfillVotes chunk ${i}: ${error.message}`);
    inserted += slice.length;
  }
  return { inserted, skipped, total: records.length };
}

// Backfill pre-cutover raffle winners so the draw dedup (getAllWinners) knows
// about them — otherwise re-drawing an old game could re-pick a prior winner
// and re-send a YALLA10 ($10) code. Dedup on (match_id, phone); skip-on-conflict
// so it can't double-insert and is safe to re-run. created_at is left to default
// (winner order doesn't matter for dedup).
export async function backfillWinners(
  records: Winner[]
): Promise<{ inserted: number; skipped: number; total: number }> {
  if (!records.length) return { inserted: 0, skipped: 0, total: 0 };

  const existing = await fetchAllRows<{ match_id: number; phone: string }>(
    "winners",
    "match_id, phone",
    "created_at"
  );
  const have = new Set(existing.map((r) => `${r.phone}|${r.match_id}`));

  const dedup = new Map<string, Winner>();
  for (const w of records) {
    const key = `${w.phone}|${w.matchId}`;
    if (have.has(key) || dedup.has(key)) continue;
    dedup.set(key, w);
  }
  const toInsert = [...dedup.values()];
  const skipped = records.length - toInsert.length;
  if (!toInsert.length) return { inserted: 0, skipped, total: records.length };

  const payload = toInsert.map((w) => ({
    match_id: w.matchId,
    phone: w.phone,
    first_name: w.firstName,
    matchup: w.matchup,
  }));
  // Plain INSERT (the winners table has no unique constraint — appendVote upserts
  // but appendWinner inserts). We've already filtered out existing keys, so there
  // is no conflict to resolve.
  let inserted = 0;
  const CHUNK = 500;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const slice = payload.slice(i, i + CHUNK);
    const { error } = await sb().from("winners").insert(slice);
    if (error) throw new Error(`backfillWinners chunk ${i}: ${error.message}`);
    inserted += slice.length;
  }
  return { inserted, skipped, total: records.length };
}

// ── Session (single row, id=1) ──────────────────────
export async function getSession(): Promise<StoredSession | null> {
  const { data, error } = await sb()
    .from("session_state")
    .select("pinned_match_id, manual_status, pin_sticky, last_draw, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`getSession: ${error.message}`);
  if (!data) return null;
  const r = data as {
    pinned_match_id: number | null;
    manual_status: string | null;
    pin_sticky: boolean | null;
    last_draw: DrawResult | null;
    updated_at: string | null;
  };
  return {
    pinnedMatchId: r.pinned_match_id ?? null,
    manualStatus: r.manual_status === "open" || r.manual_status === "closed" ? r.manual_status : "",
    pinSticky: !!r.pin_sticky,
    updatedAt: r.updated_at ?? "",
    lastDraw: r.last_draw ?? null,
  };
}

export async function setSession(s: StoredSession): Promise<void> {
  const { error } = await sb()
    .from("session_state")
    .update({
      pinned_match_id: s.pinnedMatchId,
      manual_status: s.manualStatus,
      pin_sticky: s.pinSticky,
      last_draw: s.lastDraw,
      updated_at: s.updatedAt || new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw new Error(`setSession: ${error.message}`);
}

// ── Winners ─────────────────────────────────────────
export async function appendWinner(w: Winner): Promise<void> {
  const { error } = await sb()
    .from("winners")
    .insert({ match_id: w.matchId, phone: w.phone, first_name: w.firstName, matchup: w.matchup });
  if (error) throw new Error(`appendWinner: ${error.message}`);
}

/** (matchId, phone) for every winner — for per-game + ever dedup in the draw. */
export async function getAllWinners(): Promise<{ matchId: number; phone: string }[]> {
  const { data, error } = await sb().from("winners").select("match_id, phone").limit(50000);
  if (error) throw new Error(`getAllWinners: ${error.message}`);
  return ((data ?? []) as { match_id: number; phone: string }[]).map((r) => ({
    matchId: r.match_id,
    phone: r.phone,
  }));
}

// ── SMS audit log (cheap in Postgres) ───────────────
export interface SmsLogRow {
  phone: string;
  type: string;
  status: string;
  detail?: string;
}
export async function appendSmsLog(r: SmsLogRow): Promise<void> {
  const { error } = await sb()
    .from("sms_log")
    .insert({ phone: r.phone, type: r.type, status: r.status, detail: r.detail ?? "" });
  if (error) throw new Error(`appendSmsLog: ${error.message}`);
}

// ── Full exports for the Sheet mirror (paginated past Supabase's 1000 cap) ──
async function fetchAllRows<R>(table: string, columns: string, orderCol: string): Promise<R[]> {
  const PAGE = 1000;
  const out: R[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb()
      .from(table)
      .select(columns)
      .order(orderCol, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetchAll ${table}: ${error.message}`);
    const batch = (data ?? []) as R[];
    out.push(...batch);
    if (batch.length < PAGE) break;
  }
  return out;
}

export async function getAllVotes(): Promise<VoteRecord[]> {
  type Row = {
    created_at: string;
    match_id: number;
    matchup: string;
    side: Side;
    team_code: string;
    team_name: string;
    first_name: string;
    phone: string;
    consent: boolean;
  };
  const rows = await fetchAllRows<Row>(
    "votes",
    "created_at, match_id, matchup, side, team_code, team_name, first_name, phone, consent",
    "created_at"
  );
  return rows.map((r) => ({
    ts: r.created_at,
    matchId: r.match_id,
    matchup: r.matchup,
    side: r.side,
    teamCode: r.team_code,
    teamName: r.team_name,
    firstName: r.first_name,
    phone: r.phone,
    consent: r.consent,
  }));
}

// Distinct-voter stats. Real = excluding reserved 555 numbers (load-test) and
// match 104 (the Final = the throwaway match we load-tested on), so the headline
// numbers reflect actual customers, not synthetic test data.
export async function voterStats(): Promise<{
  totalVoteRows: number;
  distinctPhonesAll: number;
  distinctVoters: number; // distinct real phone numbers
  realVoteRows: number;
  gamesWithRealVotes: number;
}> {
  type Row = { phone: string; match_id: number };
  const rows = await fetchAllRows<Row>("votes", "phone, match_id", "created_at");
  const all = new Set<string>();
  const real = new Set<string>();
  const games = new Set<number>();
  let realVoteRows = 0;
  for (const r of rows) {
    all.add(r.phone);
    if (!isTestPhone(r.phone) && r.match_id !== 104) {
      real.add(r.phone);
      games.add(r.match_id);
      realVoteRows++;
    }
  }
  return {
    totalVoteRows: rows.length,
    distinctPhonesAll: all.size,
    distinctVoters: real.size,
    realVoteRows,
    gamesWithRealVotes: games.size,
  };
}

export async function getAllWinnersFull(): Promise<Winner[]> {
  type Row = { created_at: string; match_id: number; matchup: string; first_name: string; phone: string };
  const rows = await fetchAllRows<Row>(
    "winners",
    "created_at, match_id, matchup, first_name, phone",
    "created_at"
  );
  return rows.map((r) => ({
    ts: r.created_at,
    matchId: r.match_id,
    matchup: r.matchup,
    firstName: r.first_name,
    phone: r.phone,
  }));
}
