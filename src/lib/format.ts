// Phone + name formatting/validation. Pure, safe on client and server.

export function digitsOnly(input: string): string {
  return (input || "").replace(/\D+/g, "");
}

/** Normalize to a 10-digit US number (drops a leading country-code 1). */
export function normalizePhone(input: string): string {
  let d = digitsOnly(input);
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d.slice(0, 10);
}

export function isValidUSPhone(input: string): boolean {
  const d = normalizePhone(input);
  // 10 digits; area code + exchange first digit must be 2-9 (NANP).
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(d);
}

/** A reserved/fictional NANP number (555 exchange, e.g. 469-555-0123). These
 *  never reach a real handset, so we never send SMS or fire a CRM notification
 *  for them — which also makes them safe synthetic voters for load testing. */
export function isTestPhone(input: string): boolean {
  return normalizePhone(input).slice(3, 6) === "555";
}

/** Progressive display formatting: (469) 555-1234 */
export function formatPhone(input: string): string {
  const d = normalizePhone(input);
  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6, 10);
  if (d.length <= 3) return a;
  if (d.length <= 6) return `(${a}) ${b}`;
  return `(${a}) ${b}-${c}`;
}

/** Mask for the public projector: (•••) •••-1234. Reveals the last 4 digits
 *  only for a complete 10-digit number; anything else is fully masked so a
 *  malformed value can never leak real digits on the public board. */
export function maskPhone(input: string): string {
  const d = normalizePhone(input);
  if (d.length !== 10) return "(•••) •••-••••";
  return `(•••) •••-${d.slice(-4)}`;
}

export function sanitizeFirstName(input: string): string {
  return (input || "")
    .replace(/[\x00-\x1f\x7f]/g, "")
    // Strip leading =,+,-,@ so a name can't inject a formula into Google Sheets.
    .replace(/^[=+\-@\t\r]+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}
