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
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          poster="/mascot/celebrating.png"
        >
          <source src="/video/mascot-hero.mp4" type="video/mp4" />
        </video>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-cream/60 via-cream/40 to-cream" />

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

      {/* ═══ SPONSOR INSTAGRAMS ═══ */}
      <section className="px-5 py-6">
        <h2 className="text-xs font-bold text-navy/40 uppercase tracking-[0.2em] mb-4 text-center">
          Follow Us
        </h2>
        <div className="flex items-center justify-center gap-6">
          <a
            href="https://www.instagram.com/darcoffeeofficial"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </div>
            <span className="text-[11px] font-bold text-navy/60 group-hover:text-navy transition-colors">@darcoffeeofficial</span>
          </a>
          <a
            href="https://www.instagram.com/yallabitesapp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </div>
            <span className="text-[11px] font-bold text-navy/60 group-hover:text-navy transition-colors">@yallabitesapp</span>
          </a>
          <a
            href="https://www.instagram.com/hausofdesignevents"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </div>
            <span className="text-[11px] font-bold text-navy/60 group-hover:text-navy transition-colors">@hausofdesignevents</span>
          </a>
        </div>
      </section>

      {/* ═══ ORDER FOOD CTA ═══ */}
      <section className="px-5 pb-4">
        <div className="card p-6 text-center">
          {/* Yalla Bites Logo */}
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
              className="active:scale-[0.96] transition-transform"
            >
              <Image src="/appstore-badge.png" alt="Download on App Store" width={130} height={40} unoptimized />
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.yallabites"
              target="_blank"
              rel="noopener noreferrer"
              className="active:scale-[0.96] transition-transform"
            >
              <Image src="/googleplay-badge.png" alt="Get it on Google Play" width={130} height={40} unoptimized />
            </a>
          </div>
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
