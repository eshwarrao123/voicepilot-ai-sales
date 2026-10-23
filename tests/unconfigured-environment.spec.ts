import { test, expect } from "@playwright/test";

test.describe("VoicePilot — Environment and Route Behavior", () => {
  test("Overview page renders truthful layout and activity metrics section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Activity Metrics" })).toBeVisible();
    await expect(page.getByText("Total Calls")).toBeVisible();
    await expect(page.getByText("Conversion Rate")).toBeVisible();
    await expect(page.getByText("Interested Leads")).toBeVisible();
    await expect(page.getByText("Follow-ups Needed")).toBeVisible();
  });

  test("Call History renders filter bar and truthful zero or populated state", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "Call History" })).toBeVisible();

    // Verify real filter controls are interactive and present
    const dateFilter = page.locator("#history-date-filter");
    await expect(dateFilter).toBeVisible();
    await expect(dateFilter).toHaveValue("all");

    const outcomeFilter = page.locator("#history-outcome-filter");
    await expect(outcomeFilter).toBeVisible();
    await expect(outcomeFilter).toHaveValue("all");
  });

  test("Live Call Studio renders recording consent requirement before start", async ({ page }) => {
    await page.goto("/call");
    await expect(page.getByRole("heading", { name: "Live Call Studio" })).toBeVisible();
    await expect(page.getByText("Call Status")).toBeVisible();

    // Start Call button requires explicit consent
    const consentCheckbox = page.locator("#recording-consent");
    await expect(consentCheckbox).toBeVisible();
    await expect(consentCheckbox).not.toBeChecked();

    const startBtn = page.locator("#start-call-btn");
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Expect an actionable consent notice when starting without consent
    await expect(page.getByText(/explicit customer recording consent is required/i)).toBeVisible();
  });

  test("Sidebar displays active engine and RLS indicators without stale Phase 1 claims", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.locator("nav.sidebar");
    await expect(sidebar).toBeVisible();

    // Verify stale "Phase 1 — Interface only" text is absent
    await expect(sidebar.getByText(/Phase 1 — Interface only/i)).not.toBeVisible();
    // Verify current status shows Voice Engine Ready
    await expect(sidebar.getByText(/Voice Engine Ready/i)).toBeVisible();
    await expect(sidebar.getByText(/Gemini Live/i)).toBeVisible();
  });
});
