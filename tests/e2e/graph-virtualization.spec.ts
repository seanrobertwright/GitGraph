import { expect, test } from "@playwright/test";

const ROUTE = "/graph/large";
const ROW_HEIGHT = 40;
// Threshold goal: catch a broken virtualizer (which produces 200–2000ms+
// frames) without flaking on healthy runs. The Phase B spike calibrated 100ms
// against an idealized harness (worst real-row max: webkit 60ms), but the
// production page (`/graph/large`) plus host load (parallel Playwright
// workers, dev-mode rebuild jitter, Windows webkit's heavier scroll cost)
// pushes webkit's max into the 100–185ms range on local Windows hosts.
// 250ms is comfortably above that window and well below the broken-
// virtualizer signal — ~10× headroom over a healthy run still fails fast on
// regression.
const MAX_FRAME_MS = 250;

test.describe("graph virtualization", () => {
  test("renders only a windowed slice of the 10k fixture", async ({ page }) => {
    await page.goto(ROUTE);
    await page.waitForSelector('[data-testid="git-graph-row"]');
    const count = await page.locator('[data-testid="git-graph-row"]').count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(40);
  });

  test("scroll to bottom mounts the last rows of the fixture", async ({ page }) => {
    await page.goto(ROUTE);
    await page.waitForSelector('[data-testid="git-graph-row"]');
    await page.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="scroll-container"]',
      ) as HTMLElement;
      el.scrollTop = el.scrollHeight;
    });
    await expect
      .poll(
        async () => {
          return page.evaluate(() => {
            const rows = document.querySelectorAll('[data-testid="git-graph-row"]');
            let max = -1;
            rows.forEach((r) => {
              const i = Number(r.getAttribute("data-row-index"));
              if (Number.isFinite(i) && i > max) max = i;
            });
            return max;
          });
        },
        { timeout: 5000 },
      )
      .toBeGreaterThanOrEqual(9990);
  });

  test("scroll perf stays within MAX_FRAME_MS budget", async ({ page, browserName }) => {
    await page.goto(ROUTE);
    await page.waitForSelector('[data-testid="git-graph-row"]');
    const result = await page.evaluate(async () => {
      const el = document.querySelector(
        '[data-testid="scroll-container"]',
      ) as HTMLElement;
      const deltas: number[] = [];
      let lastT = performance.now();
      let stop = false;
      function tick() {
        const now = performance.now();
        deltas.push(now - lastT);
        lastT = now;
        if (!stop) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      const total = el.scrollHeight - el.clientHeight;
      const steps = 30;
      const stepHeight = total / steps;
      for (let i = 0; i < steps; i++) {
        el.scrollTop = stepHeight * (i + 1);
        await new Promise((r) => setTimeout(r, 100));
      }
      await new Promise((r) => setTimeout(r, 300));
      stop = true;
      const trimmed = deltas.slice(2).sort((a, b) => a - b);
      return {
        max: trimmed.at(-1) ?? 0,
        p99: trimmed[Math.floor(trimmed.length * 0.99)] ?? 0,
        n: trimmed.length,
      };
    });
    console.log(`virt-perf ${browserName}: ${JSON.stringify(result)}`);
    expect(result.n).toBeGreaterThan(20);
    expect(result.max).toBeLessThan(MAX_FRAME_MS);
  });

  test("gutter SVG height matches visible window, not full fixture", async ({ page }) => {
    await page.goto(ROUTE);
    await page.waitForSelector('[data-testid="git-graph-gutter"]');
    const heightAttr = await page
      .locator('[data-testid="git-graph-gutter"]')
      .first()
      .getAttribute("height");
    const height = Number(heightAttr);
    expect(height).toBeGreaterThan(0);
    // Full fixture would be 10000 * 40 = 400000. Window must be far less.
    expect(height).toBeLessThan(10000 * ROW_HEIGHT);
    // A single windowed chunk should fit within ~3x the viewport (600px) plus
    // overscan slack — generous upper bound.
    expect(height).toBeLessThan(3000);
  });
});
