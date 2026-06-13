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

// ── Tabs ────────────────────────────────────────────
const TAB_VOTES = "KioskVotes";
const TAB_SESSION = "KioskSession";
const TAB_WINNERS = "KioskWinners";
const TAB_SMS = "KioskSms";

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
  [TAB_SESSION]: ["matchId", "status", "updatedAt", "lastDraw"],
  [TAB_WINNERS]: ["ts", "matchId", "matchup", "firstName", "phone"],
  [TAB_SMS]: ["ts", "phone", "type", "status", "detail"],
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
  await sheets.spreadsheets.values.append({
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
  });
}

export async function getVoteLog(): Promise<VoteRecord[]> {
  await ensureTabs();
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_VOTES}!A2:I`,
  });
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
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_SESSION}!A2:D2`,
  });
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
  };
}

export async function setSession(s: StoredSession): Promise<void> {
  await ensureTabs();
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB_SESSION}!A2:D2`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          s.pinnedMatchId != null ? String(s.pinnedMatchId) : "",
          s.manualStatus,
          s.updatedAt,
          s.lastDraw ? JSON.stringify(s.lastDraw) : "",
        ],
      ],
    },
  });
}

// ── Winners ─────────────────────────────────────────
export async function appendWinner(w: Winner): Promise<void> {
  await ensureTabs();
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB_WINNERS}!A:E`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[w.ts, String(w.matchId), w.matchup, w.firstName, w.phone]],
    },
  });
}

/** All winners across all games (matchId + phone) — for per-game draw dedup. */
export async function getAllWinners(): Promise<{ matchId: number; phone: string }[]> {
  await ensureTabs();
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_WINNERS}!A2:E`,
  });
  const rows = res.data.values || [];
  return rows
    .filter((r) => r && r[1] && r[4])
    .map((r) => ({ matchId: Number(r[1]) || 0, phone: r[4] || "" }));
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
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB_SMS}!A:E`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[r.ts, r.phone, r.type, r.status, r.detail]] },
  });
}
