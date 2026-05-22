"use client";

import { type Match } from "@/data/schedule";
import { getVotes } from "@/lib/store";
import { etToCt, getTeamDisplay } from "@/lib/utils";
import { MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";

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
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ boxShadow: "0 1px 6px rgba(15,27,58,0.04)" }}
      >
        <div className="text-[#C9A24B]/70 text-xs font-semibold w-16 shrink-0 text-center">
          {etToCt(match.time)} CT
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg leading-none">{home.flag}</span>
              <span className="text-sm font-semibold text-[#0F1B3A] truncate">{home.code}</span>
            </div>
            <span className="text-[#C9A24B]/40 text-xs font-bold">vs</span>
            <div className="flex items-center gap-2 min-w-0 justify-end">
              <span className="text-sm font-semibold text-[#0F1B3A] truncate">{away.code}</span>
              <span className="text-lg leading-none">{away.flag}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {match.group ? (
            <span className="text-[11px] font-bold text-[#C9A24B] bg-[#C9A24B]/10 px-2 py-0.5 rounded-full">
              GRP {match.group}
            </span>
          ) : (
            <span className="text-[11px] font-bold text-[#E54141] bg-[#E54141]/10 px-2 py-0.5 rounded-full">
              {stageLabels[match.stage] || match.stage}
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="bg-white rounded-2xl p-5 relative overflow-hidden"
      style={{ boxShadow: "0 2px 12px rgba(15,27,58,0.05)" }}
    >
      {/* Top row: group badge + time */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {match.group ? (
            <span
              className="text-xs font-bold text-[#C9A24B] px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(201,162,75,0.1)" }}
            >
              Group {match.group}
            </span>
          ) : (
            <span
              className="text-xs font-bold text-[#E54141] px-3 py-1 rounded-full uppercase"
              style={{ backgroundColor: "rgba(229,65,65,0.08)" }}
            >
              {stageLabels[match.stage] || match.stage}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[#0F1B3A]/55">
          <Clock size={12} />
          <span className="text-xs font-medium">{etToCt(match.time)} CT</span>
        </div>
      </div>

      {/* Teams row */}
      <div className="flex items-center justify-between gap-2">
        {/* Home team */}
        <div className="flex-1 text-center">
          <div className="text-4xl mb-1.5">{home.flag}</div>
          <p className="text-sm font-bold text-[#0F1B3A] leading-tight">{home.name}</p>
          <p className="text-[11px] text-[#0F1B3A]/45 font-medium">{home.code}</p>
        </div>

        {/* VS circle */}
        <div className="flex flex-col items-center shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #C9A24B 0%, #E8D48B 100%)",
              boxShadow: "0 2px 8px rgba(201,162,75,0.25)",
            }}
          >
            <span className="text-white font-extrabold text-xs tracking-wide">VS</span>
          </div>
        </div>

        {/* Away team */}
        <div className="flex-1 text-center">
          <div className="text-4xl mb-1.5">{away.flag}</div>
          <p className="text-sm font-bold text-[#0F1B3A] leading-tight">{away.name}</p>
          <p className="text-[11px] text-[#0F1B3A]/45 font-medium">{away.code}</p>
        </div>
      </div>

      {/* Vote bar */}
      {showVotes && totalVotes > 0 && (
        <div className="mt-4 pt-3 border-t border-[#0F1B3A]/5">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-[#1A6B3C]">{homePercent}%</span>
            <span className="text-[#0F1B3A]/40 text-[11px]">{totalVotes} votes</span>
            <span className="text-[#E54141]">{awayPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#F5F0E8] overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${homePercent}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-l-full"
              style={{
                background: "linear-gradient(90deg, #1A6B3C, #2d8a52)",
              }}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${awayPercent}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-r-full"
              style={{
                background: "linear-gradient(90deg, #E54141, #c93535)",
              }}
            />
          </div>
        </div>
      )}

      {/* Venue info */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[#0F1B3A]/40">
        <MapPin size={11} />
        <span className="text-[11px]">
          {match.venue}, {match.city}
        </span>
      </div>
    </motion.div>
  );
}
