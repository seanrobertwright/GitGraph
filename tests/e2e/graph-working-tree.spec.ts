import { expect, test } from "@playwright/test";

test.describe("graph working-tree row", () => {
  test("toggle adds/removes the synthetic row", async ({ page }) => {
    await page.goto("/graph/working-tree");

    await expect(
      page.locator('[data-testid="git-graph-row"][data-working-tree="true"]'),
    ).toHaveCount(0);
    await expect(page.getByTestId("git-graph-row")).toHaveCount(5);

    await page.getByTestId("toggle-wt").click();

    const wtRow = page.locator('[data-testid="git-graph-row"][data-working-tree="true"]');
    await expect(wtRow).toHaveCount(1);
    await expect(wtRow).toHaveAttribute("data-row-index", "0");
    await expect(wtRow).toHaveAttribute("data-sha", "__WORKING_TREE__");
    await expect(page.getByTestId("git-graph-row")).toHaveCount(6);
  });
});
