"use client";

import { useState } from "react";

// Shows the shareable fan-voting URL with a one-tap copy button, so staff can
// grab the link and text/post it. Falls back to selecting the text if the
// clipboard API is unavailable (e.g. non-secure context).
export function CopyVoteLink() {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined" ? `${window.location.origin}/vote` : "/vote";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="panel"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 0.9rem",
        flexWrap: "wrap",
        justifyContent: "center",
        maxWidth: 560,
        width: "100%",
      }}
    >
      <span className="eyebrow" style={{ color: "var(--yb-gold)" }}>Share to vote</span>
      <code
        style={{
          flex: "1 1 220px",
          minWidth: 0,
          fontFamily: "var(--font-body)",
          fontSize: "0.95rem",
          color: "var(--cream-soft)",
          background: "rgba(0,0,0,0.25)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "0.55rem 0.75rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {url}
      </code>
      <button className="btn btn--gold" onClick={copy} style={{ flexShrink: 0 }}>
        {copied ? "✓ Copied" : "Copy link"}
      </button>
    </div>
  );
}
