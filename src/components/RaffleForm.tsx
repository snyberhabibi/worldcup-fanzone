"use client";

import { useState } from "react";
import { addRaffleEntry } from "@/lib/store";
import { Gift, CheckCircle, AlertCircle } from "lucide-react";

interface RaffleFormProps {
  raffleId: string;
  raffleName: string;
}

export default function RaffleForm({ raffleId, raffleName }: RaffleFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim() || !email.trim()) {
      setStatus("error");
      setErrorMsg("Please fill in all fields.");
      return;
    }

    const result = addRaffleEntry(raffleId, name.trim(), phone.trim(), email.trim());
    if (result.success) {
      setStatus("success");
      setName("");
      setPhone("");
      setEmail("");
    } else {
      setStatus("error");
      setErrorMsg(result.error || "Something went wrong.");
    }
  };

  if (status === "success") {
    return (
      <div className="glass-card p-8 text-center">
        <CheckCircle className="text-green mx-auto mb-4" size={48} />
        <h3 className="text-xl font-extrabold text-gold mb-2">You&apos;re In!</h3>
        <p className="text-cream/60 text-sm">
          You&apos;ve been entered into <span className="font-bold text-cream">{raffleName}</span>.
          Good luck!
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm text-gold/60 underline underline-offset-4"
        >
          Enter another person
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <Gift className="text-gold" size={24} />
        <div>
          <h3 className="text-lg font-extrabold">{raffleName}</h3>
          <p className="text-cream/40 text-xs">Enter your details below</p>
        </div>
      </div>

      {status === "error" && (
        <div className="flex items-center gap-2 bg-red/10 border border-red/20 rounded-xl px-4 py-3 mb-4">
          <AlertCircle size={16} className="text-red shrink-0" />
          <p className="text-red text-sm">{errorMsg}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-cream/60 uppercase tracking-wider block mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setStatus("idle");
            }}
            placeholder="Enter your name"
            className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-3 text-sm text-cream placeholder:text-cream/20 focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-cream/60 uppercase tracking-wider block mb-1.5">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setStatus("idle");
            }}
            placeholder="(555) 123-4567"
            className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-3 text-sm text-cream placeholder:text-cream/20 focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-cream/60 uppercase tracking-wider block mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setStatus("idle");
            }}
            placeholder="you@email.com"
            className="w-full bg-cream/5 border border-cream/10 rounded-xl px-4 py-3 text-sm text-cream placeholder:text-cream/20 focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-colors"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full mt-6 bg-gold text-navy font-extrabold py-4 rounded-xl text-base active:scale-[0.97] transition-transform"
      >
        Enter Raffle
      </button>
    </form>
  );
}
