import { expect, test } from "@playwright/test";

const FIXTURES = [
  "linear",
  "feature-branch",
  "merge",
  "octopus",
  "orphan",
  "long-lived-release",
] as const;

test.describe("gutter screenshots", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Screenshot baselines committed for chromium only — interaction tests cover other browsers.",
  );
  test.skip(
    () => process.platform !== "linux",
    "Screenshot baselines committed on Linux (matches CI). Run via Playwright Docker image locally to verify on Windows/macOS.",
  );

  for (const name of FIXTURES) {
    test(`fixture ${name} matches baseline`, async ({ page }) => {
      await page.goto("/gutter");
      const section = page.getByTestId(`fixture-${name}`);
      await expect(section).toBeVisible();
      await expect(section).toHaveScreenshot(`gutter-${name}.png`, {
        maxDiffPixelRatio: 0.005,
      });
    });
  }
});

test.describe("gutter geometry", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "DOM assertion runs on chromium only; cross-browser DOM equivalence is not in scope.",
  );

  test("node centers align with rowIndex × rowHeight + rowHeight/2", async ({ page }) => {
    await page.goto("/gutter");
    const section = page.getByTestId("fixture-long-lived-release");
    const circles = section.locator("circle[data-sha]");
    const count = await circles.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const c = circles.nth(i);
      const cy = await c.getAttribute("cy");
      const rowIndex = await c.getAttribute("data-row-index");
      expect(cy, `node ${i} cy`).not.toBeNull();
      expect(rowIndex, `node ${i} data-row-index`).not.toBeNull();
      // Couples to DEFAULTS.rowHeight in registry/git-graph/git-graph-gutter.tsx;
      // update both together if the default ever changes.
      const expected = Number(rowIndex) * 40 + 20;
      expect(Number(cy), `node ${i} (rowIndex=${rowIndex})`).toBe(expected);
    }
  });
});
