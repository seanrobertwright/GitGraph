# Feature: Phase 6B — Headless filter predicate

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Phase 6B adds a `filter?: (commit: Commit) => boolean` predicate prop to `<GitGraph>` and threads it into `computeLayout` as a new optional second-argument option. When supplied, the layout engine produces a `LayoutResult` over only the commits for which `filter` returns `true`, with edges **rewritten transitively**: if a visible commit `A` had a filtered ancestor `B` whose nearest-visible ancestor is `C`, the resulting layout emits edge `A → C` directly. This preserves DAG topology under filtering — the visible graph is connected wherever the underlying graph is.

This phase ships **no UI**. The built-in filter bar (branch chips, author multi-select, text search) lives in Phase 6C, layered on top of this headless primitive.

## User Story

As a product developer using `<GitGraph>`,
I want to pass a predicate that hides commits I don't care about (e.g. only `main`-branch ancestry, only commits by a given author, only commits matching a search string),
So that the visible graph stays connected through hidden ancestors and I can build my own filter UI without re-implementing lane assignment.

## Problem Statement

`computeLayout` today accepts the full commit set and produces a layout over all of it. Consumers who want to filter currently have two options, both bad:

1. **Pre-filter the `Commit[]` themselves before passing it in.** Edges to filtered-out commits become "out-of-window" and are dropped — visually disconnecting branches above and below a filtered commit. Filtering "only commits by Alice" produces a graph where any chain `Alice → Bob → Alice` shows two unconnected Alice subgraphs.
2. **Wrap their consumer in pre-filter logic that walks the DAG to rebuild edges.** This is exactly what the layout engine already does internally — duplicating lane logic in user-space.

The PRD calls this out: *"edges skip over [filtered commits] where parents are still visible."* That requires transitive parent-chain walking, which only the layout engine has the topology to do correctly.

## Solution Statement

- Extend `computeLayout(commits)` to `computeLayout(commits, options?: { filter?: (c: Commit) => boolean })`. Existing zero-arg call sites are unaffected (optional parameter, default behavior identical to today).
- Implement filtering as a **parent-rewriting pre-pass** that runs after duplicate/cycle validation but before topo sort + lane assignment:
  1. Build `bySha` over the full input. Validate (duplicate-sha, cycle) on the **unfiltered** set — input integrity is independent of view.
  2. Compute `visibleShas = new Set(commits.filter(filter).map(c => c.sha))`.
  3. For each visible commit `C`, rewrite `C.parents[]` to the *nearest-visible-ancestor* list reached by walking through filtered-out commits. BFS through the filtered-out chain, deduping the result while preserving original parent order. Out-of-window (unknown) parents continue to be silently ignored, exactly as today (`layout.ts:60-72`).
  4. Run the existing topo-sort + lane-assignment over the visible-rewritten commit set. No core algorithm change.
- Add `filter` to `<GitGraph>` props. `useLayoutOrError` passes it into `computeLayout`'s options. The synthesized working-tree commit (when `showWorkingTreeRow` is true) IS subject to the filter — consumers who want it always visible should write `(c) => c.sha === WORKING_TREE_SHA || keep(c)`. Document this behavior in the recipe.
- **Selection survives filter changes.** When `selectedSha` points at a commit that gets filtered out, the row is absent from the layout (no `data-selected` attribute renders, no `aria-activedescendant` set), but `<GitGraphDetail>` still receives the remembered commit by looking up the sha against the **unfiltered** input. This requires a small change in `useGitGraphState` — replace the `selectedRow?.commit` lookup feeding `<GitGraphDetail>` with a `selectedCommit` value that falls back to the original `props.commits` (and to the synthesized working-tree commit) when the layout doesn't contain the selected sha.
- **No new prop on `<GitGraphGutter>`.** The PRD wording was imprecise: the gutter consumes a pre-computed `LayoutResult` and has no `Commit[]` to apply a predicate to. Filtering happens inside `computeLayout`; the gutter renders whatever layout it gets, filtered or not. Consumers calling `computeLayout` headlessly get the same filter capability via `options.filter`.
- New unit tests cover the parent-rewriting behavior across all six existing fixtures using **property-based assertions** (not hand-authored expected layouts — see §Hand-trace below for why) plus a small set of explicit "skip-over" cases on the feature-branch fixture. New E2E spec exercises consumer-supplied filter on the harness page. New recipe page documents the prop.

## Feature Metadata

**Feature Type**: New Capability (additive — no breaking changes to Phase 1–5–6A API; `computeLayout`'s new options arg is optional)
**Estimated Complexity**: Medium — single algorithm extension localized to `lib/layout.ts`, single new prop on `<GitGraph>`, plus the selection-survival tweak in `useGitGraphState`. The transitive parent-rewriting algorithm is the only non-trivial new logic.
**Primary Systems Affected**:
- `registry/git-graph/lib/layout.ts` — extend `computeLayout` signature, add parent-rewriting pre-pass
- `registry/git-graph/git-graph.tsx` — add `filter` prop to `GitGraphProps`; thread through `useLayoutOrError`; replace `selectedRow?.commit` for the drawer with `selectedCommit` (filter-survival lookup)
- `registry/git-graph/types.ts` — no new exports; the filter signature is inline on `GitGraphProps` and on `computeLayout`'s options
- `tests/unit/layout-filter.test.ts` — NEW (kept separate from `layout.test.ts` for clarity; same fixture imports)
- `examples/consumer-app/app/graph/filter/page.tsx` — NEW harness with three filter modes (none, branch, author)
- `apps/docs/app/docs/recipes/filtering/page.tsx` — NEW recipe page
- `apps/docs/app/docs/recipes/page.tsx` — add card linking to the new recipe
- `apps/docs/app/docs/api/page.tsx` — add `filter` prop row
- `tests/e2e/graph-filter.spec.ts` — NEW spec
- No registry-manifest change (`lib/layout.ts` already listed in `registry/git-graph/registry.json:13`)
- No new npm or shadcn-registry dependencies

**Dependencies**: None. All work is in pure TypeScript on existing modules.

---

## Manual Steps Required

None. No `gh` CLI side effects, no GitHub Pages reconfiguration, no shadcn CLI invocations, no third-party network requests during execution.

The post-merge artifact-commit on `main` (the plan file itself, plus `.agents/code-reviews/`, `.agents/execution-reports/`) is the standard cadence — not a manual step in the sense of the audit checklist.

---

## Inherited findings

From `.agents/code-reviews/phase-6a-detail-drawer.md` (when written): no carry-forwards expected — Phase 6A's drawer is independent of layout-engine work.

Process carry-forwards still in force from CLAUDE.md and prior phases:

- **Pre-PR scope check is a `CONFIRM` task.** See §"CONFIRM pre-PR scope" near the bottom.
- **Untracked-file hygiene at branch-cut.** Sweep-in protection for `.kilocode/`, `.pi/`, `.qoder/`, `skills-lock.json`, etc. — already gitignored or tracked. No expected new untracked files this phase.
- **Playwright SVG visibility.** Relevant: the new E2E will assert that filtered-out rows are absent and surviving rows are present. Use `data-sha` attribute presence/absence (`page.locator('[data-sha="x"]').count()`), NOT visibility. Edge-presence assertions on SVG `<path>`/`<line>` use `toHaveAttribute("d", /.+/)` or `toHaveCount(...)`, not `toBeVisible()`.
- **Two-pass typecheck.** `pnpm typecheck` runs per-workspace then root over `registry/**` + `tests/**`. Layout changes must satisfy both; the new test file under `tests/unit/` is in the root pass.
- **`exactOptionalPropertyTypes`.** `filter?: ...` on props means consumers can pass `undefined` only if the prop type explicitly includes `| undefined`. We follow the existing convention (`onCommitClick?: ...` etc.) — `filter?: (commit: Commit) => boolean` without `| undefined` is correct; consumers omit the prop or pass a function, never an explicit `undefined`.

---

## External-System Assumption Audit

- **No new npm dependencies.** The change is pure TypeScript on existing modules; `pnpm install` is not required after the source edits.
- **No new shadcn registry dependencies.** `registry/git-graph/registry.json`'s `registryDependencies` array stays at `["sheet"]` (added in 6A).
- **No `gh` CLI side effects** beyond the standard branch push + PR create at the end (both `CONFIRM` tasks).
- **No GitHub Actions workflow changes.** CI matrix runs Vitest + Playwright on every PR (`.github/workflows/ci.yml`); the new spec auto-picks up via Playwright's existing `tests/e2e/**/*.spec.ts` glob (verified — see `playwright.config.ts`).
- **Auto-generated files.** None; no Next.js or Tailwind first-run mutations are triggered by this phase.
- **Native-binding pins.** Tailwind v4 native pins (`@tailwindcss/oxide`, `@tailwindcss/node`) remain unchanged in `package.json`'s `pnpm.overrides`. No new ecosystems involved.
- **`scripts/sync-registry.mjs` auto-pickup.** No new files in `registry/git-graph/`; the sync is an unchanged byte-copy of the existing files. Verified by inspection of `scripts/sync-registry.mjs`.
- **Cross-OS validation recipes.** Local validation uses `pnpm` scripts only — no Docker, no shell-specific syntax. PowerShell and bash hosts both work.
- **The PRD wording "predicate prop on `<GitGraph>` and `<GitGraphGutter>`" is intentionally departed from** — see §Solution Statement. The departure is a deliberate design call confirmed with the user during planning (answer 2c). Recorded here so a future audit doesn't flag the gutter prop as missing.

---

## Plan Self-Consistency — Key Identifiers

| Identifier | Canonical form | Used in |
|---|---|---|
| Branch name | `phase-6b-filter-prop` | git ops, PR title |
| Plan file | `.agents/plans/phase-6b-filter-prop.md` | this file |
| Prop name on `<GitGraph>` | `filter` | git-graph.tsx, types section, docs api page, harness, recipe, plan body |
| Prop signature | `(commit: Commit) => boolean` | git-graph.tsx, recipe, docs api page, plan body |
| `computeLayout` options arg | `options?: { filter?: (c: Commit) => boolean }` | layout.ts, layout-filter.test.ts, plan body |
| Selected-commit fallback name | `selectedCommit` | git-graph.tsx state object, plan body |
| New harness route | `/graph/filter` | E2E spec, harness page, plan body |
| New harness page | `examples/consumer-app/app/graph/filter/page.tsx` | plan body |
| New recipe URL | `/docs/recipes/filtering` | recipes index card, recipe page, plan body |
| New recipe page | `apps/docs/app/docs/recipes/filtering/page.tsx` | plan body |
| New unit test file | `tests/unit/layout-filter.test.ts` | plan body, validation commands |
| New E2E spec | `tests/e2e/graph-filter.spec.ts` | playwright auto-pickup, plan body |
| Working-tree synthesized sha | `WORKING_TREE_SHA` (imported from `lib/working-tree`) | git-graph.tsx, recipe, plan body |
| Test data attribute for rows | `data-sha` | E2E spec, harness, plan body |

Pre-emit grep verified across the plan draft — no divergent usages.

---

## Hand-trace of fixture under filter (algorithm sanity check)

The plan deliberately does NOT colocate full expected-`LayoutResult` objects for filter cases — the existing `layout.test.ts` `cases` table uses fixture+expected pairs because the unfiltered output is small and stable, but every additional `(fixture × filter)` combination doubles the maintenance surface. Instead, `layout-filter.test.ts` uses **property-based assertions** ("every visible commit appears exactly once", "no row references a filtered-out sha", "every edge endpoint is a visible sha", "edge from A to C exists when A→B→C and only B is filtered") plus one explicit row-count + edge-count check per case.

Hand-trace of `featureBranchFixture` with `filter = (c) => c.sha !== "f1"`:

- Input: `m1`, `f1`, `m2`, `f2`, `m3` with parents `[]`, `[m1]`, `[m1]`, `[f1]`, `[m2, f2]` respectively.
- Visible: `m1`, `m2`, `f2`, `m3`.
- Parent rewriting (BFS through filtered ancestors):
  - `m3.parents` `[m2, f2]` → both visible → unchanged `[m2, f2]`.
  - `f2.parents` `[f1]` → `f1` filtered, `f1.parents = [m1]`, `m1` visible → rewritten `[m1]`.
  - `m2.parents` `[m1]` → unchanged.
  - `m1.parents` `[]` → unchanged.
- Toposort (newest-first by timestamp): `m3` (4000), `f2` (3000), `m2` (2500), `m1` (1000).
- Lane assignment (existing algorithm):
  - Row 0 `m3`: claims lane 0; primary `m2` → `lanes[0]=m2`; secondary `f2` → claim lane 1, `lanes[1]=f2`.
  - Row 1 `f2`: lane 1 expects it (target lane 1); primary (rewritten) `m1` → `lanes[1]=m1`.
  - Row 2 `m2`: lane 0 expects it; primary `m1` → `lanes[0]=m1`.
  - Row 3 `m1`: lanes 0 and 1 both expect it; target lane 0 (first match), clear both.
- Final edges:
  - `m3→m2` straight (same lane 0)
  - `m3→f2` merge
  - `f2→m1` fork (lane 1 → lane 0; was `straight` pre-classification, becomes `fork` because endpoints' lanes differ)
  - `m2→m1` straight
- `laneCount = 2`, `rows.length = 4`, `edges.length = 4`.

The unit test for this case asserts: `result.rows.length === 4`, `result.edges.length === 4`, every edge's `fromSha`/`toSha` is in the visible set, and the specific edge `f2→m1` is present (the "skip-over" sentinel). It does NOT compare the full `LayoutResult` against a hand-authored expected — keeps the test resilient to incidental ordering tweaks while still catching the only thing that could break (parent rewriting).

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `docs/PRD.md` §12 Phase 6B — deliverables and validation criteria. Note the gutter-prop departure recorded above.
- `CLAUDE.md` (entire) — conventions; especially **artifact-commit cadence on `main` post-merge**, **untracked-file hygiene**, two-pass typecheck, kebab-case files, default exports, `type` over `interface`, LF endings, and the **Playwright SVG zero-bbox** rule.
- `registry/git-graph/lib/layout.ts` (whole file, 228 lines) — current algorithm. Filter pre-pass inserts between input validation (lines 11-29) and the existing main loop (lines 41-84). The `bySha` map and `topoSort` helper stay unchanged. The new pre-pass produces a *new* `Commit[]` with rewritten `parents` arrays and a *new* `bySha` keyed only on visible shas; the rest of the existing algorithm operates on these.
- `registry/git-graph/lib/errors.ts` — `GitGraphInputError` is unchanged. No new error kinds needed: an empty filter result (zero visible commits) yields an empty layout (`{ rows: [], edges: [], laneCount: 0 }`), which the existing `<GitGraph>` empty-state branch already handles via `props.commits.length === 0` — but **read the gotcha in Task 4**: the empty-state branch checks `props.commits.length`, not `layout.rows.length`. A non-empty `commits` array filtered down to zero must NOT trip the empty-state early return; it must render an empty listbox, not the empty-state placeholder. Decide and document this behavior.
- `registry/git-graph/git-graph.tsx` (whole file, 549 lines) — `GitGraphProps` (lines 27-46), `useLayoutOrError` (lines 96-109), `useGitGraphState` (lines 111-211), and the `selectedRow?.commit` reference passed to `<GitGraphDetail>` at line 440. The selection-survival change replaces line 440's `commit={selectedRow?.commit}` with `commit={selectedCommit}`, where `selectedCommit` is computed inside `useGitGraphState` from `selectedSha` against the unfiltered `props.commits` (plus the synthesized WT commit if `showWorkingTreeRow`).
- `registry/git-graph/lib/working-tree.ts` — defines `WORKING_TREE_SHA` and `synthesizeWorkingTreeCommit`. The filter receives the synthesized commit when `showWorkingTreeRow` is true; document this in the recipe.
- `registry/git-graph/types.ts` — `Commit` and `LayoutResult` shapes; no new exports this phase.
- `tests/unit/layout.test.ts` (whole file) — pattern for table-driven Vitest fixture tests + invariant tests. The new `layout-filter.test.ts` mirrors the import idiom (`computeLayout`, fixtures from `./fixtures`).
- `tests/unit/fixtures/feature-branch.ts` — small, well-known DAG used in the hand-trace above; primary fixture for explicit-skip-over cases.
- `tests/unit/fixtures/index.ts` — barrel; the new test file imports from this.
- `tests/unit/fixtures/{linear,merge,octopus,orphan,long-lived-release}.ts` — full coverage targets for property-based assertions.
- `examples/consumer-app/app/graph/interactions/page.tsx` (whole file, 56 lines) — pattern for harness pages with controlled state and on-page echo. The new `/graph/filter` harness mirrors this shape with three filter buttons.
- `examples/consumer-app/app/graph/detail/page.tsx` — Phase 6A harness; reuse the section-stacking layout idiom.
- `tests/e2e/graph-interactions.spec.ts` — pattern for testid-driven assertions and on-page echo verification.
- `tests/e2e/graph-detail.spec.ts` — Phase 6A spec for `data-sha` selector idiom.
- `apps/docs/app/docs/api/page.tsx` (whole file, 50 lines) — `GITGRAPH_PROPS` array; add one new entry.
- `apps/docs/app/docs/recipes/page.tsx` — recipes index; add one card.
- `apps/docs/app/docs/recipes/detail-drawer/page.tsx` — Phase 6A recipe; mirror the structure (heading, intro paragraph, two `<CodeBlock>` examples, closing notes).
- `apps/docs/components/code-block.tsx` — for the recipe page's code samples.
- `playwright.config.ts` — confirm the test glob picks up `tests/e2e/graph-filter.spec.ts` automatically (it does — `testDir: "./tests/e2e"`).

### New Files to Create

**Tests**
- `tests/unit/layout-filter.test.ts` — Vitest: filter pre-pass coverage. ~120 LOC.
- `tests/e2e/graph-filter.spec.ts` — Playwright: 4 test cases. ~70 LOC.

**Consumer-app harness**
- `examples/consumer-app/app/graph/filter/page.tsx` — three filter modes side-by-side (none / branch-only / author-only).

**Docs**
- `apps/docs/app/docs/recipes/filtering/page.tsx` — recipe with three code samples (basic, working-tree-aware, branch-only).

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [shadcn registry-item schema](https://ui.shadcn.com/docs/registry/registry-item-json) — confirms no manifest changes needed when only modifying existing files.
- [Vitest docs — `expect.toContainEqual`](https://vitest.dev/api/expect.html#tocontainequal) — useful for property-based edge assertions like "result contains an edge from A to C".
- React/TypeScript no external doc reading needed beyond what already applies.

### Patterns to Follow

**`computeLayout` options-arg ergonomics** — mirror Vitest/React idiom of trailing options object for optional behavior:

```ts
export function computeLayout(
  commits: Commit[],
  options?: { filter?: (commit: Commit) => boolean },
): LayoutResult {
  // existing duplicate-sha + cycle validation runs over the full input
  // ...
  // NEW: parent-rewriting pre-pass when options?.filter is provided
  // ...
  // existing topo-sort + lane assignment over the (possibly rewritten) commit set
}
```

The implementation uses an internal helper:

```ts
function applyFilter(
  commits: Commit[],
  bySha: Map<string, Commit>,
  filter: (c: Commit) => boolean,
): Commit[] {
  const visible = new Set<string>();
  for (const c of commits) if (filter(c)) visible.add(c.sha);

  // For each filtered-out sha, memoize the deduped list of nearest-visible
  // ancestors. Memo prevents O(N*M) blowup on long filtered chains; same-sha
  // visited twice in a BFS frontier is suppressed by the per-call `seen` set.
  const resolved = new Map<string, string[]>();
  function resolveParents(parentShas: string[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const queue = [...parentShas];
    while (queue.length > 0) {
      const sha = queue.shift()!;
      if (seen.has(sha)) continue;
      seen.add(sha);
      if (!bySha.has(sha)) continue;          // out-of-window — drop, as today
      if (visible.has(sha)) {
        if (!out.includes(sha)) out.push(sha);
        continue;
      }
      const cached = resolved.get(sha);
      if (cached) {
        for (const r of cached) if (!out.includes(r)) out.push(r);
        continue;
      }
      const grandparents = bySha.get(sha)!.parents;
      for (const gp of grandparents) queue.push(gp);
    }
    // Memoize per-filtered-sha would require restructuring; for plan
    // simplicity, skip memoization in v1. Profile if it becomes a hot path
    // (10k-commit + heavy filter would be the canary).
    return out;
  }

  const rewritten: Commit[] = [];
  for (const c of commits) {
    if (!visible.has(c.sha)) continue;
    rewritten.push({ ...c, parents: resolveParents(c.parents) });
  }
  return rewritten;
}
```

The new commit objects are shallow copies with replaced `parents` arrays — the rest of `Commit` (refs, author, etc.) is shared by reference, which is fine because layout output only references `commit` for downstream rendering (not for mutation).

**`useGitGraphState` selectedCommit fallback** — add this near the existing `selectedRow` derivation (line 173 area):

```ts
const selectedRow = selectedSha
  ? layout.rows.find((r) => r.commit.sha === selectedSha)
  : undefined;

// 6B: when filter excludes the selected commit, keep the drawer's commit
// reference alive by looking up the unfiltered input. Working-tree synthetic
// is recreated by the same path useLayoutOrError uses, so the lookup is
// consistent whether or not it survived the filter.
const selectedCommit: Commit | undefined =
  selectedRow?.commit ??
  (selectedSha === undefined
    ? undefined
    : selectedSha === WORKING_TREE_SHA && props.showWorkingTreeRow
      ? synthesizeWorkingTreeCommit(props.head, Date.now())
      : props.commits.find((c) => c.sha === selectedSha));
```

Add `selectedCommit` to the returned `GitGraphState` (after `selectedRow`). Replace `commit={selectedRow?.commit}` at the `<GitGraphDetail>` site (currently line 440) with `commit={selectedCommit}`.

**Naming:** Consistent with the project. Prop on `<GitGraph>` is `filter`. The options key inside `computeLayout` is also `filter`. Internal helper is `applyFilter` (lowercase verb-noun, file-internal — not exported).

**File header / "use client":** Harness pages and recipe pages declare `"use client"` (per existing pattern in `interactions/page.tsx:1`). The library files (`layout.ts`, `git-graph.tsx`) keep their existing directives.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation — extend `computeLayout` signature with filter option

Algorithm change is localized to `lib/layout.ts`. Unit tests written first (TDD style — though the project doesn't strictly require it, the layout engine is pure-function territory where TDD pays off).

### Phase 2: Core wiring — add `filter` prop to `<GitGraph>` and selectedCommit fallback

Plumbing change in `git-graph.tsx`. No layout-engine work; purely thread the prop through and adjust drawer commit reference.

### Phase 3: Integration — harness, docs API, recipe

Consumer-app harness for E2E target; docs surfaces for the new prop.

### Phase 4: Testing & validation

Unit tests, E2E spec, full validation suite, pre-PR scope, push, PR.

---

## STEP-BY-STEP TASKS

Execute every task in order. Each task is atomic and independently testable.

### 1. CHECKOUT main, pull, branch off

- **Host:** windows (verified); linux/macOS expected to work — pure git ops.
- **IMPLEMENT:**
  - `git checkout main`
  - `git pull --ff-only origin main` — confirm Phase 6A's PR has merged before starting.
  - `git checkout -b phase-6b-filter-prop`
- **GOTCHA:** If 6A has not yet merged, STOP and surface the dependency to the user. This phase touches `git-graph.tsx` lines that 6A also modified; rebasing onto a non-merged 6A branch is out of scope here.
- **VALIDATE:** `git status` clean on the new branch; `git log --oneline -1` shows the latest `main` commit (should be the 6A merge or later).

### 2. CREATE `tests/unit/layout-filter.test.ts` (TDD-first)

- **IMPLEMENT:** New Vitest file. Imports from `../../registry/git-graph/lib/layout` and `./fixtures`. Test groups:
  1. **`computeLayout — filter signature`**:
     - With no `options` arg, behavior identical to today (delegate to one of the existing fixtures and `expect(computeLayout(input)).toEqual(computeLayout(input, undefined))`).
     - With `options.filter = () => true`, output equals the unfiltered output across all six fixtures (loop).
     - With `options.filter = () => false`, output is `{ rows: [], edges: [], laneCount: 0 }` for all fixtures.
  2. **`computeLayout — filter property invariants`** (loop over all six fixtures with three predicates: keep-half-by-sha-hash, keep-by-author, keep-non-merges):
     - `result.rows.length === input.filter(predicate).length`
     - Every `row.commit.sha` satisfies `predicate(row.commit) === true`
     - Every edge's `fromSha` and `toSha` is in the set of visible shas
     - `laneCount === Math.max(-1, ...result.rows.map(r => r.lane)) + 1`
     - Determinism: two calls produce byte-identical JSON
     - Input not mutated
  3. **`computeLayout — explicit skip-over cases`** (using `featureBranchFixture`):
     - Filter `c => c.sha !== "f1"`: assert `result.rows.length === 4`, `result.edges.length === 4`, `result.laneCount === 2`, and `result.edges.some(e => e.fromSha === "f2" && e.toSha === "m1")` is true (the skip-over edge).
     - Filter `c => c.sha !== "m2"`: assert `m3→m1` skip-over edge exists (`m3`'s primary parent `m2` is filtered, `m2.parents = [m1]`, so rewritten `m3.parents = [m1, f2]`).
     - Filter `c => !["f1", "f2"].includes(c.sha)`: feature branch entirely filtered. Assert `m3→m1` straight edge exists (`m3`'s secondary parent `f2` filtered, `f2.parents = [f1]` filtered, `f1.parents = [m1]`. So rewritten `m3.parents = [m2, m1]`. Dedup preserves order: visible from primary `m2` is `m2`, visible from secondary `f2`-chain is `m1`. So `[m2, m1]`. Edge `m3→m1` is secondary, kind `merge`).
     - Filter `c => c.sha === "m1"`: only root visible. Assert `result.rows.length === 1`, `result.edges.length === 0`, `result.laneCount === 1`.
  4. **`computeLayout — filter receives the right object`**: assert the predicate is called with exactly the input commits (no internal copies, no mutated parents arrays — verify by `Object.is` check inside the predicate).
- **PATTERN:** `tests/unit/layout.test.ts` for the table-driven loop and invariant idioms.
- **IMPORTS:**
  ```ts
  import { describe, expect, test } from "vitest";
  import { computeLayout } from "../../registry/git-graph/lib/layout";
  import {
    featureBranchFixture,
    linearFixture,
    mergeFixture,
    octopusFixture,
    orphanFixture,
    longLivedReleaseFixture,
  } from "./fixtures";
  ```
- **GOTCHA:** Tests will FAIL at this point — the filter feature isn't implemented yet. That's the TDD-first signal. Confirm failures are due to "extra argument ignored" or runtime errors, not import errors or typos.
- **VALIDATE:** `pnpm test tests/unit/layout-filter.test.ts` runs (does not error on import); test failures are expected and indicate which assertions need the implementation in Task 3.

### 3. UPDATE `registry/git-graph/lib/layout.ts` — add filter option and parent-rewrite pre-pass

- **IMPLEMENT:**
  - Change signature to `export function computeLayout(commits: Commit[], options?: { filter?: (commit: Commit) => boolean }): LayoutResult`.
  - Keep the duplicate-sha + cycle validation (lines 11-29) operating on the full input.
  - Immediately after validation, if `options?.filter` is defined, replace the local `commits` reference with the result of `applyFilter(commits, bySha, options.filter)` AND rebuild a fresh `bySha` keyed on the rewritten visible commits. The downstream loop (lines 41-84) uses this new `commits` and `bySha` unchanged.
  - `applyFilter` is the helper from §Patterns to Follow above. Place it as a `function` declaration below `computeLayout`.
  - Update the file's leading docstring (lines 3-9) to mention the new option: append a paragraph explaining the parent-rewriting semantics ("Filter mode: when `options.filter` is provided, commits for which the predicate returns false are removed from the layout. Their visible descendants' parent references are rewritten to the nearest-visible-ancestor walking through filtered ancestors. Out-of-window parents continue to be silently ignored.").
  - The cycle-detection check (`sorted.length !== commits.length` at line 24) compares against the **filtered-and-rewritten** local `commits` after the filter applies. That's correct: a cycle in the filtered subgraph could only exist if there was a cycle in the original (caught earlier by the unfiltered topo-sort if we ran it pre-filter — but we don't). To keep validation on the full input, **run topoSort on the full input first as the cycle check**, then apply filter. Restructure:
    1. Build `bySha` (full).
    2. `topoSort(commits, bySha)`; if length differs, throw cycle.
    3. If `options?.filter`, replace `commits` with `applyFilter(commits, bySha, options.filter)` and rebuild `bySha`.
    4. `topoSort(commits, bySha)` again on the rewritten set (cheap; this gives the row order).
    5. Continue with lane assignment.
- **PATTERN:** Existing structure of `computeLayout`; same input-validation-then-process pipeline.
- **IMPORTS:** No new imports.
- **GOTCHA:** The two-toposort restructure is the trade-off for keeping cycle detection on the full input. The cost is one extra topo-sort over the same-or-smaller set; even on the 10k fixture this is microseconds. Document the rationale in a one-line comment above the second `topoSort` call.
- **GOTCHA:** Parent rewriting must dedupe **per-commit** while preserving primary-vs-secondary ordering. The hand-trace case "filter removes f1+f2" produces `m3.parents = [m2, m1]` — `m2` first (from primary parent `m2` directly), `m1` second (from secondary-parent-`f2`'s chain). The reference implementation in §Patterns uses `out.push` with `includes` dedupe: O(P²) per commit where P is the resolved-parents list length. P is bounded by laneCount + filter chain depth; in practice P < 10. Acceptable.
- **VALIDATE:** `pnpm test tests/unit/layout-filter.test.ts` — all assertions added in Task 2 now pass on Chromium-equivalent Node environment. Then `pnpm test` for full unit suite — confirms no regression in `layout.test.ts`, `bezier.test.ts`, etc.

### 4. UPDATE `registry/git-graph/git-graph.tsx` — add `filter` prop and `selectedCommit` fallback

- **IMPLEMENT:**
  - Extend `GitGraphProps` (lines 27-46) with one new entry, placed between `onCommitHover` and `showWorkingTreeRow`:
    ```ts
    filter?: (commit: Commit) => boolean;
    ```
  - In `useLayoutOrError` (lines 96-109), pass the filter through:
    ```ts
    return { ok: true, layout: computeLayout(workingCommits, props.filter ? { filter: props.filter } : undefined) };
    ```
    Add `props.filter` to the `useMemo` dep array.
  - **Empty-state interaction (the gotcha called out under CONTEXT REFERENCES):** the empty-state early return at line 505 checks `props.commits.length === 0 && !props.showWorkingTreeRow`. A non-empty `commits` filtered to zero must NOT take this branch — instead it should fall through to the normal render path with a zero-row layout. The current condition already does this (it checks `props.commits.length`, not `layout.rows.length`), so **no change is needed here**. Confirm during execution by reading the code; if the condition has been changed since this plan was written, restore the check to `props.commits.length`.
  - Add `selectedCommit` derivation in `useGitGraphState`, right after `selectedRow` (current line 173):
    ```tsx
    const selectedCommit: Commit | undefined =
      selectedRow?.commit ??
      (selectedSha === undefined
        ? undefined
        : selectedSha === WORKING_TREE_SHA && props.showWorkingTreeRow
          ? synthesizeWorkingTreeCommit(props.head, Date.now())
          : props.commits.find((c) => c.sha === selectedSha));
    ```
  - Add `selectedCommit: Commit | undefined` to the `GitGraphState` type (after `selectedRow`) and include it in the returned object.
  - Destructure `selectedCommit` in `GitGraphBody` (lines 220-239) and pass it to `<GitGraphDetail>` at line 440 — replace `commit={selectedRow?.commit}` with `commit={selectedCommit}`.
- **PATTERN:** `GitGraphProps` extension idiom from Phase 6A's `renderDetail` etc. additions.
- **IMPORTS:** No new imports — `WORKING_TREE_SHA` and `synthesizeWorkingTreeCommit` are already imported at line 24.
- **GOTCHA:** `Date.now()` inside the `synthesizeWorkingTreeCommit` fallback breaks render purity — the WT commit's timestamp drifts on each render. This is an edge case (selected sha is WORKING_TREE_SHA, the WT commit got filtered out, and the drawer is open) that probably never fires in practice. Accept the impurity for code simplicity; if it becomes a real concern, lift the WT commit's synthesis into `useMemo` keyed on `props.head` and reuse the same instance from `useLayoutOrError`. Note in code comment.
- **GOTCHA:** `exactOptionalPropertyTypes` strictness — the conditional `props.filter ? { filter: props.filter } : undefined` is required; `{ filter: props.filter }` with `props.filter` possibly `undefined` would type-error against the new `options.filter` type which excludes explicit `undefined`. (Or relax the options type to `filter?: ((c: Commit) => boolean) | undefined` — pick one. Recommend the conditional spread; matches existing `aria-activedescendant` ternary at line 300.)
- **VALIDATE:** `pnpm typecheck` (per-workspace + root) passes. `pnpm test` (full vitest) passes — no E2E or harness yet, just type and unit safety.

### 5. CREATE `examples/consumer-app/app/graph/filter/page.tsx`

- **IMPLEMENT:** Three vertically stacked sections, each rendering `<GitGraph>` with `featureBranchFixture` (5 commits — small enough that the filter result is visually obvious):
  1. **No filter** — baseline. Sets `data-testid="section-none"` on the container.
  2. **Branch-only** — `filter={(c) => c.sha !== "f1" && c.sha !== "f2"}` (hides the feature branch). Container `data-testid="section-branch"`. The remaining graph is `m3 → m2 → m1` linear plus the merge edge `m3 → m1` (secondary parent rewritten through `f2.parents=[f1]→f1.parents=[m1]`).
  3. **Author-only** — uses a fixture variant: define `const filterFixture = featureBranchFixture.map((c, i) => i % 2 === 0 ? { ...c, author: { name: "Alice" } } : { ...c, author: { name: "Bob" } });` and `filter={(c) => c.author.name === "Alice"}`. Container `data-testid="section-author"`.
  - Above the sections, render an `<h1>` and a brief description.
  - Each section has its own heading (`<h2>`) and a `<pre data-testid="echo-{section-id}">` echoing `{ visibleShas: result.rows.map(r => r.commit.sha) }` — derive by re-running `computeLayout` from the same lib for the echo only (acceptable; it's a harness, not production).
- **PATTERN:** `examples/consumer-app/app/graph/interactions/page.tsx` (header + echo + buttons) and `examples/consumer-app/app/graph/detail/page.tsx` (multi-section).
- **IMPORTS:**
  ```ts
  "use client";
  import GitGraph from "@/components/git-graph/git-graph";
  import { computeLayout } from "@/components/git-graph/lib/layout";
  import { featureBranchFixture } from "../../../../../tests/unit/fixtures";
  ```
- **GOTCHA:** The harness imports `computeLayout` to render the echo, which exercises the synced copy (`@/components/git-graph/lib/layout`), not the registry source. `scripts/sync-registry.mjs` syncs `lib/layout.ts` to that path on every run, so the changes from Task 3 must propagate through `pnpm sync:registry` (or whatever the project's sync invocation is) BEFORE this harness will reflect them. Run the sync once after Task 3 and verify.
- **VALIDATE:** `pnpm --filter consumer-app dev` (run-in-background) → navigate `http://localhost:3100/graph/filter` → all three sections render; the branch-only section visibly omits `f1` and `f2`; the author-only section omits half the commits.

### 6. CREATE `tests/e2e/graph-filter.spec.ts`

- **Host:** linux (CI default); windows-locally via `pnpm e2e` if Playwright browsers installed natively.
- **IMPLEMENT:** Four test cases:
  1. **`no-filter section renders all commits`** — goto `/graph/filter`. Within `[data-testid="section-none"]`, assert `[data-sha="f1"]`, `[data-sha="f2"]`, `[data-sha="m1"]`, `[data-sha="m2"]`, `[data-sha="m3"]` each have count 1.
  2. **`branch-only filter omits f1 and f2`** — within `[data-testid="section-branch"]`, assert `[data-sha="f1"]` and `[data-sha="f2"]` each have count 0; `[data-sha="m1"]`, `[data-sha="m2"]`, `[data-sha="m3"]` each have count 1.
  3. **`branch-only echo lists only visible shas`** — assert `[data-testid="echo-branch"]` text contains `m3`, `m2`, `m1` and does NOT contain `f1`, `f2`.
  4. **`author-only filter omits Bob's commits`** — within `[data-testid="section-author"]`, assert exactly 3 elements match `[data-testid="git-graph-row"]` (Alice's three commits at indexes 0, 2, 4 of the fixture).
- **PATTERN:** `tests/e2e/graph-detail.spec.ts` for `data-sha` selectors and section-scoped queries; `tests/e2e/graph-interactions.spec.ts` for echo-text assertions.
- **GOTCHA:** Multiple `<GitGraph>` instances on one page each have a `[data-testid="git-graph"]` listbox AND many `[data-testid="git-graph-row"]` children. Section-scoped queries (`page.locator('[data-testid="section-none"]').locator('[data-sha="f1"]')`) are mandatory — bare `page.locator('[data-sha="f1"]')` will count across all sections.
- **GOTCHA:** Do NOT use `toBeVisible()` on `[data-sha="..."]` rows — the project's CLAUDE.md flags SVG-related visibility issues, but row `<div>`s have real bounding boxes so this is technically fine. Stick with `toHaveCount(1)` / `toHaveCount(0)` for consistency with other specs and to avoid flakiness from any virtualization scroll-windowing.
- **VALIDATE:** `pnpm e2e tests/e2e/graph-filter.spec.ts` — all 4 cases pass on chromium, firefox, webkit.

### 7. UPDATE `apps/docs/app/docs/api/page.tsx` — add `filter` prop row

- **IMPLEMENT:** Insert one entry into `GITGRAPH_PROPS`, placed between `onCommitHover` and `showWorkingTreeRow`:
  ```ts
  {
    name: "filter",
    type: "(commit: Commit) => boolean",
    description: "Predicate that hides commits for which it returns false. The layout engine rewrites edges to skip filtered commits — if A's parent B is filtered out, A's edge points to B's nearest visible ancestor. Selection state survives a commit being filtered out: the row disappears but the detail drawer (if rendered) keeps the remembered commit.",
  },
  ```
- **VALIDATE:** `pnpm --filter docs typecheck`; manually navigate `/docs/api` after `pnpm dev:docs` and confirm the new row.

### 8. CREATE `apps/docs/app/docs/recipes/filtering/page.tsx`

- **IMPLEMENT:** Recipe page with three `<CodeBlock>` sections:
  1. **Basic filter** — `<GitGraph commits={commits} filter={(c) => c.author.name === "Alice"} />`. One paragraph explaining edge rewriting.
  2. **Working-tree-aware filter** — for consumers using `showWorkingTreeRow`. Show the `(c) => c.sha === WORKING_TREE_SHA || keep(c)` idiom. Explain that the synthetic working-tree commit is subject to the filter by default.
  3. **Branch-ancestry filter** — show how to compute "commits reachable from `main`" using a closure over a precomputed Set:
     ```tsx
     const reachableFromMain = useMemo(() => computeReachable(commits, "main-tip-sha"), [commits]);
     <GitGraph commits={commits} filter={(c) => reachableFromMain.has(c.sha)} />
     ```
     and stub `computeReachable` as "consumer-supplied — do BFS on parents from the tip sha."
- **PATTERN:** `apps/docs/app/docs/recipes/detail-drawer/page.tsx`.
- **IMPORTS:** Standard recipe imports — `<DocsShell>`, `<CodeBlock>`, etc., matching the detail-drawer recipe.
- **VALIDATE:** `pnpm --filter docs typecheck` passes; `/docs/recipes/filtering` renders with all three samples.

### 9. UPDATE `apps/docs/app/docs/recipes/page.tsx` — add filtering card

- **IMPLEMENT:** Add a card linking to `/docs/recipes/filtering` with title "Filtering commits" and a one-liner: "Hide commits with a predicate; edges rewrite through the hidden DAG."
- **PATTERN:** Existing card shape from the detail-drawer card.
- **VALIDATE:** Card appears on `/docs/recipes`; click navigates to the new page.

### 10. RUN `pnpm sync:registry` (or equivalent) to propagate `lib/layout.ts` to consumer apps

- **IMPLEMENT:** Run the project's registry-sync script. Inspect `package.json` scripts for the canonical name (likely `sync:registry`, `sync`, or invoked directly via `node scripts/sync-registry.mjs`). The script copies `registry/git-graph/lib/layout.ts` into `examples/consumer-app/components/git-graph/lib/layout.ts` and `apps/docs/components/git-graph/lib/layout.ts`.
- **GOTCHA:** Without this sync, the harness page's `computeLayout` import will be the OLD signature (no `options` arg) and the type-checker on the consumer-app workspace will reject the new option usage. CI runs the sync as part of build, but local dev requires explicit invocation.
- **VALIDATE:** `git diff -- examples/consumer-app/components/git-graph/lib/layout.ts apps/docs/components/git-graph/lib/layout.ts` shows the new signature and `applyFilter` helper present in both synced copies. `pnpm typecheck` passes monorepo-wide.

### 11. RUN full validation suite

- **IMPLEMENT:**
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test` (full vitest)
  - `pnpm e2e` (full Playwright matrix — confirms no regression in interactions/render/detail/animation/keyboard, plus the new `graph-filter.spec.ts`)
  - `pnpm build:docs` (sanity check the static export still builds)
- **VALIDATE:** All pass. Capture timing if `pnpm test` was previously sub-second on `layout.test.ts` — the new `layout-filter.test.ts` should also be sub-second (no I/O, pure-function tests).

### 12. CONFIRM pre-PR scope

- **IMPLEMENT (CONFIRM task — review with user before proceeding to Task 13):**
  1. `git status` — confirm no untracked files outside `.agents/`. Anything else: gitignore proactively or revert.
  2. `git diff --name-only main...HEAD` — verify every changed path is in "Primary Systems Affected" or is an explicitly planned new file. Expected:
     - `registry/git-graph/lib/layout.ts`
     - `registry/git-graph/git-graph.tsx`
     - `examples/consumer-app/components/git-graph/lib/layout.ts` (synced)
     - `examples/consumer-app/components/git-graph/git-graph.tsx` (synced)
     - `apps/docs/components/git-graph/lib/layout.ts` (synced)
     - `apps/docs/components/git-graph/git-graph.tsx` (synced)
     - `examples/consumer-app/app/graph/filter/page.tsx`
     - `apps/docs/app/docs/api/page.tsx`
     - `apps/docs/app/docs/recipes/page.tsx`
     - `apps/docs/app/docs/recipes/filtering/page.tsx`
     - `tests/unit/layout-filter.test.ts`
     - `tests/e2e/graph-filter.spec.ts`
  3. Verify NO `.agents/plans/`, `.agents/code-reviews/`, `.agents/execution-reports/`, `.agents/system-reviews/` files staged on the feature branch — those land on `main` post-merge per CLAUDE.md artifact-commit cadence.
- **GOTCHA:** Phase 4 was the second incident of sweep-in. This step is non-negotiable.

### 13. CONFIRM commit and push

- **IMPLEMENT (CONFIRM task — destructive/shared-state):**
  - Stage all planned changes; commit with message:
    ```
    Phase 6B: headless filter predicate

    Adds `filter?: (commit: Commit) => boolean` prop to <GitGraph> and an
    optional `options.filter` parameter to computeLayout. Filtered commits
    are removed from lane assignment; visible-descendant edges are rewritten
    transitively to the nearest-visible-ancestor through filtered chains.

    Selection state survives commits being filtered out: the row disappears
    from the listbox but the detail drawer (if rendered) keeps the
    remembered commit by falling back to the unfiltered input.

    No UI shipped this phase. Phase 6C layers a built-in filter bar on
    top of this primitive.
    ```
  - `git push -u origin phase-6b-filter-prop`
- **GOTCHA:** First push of branch — `CONFIRM` gate per CLAUDE.md.

### 14. CONFIRM open PR

- **IMPLEMENT (CONFIRM task — shared-state):** `gh pr create --base main --head phase-6b-filter-prop --title "Phase 6B: headless filter predicate"` with body summarizing deliverables, linking to PRD §12.6B, listing validation evidence (CI green, manual harness verified), and noting the deliberate departure from PRD wording for the gutter prop (recorded in §External-System Assumption Audit of this plan).
- **POST-MERGE (separate from this PR — see CLAUDE.md):** artifact-commit `.agents/plans/phase-6b-filter-prop.md` (this file), the eventual `.agents/code-reviews/phase-6b-filter-prop.md`, `.agents/execution-reports/phase-6b-filter-prop.md`, and any post-execution corrections, in a focused commit on `main`.

---

## TESTING STRATEGY

### Unit Tests

`tests/unit/layout-filter.test.ts` (Task 2). Property-based assertions across all six fixtures with three predicate shapes, plus four explicit skip-over cases on `featureBranchFixture`. Coverage rationale:

- Property-based catches "did we forget to rewrite parents?" (would surface as edge endpoints referencing filtered shas) without requiring a hand-authored expected `LayoutResult` per (fixture × filter) pair.
- Explicit cases pin down the most subtle behavior: dedup order, secondary-parent rewriting, multi-hop chains.

No changes to `layout.test.ts` — existing assertions cover the no-filter path and act as a regression guard.

### Integration / E2E Tests

`tests/e2e/graph-filter.spec.ts` (Task 6). Four cases: baseline, branch-only by sha, echo verification, author-only. Runs across the 3-browser matrix.

The E2E does NOT verify edge geometry (rewritten edges' SVG paths). The unit tests are the source of truth for edge correctness; visual regression for filter-induced edges would be a Phase 6B+ screenshot test, deliberately deferred — the unit test asserts edge presence at the data layer, which is sufficient for headless-filter coverage.

### Edge Cases

- **Filter excludes everything** — covered by unit test: returns empty layout. `<GitGraph>`'s render path produces a zero-row listbox (NOT the empty-state branch, which keys on `props.commits.length`).
- **Filter excludes the selected commit** — covered by harness manual check + the `selectedCommit` fallback logic. Unit test for the `selectedCommit` lookup is React-component territory; manual sanity in the harness is sufficient. (Optional: add a fifth E2E case clicking a row, then toggling a filter that excludes it, then verifying the drawer still has the right commit. Defer unless reviewer requests.)
- **Filter excludes a parent in a chain of filtered ancestors** — covered by the explicit "filter removes f1+f2" unit case.
- **Filter excludes the working-tree synthetic** — predicate receives the synthesized commit; documented in the recipe.
- **Filter that returns non-boolean truthy/falsy** — predicate type is `(c) => boolean`; TypeScript catches misuse at the prop boundary. Runtime: `applyFilter` uses `if (filter(c))` semantics, so any truthy return keeps the commit. Don't add runtime coercion.
- **Performance on 10k-commit fixture under heavy filter** — not tested in this phase. The 10k virtualization fixture is deferred to Phase 6D's expansion-perf budget, and the worst-case `applyFilter` is O(N + total-resolved-edges) which is O(N) practically. If profiling later shows otherwise, add a memo on `resolveParents`.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
- `pnpm lint`

### Level 2: Type Checking
- `pnpm typecheck` (workspace pass + root pass over `registry/**` and `tests/**`)

### Level 3: Unit Tests
- `pnpm test tests/unit/layout-filter.test.ts` — fast feedback on the new file
- `pnpm test` — full suite, regression confirmation

### Level 4: E2E Tests
- `pnpm e2e tests/e2e/graph-filter.spec.ts` — new spec only
- `pnpm e2e` — full matrix

### Level 5: Build sanity
- `pnpm build:docs` — confirms static export still succeeds; the new recipe page route appears in `apps/docs/out/docs/recipes/filtering/index.html` (or the equivalent path under the export structure)

### Level 6: Manual Harness Validation
- `pnpm --filter consumer-app dev` → navigate `/graph/filter` → exercise all three sections → visual sanity check (branch-only section visibly omits feature branch; author-only shows half the commits with edges still connecting them through the hidden DAG)

---

## ACCEPTANCE CRITERIA

- [ ] `computeLayout(commits, options)` accepts an optional `{ filter?: (c: Commit) => boolean }` second arg with backward-compatible behavior when omitted
- [ ] When `filter` is supplied, the result contains only commits for which `filter` returned true; every edge endpoint is in the visible set
- [ ] When a commit is filtered, edges from its visible descendants are rewritten to the nearest-visible-ancestor reached by walking through filtered ancestors (the "skip-over" semantics)
- [ ] Out-of-window parents continue to be silently ignored (existing semantics unchanged)
- [ ] `<GitGraph>` accepts `filter` prop; harness page renders three filter modes correctly
- [ ] `selectedSha` survives a filter change that removes the selected commit: row disappears from the listbox, but `<GitGraphDetail>` (if rendered) receives the remembered commit looked up from the unfiltered input
- [ ] Working-tree synthetic commit is subject to the filter (documented in recipe)
- [ ] All existing unit, E2E, and build commands pass without regression
- [ ] Recipe page documents the prop with three working code samples
- [ ] No new untracked files outside the planned set; no `.agents/` artifacts staged on the feature branch
- [ ] `<GitGraphGutter>` is intentionally unchanged — gutter-prop departure recorded in plan §External-System Assumption Audit and PR body

---

## COMPLETION CHECKLIST

- [ ] All 14 tasks completed in order
- [ ] Each task's `VALIDATE` step passed before moving on
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e`, `pnpm build:docs` all green
- [ ] Manual harness verified on `/graph/filter`
- [ ] Acceptance criteria all checked
- [ ] PR open against `main` with descriptive body referencing PRD §12.6B and noting the gutter-prop departure
- [ ] Post-merge: artifact-commit on `main` for plan, code-review, execution-report, system-review files (separate from PR)

---

## NOTES

**Why parent-rewriting (1b) over drop-and-disconnect (1a):** consumers building branch / author / search filters expect the visible graph to remain connected through the hidden DAG. The PRD wording "edges skip over them where parents are still visible" calls this out explicitly. Drop-and-disconnect is what you get from filtering `commits[]` upstream — the whole point of pushing the filter into the layout engine is to do better.

**Why the gutter departs from the PRD:** `<GitGraphGutter>` consumes a pre-computed `LayoutResult` and has no `Commit[]` to apply a predicate to. Adding a prop that has nowhere to land would either (a) require restructuring the gutter to take `commits` (breaking change for the primitive) or (b) be a no-op decoration. Headless `computeLayout` users get the filter via `options.filter` directly. Confirmed with the user during planning.

**Why `selectedCommit` fallback (3b) over clearing selection (3a):** Phase 6E keyboard navigation will benefit from selection persistence across filter toggles. A consumer who wires up `<input type="search">` filtering wants the selected commit's drawer to stay open while the user is searching — clearing selection on filter would feel jumpy. The fallback path is short and contained to `useGitGraphState`.

**`computeLayout` second-arg vs new function name:** chose options-arg over `computeFilteredLayout(commits, filter)` because:
- Backward-compatible.
- Future-extensible: 6D might add `options.expansionMeasurer`, 6G might add `options.orientation`. One options bag scales.
- Mirrors the wider TypeScript ecosystem idiom (`Array.sort`, `JSON.stringify`).

**Performance trade-off accepted in v1:** `resolveParents` does not memoize across the per-commit BFS calls. On adversarial inputs (one filter that removes 90% of a 10k-commit graph) this is O(N²) worst-case. Profile-only-if-it-bites; the realistic bound is small. If memoization is needed later, the natural shape is `Map<filteredSha, string[]>` keyed on the filter-derived visibility set; cache invalidation is per-call so the map is local to `applyFilter`.

**Deferred to Phase 6C:** any UI surface — branch chips, author multi-select, text search, time-range. This phase is the headless primitive only.

**Deferred to a hypothetical 6Bx:** screenshot regression for filter-induced edge rewriting. The unit tests assert edge presence at the data layer; visual confirmation that the rewritten beziers look natural is judgement-call territory and matches the gutter-screenshot scope from Phase 3 (`tests/e2e/gutter-screenshots.spec.ts`). If reviewer requests, add 1–2 baseline screenshots of the harness's branch-only section.

**Confidence score: 8.5/10.** The algorithm is straightforward (parent rewriting is well-understood graph manipulation), the test surface is comprehensive (property-based + explicit cases), the prop wiring follows the established 6A pattern, and there are no new dependencies or external-system claims. The 1.5 of unconfidence:

- The two-toposort restructure in Task 3 is the largest non-localized change to `layout.ts` since Phase 2; review for off-by-one in the post-filter `topoSort` call.
- The `selectedCommit` fallback in Task 4 has an SSR edge case (`Date.now()` inside a render path for the WT-filtered case) that's documented but not tested. Reviewer-flag risk.
- No spike was performed for this plan (the algorithm and codebase are well-understood from Phase 6A); empirical surprises during execution are possible but bounded — most likely a TypeScript variance issue around the `options` arg under `exactOptionalPropertyTypes`, addressable on the spot.
