"use client";

import VoteTracker from "@/components/VoteTracker";

export default function VotePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-xl font-extrabold text-center text-navy mb-1">
          Match Vote
        </h1>
        <p className="text-navy/50 text-xs text-center mb-4">
          Pick the winner. See what everyone else thinks.
        </p>
      </div>

      {/* Vote Tracker */}
      <div className="py-4">
        <VoteTracker />
      </div>
    </div>
  );
}
