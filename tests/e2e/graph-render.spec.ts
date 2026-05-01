import { expect, test } from "@playwright/test";

const FIXTURES: Array<{ name: string; rowCount: number }> = [
  { name: "linear", rowCount: 4 },
  { name: "feature-branch", rowCount: 5 },
  { name: "merge", rowCount: 4 },
  { name: "octopus", rowCount: 5 },
  { name: "orphan", rowCount: 4 },
  { name: "long-lived-release", rowCount: 9 },
  { name: "with-refs", rowCount: 5 },
];

test.describe("graph render", () => {
  for (const { name, rowCount } of FIXTURES) {
    test(`fixture ${name} renders ${rowCount} rows`, async ({ page }) => {
      await page.goto("/graph");
      const section = page.getByTestId(`fixture-${name}`);
      const root = section.getByTestId("git-graph");
      await expect(root).toHaveCount(1);
      const rows = section.getByTestId("git-graph-row");
      await expect(rows).toHaveCount(rowCount);
      for (let i = 0; i < rowCount; i++) {
        const sha = await rows.nth(i).getAttribute("data-sha");
        expect(sha, `row ${i} data-sha`).toBeTruthy();
      }
    });
  }
});
