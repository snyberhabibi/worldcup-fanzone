"use client";

import { TEAMS, type Match } from "@/data/schedule";
import { getVotes } from "@/lib/store";

/** Convert ET time string like "3:00 PM" to CT by subtracting 1 hour */
function etToCt(etTime: string): string {
  const match = etTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return etTime;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  // Convert to 24h
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  // Subtract 1 hour for CT
  hours = (hours - 1 + 24) % 24;

  // Convert back to 12h
  const newPeriod = hours >= 12 ? "PM" : "AM";
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;

  return `${displayHours}:${minutes} ${newPeriod}`;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}

function getStageName(stage: Match["stage"]): string {
  const names: Record<Match["stage"], string> = {
    group: "Group Stage",
    "round-of-32": "Round of 32",
    "round-of-16": "Round of 16",
    quarterfinal: "Quarterfinal",
    semifinal: "Semifinal",
    "third-place": "Third Place",
    final: "Final",
  };
  return names[stage] || stage;
}

interface MatchCardProps {
  match: Match;
  showVotes?: boolean;
  compact?: boolean;
}

export default function MatchCard({
  match,
  showVotes = false,
  compact = false,
}: MatchCardProps) {
  const homeTeam = TEAMS[match.homeTeam];
  const awayTeam = TEAMS[match.awayTeam];
  const homeName = homeTeam?.name ?? match.homeTeam;
  const awayName = awayTeam?.name ?? match.awayTeam;
  const homeFlag = homeTeam?.flag_emoji ?? "";
  const awayFlag = awayTeam?.flag_emoji ?? "";

  const votes = showVotes ? getVotes(String(match.id)) : null;
  const totalVotes = votes ? votes.homeVotes + votes.awayVotes : 0;
  const homePct = totalVotes > 0 ? Math.round((votes!.homeVotes / totalVotes) * 100) : 50;
  const awayPct = totalVotes > 0 ? 100 - homePct : 50;

  if (compact) {
    return (
      <div className="glass-card flex items-center gap-3 p-3 relative overflow-hidden">
        {/* Group badge accent */}
        {match.group && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold rounded-l-2xl" />
        )}

        <div className="flex-1 min-w-0 pl-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-lg leading-none">{homeFlag}</span>
              <span className="text-sm font-semibold truncate">{homeName}</span>
            </div>
            <span className="text-gold/50 text-xs font-bold px-2 shrink-0">vs</span>
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
              <span className="text-sm font-semibold truncate text-right">{awayName}</span>
              <span className="text-lg leading-none">{awayFlag}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-1.5 text-[11px] text-cream/40">
            <span>{formatDate(match.date)}</span>
            <span>{etToCt(match.time)} CT</span>
            {match.group ? (
              <span className="text-gold/60 font-semibold">Group {match.group}</span>
            ) : (
              <span className="text-gold/60 font-semibold">{getStageName(match.stage)}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full card
  return (
    <div className="glass-card p-5 relative overflow-hidden">
      {/* Group / stage badge */}
      {match.group && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gold rounded-l-2xl" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {match.group ? (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gold/15 text-gold text-xs font-bold">
              {match.group}
            </span>
          ) : (
            <span className="inline-flex items-center justify-center px-2.5 h-7 rounded-lg bg-gold/15 text-gold text-xs font-bold">
              {getStageName(match.stage)}
            </span>
          )}
          <span className="text-cream/50 text-xs">{formatDate(match.date)}</span>
        </div>
        <span className="text-cream/50 text-xs">{etToCt(match.time)} CT</span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between">
        {/* Home team */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <span className="text-4xl leading-none">{homeFlag}</span>
          <span className="text-sm font-bold text-center leading-tight">{homeName}</span>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center px-3">
          <span className="text-gold font-extrabold text-xl">VS</span>
        </div>

        {/* Away team */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <span className="text-4xl leading-none">{awayFlag}</span>
          <span className="text-sm font-bold text-center leading-tight">{awayName}</span>
        </div>
      </div>

      {/* Vote bar */}
      {showVotes && totalVotes > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-gold">{homePct}%</span>
            <span className="text-cream/30 text-[10px]">{totalVotes} votes</span>
            <span className="text-gold">{awayPct}%</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-navy-light">
            <div
              className="bg-gradient-to-r from-gold to-gold-light transition-all duration-500 rounded-l-full"
              style={{ width: `${homePct}%` }}
            />
            <div
              className="bg-gradient-to-r from-cream/20 to-cream/30 transition-all duration-500 rounded-r-full"
              style={{ width: `${awayPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Venue */}
      <div className="mt-3 pt-3 border-t border-cream/5 text-center">
        <p className="text-cream/35 text-[11px]">
          {match.venue} &middot; {match.city}
        </p>
      </div>
    </div>
  );
}
