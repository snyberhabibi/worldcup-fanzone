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
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          poster="/mascot/celebrating.png"
        >
          <source src="/video/stadium-bg.mp4" type="video/mp4" />
        </video>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-cream/80 via-cream/60 to-cream" />

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
              src="/mascot/saudi-fan.png"
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

      {/* ═══ MASCOT GALLERY — scrollable branded fans ═══ */}
      <section className="py-8">
        <h2 className="text-xs font-bold text-navy/40 uppercase tracking-[0.2em] mb-5 text-center">
          Meet Our Fans
        </h2>
        <motion.div
          className="flex gap-5 overflow-x-auto pb-3 px-6 snap-x snap-mandatory scrollbar-hide"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {[
            { src: "/mascot/saudi-fan.png", label: "Saudi Arabia" },
            { src: "/mascot/usa-fan.png", label: "USA" },
            { src: "/mascot/mexico-fan.png", label: "México" },
            { src: "/mascot/argentina-fan.png", label: "Argentina" },
            { src: "/mascot/japan-fan.png", label: "Japan" },
            { src: "/mascot/celebrating.png", label: "Celebrating" },
            { src: "/mascot/kicking.png", label: "Fufu Kicks" },
          ].map((fan) => (
            <motion.div
              key={fan.label}
              className="snap-center shrink-0 flex flex-col items-center gap-2"
              variants={{
                hidden: { opacity: 0, scale: 0.8 },
                visible: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 20 } },
              }}
              whileHover={{ scale: 1.08, y: -4 }}
            >
              <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                <Image
                  src={fan.src}
                  alt={`Fufu ${fan.label} fan`}
                  fill
                  className="object-contain drop-shadow-lg"
                />
              </div>
              <span className="text-[11px] font-bold text-navy/50">{fan.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══ DOWNLOAD CTA ═══ */}
      <motion.section
        className="px-5 pb-6"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
      >
        <div className="card p-6 text-center">
          <h3 className="text-base font-extrabold text-navy mb-1">
            Order Food to the Fanzone
          </h3>
          <p className="text-navy/45 text-xs mb-4 max-w-xs mx-auto">
            Download Yalla Bites and get homemade food delivered while you watch.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://apps.apple.com/us/app/yalla-bites/id6753923330"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-navy text-cream font-bold text-xs py-3 px-5 rounded-xl flex items-center gap-2 active:scale-[0.96] transition-transform"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.yallabites"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-navy text-cream font-bold text-xs py-3 px-5 rounded-xl flex items-center gap-2 active:scale-[0.96] transition-transform"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 0 1 0 1.38l-2.302 2.302-2.533-2.533 2.533-2.451zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z"/>
              </svg>
              Google Play
            </a>
          </div>
        </div>
      </motion.section>

      {/* ═══ PARTNER LOGOS + FOOTER ═══ */}
      <div className="px-5 pb-6">
        <PartnerLogos />
        <p className="text-navy/20 text-[11px] text-center mt-4">
          &copy; 2026 World Cup Fanzone Dallas. Not affiliated with FIFA.
        </p>
      </div>
    </div>
  );
}
