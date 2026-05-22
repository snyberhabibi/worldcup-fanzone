"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import CountdownTimer from "@/components/CountdownTimer";
import PartnerLogos from "@/components/PartnerLogos";
import { getEvents } from "@/lib/store";
import { FanzoneEvent } from "@/types";
import { MapPin, Clock, ChevronRight, Coffee, Paintbrush, UtensilsCrossed, Sparkles } from "lucide-react";

export default function HomePage() {
  const [events, setEvents] = useState<FanzoneEvent[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEvents(getEvents().filter((e) => e.active));
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Decorative gold stars scattered */}
      <div className="absolute top-20 left-6 text-gold/20 text-lg animate-twinkle" style={{ animationDelay: "0s" }}>&#9733;</div>
      <div className="absolute top-36 right-10 text-gold/15 text-sm animate-twinkle" style={{ animationDelay: "0.8s" }}>&#9733;</div>
      <div className="absolute top-64 left-16 text-gold/10 text-xl animate-twinkle" style={{ animationDelay: "1.6s" }}>&#9733;</div>
      <div className="absolute top-48 right-24 text-gold/20 text-xs animate-twinkle" style={{ animationDelay: "0.4s" }}>&#9733;</div>
      <div className="absolute top-80 right-8 text-gold/15 text-base animate-twinkle" style={{ animationDelay: "1.2s" }}>&#9733;</div>

      {/* Hero Section */}
      <section className="relative px-5 pt-14 pb-8 overflow-hidden">
        {/* Subtle soccer ball pattern overlay */}
        <div className="absolute inset-0 soccer-pattern pointer-events-none" />

        {/* Mascot */}
        <div className="relative mx-auto w-[200px] h-[200px] mb-6">
          <div className="absolute inset-0 bg-gold/8 rounded-full blur-3xl" />
          <Image
            src="/mascot/celebrating.png"
            alt="World Cup Mascot"
            fill
            className="object-contain drop-shadow-2xl animate-float"
            priority
          />
        </div>

        {/* Title */}
        <h1 className="text-center text-3xl sm:text-4xl font-black leading-tight tracking-tight mb-1">
          <span className="text-navy">WORLD CUP </span>
          <span className="text-shimmer">FANZONE</span>
          <span className="text-navy"> 2026</span>
        </h1>
        <p className="text-center text-navy/55 text-sm font-medium mb-8 max-w-xs mx-auto">
          Dallas&apos;s first World Cup fan zone
        </p>

        {/* Countdown */}
        <div className="max-w-sm mx-auto">
          <CountdownTimer />
        </div>
      </section>

      {/* Partner Cards */}
      <section className="px-5 py-6">
        <h2 className="text-xs font-bold text-navy/50 uppercase tracking-[0.15em] mb-4">
          Presented by
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory scrollbar-hide">
          {/* DAR Coffee */}
          <div className="card p-4 min-w-[220px] snap-start shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <Coffee size={20} className="text-gold" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-navy">DAR Coffee</p>
                <p className="text-[11px] text-navy/55 font-medium">Host Venue</p>
              </div>
            </div>
            <p className="text-xs text-navy/50 leading-relaxed">
              Premium Saudi specialty coffee. Every match day, every goal, every sip.
            </p>
          </div>

          {/* Haus of Design */}
          <div className="card p-4 min-w-[220px] snap-start shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <Paintbrush size={20} className="text-gold" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-navy">Haus of Design</p>
                <p className="text-[11px] text-navy/55 font-medium">Decor Partner</p>
              </div>
            </div>
            <p className="text-xs text-navy/50 leading-relaxed">
              Transforming our fanzone into an immersive World Cup stadium experience.
            </p>
          </div>

          {/* Yalla Bites */}
          <div className="card p-4 min-w-[220px] snap-start shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <UtensilsCrossed size={20} className="text-gold" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-navy">Yalla Bites</p>
                <p className="text-[11px] text-navy/55 font-medium">Food Partner</p>
              </div>
            </div>
            <p className="text-xs text-navy/50 leading-relaxed">
              Homemade Arab food from Dallas&apos;s best home chefs, delivered to the fanzone.
            </p>
          </div>
        </div>
      </section>

      {/* Watch Locations */}
      {mounted && events.length > 0 && (
        <section className="px-5 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-navy/50 uppercase tracking-[0.15em]">
              Watch Locations
            </h2>
            <span className="flex items-center gap-1.5 text-green text-xs font-semibold">
              <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-green" />
              Active
            </span>
          </div>
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy truncate">{event.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-navy/55">{event.address}</span>
                    <span className="text-[11px] text-navy/50">{event.time}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-navy/20 shrink-0" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="px-5 py-6">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/schedule"
            className="card p-5 flex flex-col items-center gap-2.5 text-center active:scale-[0.97] transition-transform"
          >
            <span className="text-3xl">&#128197;</span>
            <span className="text-sm font-bold text-navy">Full Schedule</span>
            <span className="text-[11px] text-navy/55">104 matches</span>
          </Link>
          <Link
            href="/vote"
            className="card p-5 flex flex-col items-center gap-2.5 text-center active:scale-[0.97] transition-transform"
          >
            <span className="text-3xl">&#128499;&#65039;</span>
            <span className="text-sm font-bold text-navy">Vote Now</span>
            <span className="text-[11px] text-navy/55">Who wins?</span>
          </Link>
          <Link
            href="/raffle"
            className="card p-5 flex flex-col items-center gap-2.5 text-center active:scale-[0.97] transition-transform"
          >
            <span className="text-3xl">&#127873;</span>
            <span className="text-sm font-bold text-navy">Win Prizes</span>
            <span className="text-[11px] text-navy/55">Enter raffle</span>
          </Link>
          <Link
            href="/schedule#groups"
            className="card p-5 flex flex-col items-center gap-2.5 text-center active:scale-[0.97] transition-transform"
          >
            <span className="text-3xl">&#9917;</span>
            <span className="text-sm font-bold text-navy">Groups</span>
            <span className="text-[11px] text-navy/55">48 teams</span>
          </Link>
        </div>
      </section>

      {/* Download Yalla Bites */}
      <section className="px-5 py-6">
        <div className="card p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <Sparkles className="text-gold mx-auto mb-3" size={28} />
          <h3 className="text-lg font-extrabold text-navy mb-1">
            Order Food to the Fanzone
          </h3>
          <p className="text-navy/50 text-xs mb-5 max-w-xs mx-auto">
            Download Yalla Bites and get homemade Arab food delivered while you watch the match.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://apps.apple.com/us/app/yalla-bites/id6753923330"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-cream text-navy font-bold text-xs py-3 px-5 rounded-xl flex items-center gap-2 active:scale-[0.97] transition-transform border border-navy/10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.yallabites"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-cream text-navy font-bold text-xs py-3 px-5 rounded-xl flex items-center gap-2 active:scale-[0.97] transition-transform border border-navy/10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 0 1 0 1.38l-2.302 2.302-2.533-2.533 2.533-2.451zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z"/>
              </svg>
              Google Play
            </a>
          </div>
        </div>
      </section>

      {/* Partner Logos */}
      <section className="px-5 py-8">
        <PartnerLogos />
      </section>

      {/* Footer text */}
      <div className="text-center pb-4 px-5">
        <p className="text-navy/20 text-[11px]">
          &copy; 2026 World Cup Fanzone Dallas. Not affiliated with FIFA.
        </p>
      </div>
    </div>
  );
}
