/**
 * FIFA World Cup 2026 - Complete Schedule Data
 * Tournament: June 11 - July 19, 2026
 * Hosts: United States, Canada, Mexico
 * 48 teams, 12 groups, 104 matches, 16 venues
 *
 * Sources:
 * - FIFA.com official match schedule
 * - NBC Sports confirmed schedule
 * - Yahoo Sports daily schedule
 * - Sky Sports fixture list
 *
 * All times are in US Eastern Time (ET).
 * For UTC, add 4 hours (EDT = UTC-4 during summer).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Team {
  name: string;
  code: string; // FIFA three-letter code
  flag_emoji: string;
}

export interface Group {
  groupName: string;
  teams: Team[];
}

export interface Match {
  id: number;
  date: string;       // ISO 8601 date string (UTC)
  time: string;       // ET kick-off time (e.g. "3:00 PM")
  time_utc: string;   // UTC kick-off time (e.g. "19:00")
  homeTeam: string;   // FIFA code
  awayTeam: string;   // FIFA code
  group: string | null; // Group letter or null for knockout
  venue: string;
  city: string;
  stage: "group" | "round-of-32" | "round-of-16" | "quarterfinal" | "semifinal" | "third-place" | "final";
}

// ---------------------------------------------------------------------------
// Teams (all 48, sorted by FIFA code)
// ---------------------------------------------------------------------------

export const TEAMS: Record<string, Team> = {
  ALG: { name: "Algeria",                  code: "ALG", flag_emoji: "\u{1F1E9}\u{1F1FF}" },
  ARG: { name: "Argentina",                code: "ARG", flag_emoji: "\u{1F1E6}\u{1F1F7}" },
  AUS: { name: "Australia",                code: "AUS", flag_emoji: "\u{1F1E6}\u{1F1FA}" },
  AUT: { name: "Austria",                  code: "AUT", flag_emoji: "\u{1F1E6}\u{1F1F9}" },
  BEL: { name: "Belgium",                  code: "BEL", flag_emoji: "\u{1F1E7}\u{1F1EA}" },
  BIH: { name: "Bosnia and Herzegovina",   code: "BIH", flag_emoji: "\u{1F1E7}\u{1F1E6}" },
  BRA: { name: "Brazil",                   code: "BRA", flag_emoji: "\u{1F1E7}\u{1F1F7}" },
  CAN: { name: "Canada",                   code: "CAN", flag_emoji: "\u{1F1E8}\u{1F1E6}" },
  CIV: { name: "C\u00f4te d'Ivoire",       code: "CIV", flag_emoji: "\u{1F1E8}\u{1F1EE}" },
  COD: { name: "DR Congo",                 code: "COD", flag_emoji: "\u{1F1E8}\u{1F1E9}" },
  COL: { name: "Colombia",                 code: "COL", flag_emoji: "\u{1F1E8}\u{1F1F4}" },
  CPV: { name: "Cabo Verde",               code: "CPV", flag_emoji: "\u{1F1E8}\u{1F1FB}" },
  CRO: { name: "Croatia",                  code: "CRO", flag_emoji: "\u{1F1ED}\u{1F1F7}" },
  CUW: { name: "Cura\u00e7ao",             code: "CUW", flag_emoji: "\u{1F1E8}\u{1F1FC}" },
  CZE: { name: "Czechia",                  code: "CZE", flag_emoji: "\u{1F1E8}\u{1F1FF}" },
  ECU: { name: "Ecuador",                  code: "ECU", flag_emoji: "\u{1F1EA}\u{1F1E8}" },
  EGY: { name: "Egypt",                    code: "EGY", flag_emoji: "\u{1F1EA}\u{1F1EC}" },
  ENG: { name: "England",                  code: "ENG", flag_emoji: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}" },
  ESP: { name: "Spain",                    code: "ESP", flag_emoji: "\u{1F1EA}\u{1F1F8}" },
  FRA: { name: "France",                   code: "FRA", flag_emoji: "\u{1F1EB}\u{1F1F7}" },
  GER: { name: "Germany",                  code: "GER", flag_emoji: "\u{1F1E9}\u{1F1EA}" },
  GHA: { name: "Ghana",                    code: "GHA", flag_emoji: "\u{1F1EC}\u{1F1ED}" },
  HAI: { name: "Haiti",                    code: "HAI", flag_emoji: "\u{1F1ED}\u{1F1F9}" },
  IRN: { name: "Iran",                     code: "IRN", flag_emoji: "\u{1F1EE}\u{1F1F7}" },
  IRQ: { name: "Iraq",                     code: "IRQ", flag_emoji: "\u{1F1EE}\u{1F1F6}" },
  JOR: { name: "Jordan",                   code: "JOR", flag_emoji: "\u{1F1EF}\u{1F1F4}" },
  JPN: { name: "Japan",                    code: "JPN", flag_emoji: "\u{1F1EF}\u{1F1F5}" },
  KOR: { name: "Korea Republic",           code: "KOR", flag_emoji: "\u{1F1F0}\u{1F1F7}" },
  KSA: { name: "Saudi Arabia",             code: "KSA", flag_emoji: "\u{1F1F8}\u{1F1E6}" },
  MAR: { name: "Morocco",                  code: "MAR", flag_emoji: "\u{1F1F2}\u{1F1E6}" },
  MEX: { name: "Mexico",                   code: "MEX", flag_emoji: "\u{1F1F2}\u{1F1FD}" },
  NED: { name: "Netherlands",              code: "NED", flag_emoji: "\u{1F1F3}\u{1F1F1}" },
  NOR: { name: "Norway",                   code: "NOR", flag_emoji: "\u{1F1F3}\u{1F1F4}" },
  NZL: { name: "New Zealand",              code: "NZL", flag_emoji: "\u{1F1F3}\u{1F1FF}" },
  PAN: { name: "Panama",                   code: "PAN", flag_emoji: "\u{1F1F5}\u{1F1E6}" },
  PAR: { name: "Paraguay",                 code: "PAR", flag_emoji: "\u{1F1F5}\u{1F1FE}" },
  POR: { name: "Portugal",                 code: "POR", flag_emoji: "\u{1F1F5}\u{1F1F9}" },
  QAT: { name: "Qatar",                    code: "QAT", flag_emoji: "\u{1F1F6}\u{1F1E6}" },
  RSA: { name: "South Africa",             code: "RSA", flag_emoji: "\u{1F1FF}\u{1F1E6}" },
  SCO: { name: "Scotland",                 code: "SCO", flag_emoji: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}" },
  SEN: { name: "Senegal",                  code: "SEN", flag_emoji: "\u{1F1F8}\u{1F1F3}" },
  SUI: { name: "Switzerland",              code: "SUI", flag_emoji: "\u{1F1E8}\u{1F1ED}" },
  SWE: { name: "Sweden",                   code: "SWE", flag_emoji: "\u{1F1F8}\u{1F1EA}" },
  TUN: { name: "Tunisia",                  code: "TUN", flag_emoji: "\u{1F1F9}\u{1F1F3}" },
  TUR: { name: "T\u00fcrkiye",             code: "TUR", flag_emoji: "\u{1F1F9}\u{1F1F7}" },
  URU: { name: "Uruguay",                  code: "URU", flag_emoji: "\u{1F1FA}\u{1F1FE}" },
  USA: { name: "United States",            code: "USA", flag_emoji: "\u{1F1FA}\u{1F1F8}" },
  UZB: { name: "Uzbekistan",               code: "UZB", flag_emoji: "\u{1F1FA}\u{1F1FF}" },
};

// ---------------------------------------------------------------------------
// Groups (A through L)
// ---------------------------------------------------------------------------

export const GROUPS: Group[] = [
  {
    groupName: "A",
    teams: [TEAMS.MEX, TEAMS.RSA, TEAMS.KOR, TEAMS.CZE],
  },
  {
    groupName: "B",
    teams: [TEAMS.CAN, TEAMS.SUI, TEAMS.QAT, TEAMS.BIH],
  },
  {
    groupName: "C",
    teams: [TEAMS.BRA, TEAMS.MAR, TEAMS.HAI, TEAMS.SCO],
  },
  {
    groupName: "D",
    teams: [TEAMS.USA, TEAMS.PAR, TEAMS.AUS, TEAMS.TUR],
  },
  {
    groupName: "E",
    teams: [TEAMS.GER, TEAMS.CUW, TEAMS.CIV, TEAMS.ECU],
  },
  {
    groupName: "F",
    teams: [TEAMS.NED, TEAMS.JPN, TEAMS.TUN, TEAMS.SWE],
  },
  {
    groupName: "G",
    teams: [TEAMS.BEL, TEAMS.EGY, TEAMS.IRN, TEAMS.NZL],
  },
  {
    groupName: "H",
    teams: [TEAMS.ESP, TEAMS.CPV, TEAMS.KSA, TEAMS.URU],
  },
  {
    groupName: "I",
    teams: [TEAMS.FRA, TEAMS.SEN, TEAMS.NOR, TEAMS.IRQ],
  },
  {
    groupName: "J",
    teams: [TEAMS.ARG, TEAMS.ALG, TEAMS.AUT, TEAMS.JOR],
  },
  {
    groupName: "K",
    teams: [TEAMS.POR, TEAMS.UZB, TEAMS.COL, TEAMS.COD],
  },
  {
    groupName: "L",
    teams: [TEAMS.ENG, TEAMS.CRO, TEAMS.GHA, TEAMS.PAN],
  },
];

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

export const VENUES = {
  AZTECA:           { name: "Estadio Azteca",           city: "Mexico City, Mexico" },
  AKRON:            { name: "Estadio Akron",            city: "Guadalajara, Mexico" },
  BBVA:             { name: "Estadio BBVA",             city: "Monterrey, Mexico" },
  BMO:              { name: "BMO Field",                city: "Toronto, Canada" },
  BC_PLACE:         { name: "BC Place",                 city: "Vancouver, Canada" },
  METLIFE:          { name: "MetLife Stadium",          city: "East Rutherford, NJ" },
  SOFI:             { name: "SoFi Stadium",             city: "Inglewood, CA" },
  LEVIS:            { name: "Levi's Stadium",           city: "Santa Clara, CA" },
  GILLETTE:         { name: "Gillette Stadium",         city: "Foxborough, MA" },
  LINCOLN:          { name: "Lincoln Financial Field",  city: "Philadelphia, PA" },
  ATT:              { name: "AT&T Stadium",             city: "Arlington, TX" },
  NRG:              { name: "NRG Stadium",              city: "Houston, TX" },
  ARROWHEAD:        { name: "Arrowhead Stadium",        city: "Kansas City, MO" },
  MERCEDES:         { name: "Mercedes-Benz Stadium",    city: "Atlanta, GA" },
  HARD_ROCK:        { name: "Hard Rock Stadium",        city: "Miami Gardens, FL" },
  LUMEN:            { name: "Lumen Field",              city: "Seattle, WA" },
} as const;

// ---------------------------------------------------------------------------
// Matches (all 104)
// ---------------------------------------------------------------------------

export const MATCHES: Match[] = [
  // =========================================================================
  // GROUP STAGE — 72 matches (June 11 - June 27)
  // =========================================================================

  // --- Group A ---
  { id: 1,  date: "2026-06-11T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "MEX", awayTeam: "RSA", group: "A", venue: "Estadio Azteca",           city: "Mexico City, Mexico",      stage: "group" },
  { id: 2,  date: "2026-06-12T02:00:00Z", time: "10:00 PM", time_utc: "02:00", homeTeam: "KOR", awayTeam: "CZE", group: "A", venue: "Estadio Akron",            city: "Guadalajara, Mexico",      stage: "group" },
  { id: 3,  date: "2026-06-18T16:00:00Z", time: "12:00 PM", time_utc: "16:00", homeTeam: "CZE", awayTeam: "RSA", group: "A", venue: "Mercedes-Benz Stadium",    city: "Atlanta, GA",              stage: "group" },
  { id: 4,  date: "2026-06-19T01:00:00Z", time: "9:00 PM",  time_utc: "01:00", homeTeam: "MEX", awayTeam: "KOR", group: "A", venue: "Estadio Akron",            city: "Guadalajara, Mexico",      stage: "group" },
  { id: 5,  date: "2026-06-25T01:00:00Z", time: "9:00 PM",  time_utc: "01:00", homeTeam: "CZE", awayTeam: "MEX", group: "A", venue: "Estadio Azteca",           city: "Mexico City, Mexico",      stage: "group" },
  { id: 6,  date: "2026-06-25T01:00:00Z", time: "9:00 PM",  time_utc: "01:00", homeTeam: "RSA", awayTeam: "KOR", group: "A", venue: "Estadio BBVA",             city: "Monterrey, Mexico",        stage: "group" },

  // --- Group B ---
  { id: 7,  date: "2026-06-12T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "CAN", awayTeam: "BIH", group: "B", venue: "BMO Field",                city: "Toronto, Canada",          stage: "group" },
  { id: 8,  date: "2026-06-13T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "QAT", awayTeam: "SUI", group: "B", venue: "Levi's Stadium",           city: "Santa Clara, CA",          stage: "group" },
  { id: 9,  date: "2026-06-18T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "SUI", awayTeam: "BIH", group: "B", venue: "SoFi Stadium",             city: "Inglewood, CA",            stage: "group" },
  { id: 10, date: "2026-06-18T22:00:00Z", time: "6:00 PM",  time_utc: "22:00", homeTeam: "CAN", awayTeam: "QAT", group: "B", venue: "BC Place",                 city: "Vancouver, Canada",        stage: "group" },
  { id: 11, date: "2026-06-24T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "SUI", awayTeam: "CAN", group: "B", venue: "BC Place",                 city: "Vancouver, Canada",        stage: "group" },
  { id: 12, date: "2026-06-24T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "BIH", awayTeam: "QAT", group: "B", venue: "Lumen Field",              city: "Seattle, WA",              stage: "group" },

  // --- Group C ---
  { id: 13, date: "2026-06-13T22:00:00Z", time: "6:00 PM",  time_utc: "22:00", homeTeam: "BRA", awayTeam: "MAR", group: "C", venue: "MetLife Stadium",          city: "East Rutherford, NJ",      stage: "group" },
  { id: 14, date: "2026-06-14T01:00:00Z", time: "9:00 PM",  time_utc: "01:00", homeTeam: "HAI", awayTeam: "SCO", group: "C", venue: "Gillette Stadium",         city: "Foxborough, MA",           stage: "group" },
  { id: 15, date: "2026-06-19T22:00:00Z", time: "6:00 PM",  time_utc: "22:00", homeTeam: "SCO", awayTeam: "MAR", group: "C", venue: "Gillette Stadium",         city: "Foxborough, MA",           stage: "group" },
  { id: 16, date: "2026-06-20T00:30:00Z", time: "8:30 PM",  time_utc: "00:30", homeTeam: "BRA", awayTeam: "HAI", group: "C", venue: "Lincoln Financial Field",  city: "Philadelphia, PA",         stage: "group" },
  { id: 17, date: "2026-06-24T22:00:00Z", time: "6:00 PM",  time_utc: "22:00", homeTeam: "SCO", awayTeam: "BRA", group: "C", venue: "Hard Rock Stadium",        city: "Miami Gardens, FL",        stage: "group" },
  { id: 18, date: "2026-06-24T22:00:00Z", time: "6:00 PM",  time_utc: "22:00", homeTeam: "MAR", awayTeam: "HAI", group: "C", venue: "Mercedes-Benz Stadium",    city: "Atlanta, GA",              stage: "group" },

  // --- Group D ---
  { id: 19, date: "2026-06-13T01:00:00Z", time: "9:00 PM",  time_utc: "01:00", homeTeam: "USA", awayTeam: "PAR", group: "D", venue: "SoFi Stadium",             city: "Inglewood, CA",            stage: "group" },
  { id: 20, date: "2026-06-14T04:00:00Z", time: "12:00 AM", time_utc: "04:00", homeTeam: "AUS", awayTeam: "TUR", group: "D", venue: "BC Place",                 city: "Vancouver, Canada",        stage: "group" },
  { id: 21, date: "2026-06-19T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "USA", awayTeam: "AUS", group: "D", venue: "Lumen Field",              city: "Seattle, WA",              stage: "group" },
  { id: 22, date: "2026-06-20T04:00:00Z", time: "12:00 AM", time_utc: "04:00", homeTeam: "TUR", awayTeam: "PAR", group: "D", venue: "Levi's Stadium",           city: "Santa Clara, CA",          stage: "group" },
  { id: 23, date: "2026-06-26T02:00:00Z", time: "10:00 PM", time_utc: "02:00", homeTeam: "TUR", awayTeam: "USA", group: "D", venue: "SoFi Stadium",             city: "Inglewood, CA",            stage: "group" },
  { id: 24, date: "2026-06-26T02:00:00Z", time: "10:00 PM", time_utc: "02:00", homeTeam: "PAR", awayTeam: "AUS", group: "D", venue: "Levi's Stadium",           city: "Santa Clara, CA",          stage: "group" },

  // --- Group E ---
  { id: 25, date: "2026-06-14T17:00:00Z", time: "1:00 PM",  time_utc: "17:00", homeTeam: "GER", awayTeam: "CUW", group: "E", venue: "NRG Stadium",              city: "Houston, TX",              stage: "group" },
  { id: 26, date: "2026-06-14T23:00:00Z", time: "7:00 PM",  time_utc: "23:00", homeTeam: "CIV", awayTeam: "ECU", group: "E", venue: "Lincoln Financial Field",  city: "Philadelphia, PA",         stage: "group" },
  { id: 27, date: "2026-06-20T20:00:00Z", time: "4:00 PM",  time_utc: "20:00", homeTeam: "GER", awayTeam: "CIV", group: "E", venue: "BMO Field",                city: "Toronto, Canada",          stage: "group" },
  { id: 28, date: "2026-06-21T00:00:00Z", time: "8:00 PM",  time_utc: "00:00", homeTeam: "ECU", awayTeam: "CUW", group: "E", venue: "Arrowhead Stadium",        city: "Kansas City, MO",          stage: "group" },
  { id: 29, date: "2026-06-25T20:00:00Z", time: "4:00 PM",  time_utc: "20:00", homeTeam: "ECU", awayTeam: "GER", group: "E", venue: "MetLife Stadium",          city: "East Rutherford, NJ",      stage: "group" },
  { id: 30, date: "2026-06-25T20:00:00Z", time: "4:00 PM",  time_utc: "20:00", homeTeam: "CUW", awayTeam: "CIV", group: "E", venue: "Lincoln Financial Field",  city: "Philadelphia, PA",         stage: "group" },

  // --- Group F ---
  { id: 31, date: "2026-06-14T20:00:00Z", time: "4:00 PM",  time_utc: "20:00", homeTeam: "NED", awayTeam: "JPN", group: "F", venue: "AT&T Stadium",             city: "Arlington, TX",            stage: "group" },
  { id: 32, date: "2026-06-15T02:00:00Z", time: "10:00 PM", time_utc: "02:00", homeTeam: "SWE", awayTeam: "TUN", group: "F", venue: "Estadio BBVA",             city: "Monterrey, Mexico",        stage: "group" },
  { id: 33, date: "2026-06-20T17:00:00Z", time: "1:00 PM",  time_utc: "17:00", homeTeam: "NED", awayTeam: "SWE", group: "F", venue: "NRG Stadium",              city: "Houston, TX",              stage: "group" },
  { id: 34, date: "2026-06-21T04:00:00Z", time: "12:00 AM", time_utc: "04:00", homeTeam: "TUN", awayTeam: "JPN", group: "F", venue: "Estadio BBVA",             city: "Monterrey, Mexico",        stage: "group" },
  { id: 35, date: "2026-06-25T23:00:00Z", time: "7:00 PM",  time_utc: "23:00", homeTeam: "JPN", awayTeam: "SWE", group: "F", venue: "AT&T Stadium",             city: "Arlington, TX",            stage: "group" },
  { id: 36, date: "2026-06-25T23:00:00Z", time: "7:00 PM",  time_utc: "23:00", homeTeam: "TUN", awayTeam: "NED", group: "F", venue: "Arrowhead Stadium",        city: "Kansas City, MO",          stage: "group" },

  // --- Group G ---
  { id: 37, date: "2026-06-15T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "BEL", awayTeam: "EGY", group: "G", venue: "Lumen Field",              city: "Seattle, WA",              stage: "group" },
  { id: 38, date: "2026-06-16T01:00:00Z", time: "9:00 PM",  time_utc: "01:00", homeTeam: "IRN", awayTeam: "NZL", group: "G", venue: "SoFi Stadium",             city: "Inglewood, CA",            stage: "group" },
  { id: 39, date: "2026-06-21T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "BEL", awayTeam: "IRN", group: "G", venue: "SoFi Stadium",             city: "Inglewood, CA",            stage: "group" },
  { id: 40, date: "2026-06-22T01:00:00Z", time: "9:00 PM",  time_utc: "01:00", homeTeam: "NZL", awayTeam: "EGY", group: "G", venue: "BC Place",                 city: "Vancouver, Canada",        stage: "group" },
  { id: 41, date: "2026-06-27T03:00:00Z", time: "11:00 PM", time_utc: "03:00", homeTeam: "EGY", awayTeam: "IRN", group: "G", venue: "Lumen Field",              city: "Seattle, WA",              stage: "group" },
  { id: 42, date: "2026-06-27T03:00:00Z", time: "11:00 PM", time_utc: "03:00", homeTeam: "NZL", awayTeam: "BEL", group: "G", venue: "BC Place",                 city: "Vancouver, Canada",        stage: "group" },

  // --- Group H ---
  { id: 43, date: "2026-06-15T16:00:00Z", time: "12:00 PM", time_utc: "16:00", homeTeam: "ESP", awayTeam: "CPV", group: "H", venue: "Mercedes-Benz Stadium",    city: "Atlanta, GA",              stage: "group" },
  { id: 44, date: "2026-06-15T22:00:00Z", time: "6:00 PM",  time_utc: "22:00", homeTeam: "KSA", awayTeam: "URU", group: "H", venue: "Hard Rock Stadium",        city: "Miami Gardens, FL",        stage: "group" },
  { id: 45, date: "2026-06-21T16:00:00Z", time: "12:00 PM", time_utc: "16:00", homeTeam: "ESP", awayTeam: "KSA", group: "H", venue: "Mercedes-Benz Stadium",    city: "Atlanta, GA",              stage: "group" },
  { id: 46, date: "2026-06-21T22:00:00Z", time: "6:00 PM",  time_utc: "22:00", homeTeam: "URU", awayTeam: "CPV", group: "H", venue: "Hard Rock Stadium",        city: "Miami Gardens, FL",        stage: "group" },
  { id: 47, date: "2026-06-27T00:00:00Z", time: "8:00 PM",  time_utc: "00:00", homeTeam: "CPV", awayTeam: "KSA", group: "H", venue: "NRG Stadium",              city: "Houston, TX",              stage: "group" },
  { id: 48, date: "2026-06-27T00:00:00Z", time: "8:00 PM",  time_utc: "00:00", homeTeam: "URU", awayTeam: "ESP", group: "H", venue: "Estadio Akron",            city: "Guadalajara, Mexico",      stage: "group" },

  // --- Group I ---
  { id: 49, date: "2026-06-16T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "FRA", awayTeam: "SEN", group: "I", venue: "MetLife Stadium",          city: "East Rutherford, NJ",      stage: "group" },
  { id: 50, date: "2026-06-16T22:00:00Z", time: "6:00 PM",  time_utc: "22:00", homeTeam: "IRQ", awayTeam: "NOR", group: "I", venue: "Gillette Stadium",         city: "Foxborough, MA",           stage: "group" },
  { id: 51, date: "2026-06-22T21:00:00Z", time: "5:00 PM",  time_utc: "21:00", homeTeam: "FRA", awayTeam: "IRQ", group: "I", venue: "Lincoln Financial Field",  city: "Philadelphia, PA",         stage: "group" },
  { id: 52, date: "2026-06-23T00:00:00Z", time: "8:00 PM",  time_utc: "00:00", homeTeam: "NOR", awayTeam: "SEN", group: "I", venue: "MetLife Stadium",          city: "East Rutherford, NJ",      stage: "group" },
  { id: 53, date: "2026-06-26T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "NOR", awayTeam: "FRA", group: "I", venue: "Gillette Stadium",         city: "Foxborough, MA",           stage: "group" },
  { id: 54, date: "2026-06-26T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "SEN", awayTeam: "IRQ", group: "I", venue: "BMO Field",                city: "Toronto, Canada",          stage: "group" },

  // --- Group J ---
  { id: 55, date: "2026-06-17T01:00:00Z", time: "9:00 PM",  time_utc: "01:00", homeTeam: "ARG", awayTeam: "ALG", group: "J", venue: "Arrowhead Stadium",        city: "Kansas City, MO",          stage: "group" },
  { id: 56, date: "2026-06-17T04:00:00Z", time: "12:00 AM", time_utc: "04:00", homeTeam: "AUT", awayTeam: "JOR", group: "J", venue: "Levi's Stadium",           city: "Santa Clara, CA",          stage: "group" },
  { id: 57, date: "2026-06-22T17:00:00Z", time: "1:00 PM",  time_utc: "17:00", homeTeam: "ARG", awayTeam: "AUT", group: "J", venue: "AT&T Stadium",             city: "Arlington, TX",            stage: "group" },
  { id: 58, date: "2026-06-23T03:00:00Z", time: "11:00 PM", time_utc: "03:00", homeTeam: "JOR", awayTeam: "ALG", group: "J", venue: "Levi's Stadium",           city: "Santa Clara, CA",          stage: "group" },
  { id: 59, date: "2026-06-28T02:00:00Z", time: "10:00 PM", time_utc: "02:00", homeTeam: "ALG", awayTeam: "AUT", group: "J", venue: "Arrowhead Stadium",        city: "Kansas City, MO",          stage: "group" },
  { id: 60, date: "2026-06-28T02:00:00Z", time: "10:00 PM", time_utc: "02:00", homeTeam: "JOR", awayTeam: "ARG", group: "J", venue: "AT&T Stadium",             city: "Arlington, TX",            stage: "group" },

  // --- Group K ---
  { id: 61, date: "2026-06-17T17:00:00Z", time: "1:00 PM",  time_utc: "17:00", homeTeam: "POR", awayTeam: "COD", group: "K", venue: "NRG Stadium",              city: "Houston, TX",              stage: "group" },
  { id: 62, date: "2026-06-18T02:00:00Z", time: "10:00 PM", time_utc: "02:00", homeTeam: "UZB", awayTeam: "COL", group: "K", venue: "Estadio Azteca",           city: "Mexico City, Mexico",      stage: "group" },
  { id: 63, date: "2026-06-23T17:00:00Z", time: "1:00 PM",  time_utc: "17:00", homeTeam: "POR", awayTeam: "UZB", group: "K", venue: "NRG Stadium",              city: "Houston, TX",              stage: "group" },
  { id: 64, date: "2026-06-24T02:00:00Z", time: "10:00 PM", time_utc: "02:00", homeTeam: "COL", awayTeam: "COD", group: "K", venue: "Estadio Akron",            city: "Guadalajara, Mexico",      stage: "group" },
  { id: 65, date: "2026-06-27T23:30:00Z", time: "7:30 PM",  time_utc: "23:30", homeTeam: "COL", awayTeam: "POR", group: "K", venue: "Hard Rock Stadium",        city: "Miami Gardens, FL",        stage: "group" },
  { id: 66, date: "2026-06-27T23:30:00Z", time: "7:30 PM",  time_utc: "23:30", homeTeam: "COD", awayTeam: "UZB", group: "K", venue: "Mercedes-Benz Stadium",    city: "Atlanta, GA",              stage: "group" },

  // --- Group L ---
  { id: 67, date: "2026-06-17T20:00:00Z", time: "4:00 PM",  time_utc: "20:00", homeTeam: "ENG", awayTeam: "CRO", group: "L", venue: "AT&T Stadium",             city: "Arlington, TX",            stage: "group" },
  { id: 68, date: "2026-06-17T23:00:00Z", time: "7:00 PM",  time_utc: "23:00", homeTeam: "GHA", awayTeam: "PAN", group: "L", venue: "BMO Field",                city: "Toronto, Canada",          stage: "group" },
  { id: 69, date: "2026-06-23T20:00:00Z", time: "4:00 PM",  time_utc: "20:00", homeTeam: "ENG", awayTeam: "GHA", group: "L", venue: "Gillette Stadium",         city: "Foxborough, MA",           stage: "group" },
  { id: 70, date: "2026-06-23T23:00:00Z", time: "7:00 PM",  time_utc: "23:00", homeTeam: "PAN", awayTeam: "CRO", group: "L", venue: "BMO Field",                city: "Toronto, Canada",          stage: "group" },
  { id: 71, date: "2026-06-27T21:00:00Z", time: "5:00 PM",  time_utc: "21:00", homeTeam: "PAN", awayTeam: "ENG", group: "L", venue: "MetLife Stadium",          city: "East Rutherford, NJ",      stage: "group" },
  { id: 72, date: "2026-06-27T21:00:00Z", time: "5:00 PM",  time_utc: "21:00", homeTeam: "CRO", awayTeam: "GHA", group: "L", venue: "Lincoln Financial Field",  city: "Philadelphia, PA",         stage: "group" },

  // =========================================================================
  // KNOCKOUT STAGE — 32 matches (June 28 - July 19)
  // =========================================================================

  // --- Round of 32 (16 matches) ---
  { id: 73, date: "2026-06-28T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "2A",  awayTeam: "2B",              group: null, venue: "SoFi Stadium",             city: "Inglewood, CA",            stage: "round-of-32" },
  { id: 74, date: "2026-06-29T20:30:00Z", time: "4:30 PM",  time_utc: "20:30", homeTeam: "1E",  awayTeam: "3ABCDF",          group: null, venue: "Gillette Stadium",         city: "Foxborough, MA",           stage: "round-of-32" },
  { id: 75, date: "2026-06-30T01:00:00Z", time: "9:00 PM",  time_utc: "01:00", homeTeam: "1F",  awayTeam: "2C",              group: null, venue: "Estadio BBVA",             city: "Monterrey, Mexico",        stage: "round-of-32" },
  { id: 76, date: "2026-06-29T17:00:00Z", time: "1:00 PM",  time_utc: "17:00", homeTeam: "1C",  awayTeam: "2F",              group: null, venue: "NRG Stadium",              city: "Houston, TX",              stage: "round-of-32" },
  { id: 77, date: "2026-06-30T21:00:00Z", time: "5:00 PM",  time_utc: "21:00", homeTeam: "1I",  awayTeam: "3CDFGH",          group: null, venue: "MetLife Stadium",          city: "East Rutherford, NJ",      stage: "round-of-32" },
  { id: 78, date: "2026-06-30T17:00:00Z", time: "1:00 PM",  time_utc: "17:00", homeTeam: "2E",  awayTeam: "2I",              group: null, venue: "AT&T Stadium",             city: "Arlington, TX",            stage: "round-of-32" },
  { id: 79, date: "2026-07-01T01:00:00Z", time: "9:00 PM",  time_utc: "01:00", homeTeam: "1A",  awayTeam: "3CEFHI",          group: null, venue: "Estadio Azteca",           city: "Mexico City, Mexico",      stage: "round-of-32" },
  { id: 80, date: "2026-07-01T16:00:00Z", time: "12:00 PM", time_utc: "16:00", homeTeam: "1L",  awayTeam: "3EHIJK",          group: null, venue: "Mercedes-Benz Stadium",    city: "Atlanta, GA",              stage: "round-of-32" },
  { id: 81, date: "2026-07-02T00:00:00Z", time: "8:00 PM",  time_utc: "00:00", homeTeam: "1D",  awayTeam: "3BEFIJ",          group: null, venue: "Levi's Stadium",           city: "Santa Clara, CA",          stage: "round-of-32" },
  { id: 82, date: "2026-07-01T20:00:00Z", time: "4:00 PM",  time_utc: "20:00", homeTeam: "1G",  awayTeam: "3AEHIJ",          group: null, venue: "Lumen Field",              city: "Seattle, WA",              stage: "round-of-32" },
  { id: 83, date: "2026-07-02T23:00:00Z", time: "7:00 PM",  time_utc: "23:00", homeTeam: "2K",  awayTeam: "2L",              group: null, venue: "BMO Field",                city: "Toronto, Canada",          stage: "round-of-32" },
  { id: 84, date: "2026-07-02T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "1H",  awayTeam: "2J",              group: null, venue: "SoFi Stadium",             city: "Inglewood, CA",            stage: "round-of-32" },
  { id: 85, date: "2026-07-03T03:00:00Z", time: "11:00 PM", time_utc: "03:00", homeTeam: "1B",  awayTeam: "3EFGIJ",          group: null, venue: "BC Place",                 city: "Vancouver, Canada",        stage: "round-of-32" },
  { id: 86, date: "2026-07-03T22:00:00Z", time: "6:00 PM",  time_utc: "22:00", homeTeam: "1J",  awayTeam: "2H",              group: null, venue: "Hard Rock Stadium",        city: "Miami Gardens, FL",        stage: "round-of-32" },
  { id: 87, date: "2026-07-04T01:30:00Z", time: "9:30 PM",  time_utc: "01:30", homeTeam: "1K",  awayTeam: "3DEIJL",          group: null, venue: "Arrowhead Stadium",        city: "Kansas City, MO",          stage: "round-of-32" },
  { id: 88, date: "2026-07-03T18:00:00Z", time: "2:00 PM",  time_utc: "18:00", homeTeam: "2D",  awayTeam: "2G",              group: null, venue: "AT&T Stadium",             city: "Arlington, TX",            stage: "round-of-32" },

  // --- Round of 16 (8 matches) ---
  { id: 89, date: "2026-07-04T21:00:00Z", time: "5:00 PM",  time_utc: "21:00", homeTeam: "W74", awayTeam: "W77",             group: null, venue: "Lincoln Financial Field",  city: "Philadelphia, PA",         stage: "round-of-16" },
  { id: 90, date: "2026-07-04T17:00:00Z", time: "1:00 PM",  time_utc: "17:00", homeTeam: "W73", awayTeam: "W75",             group: null, venue: "NRG Stadium",              city: "Houston, TX",              stage: "round-of-16" },
  { id: 91, date: "2026-07-05T20:00:00Z", time: "4:00 PM",  time_utc: "20:00", homeTeam: "W76", awayTeam: "W78",             group: null, venue: "MetLife Stadium",          city: "East Rutherford, NJ",      stage: "round-of-16" },
  { id: 92, date: "2026-07-06T00:00:00Z", time: "8:00 PM",  time_utc: "00:00", homeTeam: "W79", awayTeam: "W80",             group: null, venue: "Estadio Azteca",           city: "Mexico City, Mexico",      stage: "round-of-16" },
  { id: 93, date: "2026-07-06T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "W83", awayTeam: "W84",             group: null, venue: "AT&T Stadium",             city: "Arlington, TX",            stage: "round-of-16" },
  { id: 94, date: "2026-07-07T00:00:00Z", time: "8:00 PM",  time_utc: "00:00", homeTeam: "W81", awayTeam: "W82",             group: null, venue: "Lumen Field",              city: "Seattle, WA",              stage: "round-of-16" },
  { id: 95, date: "2026-07-07T16:00:00Z", time: "12:00 PM", time_utc: "16:00", homeTeam: "W86", awayTeam: "W88",             group: null, venue: "Mercedes-Benz Stadium",    city: "Atlanta, GA",              stage: "round-of-16" },
  { id: 96, date: "2026-07-07T20:00:00Z", time: "4:00 PM",  time_utc: "20:00", homeTeam: "W85", awayTeam: "W87",             group: null, venue: "BC Place",                 city: "Vancouver, Canada",        stage: "round-of-16" },

  // --- Quarterfinals (4 matches) ---
  { id: 97,  date: "2026-07-09T20:00:00Z", time: "4:00 PM",  time_utc: "20:00", homeTeam: "W89", awayTeam: "W90",            group: null, venue: "Gillette Stadium",         city: "Foxborough, MA",           stage: "quarterfinal" },
  { id: 98,  date: "2026-07-10T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "W93", awayTeam: "W94",            group: null, venue: "SoFi Stadium",             city: "Inglewood, CA",            stage: "quarterfinal" },
  { id: 99,  date: "2026-07-11T21:00:00Z", time: "5:00 PM",  time_utc: "21:00", homeTeam: "W91", awayTeam: "W92",            group: null, venue: "Hard Rock Stadium",        city: "Miami Gardens, FL",        stage: "quarterfinal" },
  { id: 100, date: "2026-07-12T01:00:00Z", time: "9:00 PM",  time_utc: "01:00", homeTeam: "W95", awayTeam: "W96",            group: null, venue: "Arrowhead Stadium",        city: "Kansas City, MO",          stage: "quarterfinal" },

  // --- Semifinals (2 matches) ---
  { id: 101, date: "2026-07-14T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "W97",  awayTeam: "W98",           group: null, venue: "AT&T Stadium",             city: "Arlington, TX",            stage: "semifinal" },
  { id: 102, date: "2026-07-15T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "W99",  awayTeam: "W100",          group: null, venue: "Mercedes-Benz Stadium",    city: "Atlanta, GA",              stage: "semifinal" },

  // --- Third-Place Playoff ---
  { id: 103, date: "2026-07-18T21:00:00Z", time: "5:00 PM",  time_utc: "21:00", homeTeam: "L101", awayTeam: "L102",          group: null, venue: "Hard Rock Stadium",        city: "Miami Gardens, FL",        stage: "third-place" },

  // --- Final ---
  { id: 104, date: "2026-07-19T19:00:00Z", time: "3:00 PM",  time_utc: "19:00", homeTeam: "W101", awayTeam: "W102",          group: null, venue: "MetLife Stadium",          city: "East Rutherford, NJ",      stage: "final" },
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Get all matches for a specific group */
export function getGroupMatches(groupLetter: string): Match[] {
  return MATCHES.filter((m) => m.group === groupLetter);
}

/** Get all matches for a specific stage */
export function getStageMatches(stage: Match["stage"]): Match[] {
  return MATCHES.filter((m) => m.stage === stage);
}

/** Get all matches on a specific date (YYYY-MM-DD in ET) */
export function getMatchesByDate(dateStr: string): Match[] {
  return MATCHES.filter((m) => m.date.startsWith(dateStr));
}

/** Get all matches at a specific venue */
export function getMatchesByVenue(venueName: string): Match[] {
  return MATCHES.filter((m) =>
    m.venue.toLowerCase().includes(venueName.toLowerCase())
  );
}

/** Get all matches for a specific team (by FIFA code) */
export function getTeamMatches(teamCode: string): Match[] {
  return MATCHES.filter(
    (m) => m.homeTeam === teamCode || m.awayTeam === teamCode
  );
}

/** Get team info by FIFA code */
export function getTeam(code: string): Team | undefined {
  return TEAMS[code];
}

/** Get the group a team belongs to */
export function getTeamGroup(teamCode: string): Group | undefined {
  return GROUPS.find((g) => g.teams.some((t) => t.code === teamCode));
}

/** Get all group stage matches sorted chronologically */
export function getGroupStageSchedule(): Match[] {
  return MATCHES.filter((m) => m.stage === "group").sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/** Get all knockout matches sorted chronologically */
export function getKnockoutSchedule(): Match[] {
  return MATCHES.filter((m) => m.stage !== "group").sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

// ---------------------------------------------------------------------------
// Round of 32 bracket mapping (for reference)
// ---------------------------------------------------------------------------

/**
 * Round of 32 matchup pairings:
 *
 * Match 73: 2nd Group A  vs  2nd Group B
 * Match 74: 1st Group E  vs  Best 3rd (A/B/C/D/F)
 * Match 75: 1st Group F  vs  2nd Group C
 * Match 76: 1st Group C  vs  2nd Group F
 * Match 77: 1st Group I  vs  Best 3rd (C/D/F/G/H)
 * Match 78: 2nd Group E  vs  2nd Group I
 * Match 79: 1st Group A  vs  Best 3rd (C/E/F/H/I)
 * Match 80: 1st Group L  vs  Best 3rd (E/H/I/J/K)
 * Match 81: 1st Group D  vs  Best 3rd (B/E/F/I/J)
 * Match 82: 1st Group G  vs  Best 3rd (A/E/H/I/J)
 * Match 83: 2nd Group K  vs  2nd Group L
 * Match 84: 1st Group H  vs  2nd Group J
 * Match 85: 1st Group B  vs  Best 3rd (E/F/G/I/J)
 * Match 86: 1st Group J  vs  2nd Group H
 * Match 87: 1st Group K  vs  Best 3rd (D/E/I/J/L)
 * Match 88: 2nd Group D  vs  2nd Group G
 *
 * Round of 16 matchup pairings:
 * Match 89: Winner 74 vs Winner 77
 * Match 90: Winner 73 vs Winner 75
 * Match 91: Winner 76 vs Winner 78
 * Match 92: Winner 79 vs Winner 80
 * Match 93: Winner 83 vs Winner 84
 * Match 94: Winner 81 vs Winner 82
 * Match 95: Winner 86 vs Winner 88
 * Match 96: Winner 85 vs Winner 87
 *
 * Quarterfinal pairings:
 * Match 97:  Winner 89 vs Winner 90
 * Match 98:  Winner 93 vs Winner 94
 * Match 99:  Winner 91 vs Winner 92
 * Match 100: Winner 95 vs Winner 96
 *
 * Semifinal pairings:
 * Match 101: Winner 97 vs Winner 98
 * Match 102: Winner 99 vs Winner 100
 *
 * Third Place: Loser 101 vs Loser 102
 * Final:      Winner 101 vs Winner 102
 */
