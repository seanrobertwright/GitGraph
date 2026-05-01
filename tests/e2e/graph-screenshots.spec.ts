import { expect, test } from "@playwright/test";

const FIXTURES = ["feature-branch", "with-refs"] as const;

test.describe("graph screenshots", () => {
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
      await page.goto("/graph");
      const section = page.getByTestId(`fixture-${name}`);
      await expect(section).toBeVisible();
      await expect(section).toHaveScreenshot(`graph-${name}.png`, {
        maxDiffPixelRatio: 0.005,
      });
    });
  }
});
