"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MATCHES, type Match } from "@/data/schedule";
import { getVotes, getMyVote, castPublicVote } from "@/lib/store";
import { etToCt, getTeamDisplay } from "@/lib/utils";
import { Trophy, Check } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

/** Pre-sorted matches — computed once at module level */
const SORTED_MATCHES = [...MATCHES].sort(
  (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
);

function getCurrentOrNextMatch(now: Date): Match | null {
  for (const match of SORTED_MATCHES) {
    const matchTime = new Date(match.date).getTime();
    if (matchTime + 2 * 60 * 60 * 1000 > now.getTime()) {
      return match;
    }
  }
  return null;
}

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
  const [myVote, setMyVote] = useState<"home" | "away" | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentMatch = useMemo(() => getCurrentOrNextMatch(now), [now]);

  // Fetch votes from API (shared tally), fallback to localStorage
  useEffect(() => {
    if (!currentMatch) return;
    // Read from localStorage (external store) after paint to avoid a
    // synchronous setState cascade inside the effect body.
    queueMicrotask(() => {
      setMyVote(getMyVote(currentMatch.id));

      // Optimistic: show localStorage immediately
      const local = getVotes(currentMatch.id);
      setVotes({ homeVotes: local.homeVotes, awayVotes: local.awayVotes });
    });

    // Then fetch real totals from API
    fetch(`/api/votes?matchId=${currentMatch.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.homeVotes !== undefined) {
          setVotes({ homeVotes: data.homeVotes, awayVotes: data.awayVotes });
        }
      })
      .catch(() => {
        // API failed, keep localStorage values
      });
  }, [currentMatch]);

  // Poll for live updates every 10 seconds
  useEffect(() => {
    if (!currentMatch) return;
    const interval = setInterval(() => {
      fetch(`/api/votes?matchId=${currentMatch.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.homeVotes !== undefined) {
            setVotes({ homeVotes: data.homeVotes, awayVotes: data.awayVotes });
          }
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [currentMatch]);

  const totalVotes = votes ? votes.homeVotes + votes.awayVotes : 0;
  const homePercent = totalVotes > 0 ? Math.round((votes!.homeVotes / totalVotes) * 100) : 50;
  const awayPercent = totalVotes > 0 ? 100 - homePercent : 50;

  const handleVote = useCallback(
    (side: "home" | "away") => {
      if (!currentMatch) return;
      if (myVote === side) return;

      const oldVote = myVote;

      // Optimistic update locally
      castPublicVote(currentMatch.id, side);
      setMyVote(side);
      setVotes((prev) => {
        if (!prev) return { homeVotes: side === "home" ? 1 : 0, awayVotes: side === "away" ? 1 : 0 };
        const updated = { ...prev };
        // Remove old vote
        if (oldVote === "home") updated.homeVotes = Math.max(0, updated.homeVotes - 1);
        else if (oldVote === "away") updated.awayVotes = Math.max(0, updated.awayVotes - 1);
        // Add new vote
        if (side === "home") updated.homeVotes++;
        else updated.awayVotes++;
        return updated;
      });

      // Send to API
      fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: currentMatch.id,
          side,
          action: oldVote ? "change" : "cast",
          oldSide: oldVote,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.homeVotes !== undefined) {
            setVotes({ homeVotes: data.homeVotes, awayVotes: data.awayVotes });
          }
        })
        .catch(() => {});

      // Confetti burst
      const x = side === "home" ? 0.3 : 0.7;
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { x, y: 0.6 },
        colors: side === "home" ? ["#1A6B3C", "#C9A24B", "#2d8a52"] : ["#E54141", "#C9A24B", "#c93535"],
      });
    },
    [currentMatch, myVote]
  );

  // No match state
  if (!currentMatch) {
    const firstMatch = SORTED_MATCHES[0];
    const timeLeft = calcTimeLeft(new Date(firstMatch?.date ?? now.getTime()), now);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center px-6 text-center py-8"
      >
        <div className="relative w-44 h-44 mb-6">
          <Image src="/mascot/fan.png" alt="Mascot" fill unoptimized className="object-contain drop-shadow-lg" />
        </div>
        <h2 className="text-2xl font-extrabold text-[#0F1B3A] mb-2">No Match Right Now</h2>
        <p className="text-[#0F1B3A]/60 text-sm max-w-xs mb-6">
          Check back during the next match to cast your vote!
        </p>
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
              <span className="text-[#0F1B3A]/65 text-[11px] font-semibold ml-0.5">{u.l}</span>
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
        <Image src="/mascot/kicking.png" alt="Mascot" fill unoptimized className="object-contain drop-shadow-lg" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Trophy className="text-[#C9A24B]" size={24} />
        <h1 className="text-2xl font-extrabold text-[#0F1B3A] tracking-tight">WHO&apos;S TAKING IT?</h1>
        <Trophy className="text-[#C9A24B]" size={24} />
      </div>

      {/* Match info */}
      <div className="text-center mb-6">
        {currentMatch.group && (
          <span
            className="text-xs font-bold text-[#7a6020] px-3 py-1 rounded-full inline-block"
            style={{ backgroundColor: "rgba(201,162,75,0.15)" }}
          >
            Group {currentMatch.group}
          </span>
        )}
        <p className="text-[#0F1B3A]/70 text-xs mt-1.5">
          {currentMatch.venue} · {currentMatch.city} · {etToCt(currentMatch.time)} CT
        </p>
      </div>

      {/* Tap to vote instruction */}
      {!myVote && (
        <p className="text-[#0F1B3A]/65 text-xs font-medium mb-4">Tap a team to cast your vote</p>
      )}
      {myVote && (
        <p className="text-[#1A6B3C] text-xs font-semibold mb-4 flex items-center gap-1">
          <Check size={14} />
          Vote cast! Tap the other team to change.
        </p>
      )}

      {/* Two team cards — TAP TO VOTE */}
      <div className="flex items-stretch gap-4 w-full max-w-sm mb-6">
        {/* Home team card */}
        <motion.button
          onClick={() => handleVote("home")}
          whileTap={{ scale: 0.96 }}
          aria-label={`Vote for ${home.name}`}
          className={`flex-1 rounded-2xl p-5 flex flex-col items-center gap-2 transition-all duration-200 relative overflow-hidden ${
            myVote === "home"
              ? "bg-white ring-2 ring-[#1A6B3C]"
              : "bg-white hover:bg-[#f0ede5]"
          }`}
          style={{ boxShadow: myVote === "home" ? "0 4px 20px rgba(26,107,60,0.15)" : "0 2px 12px rgba(15,27,58,0.05)" }}
        >
          {myVote === "home" && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-[#1A6B3C] rounded-full flex items-center justify-center">
              <Check size={14} className="text-white" />
            </div>
          )}
          <span className="text-5xl leading-none">{home.flag}</span>
          <span className="text-base font-extrabold text-[#0F1B3A] text-center leading-tight">{home.name}</span>
          <span className="text-[#0F1B3A]/65 text-xs font-medium">{home.code}</span>
        </motion.button>

        {/* Away team card */}
        <motion.button
          onClick={() => handleVote("away")}
          whileTap={{ scale: 0.96 }}
          aria-label={`Vote for ${away.name}`}
          className={`flex-1 rounded-2xl p-5 flex flex-col items-center gap-2 transition-all duration-200 relative overflow-hidden ${
            myVote === "away"
              ? "bg-white ring-2 ring-[#E54141]"
              : "bg-white hover:bg-[#f0ede5]"
          }`}
          style={{ boxShadow: myVote === "away" ? "0 4px 20px rgba(229,65,65,0.15)" : "0 2px 12px rgba(15,27,58,0.05)" }}
        >
          {myVote === "away" && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-[#E54141] rounded-full flex items-center justify-center">
              <Check size={14} className="text-white" />
            </div>
          )}
          <span className="text-5xl leading-none">{away.flag}</span>
          <span className="text-base font-extrabold text-[#0F1B3A] text-center leading-tight">{away.name}</span>
          <span className="text-[#0F1B3A]/65 text-xs font-medium">{away.code}</span>
        </motion.button>
      </div>

      {/* Vote results bar — always visible */}
      {totalVotes > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-sm"
        >
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-[#1A6B3C]">{home.code} {homePercent}%</span>
            <span className="text-[#0F1B3A]/60 text-[11px]">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
            <span className="text-[#E54141]">{awayPercent}% {away.code}</span>
          </div>
          <div className="h-3 rounded-full bg-[#F5F0E8] overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${homePercent}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-l-full"
              style={{ background: "linear-gradient(90deg, #1A6B3C, #2d8a52)" }}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${awayPercent}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-r-full"
              style={{ background: "linear-gradient(90deg, #E54141, #c93535)" }}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
