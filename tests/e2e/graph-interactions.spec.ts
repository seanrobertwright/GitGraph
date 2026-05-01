import { expect, test } from "@playwright/test";

test.describe("graph interactions", () => {
  test("click a row updates lastClicked echo", async ({ page }) => {
    await page.goto("/graph/interactions");
    await page.locator('[data-testid="git-graph-row"][data-sha="f1"]').click();
    await expect(page.getByTestId("echo")).toContainText('"lastClicked": "f1"');
  });

  test("controlled selection: select-f1 button moves data-selected", async ({ page }) => {
    await page.goto("/graph/interactions");
    await page.getByTestId("select-f1").click();
    await expect(
      page.locator('[data-testid="git-graph-row"][data-sha="f1"]'),
    ).toHaveAttribute("data-selected", "true");
  });

  test("clear-selection removes data-selected", async ({ page }) => {
    await page.goto("/graph/interactions");
    await page.getByTestId("select-f1").click();
    await expect(
      page.locator('[data-testid="git-graph-row"][data-sha="f1"]'),
    ).toHaveAttribute("data-selected", "true");
    await page.getByTestId("clear-selection").click();
    await expect(
      page.locator('[data-testid="git-graph-row"][data-selected="true"]'),
    ).toHaveCount(0);
  });

  test("hover updates lastHover echo and clears on leave", async ({ page }) => {
    await page.goto("/graph/interactions");
    await page.locator('[data-testid="git-graph-row"][data-sha="m2"]').hover();
    await expect(page.getByTestId("echo")).toContainText('"lastHover": "m2"');
    await page.mouse.move(0, 0);
    await expect(page.getByTestId("echo")).toContainText('"lastHover": null');
  });
});
