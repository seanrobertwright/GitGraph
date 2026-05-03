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
const DEST = resolve(repoRoot, "examples/consumer-app/components/git-graph");

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
  await rm(DEST, { recursive: true, force: true });
  for (const file of files) {
    const rel = relative(SRC, file);
    const target = join(DEST, rel);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(file, target);
  }
  console.log(`[sync-registry] copied ${files.length} files → ${relative(repoRoot, DEST)}`);
}

main().catch((err) => {
  console.error("[sync-registry] failed:", err);
  process.exit(1);
});
