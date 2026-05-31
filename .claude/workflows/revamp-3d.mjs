export const meta = {
  name: 'revamp-3d',
  description: 'Transform the World Cup Fanzone PWA into an immersive 3D, scroll-stopping experience (content preserved)',
  phases: [
    { title: 'Prep', detail: 'ensure deps + read real files' },
    { title: 'Foundation', detail: 'store, hooks, lenis, fx primitives, css brand layer' },
    { title: 'Scene', detail: '3D canvas infra + hero + globe + ambient set-pieces' },
    { title: 'Compose', detail: 'rewrite home page + wire layout (content preserved)' },
    { title: 'Verify', detail: 'lint + typecheck + build until green' },
    { title: 'Review', detail: 'adversarial perf / a11y / pwa / visual review' },
    { title: 'Fix', detail: 'apply confirmed fixes + re-verify' },
  ],
}

// ───────────────────────────────────────────────────────────────────────────
// SHARED CONTRACT — injected into every builder prompt so parallel agents align
// ───────────────────────────────────────────────────────────────────────────
const CONTRACT = `
PROJECT: "World Cup Fanzone 2026" — a Dallas, mobile-first PWA for the brands
DAR Coffee × Yalla Bites × Haus of Design ("Dallas's first World Cup watch party").
Stack: Next.js 16.2.6 (App Router), React 19.2, TypeScript, Tailwind v4, pnpm.
Repo root: /Users/yusuf/Documents/GitHub-Repos/worldcup-fanzone. Branch: revamp-3d-experience.
A fuller brief lives at docs/REVAMP-PLAN.md — read it first.

IMPORTANT REPO RULE (AGENTS.md): "This is NOT the Next.js you know." If
node_modules/next/dist/docs/ exists, consult the relevant guide before writing Next-specific code.
Follow Next 16 App Router rules: dynamic import with { ssr:false } only inside client components.

THEME (globals.css, light-only, warm premium): tokens --cream #F5F0E8, --navy #0F1B3A,
--gold #C9A24B / #9A7A30, --gold-warm #D4A843, --green #1A6B3C, --red #E54141, --orange-warm #E8934A.
Tailwind color utilities already exist: cream, cream-warm, navy, navy-muted, gold, gold-light,
gold-warm, green, green-light, red, orange-warm. Font: Poppins via --font-sans. There are many
component classes (.card, .btn-gold, .vote-btn, .text-shimmer, .bottom-nav) and keyframes.
globals.css already has a prefers-reduced-motion block and forces light theme.

CREATIVE DIRECTION: "Bold WC2026 reinvention" but ELEVATE the existing navy/gold/cream identity
(DAR Coffee = warm, premium) into something cinematic — stadium-night depth, trophy-gold 3D,
particle atmosphere, electric accents used sparingly. Do NOT swap to a clashing electric-blue/magenta
palette. Scroll-stopping, premium, but FAST (it's a PWA).

3D LIBS INSTALLED: three, @react-three/fiber@9, @react-three/drei@10, @react-three/postprocessing@3,
postprocessing (core), lenis, motion (and framer-motion v12), zustand@5, maath. Use R3F v9 / React 19
patterns. drei <View> + <View.Port/> is available for single-context multi-viewport rendering.

NON-NEGOTIABLES:
- Progressive enhancement. NEVER delete existing copy, links, routes, or PWA behavior.
- All 3D is additive + aria-hidden, gated by WebGL support AND prefers-reduced-motion (no canvas when
  either fails). Mobile DPR caps. No layout shift (CLS). Keyboard/focus must keep working.
- Keep routes /vote /raffle /schedule /admin and the Google-Sheets vote flow intact.
- Must end green: pnpm lint, tsc --noEmit, pnpm build.
- Return ONLY a concise structured summary (your text is data for the orchestrator, not a user message).

STORE CONTRACT — src/lib/experience/store.ts (zustand v5):
  export type Quality = 'low' | 'medium' | 'high';
  export interface ExperienceState {
    scrollProgress: number; velocity: number; activeSection: string | null;
    webglEnabled: boolean; reducedMotion: boolean; quality: Quality;
    pointer: { x: number; y: number };
    setScroll(progress: number, velocity: number): void;
    setActiveSection(s: string | null): void;
    setWebglEnabled(b: boolean): void;
    setReducedMotion(b: boolean): void;
    setQuality(q: Quality): void;
    setPointer(x: number, y: number): void;
  }
  export const useExperience = create<ExperienceState>()((set) => ({ ...sensible defaults... }));

HOOKS:
  src/lib/experience/use-webgl.ts -> useWebGLSupport(): boolean (SSR-safe; useState+useEffect).
  src/lib/experience/use-reduced-motion.ts -> usePrefersReducedMotion(): boolean (matchMedia, SSR-safe).
  src/lib/experience/quality.ts -> detectQuality(): Quality (navigator.deviceMemory/hardwareConcurrency/mobile).

PROVIDER — src/components/providers/smooth-scroll.tsx ('use client'):
  <SmoothScroll>{children}</SmoothScroll> wraps a Lenis instance, drives useExperience.setScroll
  (progress 0..1 + velocity) via requestAnimationFrame, and NO-OPS under reduced motion. Also export a
  <ScrollProgressBar/> (thin fixed gold gradient bar at top reflecting scrollProgress).

SCENE — src/components/three/scene-canvas.tsx ('use client'):
  Uses next/dynamic ssr:false to load src/components/three/scene-canvas.client.tsx.
  Renders null when !webglEnabled || reducedMotion. The client file mounts ONE <Canvas>
  (fixed inset-0, -z-10, pointer-events-none, eventSource = document.body, eventPrefix="client"),
  with drei <View.Port/>, a persistent <AmbientField/> (src/components/three/ambient-field.tsx),
  and <CameraRig/> (src/components/three/camera-rig.tsx) reacting to scrollProgress/pointer.
  Adaptive DPR = [1, quality==='high'?2:1.5]. Set <Canvas> aria-hidden. Mounted ONCE in layout.

SET-PIECES (each: { className?: string }, render a positioned ref'd <div> + drei <View track={ref}>):
  src/components/three/hero-scene.tsx -> <HeroScene/>: procedural soccer ball (icosahedron-based,
    pentagon/hexagon feel), volumetric stadium light cones, floating gold confetti/sparks, slow spin +
    pointer parallax, subtle bloom (postprocessing). Trophy-gold + navy + cream palette.
  src/components/three/host-globe.tsx -> <HostGlobe/>: rotating stylized globe with glowing pins for the
    16 FIFA World Cup 2026 host cities; hover/tap shows city label; drag to rotate; auto-rotate idle.
    City data in src/data/host-cities.ts (name, country, lat, lng). Include a visually-hidden accessible
    <ul> listing all cities for screen readers. Dallas must be present (brand tie-in).

FX PRIMITIVES — src/components/fx/ ('use client', motion-based, all reduced-motion aware):
  reveal.tsx -> <Reveal delay? y? as?> whileInView once fade+rise (no transform under reduced motion).
  tilt-card.tsx -> <TiltCard className> pointer 3D tilt + glare (disabled on touch/reduced-motion).
  magnetic.tsx -> <Magnetic> hover magnet wrapper for buttons.
  gradient-text.tsx -> <GradientText className> animated trophy-gold gradient text (works with existing .text-shimmer vibe).
  spotlight.tsx -> <Spotlight> radial cursor-follow glow background layer (pointer-events-none).
`

const HOME_CONTENT = `
HOME PAGE CONTENT TO PRESERVE VERBATIM (src/app/page.tsx) — copy, links, images, alt text:
- Eyebrow: "DAR Coffee × Yalla Bites × Haus of Design"
- H1 "Welcome to the" then big "Fan Zone" (keep a shimmer/gradient treatment)
- Tagline: "Dallas's first World Cup watch party." / "Every match. June 11 — July 19, 2026."
- Mascot image /mascot/usa-fan.png (alt "Fufu the World Cup mascot") — keep it (may integrate w/ 3D)
- <CountdownTimer/> from @/components/CountdownTimer (no props)
- Quick actions (4 cards, keep icons & exact text & hrefs):
  /schedule  Calendar "Match Schedule" "104 matches"
  /vote      Vote     "Vote Now"       "Who wins?"
  /raffle    Gift     "Win Prizes"     "Enter raffle"
  /schedule#groups Trophy "Groups"     "48 teams"
- Yalla Bites order CTA: image /yallabites-logo.svg (alt "Yalla Bites"),
  "Exclusive discounts for DAR Kitchen & Catering", "Order for pickup on Yalla Bites",
  App Store link https://apps.apple.com/us/app/yalla-bites/id6753923330 (keep the apple SVG),
  Google Play link https://play.google.com/store/apps/details?id=com.yallabites (keep the play SVG)
- "Follow Us" sponsor Instagrams (keep IG gradient avatars + links & handles):
  https://www.instagram.com/darcoffeeofficial  @darcoffeeofficial
  https://www.instagram.com/yallabitesapp       @yallabitesapp
  https://www.instagram.com/hausofdesignevents  @hausofdesignevents
- <PartnerLogos/> from @/components/PartnerLogos + footer "© 2026 World Cup Fanzone Dallas. Not affiliated with FIFA."
USER DECISION: DROP the <video> hero background; replace with <HeroScene/>. Keep EVERYTHING else.
Add a NEW "Host Cities" section somewhere sensible (after quick actions or before footer) featuring
<HostGlobe/> with a short heading like "16 Cities. 3 Nations. One Cup." (new decorative copy is OK to add,
but never remove existing content). Keep it mobile-first; add tasteful desktop richness (max-w, columns).
`

const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lintPass', 'typecheckPass', 'buildPass', 'summary', 'filesTouched'],
  properties: {
    lintPass: { type: 'boolean' },
    typecheckPass: { type: 'boolean' },
    buildPass: { type: 'boolean' },
    remainingErrors: { type: 'array', items: { type: 'string' } },
    filesTouched: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'file', 'issue', 'fix', 'confidence'],
        properties: {
          severity: { type: 'string', enum: ['blocker', 'high', 'medium', 'low'] },
          file: { type: 'string' },
          issue: { type: 'string' },
          fix: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
}

// ───────────────────────────────────────────────────────────────────────────
// PHASE 0 — Prep (single agent: no concurrent pnpm)
// ───────────────────────────────────────────────────────────────────────────
phase('Prep')
await agent(
  `You are prepping a 3D revamp. Repo: /Users/yusuf/Documents/GitHub-Repos/worldcup-fanzone (branch revamp-3d-experience).
1) Ensure the 'postprocessing' core peer is installed: if node_modules/postprocessing is missing run \`pnpm add postprocessing\`. Do NOT run any other install.
2) Verify these import without error (node -e require checks): three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, postprocessing, lenis, zustand, maath, motion.
3) Read and internalize: docs/REVAMP-PLAN.md, src/app/page.tsx, src/app/layout.tsx, src/components/CountdownTimer.tsx, src/components/PartnerLogos.tsx, and the first ~120 lines of src/app/globals.css.
4) Check whether node_modules/next/dist/docs exists; if so, list its contents.
Return a short status: deps OK?, next/dist/docs present?, and 5 bullet facts about how the home page + layout are structured. Do NOT write any source files.`,
  { label: 'prep', phase: 'Prep' },
)

// ───────────────────────────────────────────────────────────────────────────
// PHASE 1 — Foundation (parallel; each owns distinct files; css owned solely by one)
// ───────────────────────────────────────────────────────────────────────────
phase('Foundation')
await parallel([
  () => agent(
    `${CONTRACT}\nTASK (Foundation A): Create the experience store + hooks EXACTLY per the STORE CONTRACT and HOOKS spec.
Files you OWN (create only these): src/lib/experience/store.ts, src/lib/experience/use-webgl.ts,
src/lib/experience/use-reduced-motion.ts, src/lib/experience/quality.ts.
SSR-safe (no window access during render). Strong TS types. Return the list of files + their exported symbols.`,
    { label: 'fnd:store+hooks', phase: 'Foundation' },
  ),
  () => agent(
    `${CONTRACT}\nTASK (Foundation B): Create the Lenis smooth-scroll provider per the PROVIDER spec.
Files you OWN: src/components/providers/smooth-scroll.tsx (exports <SmoothScroll> and <ScrollProgressBar>).
Code against the STORE CONTRACT (import useExperience from @/lib/experience/store). NO-OP Lenis under reduced motion
(still render children). Clean up RAF/observers on unmount. Return files + exports + how it sets scrollProgress.`,
    { label: 'fnd:lenis', phase: 'Foundation' },
  ),
  () => agent(
    `${CONTRACT}\nTASK (Foundation C): You are the ONLY agent allowed to edit src/app/globals.css. APPEND (do not rewrite or
remove anything) a new section to globals.css adding a cinematic brand+3D layer: tasteful additive utilities that
build on the existing navy/gold/cream tokens — e.g. .text-trophy-gradient (animated gold), .glass-panel (premium
frosted card consistent with existing .card), .glow-gold, .aurora-bg (subtle navy stadium-night radial usable as a
section backdrop), .grain overlay, .scroll-progress-bar, plus a couple of keyframes (gradient-pan, slow-float-3d).
Reuse existing CSS variables; keep light theme; keep everything reduced-motion safe (wrap animations so the existing
@media (prefers-reduced-motion) reduce block still neutralizes them). Do NOT touch any other file. Return the class
names + keyframes you added so other agents can use them.`,
    { label: 'fnd:css', phase: 'Foundation' },
  ),
  () => agent(
    `${CONTRACT}\nTASK (Foundation D): Create the FX DOM primitives per the FX PRIMITIVES spec.
Files you OWN: src/components/fx/reveal.tsx, src/components/fx/tilt-card.tsx, src/components/fx/magnetic.tsx,
src/components/fx/gradient-text.tsx, src/components/fx/spotlight.tsx. Use 'motion/react' (motion v12). All must be
reduced-motion aware (import usePrefersReducedMotion from @/lib/experience/use-reduced-motion) and disable transforms
on touch where relevant. Strong TS prop types, forwardRef where it helps. Return files + exported components + props.`,
    { label: 'fnd:fx', phase: 'Foundation' },
  ),
])

// ───────────────────────────────────────────────────────────────────────────
// PHASE 2 — Scene infra + set-pieces (parallel; distinct files; depends on Phase 1)
// ───────────────────────────────────────────────────────────────────────────
phase('Scene')
await parallel([
  () => agent(
    `${CONTRACT}\nTASK (Scene B1): Build the single-context 3D canvas infrastructure per the SCENE spec.
Files you OWN: src/components/three/scene-canvas.tsx, src/components/three/scene-canvas.client.tsx,
src/components/three/ambient-field.tsx, src/components/three/camera-rig.tsx.
- scene-canvas.tsx: 'use client'; reads webglEnabled/reducedMotion from the store + the hooks; on mount detect WebGL
  (useWebGLSupport) and reduced motion and quality (detectQuality) and push them into the store; returns null when
  3D disabled; else next/dynamic(ssr:false) the .client file.
- scene-canvas.client.tsx: the actual <Canvas> (fixed inset-0 -z-10 pointer-events-none, eventSource=document.body,
  eventPrefix="client", aria-hidden, adaptive DPR), containing <View.Port/>, <AmbientField/>, <CameraRig/>, and a
  shared light setup. Use Suspense + drei <Preload all/>.
- ambient-field.tsx: a subtle drifting particle/points starfield-in-stadium-haze using maath/drei Points; navy/gold.
- camera-rig.tsx: eases camera position/target from useExperience.scrollProgress + pointer (useFrame + maath easing).
Performance: cap pixel ratio, frameloop tuning ok. Return files + the exact public API the page uses (it should only
need to render set-pieces; the canvas mounts in layout).`,
    { label: 'scene:canvas', phase: 'Scene' },
  ),
  () => agent(
    `${CONTRACT}\nTASK (Scene B2): Build the hero 3D set-piece per the SET-PIECES spec.
Files you OWN: src/components/three/hero-scene.tsx (exports <HeroScene/>), src/components/three/soccer-ball.tsx,
src/components/three/confetti-3d.tsx.
- <HeroScene className/> renders a positioned ref'd <div> (aria-hidden) + drei <View track={ref}> with the 3D content,
  so it portals into the shared Canvas (which provides <View.Port/>). Do NOT create your own <Canvas>.
- SoccerBall: procedural (icosahedron / rounded geometry) with a clean white+navy paneling feel; slow spin; pointer
  parallax from useExperience.pointer; gentle float (maath/easing or useFrame).
- Volumetric stadium light cones + a subtle bloom via @react-three/postprocessing <EffectComposer><Bloom/>.
- confetti-3d: instanced gold/navy/red flecks drifting down, GPU-cheap (InstancedMesh).
Palette trophy-gold + navy + cream. Keep it performant on mobile (respect store.quality: fewer instances on low).
Return files + the <HeroScene/> usage signature.`,
    { label: 'scene:hero', phase: 'Scene' },
  ),
  () => agent(
    `${CONTRACT}\nTASK (Scene B3): Build the interactive host-cities globe per the SET-PIECES spec.
Files you OWN: src/components/three/host-globe.tsx (exports <HostGlobe/>), src/data/host-cities.ts.
- src/data/host-cities.ts: the 16 FIFA World Cup 2026 host cities with accurate {name, country, lat, lng}: USA
  (Atlanta, Boston/Foxborough, Dallas/Arlington, Houston, Kansas City, Los Angeles/Inglewood, Miami,
  New York–New Jersey/East Rutherford, Philadelphia, San Francisco Bay Area/Santa Clara, Seattle), Canada
  (Toronto, Vancouver), Mexico (Mexico City, Guadalajara, Monterrey). Type-export City.
- <HostGlobe className/>: positioned ref'd <div> (decorative aria-hidden) + drei <View track={ref}> with a stylized
  sphere (navy with gold latitude lines or subtle texture), glowing gold pins placed via lat/lng→vector3 conversion,
  hover/tap highlight + HTML label (drei <Html/>), drag-to-rotate (OrbitControls enableZoom=false) + slow auto-rotate
  when idle. Dallas pin subtly emphasized. ALSO render (outside the View, in normal DOM) a visually-hidden
  <ul class="sr-only"> listing every city+country for screen readers. Respect store.quality.
Return files + the <HostGlobe/> usage signature + the count of cities.`,
    { label: 'scene:globe', phase: 'Scene' },
  ),
])

// ───────────────────────────────────────────────────────────────────────────
// PHASE 3 — Compose (parallel; page.tsx vs layout.tsx are distinct files)
// ───────────────────────────────────────────────────────────────────────────
phase('Compose')
await parallel([
  () => agent(
    `${CONTRACT}\n${HOME_CONTENT}\nTASK (Compose C1): REWRITE src/app/page.tsx into the immersive, scroll-stopping home experience.
You OWN only src/app/page.tsx. Use the foundation + set-pieces: <HeroScene/> (replacing the video), <HostGlobe/> for a
new Host Cities section, <Reveal>/<TiltCard>/<Magnetic>/<GradientText>/<Spotlight> for motion + polish, and the
existing <CountdownTimer/> and <PartnerLogos/>. PRESERVE every piece of content listed above verbatim (copy, links,
alt text, the App Store / Google Play / Instagram links and their SVG icons). Keep it 'use client' and mobile-first;
add tasteful desktop layout (max-w container, multi-column where it helps). Quick-action cards become premium TiltCards.
Everything must degrade gracefully when 3D is disabled (set-pieces already self-gate). Return a section-by-section diff
summary confirming each original content item is still present.`,
    { label: 'compose:page', phase: 'Compose' },
  ),
  () => agent(
    `${CONTRACT}\nTASK (Compose C2): Edit src/app/layout.tsx ONLY. It is already 'use client' with Poppins + PWA meta.
Wrap the <main> children with <SmoothScroll> (from @/components/providers/smooth-scroll), add <ScrollProgressBar/>,
and mount <SceneCanvas/> (from @/components/three/scene-canvas) exactly once so it sits behind all content. Keep
BottomNav, InstallPrompt, PushOptIn, the SW-register <Script>, all <head> meta, and the <main className="pb-nav ...">.
Do not alter other files. Return the resulting provider/canvas wiring (a short outline) + confirm PWA bits untouched.`,
    { label: 'compose:layout', phase: 'Compose' },
  ),
])

// ───────────────────────────────────────────────────────────────────────────
// PHASE 4 — Verify (single agent owns the cross-file fix loop)
// ───────────────────────────────────────────────────────────────────────────
phase('Verify')
const verify = await agent(
  `${CONTRACT}\nTASK (Verify): Make the project build cleanly. In the repo root run, in order:
  1) pnpm exec tsc --noEmit   2) pnpm lint   3) pnpm build
Fix ALL errors/warnings you can across any files (you may edit any file), keeping the architecture + preserved content
intact. Re-run after each fix until green (or until clearly blocked). Common pitfalls: R3F v9 / React 19 types, drei
<View>/<Html> usage requiring the canvas tree, next/dynamic ssr:false only in client components, 'use client'
directives, postprocessing imports, unused imports (lint), Image/Link usage. Do NOT disable lint rules wholesale or
delete content to pass. Return the structured verify result.`,
  { label: 'verify', phase: 'Verify', schema: VERIFY_SCHEMA },
)
log(`Verify: lint=${verify?.lintPass} tsc=${verify?.typecheckPass} build=${verify?.buildPass}`)

// ───────────────────────────────────────────────────────────────────────────
// PHASE 5 — Adversarial review (parallel, read-only dimensions)
// ───────────────────────────────────────────────────────────────────────────
phase('Review')
const DIMENSIONS = [
  { key: 'perf-webgl', focus: 'Performance & WebGL safety: single GL context (no multiple <Canvas>), context-loss handling, DPR caps, instancing, frameloop, bundle weight, lazy/dynamic loading, mobile FPS, memory leaks (dispose, RAF/observer cleanup), Suspense fallbacks, no hydration mismatch.' },
  { key: 'a11y-motion', focus: 'Accessibility: prefers-reduced-motion fully honored (no canvas + no transforms), 3D is aria-hidden, globe has sr-only city list, keyboard nav + focus states intact, color contrast on new gradients/glass, no focus traps, semantic headings.' },
  { key: 'pwa-content', focus: 'PWA + content integrity: manifest/sw/InstallPrompt/PushOptIn/BottomNav untouched, every original home-page copy/link/alt/SVG preserved verbatim (compare against docs/REVAMP-PLAN.md + git diff), routes /vote /raffle /schedule /admin still work, no removed functionality.' },
  { key: 'visual-mobile', focus: 'Visual polish & responsiveness: cinematic but on-brand (navy/gold/cream, not clashing), no layout shift/CLS, mobile-first correctness, desktop richness, z-index/overlap of canvas vs content vs bottom-nav, spacing/typography consistency with existing design language.' },
]
const reviews = await parallel(
  DIMENSIONS.map((d) => () =>
    agent(
      `${CONTRACT}\nTASK (Review ${d.key}): Read the git diff (\`git diff main...revamp-3d-experience\` and the new files under
src/components/three, src/components/fx, src/lib/experience, src/components/providers, plus src/app/page.tsx and
src/app/layout.tsx). Adversarially review ONLY this dimension and report concrete, actionable findings:
${d.focus}
Be specific (file + what's wrong + the exact fix). Prefer high-confidence findings. Do NOT edit files. Return findings.`,
      { label: `review:${d.key}`, phase: 'Review', schema: REVIEW_SCHEMA },
    ),
  ),
)
const findings = reviews.filter(Boolean).flatMap((r) => r.findings || [])
const actionable = findings.filter((f) => f.confidence !== 'low' && (f.severity === 'blocker' || f.severity === 'high' || f.severity === 'medium'))
log(`Review: ${findings.length} findings, ${actionable.length} actionable`)

// ───────────────────────────────────────────────────────────────────────────
// PHASE 6 — Fix (single agent applies confirmed fixes + re-verifies)
// ───────────────────────────────────────────────────────────────────────────
phase('Fix')
let finalVerify = verify
if (actionable.length) {
  finalVerify = await agent(
    `${CONTRACT}\nTASK (Fix): Apply these reviewer-confirmed fixes, then re-verify the build. Use judgment; skip any fix that
would remove preserved content or is clearly wrong. After fixing, run pnpm exec tsc --noEmit && pnpm lint && pnpm build
and ensure green. Findings (JSON):\n${JSON.stringify(actionable, null, 2)}\nReturn the structured verify result after fixes.`,
    { label: 'fix', phase: 'Fix', schema: VERIFY_SCHEMA },
  )
  log(`Post-fix: lint=${finalVerify?.lintPass} tsc=${finalVerify?.typecheckPass} build=${finalVerify?.buildPass}`)
}

return {
  prep: 'done',
  verify,
  finalVerify,
  findingsCount: findings.length,
  actionableCount: actionable.length,
  topFindings: actionable.slice(0, 12),
}
