import { MATCHES } from "@/data/schedule";

/**
 * Match badge system for the schedule page.
 * Priority: RIVALRY > MUST WATCH > DFW GAME > HOT
 * Only one badge per match.
 */

type BadgeType = "RIVALRY" | "MUST WATCH" | "DFW GAME" | "HOT";

interface MatchBadge {
  label: string;
  color: string;
}

const BADGE_STYLES: Record<BadgeType, MatchBadge> = {
  RIVALRY: {
    label: "RIVALRY",
    color: "bg-purple-600/10 text-purple-600",
  },
  "MUST WATCH": {
    label: "MUST WATCH",
    color: "bg-red/10 text-red",
  },
  "DFW GAME": {
    label: "DFW GAME",
    color: "bg-gold/10 text-[#7a6020]",
  },
  HOT: {
    label: "HOT",
    color: "bg-[#E8934A]/10 text-[#E8934A]",
  },
};

/** Teams whose games qualify as MUST WATCH */
const MUST_WATCH_TEAMS = new Set([
  "USA", "ARG", "BRA", "FRA", "ENG", "GER", "ESP",
]);

/** Teams whose games qualify as HOT */
const HOT_TEAMS = new Set([
  "KSA", "MEX", "JPN", "KOR", "MAR", "EGY",
]);

/** Known rivalries — each entry is a pair of team codes (sorted alphabetically) */
const RIVALRIES: [string, string][] = [
  ["MEX", "USA"],
  ["ARG", "BRA"],
  ["ENG", "GER"],
  ["ARG", "ENG"],
  ["BRA", "GER"],
  ["FRA", "GER"],
  ["ESP", "POR"],
  ["ARG", "URU"],
  ["BRA", "URU"],
  ["ENG", "SCO"],
  ["NED", "GER"],
  ["FRA", "ENG"],
  ["BRA", "ARG"],
  ["KOR", "JPN"],
  ["MEX", "USA"],
];

/** Normalised set for O(1) rivalry lookup */
const RIVALRY_SET = new Set(
  RIVALRIES.map(([a, b]) => {
    const sorted = [a, b].sort();
    return `${sorted[0]}-${sorted[1]}`;
  })
);

function isRivalry(home: string, away: string): boolean {
  const key = [home, away].sort().join("-");
  return RIVALRY_SET.has(key);
}

function isLocalDerby(venue: string): boolean {
  return venue === "AT&T Stadium";
}

function isMustWatch(home: string, away: string): boolean {
  return MUST_WATCH_TEAMS.has(home) || MUST_WATCH_TEAMS.has(away);
}

function isHot(home: string, away: string): boolean {
  return HOT_TEAMS.has(home) || HOT_TEAMS.has(away);
}

/**
 * Get the badge for a match by ID.
 * Priority: RIVALRY > MUST WATCH > DFW GAME > HOT
 * Returns null if no badge applies.
 */
export function getMatchBadge(matchId: number): MatchBadge | null {
  const match = MATCHES.find((m) => m.id === matchId);
  if (!match) return null;

  // Only badge group-stage matches (knockout teams are placeholders like "W97")
  if (match.stage !== "group") return null;

  if (isRivalry(match.homeTeam, match.awayTeam)) {
    return BADGE_STYLES["RIVALRY"];
  }

  if (isMustWatch(match.homeTeam, match.awayTeam)) {
    return BADGE_STYLES["MUST WATCH"];
  }

  if (isLocalDerby(match.venue)) {
    return BADGE_STYLES["DFW GAME"];
  }

  if (isHot(match.homeTeam, match.awayTeam)) {
    return BADGE_STYLES["HOT"];
  }

  return null;
}
