import { expect, test } from "@playwright/test";

test.describe("graph detail drawer", () => {
  test("uncontrolled — row click opens drawer with right commit", async ({
    page,
  }) => {
    await page.goto("/graph/detail");
    await page
      .locator(
        '[data-testid="section-uncontrolled"] [data-testid="git-graph-row"][data-sha="f1"]',
      )
      .click();
    const drawer = page.locator('[data-testid="git-graph-detail"]').first();
    await drawer.waitFor({ state: "visible" });
    await expect(drawer).toBeVisible();
    await expect(
      page.locator('[data-testid="detail-content"][data-sha="f1"]').first(),
    ).toBeVisible();
  });

  test("uncontrolled — ESC closes drawer", async ({ page }) => {
    await page.goto("/graph/detail");
    await page
      .locator(
        '[data-testid="section-uncontrolled"] [data-testid="git-graph-row"][data-sha="f1"]',
      )
      .click();
    await page
      .locator('[data-testid="git-graph-detail"]')
      .first()
      .waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="git-graph-detail"]')).toHaveCount(
      0,
    );
  });

  test("controlled-decoupled — row click selects without opening drawer", async ({
    page,
  }) => {
    await page.goto("/graph/detail");
    await page
      .locator(
        '[data-testid="section-controlled"] [data-testid="git-graph-row"][data-sha="f1"]',
      )
      .click();
    await expect(
      page
        .locator(
          '[data-testid="section-controlled"] [data-testid="git-graph-row"][data-sha="f1"]',
        )
        .first(),
    ).toHaveAttribute("data-selected", "true");
    await expect(page.locator('[data-testid="git-graph-detail"]')).toHaveCount(
      0,
    );
  });

  test("controlled-decoupled — open-detail button opens drawer independently", async ({
    page,
  }) => {
    await page.goto("/graph/detail");
    await page.getByTestId("open-detail").click();
    const drawer = page.locator('[data-testid="git-graph-detail"]').first();
    await drawer.waitFor({ state: "visible" });
    await expect(drawer).toBeVisible();
  });

  test("no layout shift to the graph itself when drawer mounts", async ({
    page,
  }) => {
    await page.goto("/graph/detail");
    const graph = page
      .locator('[data-testid="section-uncontrolled"] [data-testid="git-graph"]')
      .first();
    const before = await graph.boundingBox();
    expect(before).not.toBeNull();
    await page
      .locator(
        '[data-testid="section-uncontrolled"] [data-testid="git-graph-row"][data-sha="f1"]',
      )
      .click();
    await page
      .locator('[data-testid="git-graph-detail"]')
      .first()
      .waitFor({ state: "visible" });
    const after = await graph.boundingBox();
    expect(after).not.toBeNull();
    expect(after!.x).toBe(before!.x);
    expect(after!.y).toBe(before!.y);
    expect(after!.width).toBe(before!.width);
    expect(after!.height).toBe(before!.height);
  });
});
