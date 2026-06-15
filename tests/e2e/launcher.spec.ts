import { test, expect } from "@playwright/test";

// E2E for the staff launcher at "/" (src/app/page.tsx). It's the screen a
// barista hits first: a prominent Barista banner + three device cards
// (Kiosk / Fan Voting / Live Board) + a 3-step setup checklist.
// Selectors lean on roles + real copy so they survive layout/style churn.

test.describe("staff launcher (/)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads with the World Cup Vote heading + staff intro", async ({ page }) => {
    // Heading is "World Cup Vote" split across spans, so match on substring.
    await expect(page.getByRole("heading", { name: /World Cup/i, level: 1 })).toBeVisible();
    await expect(
      page.getByText(/Staff start here — open each screen on its own device/i),
    ).toBeVisible();
    await expect(page.getByText(/DAR Coffee × Yalla Bites × Haus of Design/i)).toBeVisible();
  });

  test("Barista Setup & Controls banner is visible and links to /barista", async ({ page }) => {
    const banner = page.getByRole("link", { name: /Barista Setup & Controls/i });
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute("href", "/barista");
    // Its red CTA copy is part of the same banner.
    await expect(banner.getByText(/Open controls/i)).toBeVisible();
  });

  test("shows the three device cards with their audience tags", async ({ page }) => {
    const kiosk = page.getByRole("link", { name: /Voting Kiosk/i });
    const fan = page.getByRole("link", { name: /Fan Voting/i });
    const board = page.getByRole("link", { name: /Live Board/i });

    await expect(kiosk).toBeVisible();
    await expect(fan).toBeVisible();
    await expect(board).toBeVisible();

    await expect(kiosk).toHaveAttribute("href", "/kiosk");
    await expect(fan).toHaveAttribute("href", "/vote");
    await expect(board).toHaveAttribute("href", "/board");

    // Audience tags live inside each card.
    await expect(kiosk.getByText(/FOR CUSTOMERS · iPAD/i)).toBeVisible();
    await expect(fan.getByText(/FOR FANS' PHONES/i)).toBeVisible();
    await expect(board.getByText(/FOR THE PROJECTOR/i)).toBeVisible();
  });

  test("clicking the Voting Kiosk card navigates to /kiosk", async ({ page }) => {
    await page.getByRole("link", { name: /Voting Kiosk/i }).click();
    await expect(page).toHaveURL(/\/kiosk\/?$/);
  });

  test("renders the 3-step setup checklist", async ({ page }) => {
    await expect(page.getByText(/Setting up tonight\?/i)).toBeVisible();

    const steps = page.getByRole("listitem");
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toContainText(/pin the game/i);
    await expect(steps.nth(1)).toContainText(/Guided Access/i);
    await expect(steps.nth(2)).toContainText(/Live Board.*fullscreen/i);
  });

  test("offers the shareable fan-voting link with a copy button", async ({ page }) => {
    await expect(page.getByText(/Share to vote/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Copy link/i })).toBeVisible();
  });
});
