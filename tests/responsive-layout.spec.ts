import { test, expect } from "@playwright/test";

/**
 * Responsive Layout Regression Tests
 *
 * Tests for the mobile/tablet layout fixes implemented to address:
 * 1. AppShell mobile flex-row defect (blank sidebar column on mobile)
 * 2. Live Call Studio mobile layout (hardcoded two-column grid)
 * 3. Overview tablet metric layout (awkward 3+1 wrapping at 768px)
 * 4. Mobile navigation and controls
 */

test.describe("Responsive Layout — Mobile (390px)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("AppShell should use vertical layout without blank sidebar column", async ({ page }) => {
    await page.goto("/");
    
    // Desktop sidebar should be hidden on mobile
    const sidebar = page.locator(".sidebar");
    await expect(sidebar).toBeHidden();

    // Mobile header should be visible
    const mobileHeader = page.locator(".mobile-header");
    await expect(mobileHeader).toBeVisible();

    // Main content should occupy full width (no horizontal overflow)
    const appShell = page.locator(".app-shell");
    const shellBox = await appShell.boundingBox();
    expect(shellBox).toBeTruthy();
    
    // Check that main content is not squeezed by invisible sidebar
    const mainContent = page.locator(".main-content");
    const mainBox = await mainContent.boundingBox();
    expect(mainBox).toBeTruthy();
    expect(mainBox!.width).toBeGreaterThan(300); // Should occupy most of 390px viewport
  });

  test("Mobile navigation drawer should open correctly", async ({ page }) => {
    await page.goto("/");

    // Menu button should be visible
    const menuButton = page.locator('button[aria-label="Open menu"]');
    await expect(menuButton).toBeVisible();

    // Click to open drawer
    await menuButton.click();

    // Wait for state to update
    await page.waitForTimeout(100);

    // Drawer should be visible
    const drawer = page.locator(".mobile-menu-drawer");
    await expect(drawer).toBeVisible();

    // Overlay should be visible
    const overlay = page.locator(".mobile-menu-overlay");
    await expect(overlay).toBeVisible();

    // Navigation links should be present in drawer
    const navLinks = drawer.locator('.nav-link');
    await expect(navLinks.first()).toBeVisible();
  });

  test("Live Call Studio should stack vertically on mobile", async ({ page }) => {
    await page.goto("/call");

    // The live-call-grid should exist
    const grid = page.locator(".live-call-grid");
    await expect(grid).toBeVisible();

    // Check that grid uses single column layout
    const gridBox = await grid.boundingBox();
    expect(gridBox).toBeTruthy();

    // Get the first two major child sections
    const sections = grid.locator("> div");
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // On mobile, sections should stack (each takes full width)
    const firstBox = await sections.nth(0).boundingBox();
    const secondBox = await sections.nth(1).boundingBox();
    
    expect(firstBox).toBeTruthy();
    expect(secondBox).toBeTruthy();

    // Both sections should be close to full grid width
    expect(firstBox!.width).toBeGreaterThan(300);
    expect(secondBox!.width).toBeGreaterThan(300);

    // Second section should be below first (vertical stacking)
    expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height - 10);
  });

  test("Call timer and status should not overlap on mobile", async ({ page }) => {
    await page.goto("/call");

    // Find the status card container
    const statusCard = page.locator(".card").first();
    await expect(statusCard).toBeVisible();

    // Check that timer display is present and readable
    const timerDisplay = page.locator('span[aria-label*="Elapsed time"]');
    await expect(timerDisplay).toBeVisible();

    // Check that status indicator is present
    const statusIndicator = page.locator('[role="status"][aria-label*="Call status"]');
    await expect(statusIndicator).toBeVisible();

    // Verify no horizontal overflow in the status card
    const cardBox = await statusCard.boundingBox();
    expect(cardBox).toBeTruthy();
    expect(cardBox!.width).toBeLessThan(390); // Should fit within mobile viewport
  });

  test("Overview metrics should display in 2-column layout on mobile", async ({ page }) => {
    await page.goto("/");

    const metricsGrid = page.locator(".metrics-grid");
    await expect(metricsGrid).toBeVisible();

    // Get metric cells
    const cells = metricsGrid.locator("> div");
    const count = await cells.count();
    expect(count).toBe(4);

    // Get positions of first 3 cells
    const cell0 = await cells.nth(0).boundingBox();
    const cell1 = await cells.nth(1).boundingBox();
    const cell2 = await cells.nth(2).boundingBox();

    expect(cell0).toBeTruthy();
    expect(cell1).toBeTruthy();
    expect(cell2).toBeTruthy();

    // Cell 0 and 1 should be on same row (2-column layout)
    expect(Math.abs(cell0!.y - cell1!.y)).toBeLessThan(10);

    // Cell 2 should be on next row
    expect(cell2!.y).toBeGreaterThan(cell0!.y + 20);
  });

  test("Page content should have no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    
    // Check document width doesn't exceed viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
  });

  test("Call page should have no horizontal overflow", async ({ page }) => {
    await page.goto("/call");
    
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});

test.describe("Responsive Layout — Tablet (768px)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
  });

  test("Overview metrics should display in 2x2 grid at 768px", async ({ page }) => {
    await page.goto("/");

    const metricsGrid = page.locator(".metrics-grid");
    await expect(metricsGrid).toBeVisible();

    const cells = metricsGrid.locator("> div");
    const count = await cells.count();
    expect(count).toBe(4);

    // Get positions
    const cell0 = await cells.nth(0).boundingBox();
    const cell1 = await cells.nth(1).boundingBox();
    const cell2 = await cells.nth(2).boundingBox();
    const cell3 = await cells.nth(3).boundingBox();

    expect(cell0).toBeTruthy();
    expect(cell1).toBeTruthy();
    expect(cell2).toBeTruthy();
    expect(cell3).toBeTruthy();

    // Row 1: cells 0 and 1 should be side by side
    expect(Math.abs(cell0!.y - cell1!.y)).toBeLessThan(10);
    expect(cell1!.x).toBeGreaterThan(cell0!.x + 50);

    // Row 2: cells 2 and 3 should be side by side
    expect(Math.abs(cell2!.y - cell3!.y)).toBeLessThan(10);
    expect(cell3!.x).toBeGreaterThan(cell2!.x + 50);

    // Cell 2 should be below cell 0 (not 3+1 awkward layout)
    expect(cell2!.y).toBeGreaterThan(cell0!.y + 20);
  });

  test("Mobile header should be visible, desktop sidebar hidden", async ({ page }) => {
    await page.goto("/");

    const sidebar = page.locator(".sidebar");
    await expect(sidebar).toBeHidden();

    const mobileHeader = page.locator(".mobile-header");
    await expect(mobileHeader).toBeVisible();
  });

  test("Live Call Studio should stack vertically at tablet width", async ({ page }) => {
    await page.goto("/call");

    const grid = page.locator(".live-call-grid");
    const sections = grid.locator("> div");
    
    const firstBox = await sections.nth(0).boundingBox();
    const secondBox = await sections.nth(1).boundingBox();
    
    expect(firstBox).toBeTruthy();
    expect(secondBox).toBeTruthy();

    // Should stack vertically, not side by side
    expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height - 10);
  });
});

test.describe("Responsive Layout — Desktop (1280px)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("Desktop sidebar should be visible, mobile header hidden", async ({ page }) => {
    await page.goto("/");

    const sidebar = page.locator(".sidebar");
    await expect(sidebar).toBeVisible();

    const mobileHeader = page.locator(".mobile-header");
    await expect(mobileHeader).toBeHidden();
  });

  test("Overview metrics should display in single row (4 columns)", async ({ page }) => {
    await page.goto("/");

    const metricsGrid = page.locator(".metrics-grid");
    const cells = metricsGrid.locator("> div");
    
    const cell0 = await cells.nth(0).boundingBox();
    const cell1 = await cells.nth(1).boundingBox();
    const cell2 = await cells.nth(2).boundingBox();
    const cell3 = await cells.nth(3).boundingBox();

    expect(cell0).toBeTruthy();
    expect(cell1).toBeTruthy();
    expect(cell2).toBeTruthy();
    expect(cell3).toBeTruthy();

    // All cells should be roughly on the same row
    expect(Math.abs(cell0!.y - cell1!.y)).toBeLessThan(10);
    expect(Math.abs(cell0!.y - cell2!.y)).toBeLessThan(10);
    expect(Math.abs(cell0!.y - cell3!.y)).toBeLessThan(10);
  });

  test("Live Call Studio should use two-column layout", async ({ page }) => {
    await page.goto("/call");

    const grid = page.locator(".live-call-grid");
    const sections = grid.locator("> div");
    
    const firstBox = await sections.nth(0).boundingBox();
    const secondBox = await sections.nth(1).boundingBox();
    
    expect(firstBox).toBeTruthy();
    expect(secondBox).toBeTruthy();

    // Should be side by side (same approximate Y position)
    expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThan(30);
    
    // Second column should be to the right of first
    expect(secondBox!.x).toBeGreaterThan(firstBox!.x + 100);
  });
});

test.describe("Accessibility — Sidebar Footer Contrast", () => {
  test("Footer metadata should use adequate contrast color", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 1280, height: 800 });

    // Find the footer metadata text (Gemini Live · Supabase RLS)
    const footerText = page.locator('.sidebar p:has-text("Gemini Live")');
    await expect(footerText).toBeVisible();

    // Check computed color is not --ink-disabled
    const color = await footerText.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // --ink-disabled is rgb(192, 192, 187) or similar
    // --ink-tertiary is rgb(143, 143, 138) or similar (darker, better contrast)
    expect(color).not.toBe("rgb(192, 192, 187)");
  });
});

test.describe("Navigation Functionality", () => {
  test("Mobile navigation links should work correctly", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // Open mobile menu
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    await menuButton.click();

    // Click on Live Call Studio link
    const callLink = page.locator('.mobile-menu-drawer a[href="/call"]');
    await expect(callLink).toBeVisible();
    await callLink.click();

    // Should navigate to call page
    await expect(page).toHaveURL(/\/call/);
    
    // Mobile menu should close after navigation
    const drawer = page.locator(".mobile-menu-drawer");
    await expect(drawer).toBeHidden();
  });
});
