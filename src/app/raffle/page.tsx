"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import RaffleForm from "@/components/RaffleForm";
import { getRaffles } from "@/lib/store";
import { Raffle } from "@/types";
import { Gift, Trophy, Sparkles, Download } from "lucide-react";

export default function RafflePage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRaffles(getRaffles());
  }, []);

  const activeRaffles = raffles.filter((r) => r.status === "active");
  const pastRaffles = raffles.filter((r) => r.status === "drawn" || r.status === "closed");

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Gift className="text-gold" size={24} />
          <h1 className="text-xl font-extrabold text-shimmer">Raffle</h1>
        </div>
        <p className="text-navy/40 text-xs text-center">
          Enter for a chance to win amazing prizes
        </p>
      </div>

      <div className="px-5 space-y-6">
        {/* Active Raffles */}
        {activeRaffles.length > 0 ? (
          activeRaffles.map((raffle) => (
            <div key={raffle.id}>
              {/* Active badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-green" />
                <span className="text-green text-xs font-bold uppercase tracking-wider">
                  Active Raffle
                </span>
              </div>

              {/* Description card */}
              {raffle.description && (
                <div className="card-light p-4 mb-4">
                  <p className="text-navy/60 text-sm leading-relaxed">
                    {raffle.description}
                  </p>
                </div>
              )}

              {/* Raffle form */}
              <RaffleForm raffleId={raffle.id} raffleName={raffle.name} />
            </div>
          ))
        ) : (
          /* No active raffle */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative w-40 h-40 mb-6">
              <Image
                src="/mascot/trophy.png"
                alt="Mascot dancing"
                fill
                className="object-contain"
              />
            </div>
            <h2 className="text-xl font-extrabold text-gold mb-2">
              No Active Raffle Right Now
            </h2>
            <p className="text-navy/50 text-sm max-w-xs">
              Check back during match days for your chance to win prizes at the fanzone!
            </p>
          </div>
        )}

        {/* Download Yalla Bites CTA */}
        <div className="card p-5 text-center">
          <Sparkles className="text-gold mx-auto mb-2" size={22} />
          <p className="text-sm font-bold text-navy mb-1">
            Download Yalla Bites to increase your chances!
          </p>
          <p className="text-navy/40 text-xs mb-4">
            Yalla Bites users get bonus raffle entries on match days.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://apps.apple.com/us/app/yalla-bites/id6753923330"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gold/10 text-gold font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 active:scale-[0.97] transition-transform border border-gold/20"
            >
              <Download size={14} />
              App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.yallabites"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gold/10 text-gold font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 active:scale-[0.97] transition-transform border border-gold/20"
            >
              <Download size={14} />
              Google Play
            </a>
          </div>
        </div>

        {/* Past Raffle Winners */}
        {pastRaffles.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-navy/30 uppercase tracking-[0.15em] mb-3">
              Past Raffles
            </h2>
            <div className="space-y-3">
              {pastRaffles.map((raffle) => (
                <div key={raffle.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-navy">{raffle.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        raffle.status === "drawn"
                          ? "text-gold bg-gold/10"
                          : "text-navy/40 bg-navy/5"
                      }`}
                    >
                      {raffle.status === "drawn" ? "Winner Drawn" : "Closed"}
                    </span>
                  </div>
                  {raffle.winnerName && (
                    <div className="flex items-center gap-2 mt-2">
                      <Trophy size={14} className="text-gold" />
                      <span className="text-sm text-gold font-semibold">
                        {raffle.winnerName}
                      </span>
                    </div>
                  )}
                  {raffle.closedAt && (
                    <p className="text-[10px] text-navy/30 mt-1">
                      {new Date(raffle.closedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
