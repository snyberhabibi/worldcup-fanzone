"use client";

import { useState, useEffect, useMemo } from "react";
import { MATCHES, TEAMS, type Match } from "@/data/schedule";

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
    // Consider a match "upcoming" until 2 hours after kickoff
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

function getTeamLabel(code: string): string {
  const team = TEAMS[code];
  return team ? `${team.flag_emoji} ${team.name}` : code;
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
      <div className="glass-card p-6 text-center">
        <p className="text-gold text-lg font-bold">Tournament Complete</p>
      </div>
    );
  }

  // LIVE state
  if (live) {
    return (
      <div className="glass-card p-6 text-center relative overflow-hidden">
        {/* Animated green border pulse */}
        <div className="absolute inset-0 rounded-2xl border-2 border-green animate-pulse pointer-events-none" />

        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="pulse-dot inline-block w-3 h-3 rounded-full bg-red" />
          <span className="text-red font-extrabold text-lg tracking-wider uppercase">
            Live Now
          </span>
          <span className="pulse-dot inline-block w-3 h-3 rounded-full bg-red" />
        </div>

        <div className="flex items-center justify-center gap-4 text-2xl font-bold">
          <span>{getTeamLabel(nextMatch.homeTeam)}</span>
          <span className="text-gold text-xl">vs</span>
          <span>{getTeamLabel(nextMatch.awayTeam)}</span>
        </div>

        <p className="text-cream/50 text-sm mt-2">
          {nextMatch.venue} &middot; {nextMatch.city}
        </p>
      </div>
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
    <div className="glass-card p-6">
      <p className="text-center text-cream/60 text-sm font-medium mb-4 uppercase tracking-wider">
        {label}
      </p>

      {/* Countdown digits */}
      <div className="flex items-center justify-center gap-3">
        {units.map((unit, i) => (
          <div key={unit.label} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="timer-glow text-gold text-4xl sm:text-5xl font-extrabold tabular-nums leading-none">
                {String(unit.value).padStart(2, "0")}
              </span>
              <span className="text-cream/40 text-[10px] font-medium uppercase tracking-widest mt-1.5">
                {unit.label}
              </span>
            </div>
            {i < units.length - 1 && (
              <span className="text-gold/40 text-2xl font-bold -mt-4">:</span>
            )}
          </div>
        ))}
      </div>

      {/* Match info */}
      <div className="mt-5 pt-4 border-t border-gold/10 text-center">
        <div className="flex items-center justify-center gap-3 text-base font-semibold">
          <span>{getTeamLabel(nextMatch.homeTeam)}</span>
          <span className="text-gold/60 text-sm">vs</span>
          <span>{getTeamLabel(nextMatch.awayTeam)}</span>
        </div>
        <p className="text-cream/40 text-xs mt-1.5">
          {etToCt(nextMatch.time)} CT &middot; {nextMatch.venue}
        </p>
      </div>
    </div>
  );
}
