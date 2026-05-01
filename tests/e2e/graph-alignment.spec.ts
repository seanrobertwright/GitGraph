import { expect, test } from "@playwright/test";

// Tolerance derived from Phase 0 spike: measured worst-case delta was 0.0000px on
// chromium + firefox + webkit (Windows host, Playwright 1.49.1). Formula:
// max(measured_max, 0.5) + 0.5 rounded to one decimal → 1.0.
// Couples to DEFAULTS.rowHeight (40) in registry/git-graph/git-graph.tsx and
// registry/git-graph/git-graph-gutter.tsx; update both together if the default
// ever changes. (Mirror Phase 3 finding #4.)
const TOLERANCE_PX = 1.0;

test.describe("graph alignment", () => {
  test("circle cy aligns with metadata row vertical center", async ({ page }) => {
    await page.goto("/graph");
    const section = page.getByTestId("fixture-feature-branch");
    const gutter = section.locator('[data-testid="git-graph-gutter"]');
    const gutterBox = await gutter.boundingBox();
    expect(gutterBox).not.toBeNull();
    if (!gutterBox) return;

    const rows = section.getByTestId("git-graph-row");
    const count = await rows.count();
    expect(count).toBe(5);

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      await row.scrollIntoViewIfNeeded();
      const sha = await row.getAttribute("data-sha");
      const rowBox = await row.boundingBox();
      expect(rowBox, `row ${i} bounding box`).not.toBeNull();
      if (!rowBox) continue;

      const circle = section.locator(`[data-testid="git-graph-gutter"] circle[data-sha="${sha}"]`);
      const cy = await circle.getAttribute("cy");
      expect(cy, `circle for sha ${sha} cy`).not.toBeNull();

      const circleAbsY = gutterBox.y + Number(cy);
      const rowCenterY = rowBox.y + rowBox.height / 2;
      const delta = Math.abs(circleAbsY - rowCenterY);
      expect(delta, `row ${i} (sha=${sha}) alignment delta`).toBeLessThanOrEqual(TOLERANCE_PX);
    }
  });
});
