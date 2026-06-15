import { test, expect, type Page } from "@playwright/test";

/**
 * Staff navigation guard — the PIN-gated Barista panel must expose cross-mode
 * links ONLY on the barista's own phone console (context="console"), and must
 * NEVER expose them on a customer-facing surface (the kiosk iPad, context="locked").
 * That asymmetry is the customer-escape guard, so it's worth an e2e check.
 *
 * Everything network-touching is stubbed at the route level so the spec runs
 * offline and deterministically:
 *   - /api/admin/verify → always { ok: true } so any PIN unlocks the panel.
 *   - /api/session       → a stable SessionState so the kiosk/console mount cleanly.
 */

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

// A stable, realistic SessionState (matches src/types SessionState). matchId 19
// is a real schedule game; keeping it pinned avoids clock-derived flakiness.
const SESSION = {
  matchIds: [19],
  status: "open",
  pinned: false,
  updatedAt: "2026-06-15T12:00:00.000Z",
  lastDraw: null,
};

async function stubBackend(page: Page) {
  await page.route("**/api/admin/verify", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    })
  );
  await page.route("**/api/session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SESSION),
    })
  );
}

// The PIN pad (NumberPadDark) renders one <button> per digit whose text IS the
// digit. "2026" → tap 2, 0, 2, 6. On the 4th digit the panel verifies + unlocks.
async function enterPin(page: Page, pin = "2026") {
  for (const d of pin.split("")) {
    await page.getByRole("button", { name: d, exact: true }).click();
  }
}

test.describe("Barista console (/barista) — context='console'", () => {
  test.beforeEach(async ({ page }) => {
    await stubBackend(page);
  });

  test("PIN 2026 unlocks the panel and reveals the full StaffNav (Board / Kiosk / Fan vote + Home)", async ({
    page,
  }) => {
    await page.goto(`${BASE}/barista`);

    // Locked state: PIN prompt is shown, controls are not.
    await expect(page.getByText("Enter the staff PIN")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Barista access" })).toBeVisible();

    await enterPin(page);

    // Unlocked: header flips and the live-game controls appear.
    await expect(page.getByRole("heading", { name: "Barista controls" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "🎡 Spin the wheel on the projector" })
    ).toBeVisible();

    // Full cross-mode StaffNav: all three mode links open in a new tab, plus Home.
    await expect(page.getByRole("link", { name: "📺 Board ↗" })).toBeVisible();
    await expect(page.getByRole("link", { name: "🕹️ Kiosk ↗" })).toBeVisible();
    await expect(page.getByRole("link", { name: "📲 Fan vote ↗" })).toBeVisible();
    await expect(page.getByRole("link", { name: "🏠 Home" })).toBeVisible();

    // The links point where they should, and the cross-mode ones are _blank.
    await expect(page.getByRole("link", { name: "📺 Board ↗" })).toHaveAttribute("href", "/board");
    await expect(page.getByRole("link", { name: "📺 Board ↗" })).toHaveAttribute("target", "_blank");
    await expect(page.getByRole("link", { name: "🕹️ Kiosk ↗" })).toHaveAttribute("href", "/kiosk");
    await expect(page.getByRole("link", { name: "📲 Fan vote ↗" })).toHaveAttribute("href", "/vote");
    await expect(page.getByRole("link", { name: "🏠 Home" })).toHaveAttribute("href", "/");

    // The console is NOT the locked surface, so its in-place close is absent.
    await expect(page.getByRole("button", { name: "← Close controls" })).toHaveCount(0);
  });
});

test.describe("Kiosk (/kiosk) — context='locked', customer-escape guard", () => {
  // The kiosk is built for landscape; use a landscape iPad-ish viewport so the
  // portrait rotate-hint never covers the ⚙️ control.
  test.use({ viewport: { width: 1024, height: 768 } });

  test.beforeEach(async ({ page }) => {
    await stubBackend(page);
  });

  test("⚙️ + PIN 2026 unlocks a panel with ONLY 'Close controls' and NO cross-mode links", async ({
    page,
  }) => {
    await page.goto(`${BASE}/kiosk`);

    // The discreet barista entry point (aria-label) opens the locked panel.
    await page.getByRole("button", { name: "Barista controls" }).click();

    // PIN prompt appears, then unlock.
    await expect(page.getByText("Enter the staff PIN")).toBeVisible();
    await enterPin(page);

    // Unlocked: same controls as the console (the panel body is shared).
    await expect(page.getByRole("heading", { name: "Barista controls" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "🎡 Spin the wheel on the projector" })
    ).toBeVisible();

    // The locked StaffNav offers ONLY an in-place close — that's the guard.
    await expect(page.getByRole("button", { name: "← Close controls" })).toBeVisible();

    // No Home / Board / Kiosk / Fan-vote escape hatches on a customer surface.
    await expect(page.getByRole("link", { name: "🏠 Home" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "📺 Board ↗" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "🕹️ Kiosk ↗" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "📲 Fan vote ↗" })).toHaveCount(0);
  });
});
