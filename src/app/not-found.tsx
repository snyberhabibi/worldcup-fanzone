import Link from "next/link";

export default function NotFound() {
  return (
    <main className="screen arcade-bg safe" style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1.2rem", alignItems: "center", padding: "2rem" }}>
        <span className="emoji" style={{ fontSize: "3.5rem" }}>🧭</span>
        <h1 className="display" style={{ fontSize: "clamp(1.6rem, 5vw, 2.6rem)" }}>
          Page not found
        </h1>
        <p className="text-dim" style={{ maxWidth: 380 }}>
          That screen took a wrong turn. Back to the launcher.
        </p>
        <Link href="/" className="btn btn--red btn--lg">
          Go home
        </Link>
      </div>
    </main>
  );
}
