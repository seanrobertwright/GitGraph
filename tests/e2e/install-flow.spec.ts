import { expect, test } from "@playwright/test";

test.describe("install-flow smoke", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "install-flow only runs on chromium",
  );

  test("graph route renders rows + no page errors", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));

    await page.goto("/graph");
    await page.waitForSelector('[data-testid="git-graph-row"]');
    const rows = page.getByTestId("git-graph-row");
    expect(await rows.count()).toBeGreaterThan(0);

    expect(errors).toEqual([]);
  });

  test("gutter route renders gutter + no page errors", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));

    await page.goto("/gutter");
    await page.waitForSelector('[data-testid="git-graph-gutter"]');
    const gutter = page.getByTestId("git-graph-gutter");
    expect(await gutter.count()).toBeGreaterThan(0);

    expect(errors).toEqual([]);
  });

  test("large route renders rows + scroll container", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));

    await page.goto("/graph/large");
    await page.waitForSelector('[data-testid="git-graph-row"]');
    const rows = page.getByTestId("git-graph-row");
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(page.getByTestId("scroll-container")).toHaveCount(1);

    expect(errors).toEqual([]);
  });
});
