"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="screen arcade-bg safe" style={centered}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1.2rem", alignItems: "center", padding: "2rem" }}>
        <span className="emoji" style={{ fontSize: "3.5rem" }}>⚽️</span>
        <h2 className="display" style={{ fontSize: "clamp(1.6rem, 5vw, 2.6rem)" }}>
          Something went wrong
        </h2>
        <p className="text-dim" style={{ maxWidth: 380 }}>
          The screen hit a snag. Tap below to reload — votes already saved are safe.
        </p>
        <button onClick={reset} className="btn btn--gold btn--lg">
          Try again
        </button>
      </div>
    </main>
  );
}

const centered: React.CSSProperties = {
  alignItems: "center",
  justifyContent: "center",
};
