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
