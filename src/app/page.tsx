"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import CountdownTimer from "@/components/CountdownTimer";
import PartnerLogos from "@/components/PartnerLogos";
import { Calendar, Vote, Gift, Trophy } from "lucide-react";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ═══ HERO — Full viewport, breathtaking ═══ */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6">
        {/* Video background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          poster="/mascot/celebrating.png"
        >
          <source src="/video/stadium-v2.mp4" type="video/mp4" />
        </video>

        {/* Gradient overlay — lighter so video is more visible */}
        <div className="absolute inset-0 bg-gradient-to-b from-cream/30 via-cream/20 to-cream/80" />

        {/* Floating gold particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-gold/20 pointer-events-none"
            style={{
              top: `${15 + i * 12}%`,
              left: `${10 + (i * 17) % 80}%`,
              fontSize: `${10 + (i % 3) * 6}px`,
            }}
            animate={{ y: [0, -12, 0], opacity: [0.15, 0.4, 0.15] }}
            transition={{
              repeat: Infinity,
              duration: 2.5 + i * 0.5,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          >
            ✦
          </motion.div>
        ))}

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Mascot — floating, no white box */}
          <motion.div
            className="relative mx-auto w-48 h-48 sm:w-56 sm:h-56 mb-6"
            animate={{ y: [0, -18, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          >
            <Image
              src="/mascot/usa-fan.png"
              alt="Fufu the World Cup mascot"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </motion.div>

          {/* Welcome text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <p className="text-navy/50 text-xs font-semibold uppercase tracking-[0.2em] mb-2">
              DAR Coffee × Yalla Bites × Haus of Design
            </p>
            <h1 className="text-4xl sm:text-5xl font-black text-navy leading-none mb-2">
              Welcome to the
            </h1>
            <h2 className="text-4xl sm:text-5xl font-black leading-none mb-4">
              <span className="text-shimmer">Fan Zone</span>
            </h2>
            <p className="text-navy/50 text-sm max-w-xs mx-auto mb-2">
              Dallas&apos;s first World Cup watch party.
              <br />Every match. June 11 — July 19, 2026.
            </p>
          </motion.div>

          {/* Countdown */}
          {mounted && (
            <motion.div
              className="max-w-sm mx-auto mt-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <CountdownTimer />
            </motion.div>
          )}
        </div>
      </section>

      {/* ═══ QUICK ACTIONS — Simple, big, tappable ═══ */}
      <section className="px-5 mt-6 relative z-20">
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } },
          }}
        >
          {[
            { href: "/schedule", icon: Calendar, label: "Match Schedule", sub: "104 matches", color: "text-green" },
            { href: "/vote", icon: Vote, label: "Vote Now", sub: "Who wins?", color: "text-red" },
            { href: "/raffle", icon: Gift, label: "Win Prizes", sub: "Enter raffle", color: "text-gold" },
            { href: "/schedule#groups", icon: Trophy, label: "Groups", sub: "48 teams", color: "text-navy" },
          ].map((item) => (
            <motion.div
              key={item.href}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
              }}
            >
              <Link
                href={item.href}
                className="card p-5 flex flex-col items-center gap-2 text-center block active:scale-[0.96] transition-transform"
              >
                <item.icon size={26} className={item.color} />
                <span className="text-sm font-bold text-navy">{item.label}</span>
                <span className="text-[11px] text-navy/45">{item.sub}</span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══ ORDER FOOD CTA — right after quick actions ═══ */}
      <section className="px-5 pt-6">
        <div className="card p-6 text-center">
          <Image
            src="/yallabites-logo.svg"
            alt="Yalla Bites"
            width={140}
            height={40}
            className="mx-auto mb-3"
            unoptimized
          />
          <p className="text-sm font-bold text-navy mb-1">
            Exclusive discounts for DAR Kitchen &amp; Catering
          </p>
          <p className="text-navy/50 text-xs mb-4">
            Order for pickup on Yalla Bites
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://apps.apple.com/us/app/yalla-bites/id6753923330"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-navy text-white font-bold text-xs py-3 px-5 rounded-xl flex items-center gap-2 active:scale-[0.95] transition-transform shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.yallabites"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green text-white font-bold text-xs py-3 px-5 rounded-xl flex items-center gap-2 active:scale-[0.95] transition-transform shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 0 1 0 1.38l-2.302 2.302-2.533-2.533 2.533-2.451zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z"/></svg>
              Google Play
            </a>
          </div>
        </div>
      </section>

      {/* ═══ SPONSOR INSTAGRAMS ═══ */}
      <section className="px-5 py-6">
        <h2 className="text-xs font-bold text-navy/40 uppercase tracking-[0.2em] mb-4 text-center">
          Follow Us
        </h2>
        <div className="flex items-center justify-center gap-6">
          {[
            { href: "https://www.instagram.com/darcoffeeofficial", handle: "@darcoffeeofficial" },
            { href: "https://www.instagram.com/yallabitesapp", handle: "@yallabitesapp" },
            { href: "https://www.instagram.com/hausofdesignevents", handle: "@hausofdesignevents" },
          ].map((ig) => (
            <a
              key={ig.handle}
              href={ig.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center shadow-sm group-active:scale-90 transition-transform">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.272 2.69.072 7.052.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </div>
              <span className="text-[11px] font-bold text-navy/60 group-hover:text-navy transition-colors">{ig.handle}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <div className="px-5 pb-6">
        <PartnerLogos />
        <p className="text-navy/20 text-[11px] text-center mt-4">
          &copy; 2026 World Cup Fanzone Dallas. Not affiliated with FIFA.
        </p>
      </div>
    </div>
  );
}
