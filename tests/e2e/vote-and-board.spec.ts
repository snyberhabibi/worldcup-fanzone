import { test, expect, type Page } from "@playwright/test";

// E2E for the two public screens:
//   /vote  → MobileVote (src/components/mobile/MobileVote.tsx) — a fan's phone.
//   /board → BoardApp   (src/components/board/BoardApp.tsx)    — the projector.
//
// Both poll /api/* on mount. We STUB every API route via page.route so the
// tests are deterministic AND no real votes hit Supabase / no SMS fires.
// Selectors lean on roles + real copy so they survive layout/style churn.

// The board + vote pages read the live slot from /api/session.matchIds. We pin
// a single real, resolvable game (id 1 = MEX vs RSA, Group A) so getMatch()
// returns real team names instead of a placeholder.
const SESSION_LIVE = {
  matchIds: [1],
  status: "open",
  pinned: false,
  updatedAt: "2026-06-13T00:00:00.000Z",
  lastDraw: null,
};

// A live tally for match 1 — distinct totals so we can assert both columns.
const TALLY = { matchId: 1, home: 12, away: 7, total: 19 };

/** Stub /api/session so both screens render a known, live single-game slot. */
async function stubSession(page: Page) {
  await page.route("**/api/session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SESSION_LIVE),
    }),
  );
}

test.describe("/vote — fan voting (phone viewport)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await stubSession(page);
    await page.goto("/vote");
  });

  test("renders the team pick cards + name & phone fields", async ({ page }) => {
    // Single-game prompt copy.
    await expect(page.getByText(/WHO YA GOT\?/i)).toBeVisible();

    // Both teams from match 1 render as pickable buttons.
    await expect(page.getByRole("button", { name: /Mexico/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /South Africa/i })).toBeVisible();

    // The name + phone inputs are present.
    await expect(page.getByPlaceholder(/Your first name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Mobile number/i)).toBeVisible();

    // Raffle reassurance banner.
    await expect(page.getByText(/Every vote enters you to win/i)).toBeVisible();
  });

  test("submit stays disabled until a pick + valid name + valid phone are entered", async ({
    page,
  }) => {
    const submit = page.getByRole("button", { name: /Submit my vote/i });
    await expect(submit).toBeDisabled();

    // Pick a team — still missing name + phone.
    await page.getByRole("button", { name: /Mexico/i }).click();
    await expect(submit).toBeDisabled();

    // Add a name — still missing a valid phone.
    await page.getByPlaceholder(/Your first name/i).fill("Yusuf");
    await expect(submit).toBeDisabled();

    // A too-short / invalid phone keeps it disabled.
    await page.getByPlaceholder(/Mobile number/i).fill("123");
    await expect(submit).toBeDisabled();

    // A valid 10-digit US number enables it.
    await page.getByPlaceholder(/Mobile number/i).fill("4693165859");
    await expect(submit).toBeEnabled();
  });

  test("successful submit shows the confirmation screen with all three actions", async ({
    page,
  }) => {
    // Stub the write so nothing is recorded.
    await page.route("**/api/vote", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    );

    await page.getByRole("button", { name: /Mexico/i }).click();
    await page.getByPlaceholder(/Your first name/i).fill("Yusuf");
    await page.getByPlaceholder(/Mobile number/i).fill("4693165859");

    await page.getByRole("button", { name: /Submit my vote/i }).click();

    // Success screen.
    await expect(page.getByText(/You're in/i)).toBeVisible();

    // → /board CTA.
    const watch = page.getByRole("link", { name: /Watch the live results & raffle/i });
    await expect(watch).toBeVisible();
    await expect(watch).toHaveAttribute("href", "/board");

    // → Yalla Bites store CTA.
    const store = page.getByRole("link", { name: /Get Yalla Bites/i });
    await expect(store).toBeVisible();
    await expect(store).toHaveAttribute("href", /yallabites\.com/);

    // → vote-another reset action.
    await expect(page.getByRole("button", { name: /Vote another game/i })).toBeVisible();
  });

  test("'Vote another game' returns to the form with name + phone still filled", async ({
    page,
  }) => {
    await page.route("**/api/vote", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    );

    await page.getByRole("button", { name: /Mexico/i }).click();
    await page.getByPlaceholder(/Your first name/i).fill("Yusuf");
    await page.getByPlaceholder(/Mobile number/i).fill("4693165859");
    await page.getByRole("button", { name: /Submit my vote/i }).click();

    await expect(page.getByRole("button", { name: /Vote another game/i })).toBeVisible();
    await page.getByRole("button", { name: /Vote another game/i }).click();

    // Back on the form: the prompt + pick cards are visible again.
    await expect(page.getByText(/WHO YA GOT\?/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Mexico/i })).toBeVisible();

    // Name + phone are retained (only the pick was cleared) — two-tap re-vote.
    await expect(page.getByPlaceholder(/Your first name/i)).toHaveValue("Yusuf");
    // Phone re-renders through formatPhone(): (469) 316-5859.
    await expect(page.getByPlaceholder(/Mobile number/i)).toHaveValue("(469) 316-5859");

    // The pick was cleared, so submit is disabled again until a team is re-picked.
    await expect(page.getByRole("button", { name: /Submit my vote/i })).toBeDisabled();
  });
});

test.describe("/board — projector board (desktop viewport)", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test.beforeEach(async ({ page }) => {
    await stubSession(page);
    await page.route("**/api/tally**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TALLY),
      }),
    );
  });

  test("renders the matchup, VS, and the live tally — and no confetti canvas", async ({
    page,
  }) => {
    await page.goto("/board");

    // Both teams + the centered VS render.
    await expect(page.getByText("Mexico")).toBeVisible();
    await expect(page.getByText("South Africa")).toBeVisible();
    await expect(page.getByText("VS", { exact: true })).toBeVisible();

    // Group A header (single-game slot label).
    await expect(page.getByText("Group A", { exact: true })).toBeVisible();

    // Live-voting indicator (open status).
    await expect(page.getByText(/Live voting/i)).toBeVisible();

    // The tally count-up settles on the stubbed total (19 votes).
    await expect(page.getByText(/19 votes · one vote per phone/i)).toBeVisible();

    // A normal board render never fires confetti (per-vote burst is on the
    // phone/kiosk; the board is a passive display). canvas-confetti only injects
    // a <canvas> the first time confetti() runs — so there must be none here.
    await expect(page.locator("canvas")).toHaveCount(0);
  });
});
