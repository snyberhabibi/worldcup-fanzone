// ─────────────────────────────────────────────────────────────
// Kiosk + Board shared contracts
// One customer-facing voting kiosk (iPad) + one projector board.
// All persistence lives in Google Sheets (see src/lib/google-sheets.ts).
// ─────────────────────────────────────────────────────────────

export type Side = "home" | "away";

export type SessionStatus = "open" | "closed";

/** One row in the KioskVotes log. Append-only; latest row per phone wins. */
export interface VoteRecord {
  ts: string; // ISO timestamp
  matchId: number;
  matchup: string; // e.g. "USA vs PAR"
  side: Side;
  teamCode: string; // chosen team FIFA code (or knockout placeholder)
  teamName: string;
  firstName: string;
  phone: string; // 10-digit, digits only
  consent: boolean;
}

/** Derived live tally for a single match (distinct voters, one per phone). */
export interface Tally {
  matchId: number;
  home: number;
  away: number;
  total: number;
}

/** Result of a spin-the-wheel raffle draw, broadcast to the board via session. */
export interface DrawResult {
  nonce: string; // changes every draw so the board can detect a new one
  matchId: number;
  winnerIndex: number; // index into the stable (first-seen) entrant ordering
  firstName: string;
  phoneMasked: string; // never expose full phone on the public board
  poolSize: number;
}

/** Shared control state set by the barista on the kiosk, mirrored on the board. */
export interface SessionState {
  matchId: number;
  status: SessionStatus;
  updatedAt: string;
  lastDraw: DrawResult | null;
}

/** Public-safe entrant for the wheel (masked phone only). */
export interface Entrant {
  firstName: string;
  phoneMasked: string;
  side: Side;
}

/** One row in the KioskWinners log (full phone — private tab). */
export interface Winner {
  ts: string;
  matchId: number;
  matchup: string;
  firstName: string;
  phone: string;
}
