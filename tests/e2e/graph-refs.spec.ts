import { expect, test } from "@playwright/test";

test.describe("graph refs", () => {
  test("m3 row has 3 badges with expected kinds and HEAD on main", async ({ page }) => {
    await page.goto("/graph");
    const section = page.getByTestId("fixture-with-refs");
    const m3 = section.locator('[data-testid="git-graph-row"][data-sha="m3"]');
    const badges = m3.locator("[data-ref-kind]");
    await expect(badges).toHaveCount(3);

    const head = m3.locator('[data-ref-kind="branch"][data-head="true"]');
    await expect(head).toHaveCount(1);
    await expect(head).toHaveAttribute("data-ref-name", "main");

    await expect(
      m3.locator('[data-ref-kind="remote-branch"][data-ref-name="origin/main"]'),
    ).toHaveCount(1);
    await expect(
      m3.locator('[data-ref-kind="tag"][data-ref-name="v1.0.0"]'),
    ).toHaveCount(1);
  });

  test("f1 row has one tag and no HEAD", async ({ page }) => {
    await page.goto("/graph");
    const section = page.getByTestId("fixture-with-refs");
    const f1 = section.locator('[data-testid="git-graph-row"][data-sha="f1"]');
    await expect(f1.locator("[data-ref-kind]")).toHaveCount(1);
    await expect(f1.locator('[data-ref-kind="tag"][data-ref-name="v0.9.0"]')).toHaveCount(1);
    await expect(f1.locator("[data-head]")).toHaveCount(0);
  });

  test("branch badge background resolves a non-transparent CSS variable", async ({ page }) => {
    await page.goto("/graph");
    const section = page.getByTestId("fixture-with-refs");
    const badge = section.locator('[data-ref-kind="branch"]').first();
    await expect(badge).toBeVisible();
    const bg = await badge.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg, "branch badge background").toBeTruthy();
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg).not.toBe("transparent");
  });
});
