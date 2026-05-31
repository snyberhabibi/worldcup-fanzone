# World Cup Fanzone 2026 — 3D Immersive Revamp (working plan & state)

> Internal build doc for the `revamp-3d-experience` branch. Not user-facing content.

## CORRECTED understanding of the REAL repo (earlier audit was jumbled)

This is a **Dallas, single-page-ish PWA** for **DAR Coffee × Yalla Bites × Haus** —
"Dallas's first World Cup fan zone. Vote, win raffles, and watch every match at DAR Coffee."
It is NOT a multi-locale marketing site. `<html lang="en">`, no `[locale]` dir.

### Real structure
- `src/app/layout.tsx` — `"use client"`, Poppins font, PWA meta, title "World Cup Fanzone 2026 | DAR x Yalla x Haus", renders `<main class="pb-nav">{children}</main>` + `InstallPrompt`, `PushOptIn`, `BottomNav`, SW-register `<Script>`.
- `src/app/page.tsx` (~225 lines) — home page. **RE-READ before editing.**
- `src/app/globals.css` (1025 lines) — premium **warm cream / navy / gold** theme (light only; forces light even in system dark). Tokens: `--cream #F5F0E8`, `--navy #0F1B3A`, `--gold #C9A24B / #9A7A30`, `--green`, `--red`, `--orange-warm`, `--burgundy`. `@theme inline` exposes `color-cream/navy/gold/...`, `--font-sans: Poppins`. Rich component classes: `.btn-gold`, `.btn-red`, `.card`, `.vote-btn`, `.bottom-nav`, `.badge-*`, many keyframes (float, shimmer, confetti, pulse, etc.). Has `@media (prefers-reduced-motion)` already.
- Other pages: `admin/page.tsx` (900), `raffle/page.tsx` (200), `schedule/page.tsx` (311), `vote/page.tsx` (26).
- API: `src/app/api/votes/route.ts` (102).
- Components: `BottomNav`(93), `CountdownTimer`(228), `GroupTable`(64), `InstallPrompt`(247), `MatchCard`(185), `PartnerLogos`(36), `PushOptIn`(138), `RaffleForm`(267), `VoteTracker`(311).
- Data: `src/data/match-badges.ts`(118), `src/data/schedule.ts`(378).
- Lib: `src/lib/google-sheets.ts`(123), `src/lib/store.ts`(261), `src/lib/utils.ts`(29).
- Types: `src/types/index.ts`(35).
- Public: `mascot/*.png` (celebrating, fan, goalkeeper, kicking, trophy, usa/mexico/japan/saudi/argentina-fan), `video/{hero-bg,mascot-hero,stadium-bg,stadium-v2}.mp4`, `icons/`, `appstore/googleplay-badge.png`, `yallabites-logo.svg`. NO `public/flags`, NO `public/venues`.
- `next.config.ts`: only headers for `sw.js` + `manifest.json`. **No CSP.** Next **16.2.6**, React **19.2.4**, Tailwind **v4**.
- `next-intl` is a dependency but no `[locale]` routing — **verify usage before assuming i18n**.

### "Brands involved"
DAR Coffee, Yalla Bites, Haus (see `PartnerLogos`). Local Dallas fan-zone hub.

## User's creative decisions (from AskUserQuestion)
1. **Bold WC2026 reinvention** — cinematic, dramatic motion, keep ALL copy/content.
   - ADAPTATION: honor the EXISTING navy/gold/cream brand (DAR Coffee = warm/premium) and
     make it *cinematic* (stadium-night depth, trophy-gold 3D, particle atmosphere, electric
     accents used sparingly) rather than swapping to clashing electric-blue/magenta. Note to user.
2. **Full 3D hero, drop the video** — procedural WebGL hero: spinning soccer ball + volumetric
   stadium lights + gold confetti, mouse parallax. Keep all hero copy + CTAs.
3. **Interactive 3D globe of host cities** — only if a venues/cities section exists; otherwise a
   3D map accent. (Confirm against real page content.)

## Tech stack (installed on this branch)
three ^0.180, @react-three/fiber ^9.6, @react-three/drei ^10.7, @react-three/postprocessing ^3.0,
lenis ^1.3, motion ^12.40 (framer-motion also present ^12.40), zustand ^5, maath ^0.10, @types/three.
TODO: confirm `postprocessing` core peer is present (showed MISS); add if needed.

## Architecture (progressive enhancement — never break PWA/SEO/a11y)
- Keep all existing DOM/components/copy. 3D is ADDITIVE, `aria-hidden`, gated by:
  WebGL support + `prefers-reduced-motion` (already respected in CSS). Mobile DPR caps.
- ONE WebGL context via drei `<View>` + `<View.Port/>` on a single fixed `<Canvas eventSource={body}>`
  (`next/dynamic`, `ssr:false`, lazy mount). Each enhanced section renders `<View track={ref}>`.
- `zustand` store: scrollProgress, activeSection, webglEnabled, reducedMotion, qualityTier.
- `lenis` smooth-scroll provider drives scrollProgress.
- `motion` for DOM reveal/parallax/micro-interactions. Respect reduced-motion everywhere.
- Performance budget: procedural geometry only (no heavy GLB), keep assets lean.

## Build phases
- [x] Branch `revamp-3d-experience`; install 3D deps.
- [ ] **RE-READ real files** (page.tsx, 9 components, store, schedule data, verify next-intl, verify postprocessing core, check node_modules/next/dist/docs). Do in SMALL batches — context is tight.
- [ ] Foundation (me): zustand store, Lenis provider, SceneCanvas + View infra + WebGL/reduced-motion gating, shared 3D components (SoccerBall hero, stadium lights, confetti, ambient particles, host-cities globe), shared DOM primitives (Reveal, TiltCard, MagneticButton, GradientHeading), additive globals.css brand layer. Wire into layout/page. Get it compiling.
- [ ] Army (Workflow): parallel section/component enhancements (each owns its files; preserve exports + copy) + adversarial review (a11y/perf/WebGL-context/PWA/build).
- [ ] Verify: `pnpm lint`, build, run dev + screenshot. Fix. Summarize.

## Guardrails
- Keep all content/copy and all routes (vote/raffle/schedule/admin) working.
- Don't regress PWA (manifest, sw.js, install/push), bottom nav, Google Sheets vote flow.
- Respect AGENTS.md: "This is NOT the Next.js you know — read node_modules/next/dist/docs before writing code." (Verify that dir exists; if so, consult it for dynamic/client patterns.)
