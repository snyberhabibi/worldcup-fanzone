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

// ── Featured slot + voting window (Central time) ──────────────
// A "slot" = games with the SAME kickoff (simultaneous) → stacked voting.
// Voting stays OPEN before, during, AND after a match: a game is the featured,
// votable slot from its kickoff until the NEXT game kicks off — capped at
// MAX_FEATURE_MIN so a late game doesn't linger overnight. This adapts to the
// schedule's varying gaps (as little as 2.5h) without ever overlapping the next
// game. The barista can still pause/advance manually.
const MAX_FEATURE_MIN = 240; // a game stays featured/votable at most 4h past kickoff (unless the next game starts sooner)

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

function slotDefOf(matchId: number): SlotDef | undefined {
  return SLOTS.find((s) => s.games.some((g) => g.id === matchId));
}

function nextSlotAfter(s: SlotDef): SlotDef | undefined {
  return SLOTS[SLOTS.indexOf(s) + 1];
}

// Single source of truth: a slot is votable from before kickoff until the NEXT
// slot kicks off (so people vote during AND after the match), capped so it can't
// linger for days once a slot is the last before a long gap / overnight.
function slotVotingOpen(s: SlotDef, now: Date): boolean {
  const t = now.getTime();
  const next = nextSlotAfter(s);
  if (next && t >= next.kickoff.getTime()) return false; // the next game has started → this one's window is over
  return t < s.kickoff.getTime() + MAX_FEATURE_MIN * 60_000;
}

/** The featured slot: the most recently kicked-off slot while it's still in its
 *  window (stays put after the match until the next game starts), else the next
 *  upcoming, else the last. */
export function currentSlotGames(now: Date): Match[] {
  const t = now.getTime();
  let latest: SlotDef | undefined;
  for (const s of SLOTS) {
    if (s.kickoff.getTime() <= t) latest = s; // SLOTS sorted ascending → keep the last one at/under now
    else break;
  }
  if (latest && slotVotingOpen(latest, now)) return latest.games;
  const next = SLOTS.find((s) => s.kickoff.getTime() > t);
  return (next ?? SLOTS[SLOTS.length - 1]).games;
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
  return slotVotingOpen(s, now);
}

export function isSlotEnded(matchId: number, now: Date): boolean {
  const s = slotDefOf(matchId);
  if (!s) return false;
  return !slotVotingOpen(s, now);
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
