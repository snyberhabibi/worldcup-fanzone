"use client";

import { TEAMS, type Match } from "@/data/schedule";
import { getVotes } from "@/lib/store";
import { MapPin, Clock } from "lucide-react";

function etToCt(etTime: string): string {
  const match = etTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return etTime;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  hours = (hours - 1 + 24) % 24;
  const newPeriod = hours >= 12 ? "PM" : "AM";
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  return `${displayHours}:${minutes} ${newPeriod}`;
}

function getTeamDisplay(code: string) {
  const team = TEAMS[code];
  if (team) return { flag: team.flag_emoji, name: team.name, code: team.code };
  return { flag: "", name: code, code };
}

interface MatchCardProps {
  match: Match;
  showVotes?: boolean;
  compact?: boolean;
}

export default function MatchCard({ match, showVotes = false, compact = false }: MatchCardProps) {
  const home = getTeamDisplay(match.homeTeam);
  const away = getTeamDisplay(match.awayTeam);
  const votes = showVotes ? getVotes(match.id) : null;
  const totalVotes = votes ? votes.homeVotes + votes.awayVotes : 0;
  const homePercent = totalVotes > 0 ? Math.round((votes!.homeVotes / totalVotes) * 100) : 50;
  const awayPercent = totalVotes > 0 ? 100 - homePercent : 50;

  const stageLabels: Record<string, string> = {
    "round-of-32": "R32",
    "round-of-16": "R16",
    quarterfinal: "QF",
    semifinal: "SF",
    "third-place": "3rd",
    final: "FINAL",
  };

  if (compact) {
    return (
      <div className="glass-card-light px-4 py-3 flex items-center gap-3">
        <div className="text-gold/80 text-xs font-semibold w-16 shrink-0 text-center">
          {etToCt(match.time)} CT
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg leading-none">{home.flag}</span>
              <span className="text-sm font-semibold truncate">{home.code}</span>
            </div>
            <span className="text-gold/40 text-xs font-bold">vs</span>
            <div className="flex items-center gap-2 min-w-0 justify-end">
              <span className="text-sm font-semibold truncate">{away.code}</span>
              <span className="text-lg leading-none">{away.flag}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {match.group ? (
            <span className="text-[10px] font-bold text-gold/60 bg-gold/10 px-2 py-0.5 rounded-full">
              GRP {match.group}
            </span>
          ) : (
            <span className="text-[10px] font-bold text-red bg-red/10 px-2 py-0.5 rounded-full">
              {stageLabels[match.stage] || match.stage}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {match.group ? (
            <span className="text-xs font-bold text-gold bg-gold/10 px-2.5 py-1 rounded-full">
              Group {match.group}
            </span>
          ) : (
            <span className="text-xs font-bold text-red bg-red/10 px-2.5 py-1 rounded-full uppercase">
              {stageLabels[match.stage] || match.stage}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-cream/40">
          <Clock size={12} />
          <span className="text-xs font-medium">{etToCt(match.time)} CT</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-center">
          <div className="text-3xl mb-1">{home.flag}</div>
          <p className="text-sm font-bold leading-tight">{home.name}</p>
          <p className="text-[10px] text-cream/40 font-medium">{home.code}</p>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-gold font-extrabold text-lg">VS</span>
        </div>

        <div className="flex-1 text-center">
          <div className="text-3xl mb-1">{away.flag}</div>
          <p className="text-sm font-bold leading-tight">{away.name}</p>
          <p className="text-[10px] text-cream/40 font-medium">{away.code}</p>
        </div>
      </div>

      {showVotes && totalVotes > 0 && (
        <div className="mt-4 pt-3 border-t border-gold/10">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-green-light">{homePercent}%</span>
            <span className="text-cream/30 text-[10px]">{totalVotes} votes</span>
            <span className="text-red">{awayPercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-navy-light overflow-hidden flex">
            <div
              className="h-full bg-green-light rounded-l-full transition-all duration-500"
              style={{ width: `${homePercent}%` }}
            />
            <div
              className="h-full bg-red rounded-r-full transition-all duration-500"
              style={{ width: `${awayPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-1.5 text-cream/30">
        <MapPin size={11} />
        <span className="text-[11px]">
          {match.venue}, {match.city}
        </span>
      </div>
    </div>
  );
}
