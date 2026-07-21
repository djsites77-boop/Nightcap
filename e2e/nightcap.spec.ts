import { test, expect, type Page } from "@playwright/test";

/**
 * Full end-to-end smoke test against an already-running Nightcap instance —
 * this file never starts a server itself (see playwright.config.ts). Run it
 * with `pnpm test:e2e` while your dev server (and seeded demo data) is up.
 *
 * Assumes the standard seed: dara@queensthosting.ca / admin@nightcap.app,
 * both password "1", and a property named "Queen St Loft".
 */

const HOST_EMAIL = "dara@queensthosting.ca";
const HOST_PASSWORD = "1";
const ADMIN_EMAIL = "admin@nightcap.app";
const ADMIN_PASSWORD = "1";
const PROPERTY_NAME = "Queen St Loft";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL("**/dashboard");
}

test.describe("Marketing site (logged out)", () => {
  test("landing page renders hero and pricing for an anonymous visitor", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /stay compliant/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Simple flat monthly pricing" })).toBeVisible();
    for (const tier of ["Free", "Host", "Growth", "Portfolio"]) {
      await expect(page.getByRole("heading", { name: tier, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
  });

  test("bad credentials are rejected with an error, not a silent redirect", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(HOST_EMAIL);
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/couldn't sign you in|invalid/i)).toBeVisible();
    expect(page.url()).toContain("/login");
  });
});

test.describe("Host dashboard and property detail", () => {
  test.describe.configure({ mode: "serial" });

  test("host can log in and see the seeded portfolio", async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("link", { name: "Properties" })).toBeVisible();
    await expect(page.getByText(PROPERTY_NAME)).toBeVisible();
  });

  test("property detail loads with all tabs and the default checklist", async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASSWORD);
    await page.getByText(PROPERTY_NAME).click();
    await page.waitForURL("**/properties/**");
    await expect(page.getByRole("heading", { name: PROPERTY_NAME })).toBeVisible();

    for (const tab of ["Overview", "Tax", "Checklist", "Docs", "Bookings", "Costs", "Items"]) {
      await expect(page.getByRole("tab", { name: tab })).toBeVisible();
    }

    await page.getByRole("tab", { name: "Checklist" }).click();
    for (const item of ["Smoke Detector", "Co Detector", "Egress", "Occupancy Posting"]) {
      await expect(page.getByRole("checkbox", { name: item })).toBeVisible();
    }
  });

  test("toggling a default checklist item persists after reload", async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASSWORD);
    await page.getByText(PROPERTY_NAME).click();
    await page.getByRole("tab", { name: "Checklist" }).click();

    const smokeDetector = page.getByRole("checkbox", { name: "Smoke Detector" });
    const wasChecked = await smokeDetector.isChecked();
    await smokeDetector.click();
    if (wasChecked) await expect(smokeDetector).not.toBeChecked();
    else await expect(smokeDetector).toBeChecked();

    await page.reload();
    await page.getByRole("tab", { name: "Checklist" }).click();
    const afterReload = page.getByRole("checkbox", { name: "Smoke Detector" });
    if (wasChecked) await expect(afterReload).not.toBeChecked();
    else await expect(afterReload).toBeChecked();

    // Restore original state so repeat runs are idempotent.
    await afterReload.click();
  });

  test("a custom checklist item with a past due date shows Overdue and can be removed", async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASSWORD);
    await page.getByText(PROPERTY_NAME).click();
    await page.getByRole("tab", { name: "Checklist" }).click();

    const label = `E2E overdue item ${Date.now()}`;
    await page.getByLabel("Item").fill(label);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.getByLabel("Due by (optional)").fill(yesterday);
    await page.getByRole("button", { name: "Add item" }).click();

    const row = page.locator('[data-testid^="checklist-row-"]').filter({ hasText: label });
    await expect(row).toHaveCount(1);
    await expect(row.getByText("Overdue")).toBeVisible();

    await row.getByRole("button", { name: "Remove" }).click();
    await expect(page.locator('[data-testid^="checklist-row-"]').filter({ hasText: label })).toHaveCount(0);
  });

  test("dashboard status reflects an overdue required checklist item", async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASSWORD);
    await page.getByText(PROPERTY_NAME).click();
    await page.getByRole("tab", { name: "Checklist" }).click();

    const label = `E2E status item ${Date.now()}`;
    await page.getByLabel("Item").fill(label);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.getByLabel("Due by (optional)").fill(yesterday);
    await page.getByRole("button", { name: "Add item" }).click();

    const row = page.locator('[data-testid^="checklist-row-"]').filter({ hasText: label });
    await expect(row.getByText("Overdue")).toBeVisible();

    await page.goto("/dashboard");
    const card = page.locator("a", { hasText: PROPERTY_NAME });
    await expect(card.getByText("Urgent")).toBeVisible();

    // Clean up so this test is safe to re-run.
    await card.click();
    await page.getByRole("tab", { name: "Checklist" }).click();
    await page
      .locator('[data-testid^="checklist-row-"]')
      .filter({ hasText: label })
      .getByRole("button", { name: "Remove" })
      .click();
  });

  test("expenses: add one manually, see it listed, and export CSV", async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASSWORD);
    await page.getByText(PROPERTY_NAME).click();
    await page.getByRole("tab", { name: "Costs" }).click();

    const description = `E2E cleaning supplies ${Date.now()}`;
    await page.getByLabel("Category").selectOption("supplies");
    await page.getByLabel("Amount (CAD)").fill("42.50");
    await page.getByLabel("Date").fill(new Date().toISOString().slice(0, 10));
    await page.getByLabel("Description").fill(description);
    await page.getByRole("button", { name: "Add expense" }).click();

    await expect(page.getByRole("row", { name: new RegExp(description) })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export csv/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test("inventory: add an asset, change its condition, then delete it", async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASSWORD);
    await page.getByText(PROPERTY_NAME).click();
    await page.getByRole("tab", { name: "Items" }).click();

    const name = `E2E test lamp ${Date.now()}`;
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Category", { exact: true }).selectOption("furniture");
    await page.getByRole("button", { name: "Add item" }).click();

    const row = page.getByRole("row", { name: new RegExp(name) });
    await expect(row).toBeVisible();

    // The per-row condition/status selects have no accessible label (a visual-only
    // control, distinct from the labeled ones in the "add item" form above) — target
    // by attribute instead of getByLabel.
    const conditionSelect = row.locator('select[name="condition"]');
    await conditionSelect.selectOption("damaged");
    await expect(conditionSelect).toHaveValue("damaged");

    await row.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
  });

  test("bookings: add a manual booking and see it in the table", async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASSWORD);
    await page.getByText(PROPERTY_NAME).click();
    await page.getByRole("tab", { name: "Bookings" }).click();

    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 30);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 3);

    await page.getByLabel("Check-in").fill(checkIn.toISOString().slice(0, 10));
    await page.getByLabel("Check-out").fill(checkOut.toISOString().slice(0, 10));
    await page.getByRole("button", { name: "Add booking" }).click();

    // Scope by the check-in date actually rendered (fmtDate's en-CA short format,
    // e.g. "Aug 19, 2026") rather than a bare "3" — nights/revenue cells elsewhere
    // in the table could easily contain that digit too.
    const checkInLabel = checkIn.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
    const row = page.getByRole("row", { name: new RegExp(checkInLabel) });
    await expect(row).toBeVisible();
    await expect(row.getByRole("cell", { name: "3", exact: true })).toBeVisible();
  });

  test("sign out returns to the login page", async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASSWORD);
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL("**/login");
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  });
});

test.describe("Platform admin", () => {
  test("admin can reach every admin section", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);

    for (const [path, navLabel] of [
      ["/admin/users", "Users"],
      ["/admin/tiers", "Tiers"],
      ["/admin/tax-rates", "Tax rates"],
      ["/admin/rules", "Places"],
    ] as const) {
      await page.getByRole("link", { name: navLabel }).click();
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/")));
    }
  });

  test("a non-admin host is blocked from admin routes", async ({ page }) => {
    await login(page, HOST_EMAIL, HOST_PASSWORD);
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin$/);
  });
});
