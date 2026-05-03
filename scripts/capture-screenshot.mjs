// Captures the docs site landing-page hero (LiveDemo) in dark mode → docs/screenshot.png.
// Used to refresh the README hero image. One-off recipe; not wired into CI.
//
// Usage:
//   1. In one terminal: pnpm dev:docs   (starts Next dev on :3000)
//   2. In another:      node scripts/capture-screenshot.mjs
//
// Override URL or output via env vars: CAPTURE_URL, CAPTURE_OUT.

import { chromium } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const URL = process.env.CAPTURE_URL ?? "http://localhost:3000/";
const OUT = resolve(repoRoot, process.env.CAPTURE_OUT ?? "docs/screenshot.png");

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  colorScheme: "dark",
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.emulateMedia({ colorScheme: "dark" });
await page.goto(URL, { waitUntil: "networkidle" });
// Wait for the SVG graph in the LiveDemo to mount.
await page.locator("svg").first().waitFor({ state: "visible", timeout: 10_000 });
// Sanity-check that dark mode actually applied — historical bug where Tailwind
// v4 hoisted theme overrides out of @media into compile-time @theme blocks.
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
if (bg !== "rgb(9, 9, 11)") {
  throw new Error(
    `Expected dark body bg rgb(9, 9, 11), got ${bg}. Dark-mode CSS may have regressed.`,
  );
}

await mkdir(dirname(OUT), { recursive: true });
await page.screenshot({ path: OUT, fullPage: false });
console.log(`[capture-screenshot] wrote ${OUT}`);

await browser.close();
