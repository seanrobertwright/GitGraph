import { expect, test } from "@playwright/test";

// Note on counts: Next.js dev with React strict mode + react-virtual's
// useWindowVirtualizer renders each visible row twice in dev (the same idiom
// in tests/e2e/graph-detail.spec.ts works around it via `.first()`). Assert
// presence via .first().toBeVisible() and absence via toHaveCount(0).

test.describe("graph filter predicate", () => {
  test("no-filter section renders all commits", async ({ page }) => {
    await page.goto("/graph/filter");
    const section = page.locator('[data-testid="section-none"]');
    for (const sha of ["f1", "f2", "m1", "m2", "m3"]) {
      await expect(section.locator(`[data-sha="${sha}"]`).first()).toBeVisible();
    }
  });

  test("branch-only filter omits f1 and f2", async ({ page }) => {
    await page.goto("/graph/filter");
    const section = page.locator('[data-testid="section-branch"]');
    await expect(section.locator('[data-sha="f1"]')).toHaveCount(0);
    await expect(section.locator('[data-sha="f2"]')).toHaveCount(0);
    for (const sha of ["m1", "m2", "m3"]) {
      await expect(section.locator(`[data-sha="${sha}"]`).first()).toBeVisible();
    }
  });

  test("branch-only echo lists only visible shas", async ({ page }) => {
    await page.goto("/graph/filter");
    const echo = page.locator('[data-testid="echo-branch"]');
    const text = await echo.innerText();
    expect(text).toContain("m1");
    expect(text).toContain("m2");
    expect(text).toContain("m3");
    expect(text).not.toContain("f1");
    expect(text).not.toContain("f2");
  });

  test("author-only filter shows exactly 3 distinct Alice commits", async ({
    page,
  }) => {
    await page.goto("/graph/filter");
    const section = page.locator('[data-testid="section-author"]');
    // Wait for hydration: at least one row must be present before evaluating.
    await expect(section.locator('[data-sha="m1"]').first()).toBeVisible();
    // Count distinct shas — works around dev-mode row-doubling.
    const distinctShas = await section
      .locator('[data-testid="git-graph-row"]')
      .evaluateAll((els) =>
        Array.from(new Set(els.map((e) => e.getAttribute("data-sha")))),
      );
    expect(distinctShas.sort()).toEqual(["m1", "m2", "m3"]);
  });
});
