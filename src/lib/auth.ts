// Light guard for barista-only control endpoints (set the game, draw a winner).
// The kiosk panel sends the PIN as a header; customer voting stays open.
// Set KIOSK_PIN in the environment to override the default.

export function checkPin(req: Request): boolean {
  const expected = process.env.KIOSK_PIN || "2026";
  const provided = req.headers.get("x-kiosk-pin") || "";
  return provided === expected;
}
