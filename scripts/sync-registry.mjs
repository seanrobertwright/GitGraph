// Copies registry/git-graph/** runtime files into examples/consumer-app/
// components/git-graph/**, preserving relative structure. Foreshadows the
// `npx shadcn@latest add` install that Phase 5 wires up for real.
//
// Idempotent: rm -rf the destination, then walk the source.
// Skips: tsconfig.json, *.test.ts, .gitkeep, anything not .ts/.tsx/.css.

import { mkdir, readdir, rm, copyFile, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.SKIP_REGISTRY_SYNC === "1") {
  console.log("[sync-registry] SKIP_REGISTRY_SYNC=1, skipping.");
  process.exit(0);
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const SRC = resolve(repoRoot, "registry/git-graph");

// Destinations: explicit --dest=<path> args (relative to repo root) override
// the default. Defaults match all known consumers and are used when the script
// is invoked from the repo root with no args (e.g. `pnpm sync`). Per-workspace
// pre-hooks pass --dest to scope the sync to their own component dir, which
// avoids the parallel-write race when `pnpm -r --parallel` runs both.
const argDests = process.argv
  .slice(2)
  .filter((a) => a.startsWith("--dest="))
  .map((a) => resolve(repoRoot, a.slice("--dest=".length)));
const DESTS = argDests.length > 0
  ? argDests
  : [
      resolve(repoRoot, "examples/consumer-app/components/git-graph"),
      resolve(repoRoot, "apps/docs/components/git-graph"),
    ];

const ALLOW = new Set([".ts", ".tsx", ".css"]);
const SKIP_NAMES = new Set(["tsconfig.json", ".gitkeep"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(abs)));
      continue;
    }
    if (SKIP_NAMES.has(entry.name)) continue;
    if (entry.name.endsWith(".test.ts")) continue;
    const dot = entry.name.lastIndexOf(".");
    const ext = dot === -1 ? "" : entry.name.slice(dot);
    if (!ALLOW.has(ext)) continue;
    files.push(abs);
  }
  return files;
}

async function main() {
  try {
    await stat(SRC);
  } catch {
    console.warn(`[sync-registry] source dir not found: ${SRC}`);
    return;
  }
  // Walk first so a mid-walk failure leaves the previous synced output in
  // place; only after a successful enumeration do we wipe + replace.
  const files = await walk(SRC);
  for (const dest of DESTS) {
    await rm(dest, { recursive: true, force: true });
    for (const file of files) {
      const rel = relative(SRC, file);
      const target = join(dest, rel);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(file, target);
    }
    console.log(`[sync-registry] copied ${files.length} files → ${relative(repoRoot, dest)}`);
  }
}

main().catch((err) => {
  console.error("[sync-registry] failed:", err);
  process.exit(1);
});
