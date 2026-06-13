import Link from "next/link";
import { CopyVoteLink } from "@/components/CopyVoteLink";

export default function LauncherPage() {
  return (
    <main className="screen arcade-bg safe" style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        className="anim-rise"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2rem",
          padding: "2rem",
          maxWidth: 960,
          width: "100%",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p className="eyebrow">DAR Coffee × Yalla Bites × Haus of Design</p>
          <h1
            className="display"
            style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", marginTop: "0.4rem" }}
          >
            World Cup <span className="text-shimmer">Vote</span>
          </h1>
          <p className="text-dim" style={{ marginTop: "0.8rem", fontSize: "clamp(1rem, 2vw, 1.25rem)" }}>
            Pick a screen to launch. Open each on its own device in fullscreen.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
            width: "100%",
          }}
        >
          <Link href="/vote" className="panel" style={launchCardStyle}>
            <span style={{ fontSize: "3rem" }} className="emoji">📲</span>
            <span className="display" style={{ fontSize: "1.8rem" }}>Fan Voting</span>
            <span className="text-dim" style={{ textAlign: "center" }}>
              Phone voting page. Share this link so fans can vote from their seat.
            </span>
            <span className="btn btn--gold" style={{ marginTop: "0.5rem" }}>Open vote page →</span>
          </Link>

          <Link href="/kiosk" className="panel" style={launchCardStyle}>
            <span style={{ fontSize: "3rem" }} className="emoji">🕹️</span>
            <span className="display" style={{ fontSize: "1.8rem" }}>Voting Kiosk</span>
            <span className="text-dim" style={{ textAlign: "center" }}>
              Customer-facing iPad at the register. Landscape + Guided Access.
            </span>
            <span className="btn btn--red" style={{ marginTop: "0.5rem" }}>Launch kiosk →</span>
          </Link>

          <Link href="/board" className="panel" style={launchCardStyle}>
            <span style={{ fontSize: "3rem" }} className="emoji">📺</span>
            <span className="display" style={{ fontSize: "1.8rem" }}>Live Board</span>
            <span className="text-dim" style={{ textAlign: "center" }}>
              Projector tally + spin-the-wheel + Yalla Bites QR. Read-only.
            </span>
            <span className="btn btn--gold" style={{ marginTop: "0.5rem" }}>Launch board →</span>
          </Link>
        </div>

        <CopyVoteLink />

        <p className="text-dim" style={{ fontSize: "0.85rem", textAlign: "center", maxWidth: 620 }}>
          Tip: on the iPad, add this to the Home Screen and turn on Guided Access
          (triple-click the side button) to lock customers into the kiosk.
        </p>

        <Link href="/barista" className="text-dim" style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--yb-gold)" }}>
          ⚙️ Barista console (phone-friendly) →
        </Link>
      </div>
    </main>
  );
}

const launchCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.75rem",
  padding: "2rem 1.5rem",
  textDecoration: "none",
  color: "inherit",
};
