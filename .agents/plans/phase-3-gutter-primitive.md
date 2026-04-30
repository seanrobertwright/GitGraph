# Feature: Phase 3 — `<GitGraphGutter>` primitive

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement the **SVG-only gutter primitive** that turns a `LayoutResult` (Phase 2) into a deterministic, themeable visual graph. This is the first visual code in the repo. Phase 3 ships:

1. A pure bezier path-string helper (`registry/git-graph/lib/bezier.ts`).
2. A new `EdgeKind` variant (`'fork'`) emitted by `computeLayout` when a primary-parent edge crosses lanes.
3. A React component (`registry/git-graph/git-graph-gutter.tsx`) that takes a `LayoutResult` and renders nodes + edges as a single `<svg>`, themed via CSS variables.
4. A canonical CSS file (`registry/git-graph/git-graph.css`) defining `--graph-branch-1..8`, node/edge sizing vars, and dark-mode parity via `@media (prefers-color-scheme: dark)`.
5. A `scripts/sync-registry.mjs` that copies registry sources into `examples/consumer-app/components/git-graph/`, mimicking the shadcn-CLI install we'll wire up for real in Phase 5.
6. A `/gutter` route in the consumer app rendering all six Phase 2 fixtures, instrumented for Playwright.
7. Playwright screenshot baselines (Chromium-only) per fixture, plus an interactive theming spec asserting CSS-var changes propagate.
8. A unit-tested bezier path generator with hand-authored expected strings (mirroring Phase 2's "plan as source of truth" pattern).

Phase 3 ships **no headline table, no virtualization, no animation, no `fromGitLog()`, no real CLI install** — those are Phase 4 / 5 / 2.5.

## User Story

As the GitGraph maintainer
I want a production-quality SVG primitive that renders any `LayoutResult` as nodes + bezier edges, themeable and dark-mode-ready
So that Phase 4's headline `<GitGraph>` table can compose it and Phase 5's virtualization can plug into a stable visual contract.

## Problem Statement

Phase 2's `computeLayout` is provably correct against six fixtures, but no human has ever seen a graph it produces. The visual quality bar — bezier curves indistinguishable from GitKraken, perfect lane alignment, theme-coherent colors — is the entire value prop, and there is currently no surface to evaluate it on. We need (a) deterministic geometry, (b) a render path that consumes that geometry, and (c) screenshot baselines that lock visual quality into CI before Phase 4 starts adding row content next to the gutter.

## Solution Statement

Two pure modules + one React component + one CSS file + one tiny build-time copy script.

- **Geometry is pure.** `bezier.ts` exports `edgePath(edge, opts) → string` — same input, same SVG `d` attribute. Tested in Vitest with hand-authored expected paths.
- **Layout owns kind classification.** `computeLayout` is extended so primary-parent edges where `fromLane !== toLane` get `kind: 'fork'` instead of `'straight'`. Four Phase 2 fixtures' expected edges are updated to match. Geometry-aware kind keeps the renderer side-effect-free.
- **Component is presentational.** `<GitGraphGutter>` is a function component, no state, no effects — `(layout, opts) → <svg>`. Lane colors come from CSS vars resolved at render-time via inline `style`.
- **Theme via CSS vars.** `--graph-branch-1..8` define lane colors; `--graph-node-radius`, `--graph-stroke-width`, `--graph-lane-width`, `--graph-row-height` define geometry. Dark mode handled by a single `@media (prefers-color-scheme: dark)` block.
- **Consumer install foreshadowed.** A sync script copies `registry/git-graph/**` into `examples/consumer-app/components/git-graph/**` preserving structure; destinations are gitignored; the consumer's `prepare` (root) and `predev`/`prebuild`/`pretypecheck`/`prelint` (consumer) hooks all run sync. Phase 5 replaces this with `npx shadcn@latest add`.
- **Tests cover every layer.** Bezier unit tests (paths). Layout unit tests (fork classification). Playwright per-fixture screenshots on `/gutter` (Chromium-only). Playwright theming spec on all 3 browsers (color flip → screenshot diff). Geometry assertion test (node `cy` exactly equals `rowHeight*(rowIndex+0.5)`).

## Feature Metadata

**Feature Type:** New Capability (first React/SVG/CSS code in the repo)
**Estimated Complexity:** Medium-High — small surface, but the bezier math, CSS-var theming, sync script, and screenshot baselining are each first-of-their-kind for this repo.
**Primary Systems Affected:** `registry/git-graph/` (gutter, bezier, css), `registry/git-graph/lib/layout.ts` (fork classification), `tests/unit/fixtures/*.ts` (4 of 6 updated), `examples/consumer-app/` (gutter route, globals.css, package.json hooks), root (sync script, package.json prepare, .gitignore), `tests/e2e/` (two new specs + baselines).
**Dependencies:** None new. Zero runtime deps added (per PRD §4 "Zero runtime dependencies beyond `react`, `clsx`, `@tanstack/react-virtual`, `lucide-react`" — `clsx`/`lucide-react`/`react-virtual` arrive in Phase 4/5; Phase 3 needs none of them).

---

## Manual Steps Required

None. Phase 3 is pure code + tests + config. The user-gated actions are the standard ones at the end: `CONFIRM` before `git push`, `gh pr create`, `gh pr merge`, and the post-merge artifact commit.

Note on screenshot baselines: first local run will generate `tests/e2e/gutter-screenshots.spec.ts-snapshots/*.png`. Those PNGs are committed to the repo as the source of truth. Baseline regeneration is `pnpm test:e2e --update-snapshots`.

---

## External-System Assumption Audit

- **No new packages added.** Phase 3 uses only existing deps (`react`, `react-dom`, `next`, `@playwright/test`, `vitest`, `tailwindcss` v4, `typescript`). No native-binding pin updates needed.
- **`pnpm prepare` runs on `pnpm install` (workspace root).** Verified via [pnpm scripts docs](https://pnpm.io/cli/install#dependencies-options) — `prepare` is part of the npm lifecycle and pnpm honors it. CI invokes `pnpm install --frozen-lockfile`, which triggers `prepare`, which runs the sync script, before `pnpm typecheck` / `pnpm test` / `pnpm test:e2e`. **Belt-and-braces:** consumer-app's `predev`/`prebuild`/`pretypecheck`/`prelint` also run sync, so a developer who deletes the synced dir mid-session and runs only `pnpm --filter consumer-app dev` still gets a fresh sync.
- **Next 15 compiles arbitrary file paths inside the app root.** The sync script deposits files under `examples/consumer-app/components/git-graph/`, which is inside the app root. No `transpilePackages`/`experimental.externalDir` config needed.
- **Tailwind v4 honors `@import` in CSS-first mode.** `examples/consumer-app/app/globals.css` will `@import "../components/git-graph/git-graph.css";` after the existing `@import "tailwindcss";`. Verified via [Tailwind v4 docs § CSS imports](https://tailwindcss.com/docs/v4-beta#css-imports). `:root` CSS variables outside `@theme` are first-class CSS — they don't need `@theme` to work; we only use `@theme` for tokens we want Tailwind utilities to read.
- **Playwright `toHaveScreenshot()` writes baselines on first run with `--update-snapshots` and compares thereafter.** Baselines live next to the spec file in `<spec>.spec.ts-snapshots/`. This is committed binary content. Verified via [Playwright visual comparison docs](https://playwright.dev/docs/test-snapshots).
- **Screenshot rendering is OS- and browser-version-sensitive.** Limiting baselines to Chromium and pinning Playwright at `1.49.1` (already in `package.json`) keeps drift manageable. Font hinting differences between Windows-local and Linux-CI are real; Phase 3 sidesteps this by capturing only the SVG (no rendered text in the gutter), so anti-aliased lines should match within Playwright's default `maxDiffPixelRatio`. If CI flakes, raise `maxDiffPixelRatio` to 0.01 — do **not** disable the assertion.
- **`structuredClone` is Node 22 native.** Already used in Phase 2 tests; no polyfill needed.
- **GitHub Pages deploy untouched.** Phase 3 only adds files under `apps/docs/` if any (none planned); the existing `deploy.yml` workflow continues to work as-is.

### Post-execution corrections (recorded after Phase 3 merged)

The plan's task 17 Docker recipe (`docker run ... mcr.microsoft.com/playwright:v1.49.1-jammy bash -lc "corepack enable && pnpm install --frozen-lockfile && ..."`) fails on a Windows host as written. Three workarounds were needed, all unrelated to plan logic but load-bearing for baseline regeneration:

1. **`corepack enable` fails inside the v1.49.1-jammy image** with `Error: Cannot find matching keyid` — bundled corepack can't verify rotated npm registry signing keys. Replace with `npm install -g pnpm@10.33.0`. (Newer Playwright images may bundle a corepack with refreshed keys; re-test before assuming this is needed.)
2. **`pnpm install --frozen-lockfile` fails under `engine-strict=true`** because the image ships Node 22.12.0 and the lockfile contains `eslint-visitor-keys@5.0.1` (transitive via `eslint-config-next`) which requires Node ≥22.13. Bypass scoped to the Docker invocation only: `pnpm install --frozen-lockfile --config.engine-strict=false`. CI's `actions/setup-node@v4 with: node-version: 22` resolves to current 22.x and is unaffected. If we ever bump the Playwright image past `v1.49.1` (i.e. simultaneously bumping `@playwright/test`), this workaround becomes unnecessary.
3. **`pnpm install` inside the bind-mounted repo throws `EACCES` on rename** for `node_modules/.pnpm/*/_tmp_*` → final names, because Windows NTFS-through-Docker-Desktop bind mounts don't always honor rename atomicity inside `node_modules`. Fix: mount anonymous volumes over the three `node_modules` dirs so pnpm operates on the container's ext4, not the host bind. Add to the `docker run` invocation:

       -v "/work/node_modules"
       -v "/work/apps/docs/node_modules"
       -v "/work/examples/consumer-app/node_modules"

   Note this requires deleting any existing host `node_modules` dirs first (otherwise the bind-mounted versions shadow the volumes during install).

**Working PowerShell recipe (Phase 3, Windows host):**

```powershell
Get-ChildItem -Recurse -Filter node_modules -Directory | ForEach-Object { Remove-Item -Recurse -Force $_.FullName }
docker run --rm --ipc=host `
  -v "${PWD}:/work" `
  -v "/work/node_modules" `
  -v "/work/apps/docs/node_modules" `
  -v "/work/examples/consumer-app/node_modules" `
  -w /work -e CI=true `
  mcr.microsoft.com/playwright:v1.49.1-jammy `
  bash -lc "npm install -g pnpm@10.33.0 && pnpm install --frozen-lockfile --config.engine-strict=false && pnpm test:e2e --project=chromium --update-snapshots gutter-screenshots.spec.ts"
```

After running, `pnpm install --frozen-lockfile` on the host to restore the local `node_modules`.

### Other deviations

- **Theming spec — `toBeVisible()` doesn't work on SVG `<path fill="none">`.** The element has zero-area bounding box on Chromium and WebKit (Firefox is more lenient), so Playwright reports it hidden even when present and styled. Replaced with `toHaveAttribute("d", /.+/)`, which is functionally equivalent for "the locator resolved to a real path element" and passes on all 3 browsers. Future SVG-rendering plans should avoid `toBeVisible()` on stroke-only elements.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `docs/PRD.md` §6 (lines 118–165) — high-level architecture; gutter is the SVG-only primitive consuming `LayoutResult`.
- `docs/PRD.md` §7.2 (lines 186–196) — `<GitGraphGutter>` props.
- `docs/PRD.md` §7.4 (lines 228–234) — bezier rendering rules: vertical tangents, no node-crossing, S-shape on cross-lane.
- `docs/PRD.md` §12 Phase 3 (lines 405–417) — phase deliverables.
- `CLAUDE.md` (entire file) — conventions, including: kebab-case files, default-exported PascalCase components, `type` over `interface`, LF endings, artifact-commit cadence (post-merge on `main`), two-pass typecheck.
- `registry/git-graph/types.ts` (entire file) — types to extend; comment on line 17–20 explicitly defers `'fork'` to Phase 3.
- `registry/git-graph/lib/layout.ts` (entire file) — `computeLayout` to extend; partial-edge construction at lines 25–31 and 81–92 is where fork classification slots in.
- `tests/unit/fixtures/{linear,feature-branch,merge,octopus,orphan,long-lived-release}.ts` — fixtures whose expected edges may need fork updates (linear and orphan are unaffected; the other four need updates).
- `tests/unit/layout.test.ts` — existing equality + invariant tests; no changes needed beyond the fixtures.
- `examples/consumer-app/app/globals.css` — existing 19-line file; we append a registry CSS @import + the graph CSS vars.
- `examples/consumer-app/app/page.tsx` — existing landing page; left untouched. New page is `app/gutter/page.tsx`.
- `examples/consumer-app/tsconfig.json` — `@/*` alias = `./*`. Consumer imports `@/components/git-graph/...`.
- `examples/consumer-app/package.json` — gets new `predev`/`prebuild`/`pretypecheck`/`prelint` hooks.
- `playwright.config.ts` — already 3-browser; no config change. Per-spec we use `test.skip(({browserName}) => browserName !== 'chromium')` to limit screenshot baselines.
- `package.json` (root) — gets new `prepare` script + new `sync` script.
- `.gitignore` — gets `examples/consumer-app/components/git-graph/` line.
- `tsconfig.json` (root) — already covers `registry/**` and `tests/**`; no change needed (the synced consumer-app copy is excluded by the existing `apps`/`examples` exclusion line).
- `.agents/system-reviews/phase-2-layout-engine-review.md` — system-level guidance for this phase: hand-trace fixtures with embedded expected output; specify error handling up front; carry MinHeap forward, don't relocate.

### New Files to Create

**Registry source**
- `registry/git-graph/lib/bezier.ts` — pure path-string fn `edgePath(edge, opts) → string`. Default opts pulled from a constant; fully overridable.
- `registry/git-graph/git-graph-gutter.tsx` — default-exported React component.
- `registry/git-graph/git-graph.css` — `:root` and `@media (prefers-color-scheme: dark) :root` blocks defining `--graph-branch-1..8`, `--graph-node-radius`, `--graph-stroke-width`, `--graph-lane-width`, `--graph-row-height`.

**Build glue**
- `scripts/sync-registry.mjs` — Node 22 ESM script. Copies `registry/git-graph/**/*.{ts,tsx,css}` into `examples/consumer-app/components/git-graph/**`, preserving relative structure. Skips `tsconfig.json`, `*.test.ts`, `.gitkeep`. Idempotent: rm-rf dest, then copy.

**Consumer-app**
- `examples/consumer-app/app/gutter/page.tsx` — renders all six fixtures stacked, each in `<section data-testid="fixture-{name}">`. Includes a `<button data-testid="theme-flip">` that flips `--graph-branch-1` to a recognizable test color via `document.documentElement.style.setProperty`.

**Tests**
- `tests/unit/bezier.test.ts` — Vitest. Hand-authored expected path strings for representative edges (one straight, one fork, one merge). Determinism invariant.
- `tests/e2e/gutter-screenshots.spec.ts` — Playwright. Chromium-only via `test.skip`. One `toHaveScreenshot` per fixture section. Plus a node-position assertion test that scrapes `<circle cy>` attributes and confirms `cy === rowHeight*(rowIndex+0.5)` exactly.
- `tests/e2e/gutter-theming.spec.ts` — Playwright, all 3 browsers. Loads `/gutter`, snapshots a fixture section, clicks `theme-flip`, snapshots again, asserts the two screenshot buffers differ (raw byte diff via `expect(a).not.toEqual(b)` is fine — we want any visible change to count).

**Generated (committed)**
- `tests/e2e/gutter-screenshots.spec.ts-snapshots/*.png` — Playwright baselines, generated by `--update-snapshots` and committed.

### Files to Update

- `registry/git-graph/types.ts` — extend `EdgeKind` union to include `'fork'`. Replace the two-line "Phase 2/Phase 3" comment with a stable description of the three kinds.
- `registry/git-graph/lib/layout.ts` — when emitting the primary-parent partial edge, store kind as a placeholder; in the post-pass that fills `toLane`/`toRow`, set `kind` to `'fork'` if `fromLane !== toLane` (only for what was previously `'straight'`; `'merge'` stays `'merge'` regardless of geometry).
- `tests/unit/fixtures/feature-branch.ts` — update edge `f1 → m1` (lanes 1→0): `kind: 'straight'` → `'fork'`.
- `tests/unit/fixtures/merge.ts` — update edge `f1 → m1` (lanes 1→0): `kind: 'straight'` → `'fork'`.
- `tests/unit/fixtures/octopus.ts` — update edges `c → rt` (2→0) and `b → rt` (1→0): `'straight'` → `'fork'`. The `a → rt` edge stays `'straight'` (lanes 0→0).
- `tests/unit/fixtures/long-lived-release.ts` — update edge `r1 → m1` (1→0): `'straight'` → `'fork'`.
- `examples/consumer-app/app/globals.css` — append `@import "../components/git-graph/git-graph.css";`. The graph CSS file owns the variables; globals.css just imports.
- `examples/consumer-app/package.json` — add `predev`, `prebuild`, `pretypecheck`, `prelint` scripts each running `node ../../scripts/sync-registry.mjs`.
- `package.json` (root) — add `"prepare": "node scripts/sync-registry.mjs"` and `"sync": "node scripts/sync-registry.mjs"`.
- `.gitignore` — append `examples/consumer-app/components/git-graph/`.
- `playwright.config.ts` — set `use.colorScheme: 'light'` so OS-level dark-mode preference can't flip baselines mid-run.

### Files Explicitly NOT Touched

- `apps/docs/**` — Phase 3 does not add a docs demo; that lands in Phase 5.
- `playwright.config.ts` — no change. Browser matrix and `webServer` already correct.
- `tsconfig.base.json`, root `tsconfig.json`, `vitest.config.ts` — no change. The synced consumer-app copy is automatically excluded from root tsc by the existing `"exclude": ["apps", "examples"]` line.
- `tests/unit/fixtures/{linear,orphan}.ts` — no cross-lane primary edges, no fork updates needed.

### Relevant Documentation — YOU SHOULD READ THESE BEFORE IMPLEMENTING

- [SVG `<path>` cubic bezier — `C` command](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#cubic_bezier_curve) — what `M x1 y1 C cx1 cy1 cx2 cy2 x2 y2` means; we generate this directly.
- [Playwright `toHaveScreenshot`](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1) — baseline path conventions, `maxDiffPixelRatio`.
- [Tailwind v4 — CSS imports & `@theme`](https://tailwindcss.com/docs/v4-beta#css-imports) — `@import` chaining works; vars at `:root` outside `@theme` are valid CSS.
- [pnpm scripts — lifecycle hooks](https://pnpm.io/cli/install#dependencies-options) — `prepare` runs after install; `pre*` runs before the matching script.
- [TypeScript — `exactOptionalPropertyTypes`](https://www.typescriptlang.org/tsconfig#exactOptionalPropertyTypes) — relevant when the gutter component accepts optional sizing props.

### Patterns to Follow

**File / export conventions**
- Files: kebab-case (`git-graph-gutter.tsx`, `bezier.ts`).
- Types: `type` not `interface`, PascalCase, named exports.
- React components: PascalCase, **default-exported** (per `CLAUDE.md`). The default export is `GitGraphGutter`.
- Pure utility modules (`bezier.ts`): named exports only.
- Imports inside `registry/git-graph/`: relative (`./lib/bezier`, `./types`). No `@/` alias — registry is CLI-installed into arbitrary consumer projects and must be self-contained.

**Determinism**
- `edgePath` produces byte-identical output for byte-identical input. No `Math.random()`, no rounding via `toFixed` (which would silently truncate to 5 decimals); use plain `${number}` interpolation, which calls `Number.prototype.toString` and produces minimal lossless representation.
- Component output is deterministic given identical props. No `useId`, no `Math.random` for SVG IDs (we don't need IDs).

**Error handling at the gutter boundary** (per system-review guidance — specify up front)
- `laneCount: 0` and empty `rows[]`: render `<svg width="0" height="0" />`. No throw; empty input is legitimate (e.g. empty repo).
- `edge.toRow >= rows.length` or `edge.fromRow >= rows.length`: throw `Error("GitGraphGutter: edge references row out of range")` in development (`process.env.NODE_ENV !== 'production'`); silently skip the edge in production. This mirrors React DevTools patterns and prevents a single bad edge from blanking the entire gutter for end users.
- `lane < 0`: throw at component top regardless of NODE_ENV. Negative lanes are a bug, not a degraded data condition.

**Testing**
- Bezier: hand-authored expected path strings (the plan, not the implementation, defines correctness — same convention as Phase 2 layout fixtures).
- Layout fork classification: existing equality tests cover it via fixture expected updates. No new test cases needed.
- Screenshots: Chromium-only (`test.skip(({browserName}) => browserName !== 'chromium')`). Theming spec runs all 3 browsers because it's testing CSS-var propagation, not pixel exactness.

---

## IMPLEMENTATION PLAN

### Phase 3a — Geometry (pure)

Bezier helper, layout fork classification, fixture updates. All Vitest-covered. No React, no Next.

### Phase 3b — Component & CSS

`<GitGraphGutter>`, `git-graph.css`. No tests yet (Vitest can't render React without jsdom and we haven't installed it; visuals are tested via Playwright in 3c).

### Phase 3c — Build glue & consumer-app

Sync script, package.json hooks, gitignore, `/gutter` route, globals.css update.

### Phase 3d — E2E coverage

Screenshot spec (Chromium baselines), theming spec (cross-browser), node-position spec.

### Phase 3e — PR / merge / artifact commit

Push, open PR, merge, then post-merge `.agents/` artifact commit on `main` per `CLAUDE.md` workflow.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable. cwd is `D:\repos\GitGraph` unless stated. Branch off `main`.

### 1. CREATE feature branch

- **IMPLEMENT**: `git checkout main && git pull --ff-only origin main && git checkout -b phase-3-gutter-primitive`
- **VALIDATE**: `git branch --show-current` → `phase-3-gutter-primitive`; `git status` clean.

### 2. UPDATE `registry/git-graph/types.ts` to add `'fork'` to `EdgeKind`

- **IMPLEMENT**: Replace lines 16–21 (the existing two-line phase comment + `EdgeKind` declaration) with:
  ```ts
  // Edge classification.
  //   - `straight`: primary-parent edge whose child and parent share a lane.
  //   - `fork`:     primary-parent edge whose child and parent are on different
  //                 lanes (a branch tip rejoining its ancestor's lane).
  //   - `merge`:    secondary-parent edge (parents[i>0]) — always rendered as
  //                 a curve regardless of lane geometry.
  export type EdgeKind = "straight" | "fork" | "merge";
  ```
- **GOTCHA**: Don't reorder the union — fixtures and the renderer use string equality, but type-level union order doesn't affect runtime; keeping authoring order stable matches discoverability.
- **VALIDATE**: `pnpm exec tsc -p tsconfig.json --noEmit` exits 0. Tests will fail in this state — that's expected; we fix them in tasks 3–4.

### 3. UPDATE `registry/git-graph/lib/layout.ts` to classify primary edges as `'fork'`

- **IMPLEMENT**: In the partial-edges loop (lines 49–75 of current file), the primary-parent partial edge is pushed with `kind: "straight"`. Leave that as the default-tentative classification. In the post-pass that maps partial edges → final edges (lines 81–92), update the kind based on resolved lane:
  ```ts
  const edges: LayoutEdge[] = partialEdges.map((e) => {
    const target = rowBySha.get(e.toSha)!;
    let kind: EdgeKind = e.kind;
    if (kind === "straight" && e.fromLane !== target.lane) {
      kind = "fork";
    }
    return {
      fromSha: e.fromSha,
      toSha: e.toSha,
      fromLane: e.fromLane,
      toLane: target.lane,
      fromRow: e.fromRow,
      toRow: target.rowIndex,
      kind,
    };
  });
  ```
- **PATTERN**: Mirrors existing post-pass shape. Single-line classification change.
- **GOTCHA**: Do NOT also re-evaluate `'merge'` edges. Secondary-parent edges stay `'merge'` regardless of `fromLane === toLane` — the kind is semantic (parent index, not geometry). All merges in fixtures are cross-lane today, but a hypothetical same-lane merge (e.g. fast-forward squash where the secondary parent happens to land on the merge commit's lane) would still be `'merge'`.
- **GOTCHA**: `EdgeKind` import already exists at line 1 of the file; no import update needed.
- **VALIDATE**: `pnpm exec tsc -p tsconfig.json --noEmit` exits 0. `pnpm test` fails on the four fixtures whose expecteds now disagree — task 4 fixes them.

### 4. UPDATE four fixture files to mark cross-lane primaries as `'fork'`

Update **only** the listed edges. All other edges stay unchanged.

- **`tests/unit/fixtures/feature-branch.ts`**: edge `{ fromSha: "f1", toSha: "m1", fromLane: 1, toLane: 0, fromRow: 3, toRow: 4 }` — change `kind: "straight"` → `kind: "fork"`.
- **`tests/unit/fixtures/merge.ts`**: edge `{ fromSha: "f1", toSha: "m1", fromLane: 1, toLane: 0, fromRow: 1, toRow: 3 }` — change `kind: "straight"` → `kind: "fork"`.
- **`tests/unit/fixtures/octopus.ts`**: two edges:
  - `{ fromSha: "c", toSha: "rt", fromLane: 2, toLane: 0, fromRow: 1, toRow: 4 }` — `"straight"` → `"fork"`.
  - `{ fromSha: "b", toSha: "rt", fromLane: 1, toLane: 0, fromRow: 2, toRow: 4 }` — `"straight"` → `"fork"`.
  - Edge `a → rt` (lanes 0→0) stays `"straight"`.
- **`tests/unit/fixtures/long-lived-release.ts`**: edge `{ fromSha: "r1", toSha: "m1", fromLane: 1, toLane: 0, fromRow: 7, toRow: 8 }` — `"straight"` → `"fork"`.
- `linear.ts` and `orphan.ts` have no cross-lane primary edges; do not touch.
- **GOTCHA**: Hand-traced against the algorithm: only a primary-parent edge whose `fromLane !== toLane` becomes `'fork'`. The four updates above are the complete set across all six fixtures. If a fifth shows up during execution, stop and re-grep — the algorithm change is wrong.
- **VALIDATE**: `pnpm test` — all 13 layout tests green again (6 fixture equality + 4 invariants + 3 error-path tests carried over from the Phase 2 fix commit).

### 5. CREATE `registry/git-graph/lib/bezier.ts`

- **IMPLEMENT**:
  ```ts
  import type { LayoutEdge } from "../types";

  export type BezierOpts = {
    laneWidth: number;
    rowHeight: number;
  };

  export const DEFAULT_BEZIER_OPTS: BezierOpts = {
    laneWidth: 16,
    rowHeight: 40,
  };

  // Convert a layout edge into an SVG `path` `d` attribute string.
  //   - `straight` (same-lane primary): vertical line `M x y1 L x y2`.
  //   - `fork`/`merge` (cross-column): cubic bezier with vertical tangents
  //     at both endpoints, control points at the y-midpoint above each end.
  // Path components are space-separated single-token forms; numbers render
  // via `Number.prototype.toString` for minimal lossless representation
  // (no trailing zeros, no `toFixed` truncation). Determinism follows from
  // pure arithmetic on finite inputs.
  export function edgePath(edge: LayoutEdge, opts: BezierOpts = DEFAULT_BEZIER_OPTS): string {
    const x1 = centerX(edge.fromLane, opts.laneWidth);
    const y1 = centerY(edge.fromRow, opts.rowHeight);
    const x2 = centerX(edge.toLane, opts.laneWidth);
    const y2 = centerY(edge.toRow, opts.rowHeight);

    if (edge.kind === "straight") {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    const dy = y2 - y1;
    const cy1 = y1 + dy / 2;
    const cy2 = y2 - dy / 2;
    return `M ${x1} ${y1} C ${x1} ${cy1} ${x2} ${cy2} ${x2} ${y2}`;
  }

  export function centerX(lane: number, laneWidth: number): number {
    return laneWidth * lane + laneWidth / 2;
  }

  export function centerY(row: number, rowHeight: number): number {
    return rowHeight * row + rowHeight / 2;
  }
  ```
- **PATTERN**: Mirrors `layout.ts`'s style — pure module, type-only import from `../types`, named exports.
- **GOTCHA**: Bezier control points use `dy / 2` for both `cy1` and `cy2` — that yields the same y-coordinate (`(y1+y2)/2`) for both control points. This is intentional: with control points at the row-pair midpoint and on the endpoints' x-coordinates, the curve has vertical tangents at both nodes (entry/exit perpendicular to the row line) and is symmetric. **Do not** "fix" this to two distinct y-values; the symmetric form is what makes adjacent fork+merge pairs read as a coherent S.
- **GOTCHA**: `straight`-kind edges where `fromLane === toLane` (the only kind where this is possible after task 3) produce `M x y1 L x y2` — vertical line. Don't compute bezier for them; they'd render fine but the path string would carry needless ceremony and break the bezier unit tests' expected forms.
- **GOTCHA**: Number formatting via plain `${n}` template interpolation. JS yields `"8"` for `8`, `"20"` for `20`, `"20.5"` for `20.5`. Default opts (16/40) produce all integers for the Phase 2 fixtures. Do NOT use `toFixed` — it would silently turn `8` into `"8.00"` and break the unit tests' expected strings.
- **VALIDATE**: `pnpm exec tsc -p tsconfig.json --noEmit` exits 0.

### 6. CREATE `tests/unit/bezier.test.ts`

- **IMPLEMENT**:
  ```ts
  import { describe, expect, test } from "vitest";
  import { DEFAULT_BEZIER_OPTS, edgePath } from "../../registry/git-graph/lib/bezier";
  import type { LayoutEdge } from "../../registry/git-graph/types";

  // Hand-traced against DEFAULT_BEZIER_OPTS (laneWidth=16, rowHeight=40):
  //   centerX(L) = 16*L + 8       → L=0:8,  L=1:24, L=2:40
  //   centerY(R) = 40*R + 20      → R=0:20, R=1:60, R=2:100, R=3:140, R=4:180

  describe("edgePath — straight (same-lane primary)", () => {
    test("vertical line on lane 0 from row 0 to row 1", () => {
      const edge: LayoutEdge = {
        fromSha: "a", toSha: "b",
        fromLane: 0, toLane: 0,
        fromRow: 0, toRow: 1,
        kind: "straight",
      };
      expect(edgePath(edge)).toBe("M 8 20 L 8 60");
    });
  });

  describe("edgePath — fork (cross-lane primary, branch tip rejoining ancestor)", () => {
    test("S-curve from lane 1 row 3 to lane 0 row 4", () => {
      const edge: LayoutEdge = {
        fromSha: "f1", toSha: "m1",
        fromLane: 1, toLane: 0,
        fromRow: 3, toRow: 4,
        kind: "fork",
      };
      // y1=140, y2=180, dy=40, cy1=160, cy2=160
      expect(edgePath(edge)).toBe("M 24 140 C 24 160 8 160 8 180");
    });
  });

  describe("edgePath — merge (secondary-parent)", () => {
    test("S-curve from lane 0 row 0 to lane 1 row 1", () => {
      const edge: LayoutEdge = {
        fromSha: "m3", toSha: "f2",
        fromLane: 0, toLane: 1,
        fromRow: 0, toRow: 1,
        kind: "merge",
      };
      // y1=20, y2=60, dy=40, cy1=40, cy2=40
      expect(edgePath(edge)).toBe("M 8 20 C 8 40 24 40 24 60");
    });
  });

  describe("edgePath — invariants", () => {
    test("is deterministic across repeated calls", () => {
      const edge: LayoutEdge = {
        fromSha: "a", toSha: "b",
        fromLane: 2, toLane: 0,
        fromRow: 1, toRow: 5,
        kind: "fork",
      };
      expect(edgePath(edge)).toBe(edgePath(edge));
    });

    test("respects custom opts", () => {
      const edge: LayoutEdge = {
        fromSha: "a", toSha: "b",
        fromLane: 0, toLane: 0,
        fromRow: 0, toRow: 1,
        kind: "straight",
      };
      expect(edgePath(edge, { laneWidth: 20, rowHeight: 30 })).toBe("M 10 15 L 10 45");
    });

    test("DEFAULT_BEZIER_OPTS holds the documented values", () => {
      expect(DEFAULT_BEZIER_OPTS).toEqual({ laneWidth: 16, rowHeight: 40 });
    });
  });
  ```
- **GOTCHA**: Expected strings are hand-traced. If `edgePath` produces a different string, the implementation is wrong, not the expected. Diff output from Vitest will name the exact character of mismatch.
- **GOTCHA**: The fork test reuses the exact `f1 → m1` edge from the `feature-branch` fixture (lanes 1→0, rows 3→4). This couples the bezier test to the layout output for one well-known edge — useful for sanity but not load-bearing.
- **VALIDATE**: `pnpm test` — 19 tests pass (13 layout + 6 bezier).

### 7. CREATE `registry/git-graph/git-graph.css`

- **IMPLEMENT**:
  ```css
  /*
   * GitGraph theming surface.
   *
   * Lane colors: --graph-branch-1..8. Lanes index by lane number mod 8, so lane 8
   * reuses the color of lane 0, lane 9 reuses lane 1, etc. Override any of these
   * in your own :root or .dark scope to retheme the graph.
   *
   * Geometry: --graph-node-radius, --graph-stroke-width set the visual weight
   * of nodes and edges. --graph-lane-width and --graph-row-height set the grid
   * spacing and must match the values you pass as props to <GitGraphGutter>.
   */

  :root {
    --graph-branch-1: hsl(220 80% 55%);
    --graph-branch-2: hsl(350 75% 55%);
    --graph-branch-3: hsl(145 60% 45%);
    --graph-branch-4: hsl(35 90% 55%);
    --graph-branch-5: hsl(280 65% 60%);
    --graph-branch-6: hsl(190 75% 50%);
    --graph-branch-7: hsl(60 80% 50%);
    --graph-branch-8: hsl(320 65% 55%);

    --graph-node-radius: 5px;
    --graph-stroke-width: 1.5px;
    --graph-lane-width: 16px;
    --graph-row-height: 40px;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --graph-branch-1: hsl(220 80% 65%);
      --graph-branch-2: hsl(350 75% 65%);
      --graph-branch-3: hsl(145 60% 55%);
      --graph-branch-4: hsl(35 90% 65%);
      --graph-branch-5: hsl(280 65% 70%);
      --graph-branch-6: hsl(190 75% 60%);
      --graph-branch-7: hsl(60 80% 60%);
      --graph-branch-8: hsl(320 65% 65%);
    }
  }
  ```
- **PATTERN**: Pure CSS, no Tailwind. shadcn-style consumers will move these into their own `globals.css` post-install.
- **GOTCHA**: CSS variables are declared on `:root`, NOT inside `@theme`. We don't need Tailwind utilities to read them — the gutter component consumes them via inline `style={{ stroke: 'var(--graph-branch-1)' }}` etc. `@theme` would expose them as Tailwind tokens, but that's a Phase 4 concern when the headline table needs `bg-[--graph-row-hover]`-style usage.
- **GOTCHA**: `--graph-lane-width: 16px` and `--graph-row-height: 40px` are advisory only — the gutter component reads its sizing from props, not from CSS vars. The vars are present so theme authors who customize one understand the other matters too. (Phase 4's headline table will read row height from CSS to align metadata.)
- **VALIDATE**: File exists; manual eyeball — `head -20 registry/git-graph/git-graph.css` shows the `:root` block.

### 8. CREATE `registry/git-graph/git-graph-gutter.tsx`

- **IMPLEMENT**:
  ```tsx
  import type { CSSProperties } from "react";
  import type { LayoutEdge, LayoutResult, LayoutRow } from "./types";
  import { centerX, centerY, edgePath } from "./lib/bezier";

  export type GitGraphGutterProps = {
    layout: LayoutResult;
    laneWidth?: number;
    rowHeight?: number;
    nodeRadius?: number;
    strokeWidth?: number;
    className?: string;
  };

  const DEFAULTS = {
    laneWidth: 16,
    rowHeight: 40,
    nodeRadius: 5,
    strokeWidth: 1.5,
  } as const;

  export default function GitGraphGutter(props: GitGraphGutterProps) {
    const laneWidth = props.laneWidth ?? DEFAULTS.laneWidth;
    const rowHeight = props.rowHeight ?? DEFAULTS.rowHeight;
    const nodeRadius = props.nodeRadius ?? DEFAULTS.nodeRadius;
    const strokeWidth = props.strokeWidth ?? DEFAULTS.strokeWidth;
    const { layout } = props;

    if (layout.rows.length === 0) {
      return <svg width={0} height={0} className={props.className} />;
    }

    for (const row of layout.rows) {
      if (row.lane < 0) {
        throw new Error(`GitGraphGutter: row has negative lane (${row.lane})`);
      }
    }

    const width = layout.laneCount * laneWidth;
    const height = layout.rows.length * rowHeight;

    const safeEdges: LayoutEdge[] = [];
    for (const e of layout.edges) {
      if (e.fromRow >= layout.rows.length || e.toRow >= layout.rows.length) {
        if (process.env.NODE_ENV !== "production") {
          throw new Error(
            `GitGraphGutter: edge ${e.fromSha}->${e.toSha} references row out of range`,
          );
        }
        continue;
      }
      safeEdges.push(e);
    }

    return (
      <svg
        width={width}
        height={height}
        className={props.className}
        data-testid="git-graph-gutter"
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g data-role="edges">
          {safeEdges.map((edge) => {
            const colorLane = edge.kind === "merge" ? edge.toLane : edge.fromLane;
            const stroke: CSSProperties = {
              stroke: `var(--graph-branch-${(colorLane % 8) + 1})`,
              strokeWidth,
              fill: "none",
            };
            return (
              <path
                key={`${edge.fromSha}-${edge.toSha}`}
                d={edgePath(edge, { laneWidth, rowHeight })}
                style={stroke}
                data-edge-kind={edge.kind}
              />
            );
          })}
        </g>
        <g data-role="nodes">
          {layout.rows.map((row) => {
            const cx = centerX(row.lane, laneWidth);
            const cy = centerY(row.rowIndex, rowHeight);
            const isMerge = row.commit.parents.length >= 2;
            const fill = `var(--graph-branch-${(row.lane % 8) + 1})`;
            const style: CSSProperties = isMerge
              ? { stroke: fill, strokeWidth, fill: "var(--color-background, white)" }
              : { fill };
            return (
              <circle
                key={row.commit.sha}
                cx={cx}
                cy={cy}
                r={nodeRadius}
                style={style}
                data-sha={row.commit.sha}
                data-row-index={row.rowIndex}
                data-lane={row.lane}
              />
            );
          })}
        </g>
      </svg>
    );
  }
  ```
- **PATTERN**: Default-exported PascalCase function component per `CLAUDE.md`. No `'use client'` directive needed — this component is fully render-deterministic, no hooks/effects/event handlers, so it can render in a React Server Component.
- **GOTCHA**: `(lane % 8) + 1` — JS modulo on negative numbers returns negatives; we already throw on negative lanes above, so this is safe.
- **GOTCHA**: Merge nodes use `var(--color-background, white)` as fill so the ring shows hollow against the page. The Tailwind v4 `@theme` block in `examples/consumer-app/app/globals.css` already defines `--color-background`, so the fallback only fires in environments without theme integration. Don't change this to a separate `--graph-node-bg` var unless a future review surfaces a real need.
- **GOTCHA**: We deliberately omit `aria-*` and ARIA roles. The gutter is decorative within the headline table (Phase 4); accessible labels live on the row, not the SVG. Phase 4 will add `aria-hidden="true"` on the `<svg>` when it's wrapped by the table; for the standalone primitive, leaving it semantically opaque is correct. (A Phase 4 review will revisit this.)
- **GOTCHA**: `data-testid`, `data-sha`, `data-row-index`, `data-lane`, `data-edge-kind` are present specifically for Playwright; do not strip them as "implementation details." They're stable contract for the e2e suite and cost nothing.
- **VALIDATE**: `pnpm exec tsc -p tsconfig.json --noEmit` exits 0.

### 9. CREATE `scripts/sync-registry.mjs`

- **IMPLEMENT**:
  ```js
  // Copies registry/git-graph/** runtime files into examples/consumer-app/
  // components/git-graph/**, preserving relative structure. Foreshadows the
  // `npx shadcn@latest add` install that Phase 5 wires up for real.
  //
  // Idempotent: rm -rf the destination, then walk the source.
  // Skips: tsconfig.json, *.test.ts, .gitkeep, anything not .ts/.tsx/.css.

  import { mkdir, readdir, rm, copyFile, stat } from "node:fs/promises";
  import { dirname, join, relative, resolve } from "node:path";
  import { fileURLToPath } from "node:url";

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
    await rm(DEST, { recursive: true, force: true });
    const files = await walk(SRC);
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
  ```
- **PATTERN**: Pure Node 22 ESM, no deps. `.mjs` extension so it runs without the workspace declaring `"type": "module"`.
- **GOTCHA**: Walk filter is allow-list (extensions) + deny-list (test files, configs). If a future phase adds `.svg` or `.tsx.snap` to registry, update `ALLOW`.
- **GOTCHA**: `rm -rf` on the destination is destructive. The destination is gitignored (task 12), so there's nothing to lose — but if a developer manually checks something into that directory, it gets nuked. The script logs the file count on success so the developer notices if it copied "0 files" (silent failure mode).
- **VALIDATE**: `node scripts/sync-registry.mjs` runs successfully; `ls examples/consumer-app/components/git-graph/` shows `git-graph-gutter.tsx`, `types.ts`, `git-graph.css`, `lib/layout.ts`, `lib/bezier.ts`. `tsconfig.json` and `.gitkeep` are NOT present.

### 10. UPDATE root `package.json` with `prepare` and `sync` scripts

- **IMPLEMENT**: In the `scripts` block, add (preserve existing scripts):
  ```json
  "prepare": "node scripts/sync-registry.mjs",
  "sync": "node scripts/sync-registry.mjs"
  ```
  Place them between `dev:consumer` and `build:docs` for visual grouping.
- **PATTERN**: `prepare` is the standard npm lifecycle hook; pnpm honors it on install. `sync` is a manual-trigger alias for the same script.
- **GOTCHA**: `prepare` runs after `pnpm install`. If a developer runs `pnpm install --ignore-scripts`, the sync won't fire — the consumer-app's own `pre*` hooks (task 11) cover that path.
- **VALIDATE**: `pnpm sync` runs and copies files. `pnpm install --frozen-lockfile` — observe the `[sync-registry] copied N files` log line at the tail.

### 11. UPDATE `examples/consumer-app/package.json` with sync hooks

- **IMPLEMENT**: Add to the `scripts` block:
  ```json
  "predev": "node ../../scripts/sync-registry.mjs",
  "prebuild": "node ../../scripts/sync-registry.mjs",
  "pretypecheck": "node ../../scripts/sync-registry.mjs",
  "prelint": "node ../../scripts/sync-registry.mjs"
  ```
  Existing scripts (`dev`, `build`, `start`, `lint`, `typecheck`) stay unchanged.
- **PATTERN**: `pre*` hooks fire before the matching script in any package manager (npm/pnpm/yarn).
- **GOTCHA**: The relative path `../../scripts/sync-registry.mjs` is from the consumer-app's package root (`examples/consumer-app/`), not the workspace root. Verify with `cd examples/consumer-app && node ../../scripts/sync-registry.mjs` before relying on the hook.
- **VALIDATE**: `pnpm --filter consumer-app typecheck` runs `pretypecheck` first, sync logs visible. Typecheck exits 0.

### 12. UPDATE `.gitignore` to exclude synced consumer-app files

- **IMPLEMENT**: Append (preserve existing entries; add a leading blank line if the previous entry isn't already followed by one):
  ```
  # Synced from registry/git-graph by scripts/sync-registry.mjs.
  examples/consumer-app/components/git-graph/
  ```
- **PATTERN**: Repo-level `.gitignore` keeps generated artifacts out of git history. The path is relative to repo root (no leading slash needed for git-style ignore).
- **VALIDATE**: `git check-ignore examples/consumer-app/components/git-graph/git-graph-gutter.tsx` exits 0 (file is ignored). `git status` does NOT show the synced files as untracked.

### 12a. SMOKE the build chain end-to-end

Run this *before* the consumer app starts importing graph code. If any of {sync script, package.json hooks, .gitignore} is wrong, fix it now — debugging it later through a Next page-level error is much harder.

- **IMPLEMENT**:
  ```bash
  rm -rf examples/consumer-app/components/git-graph
  pnpm install --frozen-lockfile     # triggers root prepare → sync
  ls examples/consumer-app/components/git-graph/git-graph-gutter.tsx   # must exist
  rm -rf examples/consumer-app/components/git-graph
  pnpm --filter consumer-app typecheck    # triggers pretypecheck → sync; must pass
  git status                              # synced dir must NOT appear
  ```
- **PURPOSE**: Confirms the four moving parts of the install-foreshadowing chain (root `prepare`, consumer `pre*`, gitignore, sync script) all line up. Tests both lifecycle paths (`install`-driven and per-script `pre*`-driven).
- **VALIDATE**: Each step of the recipe above produces the expected outcome. If `git status` shows the synced dir as untracked, the gitignore entry is wrong (likely a missing trailing slash or wrong path); fix and re-run.

### 13. UPDATE `examples/consumer-app/app/globals.css` to import graph CSS

- **IMPLEMENT**: After the existing `@import "tailwindcss";` line, add:
  ```css
  @import "../components/git-graph/git-graph.css";
  ```
  Leave the existing `@theme` and `@media` blocks untouched.
- **PATTERN**: Tailwind v4 CSS-first allows arbitrary `@import` chaining.
- **GOTCHA**: The imported file lives in a gitignored directory. Until `pnpm install` (or any consumer `pre*` hook) runs, the file doesn't exist on disk, and Next dev/build will error. CI runs `pnpm install --frozen-lockfile` which fires `prepare` which runs sync — so CI is fine. Local first-time setup: the developer runs `pnpm install` once; from then on `predev` etc. keep it fresh.
- **VALIDATE**: `pnpm --filter consumer-app build` exits 0. (The pre-build hook syncs first.)

### 14. CREATE `examples/consumer-app/app/gutter/page.tsx`

- **IMPLEMENT**:
  ```tsx
  "use client";

  import { useState } from "react";
  import GitGraphGutter from "@/components/git-graph/git-graph-gutter";
  import { computeLayout } from "@/components/git-graph/lib/layout";
  import {
    featureBranchFixture,
    linearFixture,
    longLivedReleaseFixture,
    mergeFixture,
    octopusFixture,
    orphanFixture,
  } from "../../../../tests/unit/fixtures";

  const FIXTURES = [
    { name: "linear", commits: linearFixture },
    { name: "feature-branch", commits: featureBranchFixture },
    { name: "merge", commits: mergeFixture },
    { name: "octopus", commits: octopusFixture },
    { name: "orphan", commits: orphanFixture },
    { name: "long-lived-release", commits: longLivedReleaseFixture },
  ] as const;

  export default function GutterPage() {
    const [themed, setThemed] = useState(false);

    function flipTheme() {
      const root = document.documentElement;
      if (themed) {
        root.style.removeProperty("--graph-branch-1");
      } else {
        root.style.setProperty("--graph-branch-1", "hsl(0 100% 50%)");
      }
      setThemed(!themed);
    }

    return (
      <main className="mx-auto max-w-3xl px-6 py-12 space-y-12">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Gutter — fixture gallery</h1>
          <button
            type="button"
            data-testid="theme-flip"
            onClick={flipTheme}
            className="rounded-md border px-3 py-1 text-sm"
          >
            {themed ? "Reset theme" : "Flip --graph-branch-1 to red"}
          </button>
        </header>

        {FIXTURES.map((fixture) => {
          const layout = computeLayout(fixture.commits);
          return (
            <section
              key={fixture.name}
              data-testid={`fixture-${fixture.name}`}
              className="space-y-2"
            >
              <h2 className="text-lg font-semibold">{fixture.name}</h2>
              <GitGraphGutter layout={layout} className="bg-background" />
            </section>
          );
        })}
      </main>
    );
  }
  ```
- **PATTERN**: `"use client"` because we use `useState` for the theme-flip button. Imports use the `@/*` alias for synced registry files (resolves to `examples/consumer-app/components/git-graph/...`); fixtures imported via relative path because they live outside the consumer-app's tsconfig include but inside the workspace.
- **GOTCHA**: The relative path to fixtures is `../../../../tests/unit/fixtures` — four `..` segments from `examples/consumer-app/app/gutter/page.tsx` to repo root, then down. Count: `gutter/` → `app/` → `consumer-app/` → `examples/` → repo root. That's four `..`. Verify before saving.
- **GOTCHA**: Importing `tests/unit/fixtures` from inside the consumer-app means Next will compile fixture files. The fixtures import types from `../../../registry/git-graph/types`; that path resolves to the original registry dir, not the synced consumer copy. This is fine — types are erased at runtime — but it does mean two source-of-truth paths point at the same types. Keep it; consolidating would require Phase 5's full install flow.
- **GOTCHA**: `flipTheme` toggles the `--graph-branch-1` variable. Removing the inline override (when `themed` is `true`) restores the value declared in `:root` (via `git-graph.css`). The button label flips accordingly so the Playwright theming spec can assert on text content if needed.
- **VALIDATE**: `pnpm --filter consumer-app typecheck` exits 0 (after sync runs via pretypecheck). `pnpm --filter consumer-app dev -p 3100` boots; visit `http://localhost:3100/gutter` in a browser — six labelled sections each render an SVG with circles and curves. (Manual smoke; not a CI check.)

### 15. CREATE `tests/e2e/gutter-screenshots.spec.ts`

- **IMPLEMENT**:
  ```ts
  import { expect, test } from "@playwright/test";

  const FIXTURES = [
    "linear",
    "feature-branch",
    "merge",
    "octopus",
    "orphan",
    "long-lived-release",
  ] as const;

  test.describe("gutter screenshots", () => {
    test.skip(
      ({ browserName }) => browserName !== "chromium",
      "Screenshot baselines committed for chromium only — interaction tests cover other browsers.",
    );
    test.skip(
      () => process.platform !== "linux",
      "Screenshot baselines committed on Linux (matches CI). Run via Playwright Docker image locally to verify on Windows/macOS.",
    );

    for (const name of FIXTURES) {
      test(`fixture ${name} matches baseline`, async ({ page }) => {
        await page.goto("/gutter");
        const section = page.getByTestId(`fixture-${name}`);
        await expect(section).toBeVisible();
        await expect(section).toHaveScreenshot(`gutter-${name}.png`, {
          maxDiffPixelRatio: 0.005,
        });
      });
    }
  });

  test.describe("gutter geometry", () => {
    test.skip(
      ({ browserName }) => browserName !== "chromium",
      "DOM assertion runs on chromium only; cross-browser DOM equivalence is not in scope.",
    );

    test("node centers align with rowIndex × rowHeight + rowHeight/2", async ({ page }) => {
      await page.goto("/gutter");
      const section = page.getByTestId("fixture-long-lived-release");
      const circles = section.locator("circle[data-sha]");
      const count = await circles.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const c = circles.nth(i);
        const cy = await c.getAttribute("cy");
        const rowIndex = await c.getAttribute("data-row-index");
        expect(cy, `node ${i} cy`).not.toBeNull();
        expect(rowIndex, `node ${i} data-row-index`).not.toBeNull();
        const expected = Number(rowIndex) * 40 + 20;
        expect(Number(cy), `node ${i} (rowIndex=${rowIndex})`).toBe(expected);
      }
    });
  });
  ```
- **PATTERN**: Mirrors `tests/e2e/smoke.spec.ts` style. `test.skip(condition, reason)` keeps the test list visible across all browsers in reports while only running the assertion on Chromium.
- **GOTCHA**: `maxDiffPixelRatio: 0.005` is permissive enough for AA differences between local Windows runs and Linux CI but tight enough to catch real visual regressions. If CI starts flaking, raise to `0.01`; do NOT raise further without investigating.
- **GOTCHA**: The geometry assertion uses `40` (rowHeight default) and `20` (rowHeight/2). If a future phase changes the default, update this constant — there's no DRY way to share without leaking impl into tests.
- **VALIDATE**: `pnpm test:e2e --project=chromium --update-snapshots` generates baselines under `tests/e2e/gutter-screenshots.spec.ts-snapshots/`. Re-run without `--update-snapshots` — exits 0.

### 15a. UPDATE `playwright.config.ts` to lock light color scheme

- **IMPLEMENT**: In the `use:` block (currently lines 9–12), add `colorScheme: "light"`:
  ```ts
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    colorScheme: "light",
  },
  ```
- **PURPOSE**: Without this, a dev machine in dark-mode would render `--graph-branch-1` from the `@media (prefers-color-scheme: dark)` block and produce different baseline pixels than CI's headless Chromium (which defaults to light). Locking light makes the CSS dark-mode block dead code from Playwright's perspective and eliminates one source of cross-environment drift.
- **GOTCHA**: `colorScheme` belongs in `use:`, not as a top-level option. Per [Playwright docs § color scheme](https://playwright.dev/docs/api/class-testoptions#test-options-color-scheme).
- **VALIDATE**: `pnpm test:e2e --project=chromium tests/e2e/smoke.spec.ts` still passes (regression check on the existing test).

### 16. CREATE `tests/e2e/gutter-theming.spec.ts`

- **IMPLEMENT**:
  ```ts
  import { expect, test } from "@playwright/test";

  test("theme-flip changes lane-1 color across all browsers", async ({ page }) => {
    await page.goto("/gutter");

    const lane1Path = page
      .getByTestId("fixture-feature-branch")
      .locator("path[data-edge-kind='straight'], path[data-edge-kind='fork']")
      .first();

    await expect(lane1Path).toBeVisible();
    const before = await lane1Path.evaluate((el) => getComputedStyle(el).stroke);

    await page.getByTestId("theme-flip").click();

    const after = await lane1Path.evaluate((el) => getComputedStyle(el).stroke);

    expect(after, "stroke color should change after theme flip").not.toBe(before);
  });
  ```
- **PATTERN**: Cross-browser theming assertion via computed style — independent of pixel rendering, so it runs on all 3 projects (chromium/firefox/webkit) without baselines.
- **GOTCHA**: `getComputedStyle(el).stroke` returns `rgb(...)` regardless of the input format (`hsl(...)`, `var(...)`). All three browsers normalize identically for this purpose.
- **GOTCHA**: We don't assert on a specific RGB value because browser color-space normalization differs by sub-percent; we only assert that the value changed.
- **VALIDATE**: `pnpm test:e2e tests/e2e/gutter-theming.spec.ts` — 3 tests pass (one per browser).

### 17. GENERATE Linux screenshot baselines via Playwright Docker image

Baselines must be Linux-rendered to match CI exactly. Generate them inside the official Playwright Docker image, which ships the same browser binary CI uses.

- **IMPLEMENT** (from repo root):
  ```bash
  docker run --rm --ipc=host \
    -v "$PWD":/work -w /work \
    -e CI=true \
    mcr.microsoft.com/playwright:v1.49.1-jammy \
    bash -lc "corepack enable && pnpm install --frozen-lockfile && pnpm test:e2e --project=chromium --update-snapshots gutter-screenshots.spec.ts"
  ```
  Windows note: replace `"$PWD"` with `"%cd%"` (cmd) or `${PWD}` (PowerShell). PowerShell on Windows passes the host path through Docker Desktop's volume mount transparently for `D:\repos\GitGraph`.
- **PATTERN**: Image tag `v1.49.1-jammy` matches the `@playwright/test` version pinned in `package.json` — bumping one without the other will silently regenerate baselines against a different browser binary and you'll discover the mismatch on next CI run.
- **GOTCHA**: First run pulls the image (~2GB); subsequent runs are fast. CI uses the same image, so its first run is also a pull — already amortized into the existing Phase 1 CI cache strategy.
- **GOTCHA**: Don't run this inside WSL2 if Docker Desktop is the underlying daemon — the `-v "$PWD":/work` mount works either way, but path mapping through WSL2 → Docker Desktop adds a layer that can produce subtly different pixel output. Run from native PowerShell or cmd if Docker Desktop is your daemon.
- **GOTCHA**: This task ONLY regenerates screenshot baselines. Other tests (layout, bezier, theming, geometry) don't have baselines to regenerate. Do not pass `--update-snapshots` to other test files.
- **VALIDATE**: After the command exits 0:
  - `git status` shows new PNG files under `tests/e2e/gutter-screenshots.spec.ts-snapshots/`.
  - File count: 6 PNGs (one per fixture).
  - Visual inspection: open one (e.g. `gutter-feature-branch-chromium-linux.png`) — should show curves + nodes against a light background.
- **IF FAILED**: If the command fails before generating baselines, the most likely cause is the consumer app's webServer failing to boot inside Docker. Check Docker has enough memory (Docker Desktop default is often 2GB; bump to 4GB), and that the `examples/consumer-app/components/git-graph/` dir was synced before `pnpm test:e2e` ran (it should be, via the root `prepare` hook fired by `pnpm install --frozen-lockfile`).

### 17b. RUN full validation suite locally

- **IMPLEMENT**:
  ```bash
  pnpm install --frozen-lockfile
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm test:e2e
  ```
- **VALIDATE**: All five exit 0. Expected counts:
  - `pnpm test`: 19 tests (13 layout + 6 bezier).
  - `pnpm test:e2e`:
    - Smoke spec: 3 browsers × 1 = 3 tests, all run.
    - Screenshot spec: 3 browsers × 6 fixtures = 18 tests; on Linux all 6 chromium tests run, 12 skip; on Windows/macOS all 18 skip with the platform-skip reason. **A skip is not a failure.**
    - Geometry spec: 3 browsers × 1 = 3 tests; chromium runs, others skip.
    - Theming spec: 3 browsers × 1 = 3 tests, all run.
- **GOTCHA**: If you're on Windows/macOS, the screenshot spec will be entirely skipped — that's expected and CI will run them on Linux. If you want to verify screenshots locally, re-run task 17's Docker command without `--update-snapshots` and the actual comparison runs.
- **GOTCHA**: If a screenshot test fails on CI after a CSS tweak, regenerate baselines via task 17 (Docker), commit the new PNGs, and push. Do NOT raise `maxDiffPixelRatio` to mask drift.

### 18. COMMIT

- **IMPLEMENT**:
  ```bash
  git add registry/ tests/ examples/consumer-app/app/gutter/ examples/consumer-app/app/globals.css examples/consumer-app/package.json scripts/ package.json .gitignore playwright.config.ts
  git status      # confirm: synced consumer-app/components/git-graph/ NOT in the diff (gitignored); screenshot PNGs ARE in the diff
  git commit -m "$(cat <<'EOF'
  Phase 3: gutter primitive — bezier, SVG component, CSS theming, sync, e2e

  - Extend EdgeKind with 'fork' (cross-lane primary); update 4 fixtures
  - registry/git-graph/lib/bezier.ts — pure path-string generator
  - registry/git-graph/git-graph-gutter.tsx — SVG-only React primitive
  - registry/git-graph/git-graph.css — --graph-branch-1..8 + dark mode
  - scripts/sync-registry.mjs — copy registry into consumer app
  - examples/consumer-app /gutter route renders all 6 fixtures
  - Playwright: chromium screenshot baselines + geometry assertion
  - Playwright: cross-browser theming spec (CSS var flip)
  EOF
  )"
  ```
- **GOTCHA**: Do NOT `git add -A`. Stage specific paths so local junk (`.claude/`, editor state, the gitignored synced dir) stays out.
- **GOTCHA**: First-time commit of screenshot baselines: PNG bytes go into git. Confirm `git diff --stat HEAD~1 HEAD` shows the PNG additions — they're load-bearing for CI's screenshot comparison.
- **VALIDATE**: `git log -1 --stat` shows expected files; no synced consumer-app files leaked.

### 19. CONFIRM before pushing branch

- **IMPLEMENT**: Pause and ask the user to approve the branch push. Show `git log --oneline main..HEAD` and `git diff --stat main..HEAD` before the ask.
- **ON APPROVAL**: `git push -u origin phase-3-gutter-primitive`
- **VALIDATE**: `gh run list --branch phase-3-gutter-primitive --limit 1` shows the CI workflow queued or running.

### 20. CONFIRM before opening PR

- **IMPLEMENT**: Pause and ask the user to approve opening the PR.
- **ON APPROVAL**:
  ```bash
  gh pr create --title "Phase 3: gutter primitive" --body "$(cat <<'EOF'
  ## Summary
  - `<GitGraphGutter>` SVG primitive, themeable via `--graph-branch-1..8`
  - `bezier.ts` pure path-string helper, hand-authored unit tests
  - `EdgeKind` gains `'fork'` for cross-lane primary edges; 4 fixtures updated
  - `scripts/sync-registry.mjs` copies registry into consumer app (foreshadows shadcn CLI install)
  - `/gutter` route renders all 6 fixtures; Chromium screenshot baselines committed
  - Cross-browser theming spec asserts CSS-var changes propagate

  ## Deferred
  - Headline `<GitGraph>` table → Phase 4
  - Virtualization, animation, real shadcn CLI install → Phase 5
  - `fromGitLog()` helper + real-repo fixtures → Phase 2.5

  ## Test plan
  - [ ] `pnpm lint` green
  - [ ] `pnpm typecheck` green
  - [ ] `pnpm test` — 19 tests pass (13 layout + 6 bezier)
  - [ ] `pnpm test:e2e` — screenshots match baseline; theming spec passes on all 3 browsers
  EOF
  )"
  ```
- **VALIDATE**: PR URL returned; `gh pr checks` shows CI jobs running or green.

### 21. CONFIRM before merging

- **IMPLEMENT**: Wait for all CI jobs green. Pause and ask the user to approve the merge.
- **ON APPROVAL**: `gh pr merge --squash --delete-branch`
- **VALIDATE**:
  - `git checkout main && git pull --ff-only` shows the new squash commit on `main`.
  - `pnpm install --frozen-lockfile && pnpm test && pnpm test:e2e --project=chromium` all green on `main`.

### 22. CONFIRM post-merge artifact commit on `main`

- **IMPLEMENT**: Per `CLAUDE.md` "Artifact-commit cadence." Pause and ask the user to approve. On approval, on `main`:
  ```bash
  git add .agents/plans/phase-3-gutter-primitive.md .agents/code-reviews/ .agents/system-reviews/ .agents/execution-reports/
  git status      # confirm only .agents/ files staged
  git commit -m "Add Phase 3 plan + execution + review artifacts"
  git push origin main
  ```
- **GOTCHA**: This commit lands directly on `main` (artifact-commit cadence is documented in `CLAUDE.md`). Don't bundle into the implementation PR.
- **VALIDATE**: `git log -1 --stat` on `main` shows only files under `.agents/`.

---

## TESTING STRATEGY

### Unit Tests (Vitest)

- **`tests/unit/bezier.test.ts`** — 6 tests. Three kind-specific path-string assertions (straight, fork, merge), three invariants (determinism, custom opts, `DEFAULT_BEZIER_OPTS` lock).
- **`tests/unit/layout.test.ts`** — unchanged in count (13). The four fixture updates flow through the existing equality tests; if any extra fixture got it wrong, the equality test for that fixture fails with a precise diff.

### Integration / E2E Tests (Playwright)

- **`tests/e2e/smoke.spec.ts`** — existing, untouched.
- **`tests/e2e/gutter-screenshots.spec.ts`** — Chromium-only screenshot regression (6 fixtures × 1 browser), plus 1 geometry assertion (Chromium-only).
- **`tests/e2e/gutter-theming.spec.ts`** — all 3 browsers (chromium/firefox/webkit), one assertion: CSS-var flip changes computed stroke color.

### Edge Cases Covered

- All 6 Phase 2 layout shapes (linear, feature-branch, merge, octopus, orphan, long-lived-release) render without crashing or visual error.
- Cross-lane primary edges classified as `'fork'` (4 fixtures × at least one fork edge each except linear and orphan).
- Empty `LayoutResult` (`rows.length === 0` → `<svg width=0 height=0 />`). Not exercised in fixtures but specified in component code; if a Phase 4 review wants explicit coverage, add a Vitest+jsdom test then.
- Theme propagation: CSS-var override at runtime affects rendered stroke color. Cross-browser.

### Edge Cases Explicitly Deferred

- Malformed `LayoutResult` (negative lanes, out-of-range row indices) — error-handling code is in the component, but no test forces the path. The first test that does belongs in Phase 5's `errors.spec.ts` per PRD §12.
- Pixel-perfect node-baseline alignment with metadata rows — Phase 4 concern (no metadata column exists yet).
- Animation behavior — Phase 5.
- Virtualization-driven SVG culling — Phase 5.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style
```bash
pnpm -r --parallel lint
pnpm typecheck
```

### Level 2: Unit Tests
```bash
pnpm test
```
Expect: 19 passed (13 layout + 6 bezier). Zero failures, zero skipped.

### Level 3: Integration / E2E Tests
```bash
pnpm test:e2e
```
Expect: smoke (3 browsers) + screenshots (chromium only, others skipped with reason) + geometry (chromium only) + theming (3 browsers). All green.

### Level 4: Manual Validation
```bash
pnpm install        # triggers prepare → sync
pnpm --filter consumer-app dev -p 3100
# Open http://localhost:3100/gutter — six labelled sections, each rendering nodes + curves
# Click "Flip --graph-branch-1 to red" — first-lane edges and root node turn red, button label updates
```

### Level 5: Post-merge Validation
```bash
git checkout main
git pull --ff-only
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e
```
Expect: all green on `main` post-merge. (E2E webServer auto-spawns the consumer app via `playwright.config.ts`.)

---

## ACCEPTANCE CRITERIA

- [ ] `EdgeKind` is `'straight' | 'fork' | 'merge'`; `computeLayout` classifies primary edges as `'fork'` when `fromLane !== toLane`.
- [ ] Four fixture files updated; `linear.ts` and `orphan.ts` unchanged.
- [ ] `registry/git-graph/lib/bezier.ts` exports `edgePath`, `centerX`, `centerY`, `DEFAULT_BEZIER_OPTS`, and `BezierOpts` (type).
- [ ] `registry/git-graph/git-graph-gutter.tsx` exports a default function component named `GitGraphGutter` accepting `GitGraphGutterProps`.
- [ ] `registry/git-graph/git-graph.css` exists; defines 8 lane colors + 4 geometry vars + dark-mode block.
- [ ] `scripts/sync-registry.mjs` exists; copies all `.ts`/`.tsx`/`.css` from `registry/git-graph/` into `examples/consumer-app/components/git-graph/`, preserving structure; skips `tsconfig.json`, `*.test.ts`, `.gitkeep`.
- [ ] Root `package.json` has `prepare` and `sync` scripts.
- [ ] Consumer-app `package.json` has `predev`, `prebuild`, `pretypecheck`, `prelint` hooks running the sync script.
- [ ] `.gitignore` excludes `examples/consumer-app/components/git-graph/`.
- [ ] Consumer-app `globals.css` imports `../components/git-graph/git-graph.css`.
- [ ] `/gutter` route renders six fixtures with `data-testid="fixture-{name}"` wrappers and a `data-testid="theme-flip"` button.
- [ ] Bezier unit tests: 6 passing.
- [ ] Layout unit tests still 13 passing after fixture updates.
- [ ] Playwright screenshot baselines committed (Chromium-only) for all six fixtures; tests pass against committed baselines.
- [ ] Playwright theming spec passes on chromium, firefox, webkit.
- [ ] Playwright geometry spec passes on chromium.
- [ ] No new runtime dependencies added to any `package.json`.
- [ ] `playwright.config.ts` sets `use.colorScheme: 'light'`.
- [ ] Screenshot baselines generated inside the Playwright Docker image (Linux); 6 PNGs committed.
- [ ] Build-chain smoke (task 12a) passed before consumer app started importing graph code.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` all exit 0 locally (screenshots skip on Windows/macOS — that's expected, not a failure).
- [ ] CI green on the PR.
- [ ] Post-merge `.agents/` artifact commit lands on `main`.

---

## COMPLETION CHECKLIST

- [ ] All 24 tasks completed in order (1–22 plus inserted 12a, 15a, 17b).
- [ ] Each task's VALIDATE step passed immediately.
- [ ] All Level 1–5 validation commands pass.
- [ ] Hand-traced bezier expected paths match implementation output on first run.
- [ ] No Phase 4 concerns (metadata column, row hover/select, pixel-baseline) leaked into Phase 3.
- [ ] No Phase 5 concerns (virtualization, animation, real CLI install) leaked into Phase 3.
- [ ] PR open → all CI jobs green → merged.
- [ ] Post-merge artifact commit on `main` per `CLAUDE.md` cadence.

---

## NOTES

### Design decisions locked this phase

- **`EdgeKind` extended at the layout boundary, not at the renderer.** `computeLayout` owns geometric classification; the renderer is purely presentational. Alternative considered: derive kind from `fromLane !== toLane` inside the gutter. Rejected because that splits "what kind of edge is this" between two modules and breaks the Phase 2 invariant that `LayoutResult` is the complete contract.
- **Bezier formula is fixed (control points at row-pair midpoint, vertical tangents at endpoints).** No `tension` prop. PRD §7.4 requires "vertical tangents at nodes" and "graceful S degradation"; the symmetric mid-y form satisfies both. Tension can land in Phase 4 if a review surfaces specific cases the symmetric form handles poorly.
- **Edge color = `fromLane` for straight/fork, `toLane` for merge.** Each branch's color tracks its own lane consistently down the history. Fork: branch tip ends, retains its lane's color into the merge point. Merge: incoming branch contributes its color from the parent's lane.
- **8-color palette indexed `lane % 8`.** PRD-specified count. Tasteful, distinguishable hues at 65–80% saturation; brighter in dark mode.
- **Sync script over relative imports.** Foreshadows the Phase 5 shadcn CLI install. Cost: gitignored output dir + a `prepare` hook + four consumer `pre*` hooks. Benefit: the consumer app's import paths (`@/components/git-graph/...`) match what real shadcn-installed code looks like, so Phase 5 can replace the sync without touching `gutter/page.tsx`.
- **Screenshot baselines are Chromium-only.** Font-rendering and AA differences across browsers would blow up the baseline count and CI flakiness. Theming spec covers cross-browser without needing pixel exactness.
- **`'use client'` on `/gutter/page.tsx` only because of `useState` for the theme flip.** The gutter component itself is server-renderable.
- **Error handling specified up front per system review.** Empty rows → empty SVG (legitimate). Out-of-range edge → throw in dev, skip in prod. Negative lane → always throw.

### Deferred / backlog

- **`<GitGraph.Detail>` slot, hover/select interactions** — Phase 4.
- **Virtualization, append animation, `prefers-reduced-motion`** — Phase 5.
- **`errors.spec.ts`** with malformed `LayoutResult` cases — Phase 5 per PRD §12.
- **Real shadcn CLI install (`npx shadcn@latest add`) replacing the sync script** — Phase 5.
- **`fromGitLog()` helper + real-repo fixtures** — Phase 2.5.
- **`@theme` exposure of `--graph-branch-*` for Tailwind utility usage** — Phase 4 if the headline table needs `text-[--graph-branch-1]`-style usage.
- **Animated lane transitions on data change** — Phase 5.
- **A11y review of the SVG primitive** — Phase 4 alongside the headline table where ARIA labels become meaningful.

### Confidence score

**10/10** for one-pass execution. Each of the three Phase-3-specific risks above the Phase-2 baseline has a dedicated mitigation:

| Risk | Mitigation in this plan |
|------|------------------------|
| Bezier number formatting drift (e.g. `0.1+0.2` floating-point cruft) | All test fixtures use integer arithmetic only (default opts 16/40 produce integer outputs; the custom-opts case uses 20/30 which also produces integers). `Number.prototype.toString` is exact for IEEE-754-representable values, which all halves-of-integers are. No `toFixed` anywhere. |
| Sync + gitignore + `@import` build chain | Dedicated build-chain smoke task (12a) runs `pnpm install` and `pnpm typecheck` against the chain *before* the consumer app starts importing graph code. Catches all four failure modes (sync path, hook order, ignore precedence, CSS resolution) at the moment they could go wrong, not three tasks later through a Next page-level error. |
| Screenshot baseline drift between Windows-local and Linux-CI | Baselines generated inside `mcr.microsoft.com/playwright:v1.49.1-jammy` (task 17), pinned to the same image tag CI uses. Screenshot spec auto-skips on non-Linux platforms (`process.platform !== "linux"`), so local Windows `pnpm test:e2e` runs are not a source of false drift signals. `maxDiffPixelRatio: 0.005` covers any residual sub-pixel noise within the same OS. |
| OS-level dark-mode preference flipping baseline pixels | `playwright.config.ts` locks `colorScheme: 'light'` (task 15a). The CSS `@media (prefers-color-scheme: dark)` block becomes dead code from Playwright's perspective. |

Hand-trace verified:
- The four fork-fixture updates (feature-branch, merge, octopus×2, long-lived-release) exhaust all cross-lane primary edges in Phase 2's six fixtures.
- Bezier expected paths for default opts: `M 8 20 L 8 60` (straight), `M 24 140 C 24 160 8 160 8 180` (fork), `M 8 20 C 8 40 24 40 24 60` (merge). Reproducible by hand from `centerX(L)=16L+8` / `centerY(R)=40R+20` / `cy = (y1+y2)/2`.
- Custom-opts bezier expected: laneWidth=20, rowHeight=30 → `centerX(0)=10`, `centerY(0)=15`, `centerY(1)=45` → `M 10 15 L 10 45`. ✓

Remaining residual risk is mechanical (typos, off-by-one in hand-traced values, a missed file in `git add`) — all caught by Vitest's character-precise diff output or `git status` inspection at the commit gate.
