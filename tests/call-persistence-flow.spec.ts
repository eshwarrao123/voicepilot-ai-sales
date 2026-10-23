import { test, expect } from "@playwright/test";

test.describe("Call Persistence & Navigation", () => {
  test("Navigating between routes preserves navigation state without page errors", async ({ page }) => {
    // 1. Visit Overview
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

    // 2. Navigate to Live Call Studio via primary CTA
    await page.click("#start-call-cta");
    await expect(page).toHaveURL(/\/call/);
    await expect(page.getByRole("heading", { name: /Live Call Studio|Call Studio/i })).toBeVisible();

    // 3. Navigate to Call History
    await page.click("nav.sidebar >> text=Call History");
    await expect(page).toHaveURL(/\/history/);
    await expect(page.getByRole("heading", { name: "Call History" })).toBeVisible();

    // 4. Return to Overview and verify layout stability
    await page.click("nav.sidebar >> text=Overview");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Activity Metrics" })).toBeVisible();
  });

  test("Browser refresh preserves route and view integrity", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "Call History" })).toBeVisible();

    // Refresh page
    await page.reload();
    await expect(page.getByRole("heading", { name: "Call History" })).toBeVisible();
    await expect(page.locator("#history-date-filter")).toBeVisible();
    await expect(page.locator("#history-outcome-filter")).toBeVisible();
  });

  test("Product setup persistence is reflected across Call Studio campaign header", async ({ page }) => {
    // 1. Go to setup page and check default or configured name
    await page.goto("/setup");
    await expect(page.getByRole("heading", { name: "Product Setup" })).toBeVisible();
    const productNameInput = page.locator("#field-name");
    await expect(productNameInput).toBeVisible();
    const currentName = await productNameInput.inputValue();

    // 2. Go to call page and verify campaign matches product
    await page.goto("/call");
    await expect(page.getByText(`Active campaign:`)).toBeVisible();
    if (currentName) {
      await expect(page.getByText(currentName)).toBeVisible();
    }
  });
});
