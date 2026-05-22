"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MATCHES, TEAMS, type Match } from "@/data/schedule";
import { getVotes, incrementVote, decrementVote } from "@/lib/store";
import { Trophy, Plus, Minus } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

function getTeamDisplay(code: string) {
  const team = TEAMS[code];
  if (team) return { flag: team.flag_emoji, name: team.name, code: team.code };
  return { flag: "", name: code, code };
}

function getCurrentOrNextMatch(now: Date): Match | null {
  const sorted = [...MATCHES].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  for (const match of sorted) {
    const matchTime = new Date(match.date).getTime();
    if (matchTime + 2 * 60 * 60 * 1000 > now.getTime()) {
      return match;
    }
  }
  return null;
}

function etToCt(etTime: string): string {
  const m = etTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return etTime;
  let hours = parseInt(m[1], 10);
  const minutes = m[2];
  const period = m[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  hours = (hours - 1 + 24) % 24;
  const newPeriod = hours >= 12 ? "PM" : "AM";
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  return `${displayHours}:${minutes} ${newPeriod}`;
}

/** Time until next match */
function calcTimeLeft(target: Date, now: Date) {
  const diff = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function VoteTracker() {
  const [now, setNow] = useState(() => new Date());
  const [votes, setVotes] = useState<{ homeVotes: number; awayVotes: number } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentMatch = useMemo(() => getCurrentOrNextMatch(now), [now]);

  // Sync votes from store
  useEffect(() => {
    if (!currentMatch) return;
    setVotes(getVotes(currentMatch.id));
  }, [currentMatch, now]);

  const totalVotes = votes ? votes.homeVotes + votes.awayVotes : 0;
  const homePercent = totalVotes > 0 ? Math.round((votes!.homeVotes / totalVotes) * 100) : 50;
  const awayPercent = totalVotes > 0 ? 100 - homePercent : 50;

  const handleIncrement = useCallback(
    (side: "home" | "away") => {
      if (!currentMatch) return;
      const updated = incrementVote(currentMatch.id, side);
      setVotes({ ...updated });

      // Small confetti burst
      const x = side === "home" ? 0.25 : 0.75;
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { x, y: 0.5 },
        colors:
          side === "home"
            ? ["#1A6B3C", "#C9A24B", "#2d8a52"]
            : ["#E54141", "#C9A24B", "#c93535"],
      });
    },
    [currentMatch]
  );

  const handleDecrement = useCallback(
    (side: "home" | "away") => {
      if (!currentMatch) return;
      const updated = decrementVote(currentMatch.id, side);
      setVotes({ ...updated });
    },
    [currentMatch]
  );

  // No match state
  if (!currentMatch) {
    const timeLeft = calcTimeLeft(
      new Date(
        [...MATCHES].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )[0]?.date || Date.now()
      ),
      now
    );

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
      >
        <div className="relative w-44 h-44 mb-6">
          <Image
            src="/mascot/waving.png"
            alt="Mascot waving"
            fill
            className="object-contain drop-shadow-lg"
          />
        </div>
        <h2 className="text-2xl font-extrabold text-[#0F1B3A] mb-2">No Match Right Now</h2>
        <p className="text-[#0F1B3A]/40 text-sm max-w-xs mb-6">
          Check back during the next match to cast your vote!
        </p>

        {/* Mini countdown */}
        <div className="flex items-center gap-2">
          {[
            { v: timeLeft.days, l: "d" },
            { v: timeLeft.hours, l: "h" },
            { v: timeLeft.minutes, l: "m" },
            { v: timeLeft.seconds, l: "s" },
          ].map((u) => (
            <div
              key={u.l}
              className="bg-white rounded-lg px-3 py-2 text-center"
              style={{ boxShadow: "0 2px 8px rgba(15,27,58,0.05)" }}
            >
              <span className="text-[#C9A24B] font-extrabold text-lg tabular-nums">
                {String(u.v).padStart(2, "0")}
              </span>
              <span className="text-[#0F1B3A]/30 text-[10px] font-semibold ml-0.5">{u.l}</span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  const home = getTeamDisplay(currentMatch.homeTeam);
  const away = getTeamDisplay(currentMatch.awayTeam);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center px-4"
    >
      {/* Mascot */}
      <div className="relative w-28 h-28 mb-2">
        <Image
          src="/mascot/excited.png"
          alt="Excited mascot"
          fill
          className="object-contain drop-shadow-lg"
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Trophy className="text-[#C9A24B]" size={24} />
        <h1 className="text-2xl font-extrabold text-[#0F1B3A] tracking-tight">WHO WINS?</h1>
        <Trophy className="text-[#C9A24B]" size={24} />
      </div>

      {/* Match info */}
      <div className="text-center mb-6">
        {currentMatch.group && (
          <span
            className="text-xs font-bold text-[#C9A24B] px-3 py-1 rounded-full inline-block"
            style={{ backgroundColor: "rgba(201,162,75,0.1)" }}
          >
            Group {currentMatch.group}
          </span>
        )}
        <p className="text-[#0F1B3A]/35 text-xs mt-1.5">
          {currentMatch.venue} &middot; {currentMatch.city} &middot;{" "}
          {etToCt(currentMatch.time)} CT
        </p>
      </div>

      {/* Two team cards */}
      <div className="flex items-stretch gap-4 w-full max-w-sm mb-6">
        {/* Home team card */}
        <div
          className="flex-1 bg-white rounded-2xl p-5 flex flex-col items-center gap-2"
          style={{ boxShadow: "0 4px 16px rgba(15,27,58,0.06)" }}
        >
          <span className="text-5xl leading-none">{home.flag}</span>
          <span className="text-base font-extrabold text-[#0F1B3A] text-center leading-tight">
            {home.name}
          </span>
          <span className="text-[#0F1B3A]/30 text-xs font-medium">{home.code}</span>

          {/* Vote count */}
          <AnimatePresence mode="popLayout">
            <motion.span
              key={votes?.homeVotes ?? 0}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.3, opacity: 0 }}
              className="text-[#C9A24B] font-extrabold text-3xl tabular-nums mt-1"
            >
              {votes?.homeVotes ?? 0}
            </motion.span>
          </AnimatePresence>

          {/* +/- buttons */}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => handleDecrement("home")}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{
                backgroundColor: "#F5F0E8",
                color: "#0F1B3A",
              }}
            >
              <Minus size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => handleIncrement("home")}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "linear-gradient(135deg, #C9A24B 0%, #E8D48B 100%)",
                color: "#fff",
                boxShadow: "0 2px 8px rgba(201,162,75,0.3)",
              }}
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Away team card */}
        <div
          className="flex-1 bg-white rounded-2xl p-5 flex flex-col items-center gap-2"
          style={{ boxShadow: "0 4px 16px rgba(15,27,58,0.06)" }}
        >
          <span className="text-5xl leading-none">{away.flag}</span>
          <span className="text-base font-extrabold text-[#0F1B3A] text-center leading-tight">
            {away.name}
          </span>
          <span className="text-[#0F1B3A]/30 text-xs font-medium">{away.code}</span>

          {/* Vote count */}
          <AnimatePresence mode="popLayout">
            <motion.span
              key={votes?.awayVotes ?? 0}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.3, opacity: 0 }}
              className="text-[#C9A24B] font-extrabold text-3xl tabular-nums mt-1"
            >
              {votes?.awayVotes ?? 0}
            </motion.span>
          </AnimatePresence>

          {/* +/- buttons */}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => handleDecrement("away")}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{
                backgroundColor: "#F5F0E8",
                color: "#0F1B3A",
              }}
            >
              <Minus size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => handleIncrement("away")}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "linear-gradient(135deg, #C9A24B 0%, #E8D48B 100%)",
                color: "#fff",
                boxShadow: "0 2px 8px rgba(201,162,75,0.3)",
              }}
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Animated vote bar */}
      {totalVotes > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="flex items-center justify-between text-sm font-bold mb-2">
            <span className="text-[#1A6B3C]">
              {home.code} {homePercent}%
            </span>
            <span className="text-[#0F1B3A]/25 text-xs">{totalVotes} total votes</span>
            <span className="text-[#E54141]">
              {awayPercent}% {away.code}
            </span>
          </div>
          <div className="h-3 rounded-full bg-[#F5F0E8] overflow-hidden flex">
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
        </motion.div>
      )}

      {totalVotes === 0 && (
        <p className="text-[#0F1B3A]/30 text-sm text-center animate-pulse">
          Tap + to start counting votes
        </p>
      )}
    </motion.div>
  );
}
