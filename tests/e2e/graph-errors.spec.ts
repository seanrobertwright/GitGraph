import { expect, test } from "@playwright/test";

// The component-level error shell renders in both dev and prod. In dev a
// console.error message is also emitted (suppressed in prod builds via
// process.env.NODE_ENV gating). That decision diverges from the plan's
// "dev rethrow / prod shell" wording — see plan's "Post-execution
// corrections" section for context.
test.describe("graph errors", () => {
  test("duplicate-sha renders the error shell", async ({ page }) => {
    await page.goto("/graph/errors?case=duplicate");
    const shell = page.locator('[data-testid="git-graph-error"]');
    await expect(shell).toHaveAttribute("data-error-kind", "duplicate-sha");
    await expect(shell).toContainText("duplicate-sha");
  });

  test("cycle renders the error shell", async ({ page }) => {
    await page.goto("/graph/errors?case=cycle");
    const shell = page.locator('[data-testid="git-graph-error"]');
    await expect(shell).toHaveAttribute("data-error-kind", "cycle");
    await expect(shell).toContainText("cycle");
  });

  test("validate(commits) surfaces missing-parent kind", async ({ page }) => {
    await page.goto("/graph/errors?case=missing-parent");
    const v = page.locator('[data-testid="validate-error"]');
    await expect(v).toHaveAttribute("data-error-kind", "missing-parent");
  });
});
