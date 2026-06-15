#!/usr/bin/env node
// Concurrency load test for the FanZone vote path.
//
// Fires simultaneous POSTs to /api/vote with distinct reserved 555 numbers (no
// SMS/Slack fires — see isTestPhone) against a throwaway match, then checks the
// tally. Single-burst or a full ladder (20→500).
//
// Usage:
//   node tests/load/loadtest.mjs <baseUrl> <count> [matchId] [phoneBase]
//   node tests/load/loadtest.mjs <baseUrl> ladder [matchId]
//
//   baseUrl   e.g. https://fifa.yallabites.com  (no trailing slash)
//   count     concurrent voters for a single burst, e.g. 300
//   ladder    runs 20,30,50,100,200,300,500 in sequence (distinct phone ranges)
//   matchId   default 104 (the Final — never shown on the live board)
//
// EXIT: non-zero if any request fails (so it can gate CI / be scripted).

const baseUrl = (process.argv[2] || "").replace(/\/$/, "");
const mode = process.argv[3] || "100";
const MATCH_ID = Number(process.argv[4] || 104);

if (!baseUrl) {
  console.error("usage: node tests/load/loadtest.mjs <baseUrl> <count|ladder> [matchId]");
  process.exit(2);
}

const VOTE_URL = `${baseUrl}/api/vote`;
const TALLY_URL = `${baseUrl}/api/tally?matchId=${MATCH_ID}`;

const pct = (sorted, p) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0;

async function getTally() {
  try {
    return await (await fetch(TALLY_URL, { cache: "no-store" })).json();
  } catch (e) {
    return { error: String(e) };
  }
}

async function castVote(phoneBase, i) {
  const phone = String(phoneBase + i);
  const side = i % 2 === 0 ? "home" : "away";
  const t0 = performance.now();
  try {
    const res = await fetch(VOTE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: MATCH_ID, side, firstName: `Load${i}`, phone }),
    });
    let body = null;
    try { body = await res.json(); } catch {}
    return { status: res.status, ok: res.ok && body?.ok === true, ms: performance.now() - t0, body };
  } catch (e) {
    return { status: 0, ok: false, ms: performance.now() - t0, error: String(e) };
  }
}

async function runBurst(count, phoneBase) {
  const before = await getTally();
  const wall0 = performance.now();
  const results = await Promise.all(Array.from({ length: count }, (_, i) => castVote(phoneBase, i)));
  const wallMs = performance.now() - wall0;

  const ok = results.filter((r) => r.ok).length;
  const lat = results.map((r) => r.ms).sort((a, b) => a - b);
  const byStatus = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

  await new Promise((r) => setTimeout(r, 4000)); // let the cached tally settle
  const after = await getTally();
  const delta = before?.total != null && after?.total != null ? after.total - before.total : null;

  console.log(
    `[${String(count).padStart(3)}] ok=${ok}/${count} ` +
      `wall=${wallMs.toFixed(0)}ms thru=${(count / (wallMs / 1000)).toFixed(0)}/s ` +
      `p50=${pct(lat, 50).toFixed(0)} p99=${pct(lat, 99).toFixed(0)} max=${lat[lat.length - 1].toFixed(0)}ms ` +
      `status=${JSON.stringify(byStatus)} tallyΔ=${delta == null ? "?" : "+" + delta}`
  );
  return { count, ok, fail: count - ok };
}

(async () => {
  console.log(`== FanZone load test ==  target=${VOTE_URL}  match=${MATCH_ID}`);
  const tiers = mode === "ladder" ? [20, 30, 50, 100, 200, 300, 500] : [Number(mode)];
  let totalFail = 0;
  let base = 4695600000; // 555-exchange range distinct from other test data
  for (const n of tiers) {
    const { fail } = await runBurst(n, base);
    totalFail += fail;
    base += 10000; // fresh phone range per tier → clean deltas
  }
  console.log(totalFail === 0 ? "\nPASS — every concurrent vote recorded." : `\nFAIL — ${totalFail} requests did not record.`);
  process.exit(totalFail === 0 ? 0 : 1);
})();
