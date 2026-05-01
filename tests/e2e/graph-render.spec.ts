import { expect, test } from "@playwright/test";
import {
  featureBranchFixture,
  linearFixture,
  longLivedReleaseFixture,
  mergeFixture,
  octopusFixture,
  orphanFixture,
  withRefsFixture,
} from "../unit/fixtures";

const FIXTURES = [
  { name: "linear", rowCount: linearFixture.length },
  { name: "feature-branch", rowCount: featureBranchFixture.length },
  { name: "merge", rowCount: mergeFixture.length },
  { name: "octopus", rowCount: octopusFixture.length },
  { name: "orphan", rowCount: orphanFixture.length },
  { name: "long-lived-release", rowCount: longLivedReleaseFixture.length },
  { name: "with-refs", rowCount: withRefsFixture.length },
] as const;

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
