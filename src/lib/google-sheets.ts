import { google } from "googleapis";
import type {
  VoteRecord,
  Tally,
  Side,
  StoredSession,
  Winner,
  DrawResult,
} from "@/types";

const SHEET_ID = (
  process.env.GOOGLE_SHEET_ID || "10ch5yHsnDt_YNvf-D7LbFc_ZvaAfJksqFJ5kUo7zw68"
)
  .replace(/\\n/g, "")
  .trim(); // env value was saved with a trailing "\n" → "Requested entity was not found"

function getAuth() {
  // Defensively strip stray whitespace / escaped newlines from env values — a
  // trailing "\n" on the email makes Google report "invalid_grant: account not
  // found", and serverless env injection can re-wrap multiline keys.
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.replace(/\\n/g, "").trim();
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n").trim();
  if (!email || !key) {
    throw new Error("Missing Google service account credentials");
  }
  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// ── Transient-failure retry ─────────────────────────
// Google Sheets enforces per-minute quotas (~60 writes/min on a single service
// account). A matchday vote burst can briefly exceed that and get HTTP 429,
// which would otherwise 500 the vote and silently drop a sign-up. Retry the
// quota/5xx/network class with jittered exponential backoff so short spikes ride
// over the per-minute boundary instead of failing the customer.
const RETRYABLE_NET = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ENOTFOUND",
]);

function isRetryable(e: unknown): boolean {
  const err = e as {
    code?: number | string;
    status?: number;
    response?: { status?: number };
  };
  const status =
    typeof err?.code === "number" ? err.code : err?.status ?? err?.response?.status;
  if (typeof status === "number") return status === 429 || (status >= 500 && status < 600);
  if (typeof err?.code === "string") return RETRYABLE_NET.has(err.code);
  return false;
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i === attempts - 1 || !isRetryable(e)) throw e;
      const delay = Math.min(2000, 250 * 2 ** i) + Math.floor(Math.random() * 120);
      console.warn(`[sheets] ${label} retryable failure (attempt ${i + 1}), backoff ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ── Tabs ────────────────────────────────────────────
const TAB_VOTES = "KioskVotes";
const TAB_SESSION = "KioskSession";
const TAB_WINNERS = "KioskWinners";
const TAB_SMS = "KioskSms";
const TAB_UNIQUE = "UniqueVoters";

const HEADERS: Record<string, string[]> = {
  [TAB_VOTES]: [
    "ts",
    "matchId",
    "matchup",
    "side",
    "teamCode",
    "teamName",
    "firstName",
    "phone",
    "consent",
  ],
  [TAB_SESSION]: ["matchId", "status", "updatedAt", "lastDraw", "pinSticky"],
  [TAB_WINNERS]: ["ts", "matchId", "matchup", "firstName", "phone"],
  [TAB_SMS]: ["ts", "phone", "type", "status", "detail"],
  // Distinct voters across the whole tournament — row count = total unique users.
  [TAB_UNIQUE]: ["phone", "firstName", "gamesVoted", "firstVoteAt", "lastVoteAt"],
};

// Idempotent, memoized per warm instance: create the kiosk tabs + headers if missing.
let ensurePromise: Promise<void> | null = null;
export function ensureTabs(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = doEnsure().catch((e) => {
      ensurePromise = null; // allow retry on next call
      throw e;
    });
  }
  return ensurePromise;
}

async function doEnsure(): Promise<void> {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existing = new Set(
    (meta.data.sheets || []).map((s) => s.properties?.title || "")
  );
  const toAdd = Object.keys(HEADERS).filter((t) => !existing.has(t));
  if (toAdd.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: toAdd.map((title) => ({ addSheet: { properties: { title } } })),
      },
    });
  }
  for (const [title, headers] of Object.entries(HEADERS)) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${title}!A1:1`,
    });
    if (!res.data.values?.[0]?.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${title}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    }
  }
}

// ── Votes ───────────────────────────────────────────
export async function appendVote(v: VoteRecord): Promise<void> {
  await ensureTabs();
  const sheets = getSheets();
  await withRetry("appendVote", () =>
    sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TAB_VOTES}!A:I`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [
          [
            v.ts,
            String(v.matchId),
            v.matchup,
            v.side,
            v.teamCode,
            v.teamName,
            v.firstName,
            v.phone,
            v.consent ? "TRUE" : "FALSE",
          ],
        ],
      },
    })
  );
}

export async function getVoteLog(): Promise<VoteRecord[]> {
  await ensureTabs();
  const sheets = getSheets();
  const res = await withRetry("getVoteLog", () =>
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB_VOTES}!A2:I`,
    })
  );
  const rows = res.data.values || [];
  return rows
    .filter((r) => r && r.length && r[0])
    .map((r) => ({
      ts: r[0] || "",
      matchId: Number(r[1]) || 0,
      matchup: r[2] || "",
      side: (r[3] === "away" ? "away" : "home") as Side,
      teamCode: r[4] || "",
      teamName: r[5] || "",
      firstName: r[6] || "",
      phone: r[7] || "",
      consent: String(r[8]).toUpperCase() === "TRUE",
    }));
}

/** Latest pick per phone for a match — enforces the one-vote-per-game rule. */
function latestByPhone(log: VoteRecord[], matchId: number): Map<string, VoteRecord> {
  const m = new Map<string, VoteRecord>();
  for (const v of log) {
    if (v.matchId !== matchId || !v.phone) continue;
    m.set(v.phone, v); // later rows overwrite earlier → latest pick wins
  }
  return m;
}

/** Phones in first-seen order → stable index the wheel can land on deterministically. */
function firstSeenOrder(log: VoteRecord[], matchId: number): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const v of log) {
    if (v.matchId !== matchId || !v.phone) continue;
    if (!seen.has(v.phone)) {
      seen.add(v.phone);
      order.push(v.phone);
    }
  }
  return order;
}

export function tallyFromLog(log: VoteRecord[], matchId: number): Tally {
  const latest = latestByPhone(log, matchId);
  let home = 0;
  let away = 0;
  for (const v of latest.values()) {
    if (v.side === "home") home++;
    else away++;
  }
  return { matchId, home, away, total: latest.size };
}

export function entrantsFromLog(
  log: VoteRecord[],
  matchId: number
): { firstName: string; phone: string; side: Side }[] {
  const latest = latestByPhone(log, matchId);
  return firstSeenOrder(log, matchId).map((phone) => {
    const v = latest.get(phone)!;
    return { firstName: v.firstName, phone: v.phone, side: v.side };
  });
}

// ── Session ─────────────────────────────────────────
// Column A reused as the barista's pinned matchId, B as the manual status
// override ("" = auto). The live slot + open/closed are derived from the clock.
export async function getSession(): Promise<StoredSession | null> {
  await ensureTabs();
  const sheets = getSheets();
  const res = await withRetry("getSession", () =>
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB_SESSION}!A2:E2`,
    })
  );
  const r = res.data.values?.[0];
  if (!r || (!r[0] && !r[1] && !r[3])) return null;
  let lastDraw: DrawResult | null = null;
  if (r[3]) {
    try {
      lastDraw = JSON.parse(r[3]) as DrawResult;
    } catch {
      lastDraw = null;
    }
  }
  return {
    pinnedMatchId: r[0] ? Number(r[0]) || null : null,
    manualStatus: r[1] === "open" || r[1] === "closed" ? r[1] : "",
    updatedAt: r[2] || "",
    lastDraw,
    pinSticky: String(r[4]).toUpperCase() === "TRUE",
  };
}

export async function setSession(s: StoredSession): Promise<void> {
  await ensureTabs();
  const sheets = getSheets();
  await withRetry("setSession", () =>
    sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB_SESSION}!A2:E2`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            s.pinnedMatchId != null ? String(s.pinnedMatchId) : "",
            s.manualStatus,
            s.updatedAt,
            s.lastDraw ? JSON.stringify(s.lastDraw) : "",
            s.pinSticky ? "TRUE" : "",
          ],
        ],
      },
    })
  );
}

// ── Winners ─────────────────────────────────────────
export async function appendWinner(w: Winner): Promise<void> {
  await ensureTabs();
  const sheets = getSheets();
  await withRetry("appendWinner", () =>
    sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TAB_WINNERS}!A:E`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[w.ts, String(w.matchId), w.matchup, w.firstName, w.phone]],
      },
    })
  );
}

/** All winners across all games (matchId + phone) — for per-game draw dedup. */
export async function getAllWinners(): Promise<{ matchId: number; phone: string }[]> {
  await ensureTabs();
  const sheets = getSheets();
  const res = await withRetry("getAllWinners", () =>
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB_WINNERS}!A2:E`,
    })
  );
  const rows = res.data.values || [];
  return rows
    .filter((r) => r && r[1] && r[4])
    .map((r) => ({ matchId: Number(r[1]) || 0, phone: r[4] || "" }));
}

/** Full pre-cutover winners (ts, matchId, matchup, firstName, phone) — the
 *  source for the one-time winners backfill so Supabase's draw dedup knows about
 *  raffles drawn before the cutover (else an old-game re-draw could re-pay). */
export async function getAllWinnersFull(): Promise<Winner[]> {
  await ensureTabs();
  const sheets = getSheets();
  const res = await withRetry("getAllWinnersFull", () =>
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB_WINNERS}!A2:E`,
    })
  );
  const rows = res.data.values || [];
  return rows
    .filter((r) => r && r[1] && r[4])
    .map((r) => ({
      ts: r[0] || "",
      matchId: Number(r[1]) || 0,
      matchup: r[2] || "",
      firstName: r[3] || "",
      phone: r[4] || "",
    }));
}

// ── SMS audit log ───────────────────────────────────
export interface SmsLogRow {
  ts: string;
  phone: string;
  type: string;
  status: string;
  detail: string;
}

export async function appendSmsLog(r: SmsLogRow): Promise<void> {
  await ensureTabs();
  const sheets = getSheets();
  await withRetry("appendSmsLog", () =>
    sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TAB_SMS}!A:E`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[r.ts, r.phone, r.type, r.status, r.detail]] },
    })
  );
}

// ── Sheet mirror ────────────────────────────────────
// Supabase is the source of truth; the periodic cron (/api/cron/mirror-to-sheet)
// snapshots the current votes + winners here so results stay readable in the
// Sheet. Each mirror is at most 2 write calls per tab (clear + one bulk update)
// regardless of row count — never per-row, so the Sheets write quota is a non-issue.
async function replaceTab(tab: string, rows: string[][]): Promise<void> {
  await ensureTabs();
  const sheets = getSheets();
  await withRetry(`clear:${tab}`, () =>
    sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `${tab}!A2:Z` })
  );
  if (rows.length) {
    await withRetry(`mirror:${tab}`, () =>
      sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${tab}!A2`,
        valueInputOption: "RAW",
        requestBody: { values: rows },
      })
    );
  }
}

export async function mirrorVotesToSheet(votes: VoteRecord[]): Promise<void> {
  await replaceTab(
    TAB_VOTES,
    votes.map((v) => [
      v.ts, String(v.matchId), v.matchup, v.side, v.teamCode, v.teamName,
      v.firstName, v.phone, v.consent ? "TRUE" : "FALSE",
    ])
  );
}

export async function mirrorWinnersToSheet(winners: Winner[]): Promise<void> {
  await replaceTab(
    TAB_WINNERS,
    winners.map((w) => [w.ts, String(w.matchId), w.matchup, w.firstName, w.phone])
  );
}

/** Pre-built rows (phone, firstName, gamesVoted, firstVoteAt, lastVoteAt). */
export async function mirrorUniqueVotersToSheet(rows: string[][]): Promise<void> {
  await replaceTab(TAB_UNIQUE, rows);
}
