#!/usr/bin/env node
// Capture a JSON fixture of the first N commits from a git repo.
// Usage: node scripts/capture-fixture.mjs --repo <path> --n <count> --out <json-path>

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

const GIT_LOG_FORMAT = "%H%x09%P%x09%ct%x09%an%x09%ae%x09%s";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo") out.repo = argv[++i];
    else if (a === "--n") out.n = argv[++i];
    else if (a === "--out") out.out = argv[++i];
  }
  if (!out.repo || !out.n || !out.out) {
    console.error(
      "Usage: node scripts/capture-fixture.mjs --repo <path> --n <count> --out <json-path>",
    );
    process.exit(2);
  }
  return out;
}

// Inline copy of the parser logic in registry/git-graph/lib/from-git-log.ts.
// Kept inline (not imported) to avoid pulling tsx into the script's runtime.
// If the registry parser changes, mirror the change here — fixtures captured
// with a divergent parser would silently disagree with production parsing.
function fromGitLog(text) {
  const commits = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (line === "") continue;
    const parts = line.split("\t");
    if (parts.length < 6) {
      throw new Error(
        `capture-fixture: malformed line ${i + 1}: expected 6 tab-delimited fields, got ${parts.length}`,
      );
    }
    const sha = parts[0];
    const parentsRaw = parts[1];
    const ctRaw = parts[2];
    const name = parts[3];
    const email = parts[4];
    const message = parts.slice(5).join("\t");
    if (!/^\d+$/.test(ctRaw)) {
      throw new Error(
        `capture-fixture: malformed timestamp on line ${i + 1}: ${ctRaw}`,
      );
    }
    const parents = parentsRaw === "" ? [] : parentsRaw.split(" ");
    const timestamp = Number(ctRaw) * 1000;
    commits.push({ sha, parents, author: { name, email }, message, timestamp });
  }
  return commits;
}

const args = parseArgs(process.argv.slice(2));
const n = Number(args.n);
if (!Number.isInteger(n) || n <= 0) {
  console.error(`capture-fixture: --n must be a positive integer, got ${args.n}`);
  process.exit(2);
}

const stdout = execFileSync(
  "git",
  ["-C", args.repo, "log", `--pretty=tformat:${GIT_LOG_FORMAT}`, `-${n}`],
  { maxBuffer: 16 * 1024 * 1024, encoding: "utf8" },
);

const commits = fromGitLog(stdout);
writeFileSync(path.resolve(args.out), JSON.stringify(commits, null, 2) + "\n");
console.log(`capture-fixture: wrote ${commits.length} commits to ${args.out}`);
