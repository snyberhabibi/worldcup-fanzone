"use client";

import VoteTracker from "@/components/VoteTracker";
import { Coffee } from "lucide-react";

export default function VotePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-xl font-extrabold text-center mb-1 flex items-center justify-center gap-2">
          <Coffee size={20} className="text-gold" />
          <span><span className="text-navy font-black">DAR&apos;s</span>{" "}<span className="text-shimmer font-black">Pick</span></span>
        </h1>
        <p className="text-navy/50 text-xs text-center mb-4">
          Cast your vote. Who takes it?
        </p>
      </div>

      {/* Vote Tracker */}
      <div className="py-4">
        <VoteTracker />
      </div>
    </div>
  );
}
