"use client";

import { useState, useRef } from "react";
import { addRaffleEntry } from "@/lib/store";
import { Gift, CheckCircle, AlertCircle, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import confetti from "canvas-confetti";

interface RaffleFormProps {
  raffleId: string;
  raffleName: string;
}

/** Format phone as (XXX) XXX-XXXX */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function RaffleForm({ raffleId, raffleName }: RaffleFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [shaking, setShaking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim() || !email.trim()) {
      setStatus("error");
      setErrorMsg("Please fill in all fields.");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setStatus("error");
      setErrorMsg("Please enter a valid email address.");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }

    // Phone validation — must have exactly 10 digits
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      setStatus("error");
      setErrorMsg("Please enter a valid 10-digit phone number.");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }

    const result = addRaffleEntry(raffleId, name.trim(), phone.trim(), email.trim());
    if (result.success) {
      setStatus("success");
      setName("");
      setPhone("");
      setEmail("");

      // Victory confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { x: 0.5, y: 0.6 },
        colors: ["#C9A24B", "#1A6B3C", "#E54141", "#0F1B3A"],
      });
    } else {
      setStatus("error");
      setErrorMsg(result.error || "Something went wrong.");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  // Success state
  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 text-center"
        style={{ boxShadow: "0 4px 20px rgba(15,27,58,0.06)" }}
      >
        {/* Mascot with bounce-in */}
        <motion.div
          className="relative w-32 h-32 mx-auto mb-4"
          initial={{ scale: 0, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <Image
            src="/mascot/celebrating.png"
            alt="Celebrating mascot"
            fill
            className="object-contain drop-shadow-lg"
          />
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
        >
          <CheckCircle className="text-[#1A6B3C] mx-auto mb-3" size={48} />
        </motion.div>
        <h3 className="text-xl font-extrabold text-[#0F1B3A] mb-2">You&apos;re In!</h3>
        <p className="text-[#0F1B3A]/50 text-sm mb-6">
          You&apos;ve been entered into{" "}
          <span className="font-bold text-[#0F1B3A]">{raffleName}</span>. Good luck!
        </p>

        {/* Download Yalla Bites CTAs */}
        <div
          className="bg-[#F5F0E8] rounded-xl p-4 mb-6"
        >
          <p className="text-[#0F1B3A]/60 text-xs font-semibold uppercase tracking-wider mb-3">
            Order from the best home chefs
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://apps.apple.com/us/app/yalla-bites/id6753923330"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#0F1B3A] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-transform active:scale-95"
            >
              <Download size={14} />
              App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.yallabites"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#0F1B3A] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-transform active:scale-95"
            >
              <Download size={14} />
              Play Store
            </a>
          </div>
        </div>

        <button
          onClick={() => setStatus("idle")}
          className="text-sm text-[#C9A24B] font-semibold underline underline-offset-4"
        >
          Enter another person
        </button>
      </motion.div>
    );
  }

  // Form state
  return (
    <motion.form
      ref={formRef}
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: 1,
        y: 0,
        x: shaking ? [0, -8, 8, -6, 6, -3, 3, 0] : 0,
      }}
      transition={shaking ? { duration: 0.4 } : { duration: 0.4 }}
      className="bg-white rounded-2xl p-6"
      style={{ boxShadow: "0 4px 20px rgba(15,27,58,0.06)" }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #C9A24B 0%, #E8D48B 100%)" }}
        >
          <Gift className="text-white" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-[#0F1B3A]">{raffleName}</h3>
          <p className="text-[#0F1B3A]/35 text-xs">Enter your details below</p>
        </div>
      </div>

      {/* Error alert */}
      <AnimatePresence>
        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 bg-[#E54141]/5 border border-[#E54141]/15 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={16} className="text-[#E54141] shrink-0" />
              <p className="text-[#E54141] text-sm">{errorMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#0F1B3A]/50 uppercase tracking-wider block mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="Enter your name"
            className="w-full bg-[#F5F0E8]/60 border border-[#0F1B3A]/8 rounded-xl px-4 py-3 text-sm text-[#0F1B3A] placeholder:text-[#0F1B3A]/20 focus:outline-none focus:border-[#C9A24B]/50 focus:ring-2 focus:ring-[#C9A24B]/10 transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#0F1B3A]/50 uppercase tracking-wider block mb-1.5">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(formatPhone(e.target.value));
              if (status === "error") setStatus("idle");
            }}
            placeholder="(555) 123-4567"
            className="w-full bg-[#F5F0E8]/60 border border-[#0F1B3A]/8 rounded-xl px-4 py-3 text-sm text-[#0F1B3A] placeholder:text-[#0F1B3A]/20 focus:outline-none focus:border-[#C9A24B]/50 focus:ring-2 focus:ring-[#C9A24B]/10 transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#0F1B3A]/50 uppercase tracking-wider block mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="you@email.com"
            className="w-full bg-[#F5F0E8]/60 border border-[#0F1B3A]/8 rounded-xl px-4 py-3 text-sm text-[#0F1B3A] placeholder:text-[#0F1B3A]/20 focus:outline-none focus:border-[#C9A24B]/50 focus:ring-2 focus:ring-[#C9A24B]/10 transition-all"
          />
        </div>
      </div>

      <motion.button
        type="submit"
        whileTap={{ scale: 0.95 }}
        className="w-full mt-6 font-extrabold py-4 rounded-xl text-base text-white transition-all"
        style={{
          background: "linear-gradient(135deg, #C9A24B 0%, #DFC06A 50%, #C9A24B 100%)",
          boxShadow: "0 4px 12px rgba(201,162,75,0.3)",
        }}
      >
        Enter Raffle
      </motion.button>
    </motion.form>
  );
}
