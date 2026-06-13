// Resolves knockout matchups from the live bracket and produces the overrides
// the schedule merges. Source: ESPN's public soccer scoreboard (no API key).
// It exposes WC fixtures keyed by the SAME venue + datetime as our static
// schedule, and uses the SAME placeholder codes (2A, W74…) until teams are
// decided — so matching is exact and "resolved vs not" is trivial to detect.
//
// Fail-safe by design: anything uncertain (no venue/date match, ESPN still
// showing a placeholder, an unknown team) is skipped, never guessed. Worst
// case the cron resolves nothing and the schedule keeps its placeholders.

import { RAW_MATCHES_REF, TEAMS, type Match } from "@/data/schedule";
import currentOverrides from "@/data/knockout-overrides.json";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
// 2A / 2B (group winner/runner-up), 3ABCDF (best third), W74 / L101 (match w/l).
const PLACEHOLDER_RE = /^([12][A-L]|3[A-L]{2,}|[WL]\d+)$/i;

type Override = { homeTeam?: string; awayTeam?: string };
type Overrides = Record<string, Override>;

interface EspnTeam { abbreviation?: string; displayName?: string; shortDisplayName?: string }
interface EspnCompetitor { homeAway?: string; team?: EspnTeam }
interface EspnEvent {
  date?: string;
  competitions?: { venue?: { fullName?: string }; competitors?: EspnCompetitor[] }[];
}
interface EspnResp { events?: EspnEvent[] }

function normVenue(v: string): string {
  return (v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function dayKey(iso: string): string {
  // YYYY-MM-DD in UTC — stable across the seconds/format differences between
  // ESPN ("…T19:00Z") and our data ("…T19:00:00Z"), and tolerant of FIFA
  // nudging a kickoff time within the same day.
  return new Date(iso).toISOString().slice(0, 10);
}

// ESPN team → our FIFA code (or null if still a placeholder / unknown).
const NAME_TO_CODE: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [code, t] of Object.entries(TEAMS)) {
    m[code.toUpperCase()] = code;
    m[t.name.toLowerCase()] = code;
  }
  return m;
})();

function resolveCode(team: EspnTeam | undefined): string | null {
  if (!team) return null;
  const abbr = (team.abbreviation || "").toUpperCase();
  if (abbr && PLACEHOLDER_RE.test(abbr)) return null; // ESPN still shows a placeholder
  if (abbr && TEAMS[abbr]) return abbr;
  const byName = NAME_TO_CODE[(team.displayName || "").toLowerCase()]
    || NAME_TO_CODE[(team.shortDisplayName || "").toLowerCase()];
  if (byName) return byName;
  if (abbr && NAME_TO_CODE[abbr]) return NAME_TO_CODE[abbr];
  return null;
}

interface EspnFixture { day: string; venue: string; home: string | null; away: string | null }

function parseEvents(j: EspnResp): EspnFixture[] {
  const out: EspnFixture[] = [];
  for (const e of j.events || []) {
    const c = e.competitions?.[0];
    if (!c || !e.date) continue;
    const comps = c.competitors || [];
    const homeC = comps.find((x) => x.homeAway === "home") ?? comps[0];
    const awayC = comps.find((x) => x.homeAway === "away") ?? comps[1];
    out.push({
      day: dayKey(e.date),
      venue: normVenue(c.venue?.fullName || ""),
      home: resolveCode(homeC?.team),
      away: resolveCode(awayC?.team),
    });
  }
  return out;
}

async function fetchEspnForDays(daysYmd: string[]): Promise<EspnFixture[]> {
  const batches = await Promise.all(
    daysYmd.map(async (d) => {
      try {
        const res = await fetch(`${ESPN}?dates=${d}`, {
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "fanzone-schedule-cron" },
        });
        if (!res.ok) return [];
        return parseEvents((await res.json()) as EspnResp);
      } catch {
        return [];
      }
    })
  );
  return batches.flat();
}

export interface SyncResult {
  changed: boolean;
  espnFixtures: number;
  knockoutMatched: number; // our knockout matches that found an ESPN fixture (proves matching works)
  resolved: { id: number; home: string; away: string }[];
  overrides: Overrides;
}

export async function computeScheduleSync(): Promise<SyncResult> {
  const knockout: Match[] = RAW_MATCHES_REF.filter((m) => m.stage !== "group");
  const daysYmd = Array.from(
    new Set(knockout.map((m) => dayKey(m.date).replace(/-/g, "")))
  ).sort();

  const fixtures = await fetchEspnForDays(daysYmd);
  const idx = new Map<string, EspnFixture>();
  for (const f of fixtures) idx.set(`${f.day}|${f.venue}`, f);

  const existing = (currentOverrides as Overrides) ?? {};
  const next: Overrides = { ...existing };
  const resolved: SyncResult["resolved"] = [];
  let knockoutMatched = 0;

  for (const m of knockout) {
    const f = idx.get(`${dayKey(m.date)}|${normVenue(m.venue)}`);
    if (!f) continue;
    knockoutMatched++;
    const cur = next[String(m.id)] ?? {};
    const effHome = cur.homeTeam || m.homeTeam;
    const effAway = cur.awayTeam || m.awayTeam;
    const home = f.home && f.home !== effHome ? f.home : null;
    const away = f.away && f.away !== effAway ? f.away : null;
    if (home || away) {
      next[String(m.id)] = { homeTeam: home || effHome, awayTeam: away || effAway };
      resolved.push({ id: m.id, home: next[String(m.id)].homeTeam!, away: next[String(m.id)].awayTeam! });
    }
  }

  return {
    changed: JSON.stringify(next) !== JSON.stringify(existing),
    espnFixtures: fixtures.length,
    knockoutMatched,
    resolved,
    overrides: next,
  };
}
