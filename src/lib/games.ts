// Schedule helpers built on the static src/data/schedule.ts dataset.
// Handles knockout placeholder codes (2A, 1E, W74, L101, 3ABCDF) gracefully
// and renders all kickoff times in US Central (Dallas) time.

import { MATCHES, TEAMS, type Match } from "@/data/schedule";

export interface ResolvedTeam {
  code: string;
  name: string;
  flag: string;
  placeholder: boolean;
}

const GROUP_RE = /^([12])([A-L])$/; // 1A winner / 2B runner-up
const THIRD_RE = /^3([A-L]{2,})$/; // 3ABCDF best third
const WIN_RE = /^W(\d+)$/; // winner of match N
const LOSE_RE = /^L(\d+)$/; // loser of match N

export function placeholderLabel(code: string): string {
  let m: RegExpMatchArray | null;
  if ((m = code.match(GROUP_RE))) {
    return `${m[1] === "1" ? "Winner" : "Runner-up"} Group ${m[2]}`;
  }
  if ((m = code.match(THIRD_RE))) {
    return `3rd place ${m[1].split("").join("/")}`;
  }
  if ((m = code.match(WIN_RE))) return `Winner Match ${m[1]}`;
  if ((m = code.match(LOSE_RE))) return `Loser Match ${m[1]}`;
  return code;
}

export function resolveTeam(code: string): ResolvedTeam {
  const t = TEAMS[code];
  if (t) return { code, name: t.name, flag: t.flag_emoji, placeholder: false };
  return { code, name: placeholderLabel(code), flag: "🏆", placeholder: true };
}

export function kickoff(match: Match): Date {
  return new Date(match.date);
}

// A match stays "current" until ~2.5h after kickoff so a live game keeps showing.
const LIVE_BUFFER_MIN = 150;

export function hasEnded(match: Match, now: Date): boolean {
  return now.getTime() > kickoff(match).getTime() + LIVE_BUFFER_MIN * 60_000;
}

export function isLive(match: Match, now: Date): boolean {
  const k = kickoff(match).getTime();
  return now.getTime() >= k && !hasEnded(match, now);
}

const BY_KICKOFF: Match[] = [...MATCHES].sort(
  (a, b) => kickoff(a).getTime() - kickoff(b).getTime()
);

export function getMatch(id: number): Match | undefined {
  return MATCHES.find((m) => m.id === id);
}

/** The game nearest "now": a live one if any, else the next upcoming, else the last. */
export function pickDefaultMatchId(now: Date): number {
  const live = BY_KICKOFF.find((m) => isLive(m, now));
  if (live) return live.id;
  const next = BY_KICKOFF.find((m) => kickoff(m).getTime() > now.getTime());
  if (next) return next.id;
  return BY_KICKOFF[BY_KICKOFF.length - 1].id;
}

export function upcomingMatches(now: Date, count: number): Match[] {
  return BY_KICKOFF.filter((m) => !hasEnded(m, now)).slice(0, count);
}

export function allMatchesByKickoff(): Match[] {
  return BY_KICKOFF;
}

export function matchup(match: Match): string {
  return `${match.homeTeam} vs ${match.awayTeam}`;
}

const CT_ZONE = "America/Chicago";

export function formatKickoffCT(match: Match): { day: string; time: string; full: string } {
  const d = kickoff(match);
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: CT_ZONE,
  }).format(d);
  const time =
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: CT_ZONE,
    }).format(d) + " CT";
  return { day, time, full: `${day} · ${time}` };
}

const STAGE_LABELS: Record<Match["stage"], string> = {
  group: "Group Stage",
  "round-of-32": "Round of 32",
  "round-of-16": "Round of 16",
  quarterfinal: "Quarterfinal",
  semifinal: "Semifinal",
  "third-place": "Third-Place Playoff",
  final: "Final",
};

export function stageLabel(match: Match): string {
  return match.group ? `Group ${match.group}` : STAGE_LABELS[match.stage];
}

// ── Auto-progression slots (Central time) ─────────────────────
// A "slot" = games with the SAME kickoff (simultaneous) → stacked voting.
// Voting stays open for the ENTIRE game (~2h from kickoff: 90' + halftime +
// stoppage), then the slot auto-advances to the next game. Timing is estimated
// from the scheduled kickoff; the barista can still pause/advance manually.
export const VOTE_CLOSE_MIN = 120; // whole game — kickoff to ~full time
export const SLOT_END_MIN = 120; // advance to the next game at full time

interface SlotDef {
  kickoff: Date;
  games: Match[];
}

const SLOTS: SlotDef[] = (() => {
  const map = new Map<string, Match[]>();
  for (const g of BY_KICKOFF) {
    const arr = map.get(g.date);
    if (arr) arr.push(g);
    else map.set(g.date, [g]);
  }
  return Array.from(map.values())
    .map((games) => ({ kickoff: kickoff(games[0]), games }))
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
})();

function slotEnded(s: SlotDef, now: Date): boolean {
  return now.getTime() >= s.kickoff.getTime() + SLOT_END_MIN * 60_000;
}

function slotDefOf(matchId: number): SlotDef | undefined {
  return SLOTS.find((s) => s.games.some((g) => g.id === matchId));
}

/** The active slot's games by clock: the first slot not yet ended (auto-advances). */
export function currentSlotGames(now: Date): Match[] {
  const s = SLOTS.find((x) => !slotEnded(x, now)) ?? SLOTS[SLOTS.length - 1];
  return s.games;
}

/** The other games kicking off at the same time as `matchId` (incl. itself). */
export function slotGamesOf(matchId: number): Match[] {
  const s = slotDefOf(matchId);
  if (s) return s.games;
  const m = getMatch(matchId);
  return m ? [m] : [];
}

export function isSlotOpen(matchId: number, now: Date): boolean {
  const s = slotDefOf(matchId);
  if (!s) return true;
  return now.getTime() < s.kickoff.getTime() + VOTE_CLOSE_MIN * 60_000;
}

export function isSlotEnded(matchId: number, now: Date): boolean {
  const s = slotDefOf(matchId);
  if (!s) return false;
  return slotEnded(s, now);
}

// ── Today's slate (Central time) ──────────────────────────────
// The calendar day a kickoff falls on in US Central. Precomputed once since
// match datetimes are static, so the board can recompute "today" cheaply.
function ctDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: CT_ZONE,
  }).format(d);
}

const MATCH_CT_DAY = new Map<number, string>(
  BY_KICKOFF.map((m) => [m.id, ctDayKey(kickoff(m))])
);

export function matchStatus(match: Match, now: Date): "live" | "final" | "upcoming" {
  if (isLive(match, now)) return "live";
  if (hasEnded(match, now)) return "final";
  return "upcoming";
}

/**
 * Matches on "today" in Central time. If today has no games (a rest day),
 * falls back to the next day that does, so the board panel is never empty.
 */
export function matchesOnDay(now: Date): {
  isToday: boolean;
  label: string;
  matches: Match[];
} {
  const todayKey = ctDayKey(now);
  let matches = BY_KICKOFF.filter((m) => MATCH_CT_DAY.get(m.id) === todayKey);
  const isToday = matches.length > 0;
  if (!isToday) {
    const next = BY_KICKOFF.find((m) => kickoff(m).getTime() >= now.getTime());
    if (next) {
      const nextKey = MATCH_CT_DAY.get(next.id);
      matches = BY_KICKOFF.filter((m) => MATCH_CT_DAY.get(m.id) === nextKey);
    }
  }
  const label = matches.length
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        timeZone: CT_ZONE,
      }).format(kickoff(matches[0]))
    : "";
  return { isToday, label, matches };
}
