#!/usr/bin/env node
// Post-deploy smoke checks for the World Cup voting app.
//
// Standalone Node ESM script — NOT vitest, NOT playwright. Read-only: it only
// GETs (never POSTs / writes). Exits non-zero if any check fails so it can gate
// a deploy.
//
//   node tests/smoke/smoke.mjs [baseUrl]
//   BASE_URL=https://preview.example.com node tests/smoke/smoke.mjs
//
// Default base URL is production: https://fifa.yallabites.com
//
// Markers were chosen to match the SERVER-RENDERED HTML, which is what fetch()
// returns:
//   • /            — server component, renders "World Cup" directly.
//   • /vote        — MobileVote renders the "Vote from your phone" header
//                    unconditionally (not behind a hydration gate).
//   • /board, /kiosk, /barista — these client apps render <Splash/> ("Connecting…")
//                    until the browser hydrates, so the initial HTML only contains
//                    the Splash marker. We also accept the per-page <title> as a
//                    fallback ("World Cup Vote" ships in <head> on every route).

const BASE = (process.argv[2] || process.env.BASE_URL || "https://fifa.yallabites.com").replace(/\/+$/, "");
const TIMEOUT_MS = 15000;

let passed = 0;
let total = 0;

function pass(name) {
  total++;
  passed++;
  console.log(`PASS  ${name}`);
}

function fail(name, detail) {
  total++;
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path, accept) {
  const url = `${BASE}${path}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: accept ? { accept } : undefined,
      signal: ctrl.signal,
      redirect: "follow",
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function isNum(v) {
  return typeof v === "number" && Number.isFinite(v);
}

// ── JSON API checks ──────────────────────────────────────────────────────────

async function checkSession() {
  const name = "GET /api/session";
  try {
    const res = await get("/api/session", "application/json");
    if (res.status !== 200) return fail(name, `status ${res.status}`);
    let body;
    try {
      body = await res.json();
    } catch {
      return fail(name, "response was not valid JSON");
    }
    if (!Array.isArray(body?.matchIds)) return fail(name, "matchIds is not an array");
    if (typeof body?.status !== "string") return fail(name, "missing string status");
    return pass(`${name} (status=${body.status}, ${body.matchIds.length} match id(s))`);
  } catch (e) {
    return fail(name, e?.message || String(e));
  }
}

async function checkTally() {
  const name = "GET /api/tally?matchId=19";
  try {
    const res = await get("/api/tally?matchId=19", "application/json");
    if (res.status !== 200) return fail(name, `status ${res.status}`);
    let body;
    try {
      body = await res.json();
    } catch {
      return fail(name, "response was not valid JSON");
    }
    if (!isNum(body?.home)) return fail(name, "home is not numeric");
    if (!isNum(body?.away)) return fail(name, "away is not numeric");
    if (!isNum(body?.total)) return fail(name, "total is not numeric");
    return pass(`${name} (home=${body.home}, away=${body.away}, total=${body.total})`);
  } catch (e) {
    return fail(name, e?.message || String(e));
  }
}

// ── HTML page checks ─────────────────────────────────────────────────────────
// Each page must return 200 and its HTML must contain at least one of the
// expected markers (markers are alternatives — any one is a pass).

async function checkPage(path, markers) {
  const name = `GET ${path}`;
  try {
    const res = await get(path, "text/html");
    if (res.status !== 200) return fail(name, `status ${res.status}`);
    const html = await res.text();
    const hit = markers.find((m) => html.includes(m));
    if (!hit) return fail(name, `none of the expected markers found: ${markers.map((m) => JSON.stringify(m)).join(", ")}`);
    return pass(`${name} ("${hit}")`);
  } catch (e) {
    return fail(name, e?.message || String(e));
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Smoke checks against ${BASE}\n`);

  await checkSession();
  await checkTally();

  // Title "World Cup Vote" ships in <head> on every route via the root layout
  // metadata, so it's a safe fallback marker for the hydration-gated apps.
  const TITLE = "World Cup Vote";
  await checkPage("/", ["World Cup"]);
  await checkPage("/vote", ["Vote from your phone", TITLE]);
  await checkPage("/board", ["Connecting", TITLE]);
  await checkPage("/kiosk", ["Connecting", TITLE]);
  await checkPage("/barista", ["Connecting", TITLE]);

  console.log(`\n(${passed}/${total} checks passed)`);
  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error(`FATAL — ${e?.stack || e?.message || e}`);
  process.exit(1);
});
