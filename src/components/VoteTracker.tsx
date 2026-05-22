"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MATCHES, TEAMS, type Match } from "@/data/schedule";
import { getVotes, incrementVote } from "@/lib/store";
import { Trophy } from "lucide-react";
import Image from "next/image";
import confetti from "canvas-confetti";

function getTeamDisplay(code: string) {
  const team = TEAMS[code];
  if (team) return { flag: team.flag_emoji, name: team.name, code: team.code };
  return { flag: "", name: code, code };
}

function getNextGroupMatch(now: Date): Match | null {
  const sorted = [...MATCHES]
    .filter((m) => m.stage === "group")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const match of sorted) {
    const matchTime = new Date(match.date).getTime();
    if (matchTime + 2 * 60 * 60 * 1000 > now.getTime()) {
      return match;
    }
  }
  return null;
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

export default function VoteTracker() {
  const [now, setNow] = useState(() => new Date());
  const [voted, setVoted] = useState<"home" | "away" | null>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentMatch = useMemo(() => getCurrentOrNextMatch(now), [now]);
  const votes = currentMatch ? getVotes(currentMatch.id) : null;
  const totalVotes = votes ? votes.homeVotes + votes.awayVotes : 0;
  const homePercent = totalVotes > 0 ? Math.round((votes!.homeVotes / totalVotes) * 100) : 50;
  const awayPercent = totalVotes > 0 ? 100 - homePercent : 50;

  const handleVote = useCallback(
    (side: "home" | "away") => {
      if (!currentMatch || voted) return;
      incrementVote(currentMatch.id, side);
      setVoted(side);
      setAnimating(true);

      // Fire confetti
      const x = side === "home" ? 0.25 : 0.75;
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { x, y: 0.6 },
        colors:
          side === "home"
            ? ["#1A6B3C", "#2d8a52", "#C9A24B"]
            : ["#E54141", "#C9A24B", "#5A2A2E"],
      });

      setTimeout(() => setAnimating(false), 600);
    },
    [currentMatch, voted]
  );

  // Check if user already voted (per session)
  useEffect(() => {
    if (!currentMatch) return;
    const savedVote = sessionStorage.getItem(`wc26_voted_${currentMatch.id}`);
    if (savedVote === "home" || savedVote === "away") {
      setVoted(savedVote);
    } else {
      setVoted(null);
    }
  }, [currentMatch]);

  // Save vote to session
  useEffect(() => {
    if (!currentMatch || !voted) return;
    sessionStorage.setItem(`wc26_voted_${currentMatch.id}`, voted);
  }, [currentMatch, voted]);

  if (!currentMatch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="relative w-40 h-40 mb-6">
          <Image
            src="/mascot/17_running.png"
            alt="Mascot running"
            fill
            className="object-contain"
          />
        </div>
        <h2 className="text-2xl font-extrabold text-gold mb-2">No Match Right Now</h2>
        <p className="text-cream/50 text-sm max-w-xs">
          Check back during the next match to cast your vote!
        </p>
      </div>
    );
  }

  const home = getTeamDisplay(currentMatch.homeTeam);
  const away = getTeamDisplay(currentMatch.awayTeam);

  return (
    <div className="flex flex-col items-center px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Trophy className="text-gold trophy-glow" size={28} />
        <h1 className="text-2xl font-extrabold text-shimmer">WHO WINS?</h1>
        <Trophy className="text-gold trophy-glow" size={28} />
      </div>

      {/* Match info */}
      <div className="text-center mb-8">
        {currentMatch.group && (
          <span className="text-xs font-bold text-gold bg-gold/10 px-3 py-1 rounded-full">
            Group {currentMatch.group}
          </span>
        )}
        <p className="text-cream/40 text-xs mt-2">
          {currentMatch.venue} &middot; {currentMatch.city}
        </p>
      </div>

      {/* Vote buttons */}
      <div className="flex items-stretch gap-4 w-full max-w-sm mb-8">
        {/* Home team */}
        <button
          onClick={() => handleVote("home")}
          disabled={!!voted}
          className={`
            vote-btn flex-1 flex-col gap-2 p-6 transition-all duration-300
            ${
              voted === "home"
                ? "bg-green/30 border-2 border-green scale-105 shadow-lg shadow-green/20"
                : voted === "away"
                ? "bg-cream/5 border border-cream/10 opacity-50"
                : "bg-cream/5 border border-cream/10 active:bg-green/20 active:border-green/40"
            }
          `}
        >
          <span className={`text-5xl transition-transform duration-300 ${animating && voted === "home" ? "flag-bounce" : ""}`}>
            {home.flag}
          </span>
          <span className="text-lg font-extrabold">{home.name}</span>
          <span className="text-cream/40 text-xs font-medium">{home.code}</span>
          {voted && (
            <span className="text-green-light font-extrabold text-2xl mt-1">{homePercent}%</span>
          )}
        </button>

        {/* Away team */}
        <button
          onClick={() => handleVote("away")}
          disabled={!!voted}
          className={`
            vote-btn flex-1 flex-col gap-2 p-6 transition-all duration-300
            ${
              voted === "away"
                ? "bg-red/30 border-2 border-red scale-105 shadow-lg shadow-red/20"
                : voted === "home"
                ? "bg-cream/5 border border-cream/10 opacity-50"
                : "bg-cream/5 border border-cream/10 active:bg-red/20 active:border-red/40"
            }
          `}
        >
          <span className={`text-5xl transition-transform duration-300 ${animating && voted === "away" ? "flag-bounce" : ""}`}>
            {away.flag}
          </span>
          <span className="text-lg font-extrabold">{away.name}</span>
          <span className="text-cream/40 text-xs font-medium">{away.code}</span>
          {voted && (
            <span className="text-red font-extrabold text-2xl mt-1">{awayPercent}%</span>
          )}
        </button>
      </div>

      {/* Results bar */}
      {voted && totalVotes > 0 && (
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between text-sm font-bold mb-2">
            <span className="text-green-light">{home.code} {homePercent}%</span>
            <span className="text-cream/30 text-xs">{totalVotes} total votes</span>
            <span className="text-red">{awayPercent}% {away.code}</span>
          </div>
          <div className="h-3 rounded-full bg-navy-light overflow-hidden flex">
            <div
              className="h-full bg-green-light rounded-l-full transition-all duration-700 ease-out"
              style={{ width: `${homePercent}%` }}
            />
            <div
              className="h-full bg-red rounded-r-full transition-all duration-700 ease-out"
              style={{ width: `${awayPercent}%` }}
            />
          </div>
          <p className="text-center text-cream/30 text-xs mt-4">
            Your vote has been recorded!
          </p>
        </div>
      )}

      {!voted && (
        <p className="text-cream/40 text-sm text-center animate-pulse">
          Tap a team to cast your vote
        </p>
      )}
    </div>
  );
}
