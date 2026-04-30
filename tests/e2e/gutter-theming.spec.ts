import { expect, test } from "@playwright/test";

test("theme-flip changes lane-1 color across all browsers", async ({ page }) => {
  await page.goto("/gutter");

  const lane1Path = page
    .getByTestId("fixture-feature-branch")
    .locator("path[data-edge-kind='straight'], path[data-edge-kind='fork']")
    .first();

  await expect(lane1Path).toHaveAttribute("d", /.+/);
  const before = await lane1Path.evaluate((el) => getComputedStyle(el).stroke);

  await page.getByTestId("theme-flip").click();

  const after = await lane1Path.evaluate((el) => getComputedStyle(el).stroke);

  expect(after, "stroke color should change after theme flip").not.toBe(before);
});
