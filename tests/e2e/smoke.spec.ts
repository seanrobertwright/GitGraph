import { test, expect } from "@playwright/test";

test("consumer app loads with correct title and heading", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/GitGraph Consumer App/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/GitGraph Consumer App/);
});
