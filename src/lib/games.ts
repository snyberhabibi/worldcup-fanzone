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
