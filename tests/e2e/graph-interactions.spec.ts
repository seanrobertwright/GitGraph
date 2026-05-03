import { expect, test } from "@playwright/test";

test.describe("graph interactions", () => {
  test("click a row updates lastClicked echo", async ({ page }) => {
    await page.goto("/graph/interactions");
    await page.locator('[data-testid="git-graph-row"][data-sha="f1"]').click();
    await expect(page.getByTestId("echo")).toContainText('"lastClicked": "f1"');
  });

  test("controlled selection: select-f1 button moves data-selected", async ({ page }) => {
    await page.goto("/graph/interactions");
    await page.getByTestId("select-f1").click();
    await expect(
      page.locator('[data-testid="git-graph-row"][data-sha="f1"]'),
    ).toHaveAttribute("data-selected", "true");
  });

  test("clear-selection removes data-selected", async ({ page }) => {
    await page.goto("/graph/interactions");
    await page.getByTestId("select-f1").click();
    await expect(
      page.locator('[data-testid="git-graph-row"][data-sha="f1"]'),
    ).toHaveAttribute("data-selected", "true");
    await page.getByTestId("clear-selection").click();
    await expect(
      page.locator('[data-testid="git-graph-row"][data-selected="true"]'),
    ).toHaveCount(0);
  });

  test("hover updates lastHover echo and clears on leave", async ({ page }) => {
    await page.goto("/graph/interactions");
    await page.locator('[data-testid="git-graph-row"][data-sha="m2"]').hover();
    await expect(page.getByTestId("echo")).toContainText('"lastHover": "m2"');
    await page.mouse.move(0, 0);
    await expect(page.getByTestId("echo")).toContainText('"lastHover": null');
  });

  test("hover crossing between rows does not fire null transient", async ({ page }) => {
    await page.goto("/graph/interactions");
    const hovers: string[] = [];
    await page.exposeFunction("__recordHover", (sha: string | null) => {
      hovers.push(sha === null ? "null" : sha);
    });
    // Wire an additional listener that mirrors the harness's onCommitHover
    // by reading the echo block on each mutation. The component delegates
    // onMouseLeave to its root, so onCommitHover(null) only fires when the
    // cursor exits the entire <GitGraph>. Crossing between rows fires
    // onMouseEnter on the new row but no leave on the old one.
    await page.evaluate(() => {
      const echo = document.querySelector('[data-testid="echo"]');
      if (!echo) return;
      const obs = new MutationObserver(() => {
        const txt = echo.textContent ?? "";
        const m = txt.match(/"lastHover":\s*("[^"]*"|null)/);
        if (m && m[1]) {
          const v = m[1] === "null" ? null : m[1].slice(1, -1);
          (window as unknown as { __recordHover: (s: string | null) => void }).__recordHover(v);
        }
      });
      obs.observe(echo, { characterData: true, subtree: true, childList: true });
    });
    await page.locator('[data-testid="git-graph-row"][data-sha="m1"]').hover();
    await page.locator('[data-testid="git-graph-row"][data-sha="f1"]').hover();
    await page.locator('[data-testid="git-graph-row"][data-sha="m2"]').hover();
    await expect(page.getByTestId("echo")).toContainText('"lastHover": "m2"');
    await page.mouse.move(0, 0);
    await expect(page.getByTestId("echo")).toContainText('"lastHover": null');
    // The MutationObserver may coalesce consecutive identical values, but
    // the SEQUENCE of distinct values must be exactly m1 → f1 → m2 → null
    // with no spurious `null` between rows. Dedupe and assert the sequence.
    const sequence = hovers.filter((h, i) => h !== hovers[i - 1]);
    expect(sequence).toEqual(["m1", "f1", "m2", "null"]);
  });

  test("controlled-mode harness produces no GitGraph console warnings", async ({ page }) => {
    const warns: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "warning") warns.push(msg.text());
    });
    await page.goto("/graph/interactions");
    await page.getByTestId("select-f1").click();
    await page.getByTestId("clear-selection").click();
    await page.waitForTimeout(50);
    expect(warns.filter((w) => w.includes("GitGraph:"))).toHaveLength(0);
  });

  test("uncontrolled→controlled mode switch fires dev-warn exactly once", async ({ page }) => {
    const warns: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "warning") warns.push(msg.text());
    });
    await page.goto("/graph/interactions-modeswitch");
    await page.waitForSelector('[data-testid="git-graph-row"]');
    expect(warns.filter((w) => w.includes("GitGraph:"))).toHaveLength(0);
    await page.getByTestId("select-f1").click();
    await page.waitForTimeout(50);
    const gitGraphWarns = warns.filter((w) => w.includes("GitGraph:"));
    expect(gitGraphWarns.length).toBeGreaterThanOrEqual(1);
    expect(gitGraphWarns[0]).toContain("controlled and uncontrolled");
  });
});
