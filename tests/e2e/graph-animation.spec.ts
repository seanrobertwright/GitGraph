import { expect, test } from "@playwright/test";

const ROUTE = "/graph/animation";

test.describe("graph animation", () => {
  test("initial render — no row has data-just-appended", async ({ page }) => {
    await page.goto(ROUTE);
    await page.waitForSelector('[data-testid="git-graph-row"]');
    const count = await page
      .locator('[data-testid="git-graph-row"][data-just-appended="true"]')
      .count();
    expect(count).toBe(0);
  });

  test("clicking append marks exactly one new row at index 0", async ({ page }) => {
    await page.goto(ROUTE);
    await page.waitForSelector('[data-testid="git-graph-row"]');
    await page.getByTestId("append-commit").click();
    const marked = page.locator(
      '[data-testid="git-graph-row"][data-just-appended="true"]',
    );
    await expect(marked).toHaveCount(1);
    const rowIndex = await marked.first().getAttribute("data-row-index");
    expect(rowIndex).toBe("0");
  });

  test("appending again only marks the newest row", async ({ page }) => {
    await page.goto(ROUTE);
    await page.waitForSelector('[data-testid="git-graph-row"]');
    await page.getByTestId("append-commit").click();
    const firstSha = await page
      .locator('[data-testid="git-graph-row"][data-just-appended="true"]')
      .first()
      .getAttribute("data-sha");
    await page.getByTestId("append-commit").click();
    const marked = page.locator(
      '[data-testid="git-graph-row"][data-just-appended="true"]',
    );
    await expect(marked).toHaveCount(1);
    const newSha = await marked.first().getAttribute("data-sha");
    expect(newSha).not.toBe(firstSha);
  });

  test("prefers-reduced-motion: reduce disables the CSS animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(ROUTE);
    await page.waitForSelector('[data-testid="git-graph-row"]');
    await page.getByTestId("append-commit").click();
    const marked = page.locator(
      '[data-testid="git-graph-row"][data-just-appended="true"]',
    );
    await expect(marked).toHaveCount(1);
    const animationName = await marked.first().evaluate(
      (el) => getComputedStyle(el).animationName,
    );
    expect(animationName).toBe("none");
  });

  test("animation fires within ~250ms when reduced-motion is no-preference", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(ROUTE);
    await page.waitForSelector('[data-testid="git-graph-row"]');
    const ended = page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let started = 0;
          document.addEventListener(
            "animationstart",
            (e) => {
              const target = e.target as HTMLElement;
              if (target.matches('[data-just-appended="true"]')) {
                started = performance.now();
              }
            },
            { once: true },
          );
          document.addEventListener(
            "animationend",
            (e) => {
              const target = e.target as HTMLElement;
              if (target.matches('[data-just-appended="true"]')) {
                resolve(performance.now() - started);
              }
            },
            { once: true },
          );
        }),
    );
    await page.getByTestId("append-commit").click();
    const elapsed = await ended;
    expect(elapsed).toBeGreaterThan(100);
    expect(elapsed).toBeLessThan(400);
  });
});
