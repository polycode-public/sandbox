// SPDX-License-Identifier: MIT
// Copyright (C) 2025-2026 Polycode Limited
//
// Behaviour test (Playwright) — DELIBERATELY thin and OUT of the agent's tool loop
// (screenshot-publish.yml runs it, claude -p does not). It loads the page, waits for
// the demo to render REAL output (the contract is enforced by tests/unit/web.test.js,
// which the agent can run + fix), then captures SCREENSHOT_INDEX.png. No dependency
// on any specific src/lib export, so it works against any delivery.
import { test, expect } from "@playwright/test";

test("homepage renders the live demo and screenshots it", async ({ page }) => {
  const response = await page.goto("./", { waitUntil: "networkidle" });
  expect(response.status()).toBe(200);

  await expect(page.locator("#lib-name")).toBeVisible({ timeout: 10000 });
  // Wait for the demo to actually populate (exercised main.js), so the screenshot
  // captures real content rather than the "loading…" placeholder.
  await expect(page.locator("#intent-title")).not.toHaveText(/Loading/i, { timeout: 10000 });
  await expect(page.locator("#demo-output")).not.toHaveText(/^Loading/i, { timeout: 10000 });
  await expect(page.locator("#api-list li").first()).toBeVisible({ timeout: 10000 });

  await page.screenshot({ path: "SCREENSHOT_INDEX.png", fullPage: true });
});
