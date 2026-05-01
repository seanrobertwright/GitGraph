import { expect, test } from "@playwright/test";

test.describe("graph keyboard navigation", () => {
  test("ArrowDown selects row 0 then row 1; ArrowUp returns to row 0", async ({ page }) => {
    await page.goto("/graph/interactions");
    const root = page.getByTestId("git-graph");
    await root.focus();

    await page.keyboard.press("ArrowDown");
    const row0 = page.locator('[data-testid="git-graph-row"][data-row-index="0"]');
    await expect(row0).toHaveAttribute("aria-selected", "true");
    const row0Id = await row0.getAttribute("id");
    await expect(root).toHaveAttribute("aria-activedescendant", row0Id ?? "");

    await page.keyboard.press("ArrowDown");
    const row1 = page.locator('[data-testid="git-graph-row"][data-row-index="1"]');
    await expect(row1).toHaveAttribute("aria-selected", "true");
    const row1Id = await row1.getAttribute("id");
    await expect(root).toHaveAttribute("aria-activedescendant", row1Id ?? "");

    await page.keyboard.press("ArrowUp");
    await expect(row0).toHaveAttribute("aria-selected", "true");
  });

  test("Enter fires onCommitClick for current selection", async ({ page }) => {
    await page.goto("/graph/interactions");
    const root = page.getByTestId("git-graph");
    await root.focus();
    await page.keyboard.press("ArrowDown"); // select row 0 (m3)
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("echo")).toContainText('"lastClicked": "m3"');
    await expect(
      page.locator('[data-testid="git-graph-row"][data-row-index="0"]'),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("Escape clears selection and removes aria-activedescendant", async ({ page }) => {
    await page.goto("/graph/interactions");
    const root = page.getByTestId("git-graph");
    await root.focus();
    await page.keyboard.press("ArrowDown");
    await root.focus();
    await page.keyboard.press("Escape");
    await expect(
      page.locator('[data-testid="git-graph-row"][data-selected="true"]'),
    ).toHaveCount(0);
    const ad = await root.getAttribute("aria-activedescendant");
    expect(ad === null || ad === "").toBeTruthy();
  });

  test("ArrowDown scrolls last row into view in a constrained viewport", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 200 });
    await page.goto("/graph/interactions");
    const root = page.getByTestId("git-graph");
    await root.focus();
    // featureBranchFixture has 5 rows; press ArrowDown 5x to reach the last row.
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
    const lastRow = page.locator('[data-testid="git-graph-row"][data-row-index="4"]');
    await expect(lastRow).toBeInViewport();
  });
});
