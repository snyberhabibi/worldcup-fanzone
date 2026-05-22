"use client";

import VoteTracker from "@/components/VoteTracker";

export default function VotePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-xl font-extrabold text-center text-shimmer mb-1">
          Match Vote
        </h1>
        <p className="text-navy/40 text-xs text-center mb-4">
          Pick the winner. See what everyone else thinks.
        </p>
      </div>

      {/* Vote Tracker */}
      <div className="flex-1 flex flex-col justify-center py-6">
        <VoteTracker />
      </div>
    </div>
  );
}
