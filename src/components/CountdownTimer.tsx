"use client";

import { useState, useEffect, useMemo } from "react";
import { MATCHES, TEAMS, type Match } from "@/data/schedule";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getNextMatch(now: Date): Match | null {
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

function isLive(match: Match, now: Date): boolean {
  const matchTime = new Date(match.date).getTime();
  const nowMs = now.getTime();
  return nowMs >= matchTime && nowMs < matchTime + 2 * 60 * 60 * 1000;
}

function tournamentHasStarted(now: Date): boolean {
  const firstMatch = [...MATCHES].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )[0];
  if (!firstMatch) return false;
  return now.getTime() >= new Date(firstMatch.date).getTime();
}

function calcTimeLeft(target: Date, now: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

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

function getTeamLabel(code: string): string {
  const team = TEAMS[code];
  return team ? `${team.flag_emoji} ${team.name}` : code;
}

/** Flip-style digit with exit/enter animation */
function FlipDigit({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative overflow-hidden rounded-xl px-2 py-2"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8F5EE 100%)",
          boxShadow:
            "0 2px 8px rgba(15,27,58,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
        }}
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={display}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="block text-[#C9A24B] text-4xl sm:text-5xl font-extrabold tabular-nums leading-none"
          >
            {display}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[#0F1B3A]/35 text-[10px] font-semibold uppercase tracking-widest mt-2">
        {label}
      </span>
    </div>
  );
}

export default function CountdownTimer() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const nextMatch = useMemo(() => getNextMatch(now), [now]);
  const started = useMemo(() => tournamentHasStarted(now), [now]);
  const live = nextMatch ? isLive(nextMatch, now) : false;
  const timeLeft = nextMatch
    ? calcTimeLeft(new Date(nextMatch.date), now)
    : null;

  // No more matches
  if (!nextMatch) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 text-center"
        style={{ boxShadow: "0 4px 20px rgba(15,27,58,0.06)" }}
      >
        <p className="text-[#C9A24B] text-lg font-bold">Tournament Complete</p>
      </motion.div>
    );
  }

  // LIVE state
  if (live) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 text-center relative overflow-hidden"
        style={{ boxShadow: "0 4px 24px rgba(26,107,60,0.12)" }}
      >
        {/* Pulsing green border */}
        <div className="absolute inset-0 rounded-2xl border-2 border-[#1A6B3C] animate-pulse pointer-events-none" />

        <div className="flex items-center justify-center gap-2 mb-3">
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="inline-block w-3 h-3 rounded-full bg-[#E54141]"
          />
          <span className="text-[#E54141] font-extrabold text-lg tracking-wider uppercase">
            Live Now
          </span>
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
            className="inline-block w-3 h-3 rounded-full bg-[#E54141]"
          />
        </div>

        <div className="flex items-center justify-center gap-4 text-2xl font-bold text-[#0F1B3A]">
          <span>{getTeamLabel(nextMatch.homeTeam)}</span>
          <span className="text-[#C9A24B] text-xl">vs</span>
          <span>{getTeamLabel(nextMatch.awayTeam)}</span>
        </div>

        <p className="text-[#0F1B3A]/40 text-sm mt-2">
          {nextMatch.venue} &middot; {nextMatch.city}
        </p>
      </motion.div>
    );
  }

  // Countdown state
  const label = started ? "Next match in" : "Tournament starts in";
  const units = [
    { value: timeLeft!.days, label: "Days" },
    { value: timeLeft!.hours, label: "Hours" },
    { value: timeLeft!.minutes, label: "Min" },
    { value: timeLeft!.seconds, label: "Sec" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 relative overflow-hidden"
      style={{ boxShadow: "0 4px 20px rgba(15,27,58,0.06)" }}
    >
      {/* Mascot decoration */}
      <div className="absolute -right-4 -top-2 w-24 h-24 opacity-20 pointer-events-none">
        <Image
          src="/mascot/referee.png"
          alt=""
          fill
          className="object-contain"
        />
      </div>

      <p className="text-center text-[#0F1B3A]/45 text-sm font-semibold mb-5 uppercase tracking-wider relative z-10">
        {label}
      </p>

      {/* Countdown digits */}
      <div className="flex items-center justify-center gap-3 relative z-10">
        {units.map((unit, i) => (
          <div key={unit.label} className="flex items-center gap-3">
            <FlipDigit value={unit.value} label={unit.label} />
            {i < units.length - 1 && (
              <span className="text-[#C9A24B]/30 text-2xl font-bold -mt-5">:</span>
            )}
          </div>
        ))}
      </div>

      {/* Match info */}
      <div className="mt-6 pt-4 border-t border-[#0F1B3A]/5 text-center relative z-10">
        <div className="flex items-center justify-center gap-3 text-base font-semibold text-[#0F1B3A]">
          <span>{getTeamLabel(nextMatch.homeTeam)}</span>
          <span className="text-[#C9A24B]/50 text-sm">vs</span>
          <span>{getTeamLabel(nextMatch.awayTeam)}</span>
        </div>
        <p className="text-[#0F1B3A]/35 text-xs mt-1.5">
          {etToCt(nextMatch.time)} CT &middot; {nextMatch.venue}
        </p>
      </div>
    </motion.div>
  );
}
