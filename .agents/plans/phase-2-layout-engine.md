# Feature: Phase 2 — Layout Engine

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement the **pure, deterministic DAG-to-layout function** that turns a raw list of commits into a renderable 2-D layout (rows, lanes, edges). This is the math core of GitGraph. It has no React, no SVG, no DOM — it is a single exported function `computeLayout(commits)` whose output is later consumed by `<GitGraphGutter>` (Phase 3) and `<GitGraph>` (Phase 4).

Phase 2 ships the types, the function, a hand-authored fixture suite, Vitest coverage (deep-equality + determinism + invariants), and the tsconfig / typecheck wiring that lets the registry source typecheck alongside the apps. Phase 2 ships **no React code, no bezier math, no `fromGitLog()` helper, no real-repo fixtures** — those are Phase 2.5 / Phase 3.

## User Story

As the GitGraph maintainer
I want a pure, unit-tested `computeLayout` function that assigns every commit to a lane and enumerates the edges between commits
So that Phase 3 can render the graph as SVG without doing any layout reasoning itself, and so that the layout is trivially verifiable by deep-equality against hand-authored expected results.

## Problem Statement

Everything downstream — the gutter primitive, the headline table, the virtualization, the animation — depends on a deterministic, well-typed `LayoutResult`. Without it there is nothing to render, nothing to test against GitKraken screenshots, nothing to animate between. The layout engine is also the one piece that can be unit-tested thoroughly in isolation, and it is the piece most likely to have subtle bugs (edge crossings, lane thrashing, non-determinism across runs). If we get this wrong, every visual bug later in the project looks like a rendering bug but is actually a layout bug, and we will waste weeks chasing ghosts.

## Solution Statement

Author a pure TypeScript module at `registry/git-graph/lib/layout.ts` whose only export is `computeLayout(commits: Commit[]): LayoutResult`. Define the type surface at `registry/git-graph/types.ts` (`Commit`, `Ref`, `LayoutResult`, `LayoutRow`, `LayoutEdge`, `EdgeKind`). The function:

1. Internally topologically sorts the input (children-before-parents; `timestamp` desc is the tiebreaker for independent branches; `sha` asc is the final tiebreaker for total ordering). Consumer input order is not assumed.
2. Walks rows top-to-bottom. Each commit is placed on the leftmost lane already reserved for it (if any), otherwise the leftmost free lane. The commit's first parent ("primary parent") reserves the commit's lane; secondary parents reserve additional free lanes.
3. Emits one `LayoutEdge` per (child, parent) pair, classified as `straight` (primary-parent edge — `parents[0]`) or `merge` (secondary-parent edge — `parents[i>0]`). The classification is semantic, not geometric: a `straight` edge may cross lanes when a branch tip rejoins an ancestor lane. Phase 3 adds the geometric `fork` kind when bezier rendering needs the distinction.

Cover it with six hand-authored fixtures (linear, feature-branch, merge, octopus, orphan, long-lived-release). Each fixture file colocates both the input `Commit[]` AND the hand-authored expected `LayoutResult`. Tests use `expect(computeLayout(input)).toEqual(expected)` — **no snapshots**. The plan author, not the implementation, is the source of truth for what "correct" looks like. A determinism test additionally asserts that two back-to-back calls produce byte-identical JSON. Wire the registry source into a new root-level `tsconfig.json` so `pnpm typecheck` covers it.

## Feature Metadata

**Feature Type:** New Capability (first component-source code in the repo)
**Estimated Complexity:** Medium — the algorithm has real subtlety (lane reservation, merge classification, tiebreaking), but the surface area is one function and six fixtures.
**Primary Systems Affected:** `registry/git-graph/` (greenfield), root tsconfig, root `typecheck` script, CI typecheck job implicitly.
**Dependencies:** None. Zero runtime deps. Vitest 2.1.9 (already installed) for tests.

---

## Manual Steps Required

None. Phase 2 is pure code + tests + config. No external systems, no tokens, no deploys. The user-gated actions are the standard ones at the end: `CONFIRM` before `git push`, `gh pr create`, `gh pr merge`.

---

## External-System Assumption Audit

Minimal for this phase — it is almost entirely local code. Explicit claims:

- **Vitest 2.1.9** (already installed in Phase 1) handles `.ts` test files without additional transformer config. **Verified** — Phase 1's `tests/unit/sanity.test.ts` runs under this exact version.
- **`vitest.config.ts` already includes `registry/**/*.test.ts`** in its glob. **Verified** — see `vitest.config.ts:5`. We will not put tests inside `registry/`, but the glob is harmless.
- **`tsc -p <dir>` with a `noEmit: true` config does not write `.tsbuildinfo`** if `incremental` is false. The base tsconfig sets `incremental: true`, so we need to either disable incremental on the registry tsconfig or add `*.tsbuildinfo` to `.gitignore` (already there — verified `.gitignore` line from Phase 1 plan). **Verified** — `.gitignore` already ignores `*.tsbuildinfo`.
- **`pnpm -r --parallel typecheck` does not recurse into non-workspace directories.** `registry/` is intentionally not a workspace member per `pnpm-workspace.yaml`. Therefore a second `tsc` invocation is required to cover it. **Verified by design** — this is why we add a root tsconfig.

No native-binding transitive pins needed — Phase 2 adds no new packages.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `docs/PRD.md` §6 "Core Architecture & Patterns" (lines 118–165) — canonical `LayoutResult` shape and algorithm outline.
- `docs/PRD.md` §7.3 "Layout engine (`computeLayout`)" (lines 197–226) — function signature, output type, algorithm bullets.
- `docs/PRD.md` §10.2 "Component API" (lines 336–353) — `Commit` and `Ref` type definitions; **these are authoritative**, do not invent new fields.
- `docs/PRD.md` §12 Phase 2 (lines 397–403) — deliverables and validation criteria for this phase.
- `CLAUDE.md` (entire file) — conventions (kebab-case files, `type` over `interface`, LF line endings, `@/` alias within apps, tests naming).
- `tsconfig.base.json` — strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`; both will bite hard during layout implementation, especially array indexing.
- `vitest.config.ts` — already globs `tests/unit/**/*.test.ts` and `registry/**/*.test.ts`; we will put tests in `tests/unit/`.
- `package.json` (root) — `typecheck` script will need updating.
- `.agents/system-reviews/phase-1-scaffolding-review.md` — lessons that apply here: no conditional fixes, grep identifiers before emitting the plan, every `VALIDATE` artifact produced by some `IMPLEMENT`.
- `apps/docs/tsconfig.json` — reference shape for how we extend `tsconfig.base.json`.

### New Files to Create

**Registry source**
- `registry/git-graph/types.ts` — `Commit`, `Ref`, `LayoutResult`, `LayoutRow`, `LayoutEdge`, `EdgeKind` types. Exports only types.
- `registry/git-graph/lib/layout.ts` — `computeLayout(commits: Commit[]): LayoutResult`. Pure function, no imports except from `../types`.
- `registry/git-graph/tsconfig.json` — extends `tsconfig.base.json`, `noEmit: true`, includes `**/*.ts`.

**Root**
- `tsconfig.json` — covers `registry/**` and `tests/**` for a single `tsc --noEmit` pass. Per-app typechecks stay unchanged.

**Tests**
- `tests/unit/layout.test.ts` — deep-equality tests against hand-authored expected results, plus determinism + invariant tests.
- `tests/unit/fixtures/linear.ts` — 4-commit linear history; exports `linearFixture` and `linearExpected`.
- `tests/unit/fixtures/feature-branch.ts` — main + one feature branch that merges back; exports `featureBranchFixture` and `featureBranchExpected`.
- `tests/unit/fixtures/merge.ts` — explicit 2-parent merge commit; exports `mergeFixture` and `mergeExpected`.
- `tests/unit/fixtures/octopus.ts` — 3-parent merge; exports `octopusFixture` and `octopusExpected`.
- `tests/unit/fixtures/orphan.ts` — two disjoint root commits; exports `orphanFixture` and `orphanExpected`.
- `tests/unit/fixtures/long-lived-release.ts` — main + long-lived release branch + one hotfix merge; exports `longLivedReleaseFixture` and `longLivedReleaseExpected`.
- `tests/unit/fixtures/index.ts` — barrel file re-exporting all fixtures and expecteds.

**Removed**
- `tests/unit/sanity.test.ts` — replaced by real layout tests. Delete in the same commit as the new tests.

### Relevant Documentation — YOU SHOULD READ THESE BEFORE IMPLEMENTING

- [Vitest `expect.toEqual`](https://vitest.dev/api/expect.html#toequal) — deep-equality assertion. We use this instead of snapshots so the plan, not the implementation, defines correctness.
- [TypeScript — `exactOptionalPropertyTypes`](https://www.typescriptlang.org/tsconfig#exactOptionalPropertyTypes) — forbids passing `undefined` to an optional field. Matters when constructing `Ref` and optional `Commit` fields.
- [TypeScript — `noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess) — every `array[i]` is `T | undefined`. Dominates the implementation style; plan for narrowing.

### Patterns to Follow

**Naming & structure**
- Files: `kebab-case.ts` (e.g. `feature-branch.ts`, `long-lived-release.ts`).
- Types: `PascalCase`, `type` not `interface`. Example: `type LayoutResult = { ... }`.
- Exports: named only (no default exports for types/utility modules). `export function computeLayout`, `export type Commit`.
- Imports within `registry/git-graph/`: relative (`../types`). Do NOT set up `@/` alias here — the registry is CLI-installed into arbitrary consumer repos and must be self-contained. `@/` is an app-level convention, not a registry one.

**Purity**
- `computeLayout` must have no side effects, no `Date.now()`, no `Math.random()`, no mutation of inputs. The input `Commit[]` must not be mutated (freeze it in tests if you want belt-and-braces, but the function itself should defensively not mutate).
- No imports from `react`, `next`, `node:*`, or anything DOM-ish. Plain TypeScript only.

**Determinism**
- Given the same input array (same element order, same values), `computeLayout` must return deeply-equal output. Tiebreakers must be total orders, never `Set`/`Map` iteration order over user data.

**Testing**
- One `toEqual` test per fixture, asserting the full `LayoutResult` matches the hand-authored expected result from the fixture file. No snapshots.
- Invariant tests that run across all fixtures: determinism (two calls produce identical JSON), input immutability, row cardinality, `laneCount` consistency.
- Fixtures are plain TypeScript modules each exporting two named constants: a typed `Commit[]` input and a typed `LayoutResult` expected output. Use short hex-ish SHAs (`"m1"`, `"f1"`, `"a1"`; the layout engine doesn't care).

---

## IMPLEMENTATION PLAN

### Phase 2a — Types and tsconfig skeleton

Define the type surface and wire registry typechecking in before writing the algorithm, so the compiler catches mistakes during layout work.

### Phase 2b — Layout engine

Implement `computeLayout`. Start with the simplest fixture (linear) and grow until all six equality tests pass.

### Phase 2c — Fixtures and tests

Create the six fixture files (copying the hand-authored expected values from Task 7), write the test file, verify determinism.

### Phase 2d — Root typecheck wiring + CI verification

Add the root `tsconfig.json`, update the root `typecheck` script, confirm the CI `typecheck` job still passes.

### Phase 2e — PR and merge

Push, open PR, confirm all CI jobs green, merge.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable. cwd is `D:\repos\GitGraph` unless stated. Branch off `main`.

### 1. CREATE feature branch

- **IMPLEMENT**: `git checkout main && git pull --ff-only origin main && git checkout -b phase-2-layout-engine`
- **VALIDATE**: `git branch --show-current` → `phase-2-layout-engine`; `git status` clean.

### 2. CREATE `registry/git-graph/types.ts`

- **IMPLEMENT**:
  ```ts
  export type Ref = {
    name: string;
    kind: "branch" | "tag" | "remote-branch";
    isHead?: boolean;
  };

  export type Commit = {
    sha: string;
    parents: string[];
    author: { name: string; email?: string; avatarUrl?: string };
    message: string;
    timestamp: number | string;
    refs?: Ref[];
  };

  // Phase 2: `straight` = primary-parent edge (parents[0]),
  //          `merge`    = secondary-parent edge (parents[i>0]).
  // Phase 3 will add `fork` when bezier rendering needs to distinguish a
  // cross-lane primary-parent edge (branch tip rejoining ancestor lane) from
  // a same-lane one. For Phase 2, geometry is read off fromLane/toLane.
  export type EdgeKind = "straight" | "merge";

  export type LayoutRow = {
    commit: Commit;
    lane: number;
    rowIndex: number;
  };

  export type LayoutEdge = {
    fromSha: string;
    toSha: string;
    fromLane: number;
    toLane: number;
    fromRow: number;
    toRow: number;
    kind: EdgeKind;
  };

  export type LayoutResult = {
    rows: LayoutRow[];
    edges: LayoutEdge[];
    laneCount: number;
  };
  ```
- **PATTERN**: Shape mirrors PRD §7.3 and §10.2 exactly. Do not rename fields — `<GitGraph>` consumers will see these types verbatim.
- **GOTCHA**: `exactOptionalPropertyTypes` means `email?: string` forbids `{ email: undefined }`; you must omit the key instead. Fixtures must follow this rule.
- **VALIDATE**: File exists; `npx tsc --noEmit --strict registry/git-graph/types.ts` (one-off smoke) reports no errors.

### 3. CREATE `registry/git-graph/tsconfig.json`

- **IMPLEMENT**:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "noEmit": true,
      "incremental": false
    },
    "include": ["**/*.ts"],
    "exclude": ["node_modules"]
  }
  ```
- **GOTCHA**: We disable `incremental` here because there is no `.gitignore` entry specifically for `registry/`, and `.tsbuildinfo` at this path would pollute git status on a fresh run. Root `.gitignore` already ignores `*.tsbuildinfo` globally, so this is belt-and-braces; keeping it off is cheap.
- **VALIDATE**: `pnpm exec tsc -p registry/git-graph/tsconfig.json --noEmit` exits 0.

### 4. CREATE root `tsconfig.json`

- **IMPLEMENT**:
  ```json
  {
    "extends": "./tsconfig.base.json",
    "compilerOptions": {
      "noEmit": true,
      "incremental": false,
      "types": ["node"]
    },
    "include": ["registry/**/*.ts", "tests/**/*.ts"],
    "exclude": ["node_modules", "**/node_modules", "apps", "examples"]
  }
  ```
- **PURPOSE**: Gives `pnpm typecheck` a single entry point that covers registry source AND the Vitest test files, which are otherwise homeless (not in any workspace). `apps/` and `examples/` are excluded because each has its own tsconfig with a Next plugin that this root config should not try to resolve.
- **GOTCHA**: `types: ["node"]` prevents accidental DOM type leakage into layout code. `@types/node` is already a root devDep (pinned in `package.json`).
- **VALIDATE**: `pnpm exec tsc -p tsconfig.json --noEmit` exits 0 (the only file it currently sees is `registry/git-graph/types.ts` from task 2).

### 5. UPDATE root `package.json` `typecheck` script

- **IMPLEMENT**: Change the `"typecheck"` script from:
  ```json
  "typecheck": "pnpm -r --parallel typecheck"
  ```
  to:
  ```json
  "typecheck": "pnpm -r --parallel typecheck && tsc -p tsconfig.json --noEmit"
  ```
- **PATTERN**: Per-app typechecks (`apps/docs`, `examples/consumer-app`) still run via `-r --parallel` against their own tsconfigs. Root `tsc` pass adds coverage for `registry/` and `tests/`.
- **GOTCHA**: Order matters only in that the per-app pass is the more expensive one; running it first fails fast on the more common error surface.
- **VALIDATE**: `pnpm typecheck` exits 0. CI's `typecheck` job picks this up automatically — no workflow change required.

### 6. CREATE `registry/git-graph/lib/layout.ts`

- **IMPLEMENT**: Implement `computeLayout` per the algorithm below.

  ```ts
  import type { Commit, LayoutEdge, LayoutResult, LayoutRow } from "../types";

  export function computeLayout(commits: Commit[]): LayoutResult {
    // 1. Internal topological sort: children before parents.
    //    Tiebreakers, in order: timestamp desc (newer first), then sha asc
    //    for total-ordering determinism. Treat Commit.timestamp as a number;
    //    if it's a string, Date.parse it. Tie in timestamp falls through to
    //    sha asc.
    const sorted = topoSort(commits);

    // 2. Walk rows. Maintain `lanes: (string | null)[]` where lanes[i] is the
    //    sha of the commit expected next in lane i, or null if the lane is
    //    free. For each commit at rowIndex:
    //      a. Find ALL lanes whose reservation === commit.sha.
    //         - If non-empty: commit.lane = leftmost of those. Clear every
    //           reservation for this sha (the other reserved lanes
    //           "converge" into commit.lane; no extra edges emitted — the
    //           edges were already emitted when those lanes were reserved).
    //         - If empty: commit.lane = leftmost lane that is null (free),
    //           or append a new lane at the end.
    //      b. For parent[0] (if commit has any parents and that sha is in
    //         the input window): set lanes[commit.lane] = parent[0].
    //         Emit edge { fromSha: commit.sha, toSha: parent[0],
    //                     fromLane: commit.lane, fromRow: rowIndex,
    //                     kind: 'straight' }. toLane/toRow are filled in
    //         step 3.
    //      c. For each parent[i>0] (secondary, if in input window): set the
    //         leftmost free lane to parent[i] (append if none free). Emit
    //         edge with kind: 'merge', same toLane/toRow-unknown shape.
    //      d. If a parent sha is NOT in the input window, do not reserve a
    //         lane for it and do not emit an edge. This is realistic for
    //         `git log -n N` style windowed input.

    // 3. Post-pass: for each edge, look up the placed row for toSha; set
    //    edge.toLane = that row's lane, edge.toRow = that row's rowIndex.
    //    (Every toSha is guaranteed placed because we only emit edges for
    //    parents that are in the input window.)

    // 4. laneCount = max lane index referenced by any row + 1. If no rows,
    //    laneCount = 0. Edges referencing transiently-reserved-but-unplaced
    //    lanes are impossible given rule 2d.
  }

  // helpers: topoSort, etc. — all local, non-exported.
  ```

  Constraints the implementer must respect:
  - Input array is not mutated. Clone before sorting.
  - If a commit in `parents` references a sha not present in `commits`, treat it as "parent not in window" — do NOT emit an edge for it, and do NOT reserve a lane for it. This is a realistic case (consumer passes the last N commits of a long history).
  - If the input contains commits with duplicate shas, `computeLayout` may throw or may take the last occurrence; document whichever behavior you pick with a one-line comment in the function. Do NOT silently produce garbage.
  - Orphan roots (commit with `parents: []`) — the commit occupies its lane; that lane becomes free after placement.
- **PATTERN**: No existing layout code in the repo. This task establishes the pattern.
- **IMPORTS**: `import type { Commit, LayoutEdge, LayoutResult, LayoutRow } from "../types";` — type-only import so the compiled output has no runtime dependency on `types.ts`.
- **GOTCHA**: `noUncheckedIndexedAccess` means every `sorted[i]` is `Commit | undefined`. Either narrow with `if (!commit) continue;` or iterate with `for (const commit of sorted)`. The latter is cleaner.
- **GOTCHA**: `exactOptionalPropertyTypes` bites when constructing objects with conditionally-present optional fields. Build `Commit`-shaped objects by omitting absent keys rather than setting them to `undefined`.
- **VALIDATE**: `pnpm exec tsc -p tsconfig.json --noEmit` exits 0 (compile check; tests come next).

### 7. CREATE six fixture files under `tests/unit/fixtures/`

Each fixture file exports **two** named constants: the input `Commit[]` and the expected `LayoutResult`. The expected values below are worked out by hand in this plan; implementation correctness is defined as "makes these pass."

**Common scaffolding (every fixture file starts with this):**
```ts
import type { Commit, LayoutResult } from "../../../registry/git-graph/types";
const author = { name: "A" };
```

**Edge array ordering convention:** edges are emitted in the order the algorithm walks rows. For each row that has parents, the primary-parent edge (`straight`) is emitted first, then each secondary-parent edge (`merge`) in `parents` order. Expected arrays below follow this order; the implementation must match.

---

**`linear.ts`** — 4-commit chain. Topo order matches input order.

```ts
export const linearFixture: Commit[] = [
  { sha: "a4", parents: ["a3"], author, message: "fourth", timestamp: 4000 },
  { sha: "a3", parents: ["a2"], author, message: "third",  timestamp: 3000 },
  { sha: "a2", parents: ["a1"], author, message: "second", timestamp: 2000 },
  { sha: "a1", parents: [],     author, message: "first",  timestamp: 1000 },
];

export const linearExpected: LayoutResult = {
  rows: [
    { commit: linearFixture[0]!, lane: 0, rowIndex: 0 },
    { commit: linearFixture[1]!, lane: 0, rowIndex: 1 },
    { commit: linearFixture[2]!, lane: 0, rowIndex: 2 },
    { commit: linearFixture[3]!, lane: 0, rowIndex: 3 },
  ],
  edges: [
    { fromSha: "a4", toSha: "a3", fromLane: 0, toLane: 0, fromRow: 0, toRow: 1, kind: "straight" },
    { fromSha: "a3", toSha: "a2", fromLane: 0, toLane: 0, fromRow: 1, toRow: 2, kind: "straight" },
    { fromSha: "a2", toSha: "a1", fromLane: 0, toLane: 0, fromRow: 2, toRow: 3, kind: "straight" },
  ],
  laneCount: 1,
};
```

---

**`feature-branch.ts`** — main `m1..m3`, feature `f1..f2` branches off `m1` and merges into `m3`.

DAG: `m3 = merge(m2, f2)`; `m2 → m1`; `f2 → f1`; `f1 → m1`; `m1 = root`.
Timestamps: `m1=1000, f1=2000, m2=2500, f2=3000, m3=4000`.
Topo order (children-first, ts-desc tiebreak): `m3, f2, m2, f1, m1`.

```ts
export const featureBranchFixture: Commit[] = [
  { sha: "m1", parents: [],           author, message: "root",    timestamp: 1000 },
  { sha: "f1", parents: ["m1"],       author, message: "feat 1",  timestamp: 2000 },
  { sha: "m2", parents: ["m1"],       author, message: "main 2",  timestamp: 2500 },
  { sha: "f2", parents: ["f1"],       author, message: "feat 2",  timestamp: 3000 },
  { sha: "m3", parents: ["m2", "f2"], author, message: "merge",   timestamp: 4000 },
];

// Topo index into the sorted order: [m3, f2, m2, f1, m1]
export const featureBranchExpected: LayoutResult = {
  rows: [
    { commit: featureBranchFixture[4]!, lane: 0, rowIndex: 0 }, // m3
    { commit: featureBranchFixture[3]!, lane: 1, rowIndex: 1 }, // f2
    { commit: featureBranchFixture[2]!, lane: 0, rowIndex: 2 }, // m2
    { commit: featureBranchFixture[1]!, lane: 1, rowIndex: 3 }, // f1
    { commit: featureBranchFixture[0]!, lane: 0, rowIndex: 4 }, // m1
  ],
  edges: [
    { fromSha: "m3", toSha: "m2", fromLane: 0, toLane: 0, fromRow: 0, toRow: 2, kind: "straight" },
    { fromSha: "m3", toSha: "f2", fromLane: 0, toLane: 1, fromRow: 0, toRow: 1, kind: "merge"    },
    { fromSha: "f2", toSha: "f1", fromLane: 1, toLane: 1, fromRow: 1, toRow: 3, kind: "straight" },
    { fromSha: "m2", toSha: "m1", fromLane: 0, toLane: 0, fromRow: 2, toRow: 4, kind: "straight" },
    { fromSha: "f1", toSha: "m1", fromLane: 1, toLane: 0, fromRow: 3, toRow: 4, kind: "straight" },
  ],
  laneCount: 2,
};
```

Note the last edge `f1→m1`: cross-lane (1→0) but still `kind: "straight"` because it is a primary-parent link. Phase 3's bezier renderer will detect `fromLane !== toLane` and draw a curve.

---

**`merge.ts`** — minimal 2-parent merge, short history.

DAG: `m3 = merge(m2, f1)`; `m2 → m1`; `f1 → m1`; `m1 = root`.
Timestamps: `m1=1000, m2=2000, f1=2500, m3=3000`.
Topo order: `m3, f1, m2, m1`.

```ts
export const mergeFixture: Commit[] = [
  { sha: "m1", parents: [],           author, message: "root",  timestamp: 1000 },
  { sha: "m2", parents: ["m1"],       author, message: "m2",    timestamp: 2000 },
  { sha: "f1", parents: ["m1"],       author, message: "f1",    timestamp: 2500 },
  { sha: "m3", parents: ["m2", "f1"], author, message: "merge", timestamp: 3000 },
];

export const mergeExpected: LayoutResult = {
  rows: [
    { commit: mergeFixture[3]!, lane: 0, rowIndex: 0 }, // m3
    { commit: mergeFixture[2]!, lane: 1, rowIndex: 1 }, // f1
    { commit: mergeFixture[1]!, lane: 0, rowIndex: 2 }, // m2
    { commit: mergeFixture[0]!, lane: 0, rowIndex: 3 }, // m1
  ],
  edges: [
    { fromSha: "m3", toSha: "m2", fromLane: 0, toLane: 0, fromRow: 0, toRow: 2, kind: "straight" },
    { fromSha: "m3", toSha: "f1", fromLane: 0, toLane: 1, fromRow: 0, toRow: 1, kind: "merge"    },
    { fromSha: "f1", toSha: "m1", fromLane: 1, toLane: 0, fromRow: 1, toRow: 3, kind: "straight" },
    { fromSha: "m2", toSha: "m1", fromLane: 0, toLane: 0, fromRow: 2, toRow: 3, kind: "straight" },
  ],
  laneCount: 2,
};
```

---

**`octopus.ts`** — one commit with three parents.

DAG: `o = merge(a, b, c)`; `a, b, c → root`.
Timestamps: `root=1000, a=2000, b=2100, c=2200, o=3000`.
Topo order: `o, c, b, a, root`.

```ts
export const octopusFixture: Commit[] = [
  { sha: "rt", parents: [],                author, message: "root",    timestamp: 1000 },
  { sha: "a",  parents: ["rt"],            author, message: "a",       timestamp: 2000 },
  { sha: "b",  parents: ["rt"],            author, message: "b",       timestamp: 2100 },
  { sha: "c",  parents: ["rt"],            author, message: "c",       timestamp: 2200 },
  { sha: "o",  parents: ["a", "b", "c"],   author, message: "octopus", timestamp: 3000 },
];

export const octopusExpected: LayoutResult = {
  rows: [
    { commit: octopusFixture[4]!, lane: 0, rowIndex: 0 }, // o
    { commit: octopusFixture[3]!, lane: 2, rowIndex: 1 }, // c
    { commit: octopusFixture[2]!, lane: 1, rowIndex: 2 }, // b
    { commit: octopusFixture[1]!, lane: 0, rowIndex: 3 }, // a
    { commit: octopusFixture[0]!, lane: 0, rowIndex: 4 }, // rt
  ],
  edges: [
    { fromSha: "o", toSha: "a",  fromLane: 0, toLane: 0, fromRow: 0, toRow: 3, kind: "straight" },
    { fromSha: "o", toSha: "b",  fromLane: 0, toLane: 1, fromRow: 0, toRow: 2, kind: "merge"    },
    { fromSha: "o", toSha: "c",  fromLane: 0, toLane: 2, fromRow: 0, toRow: 1, kind: "merge"    },
    { fromSha: "c", toSha: "rt", fromLane: 2, toLane: 0, fromRow: 1, toRow: 4, kind: "straight" },
    { fromSha: "b", toSha: "rt", fromLane: 1, toLane: 0, fromRow: 2, toRow: 4, kind: "straight" },
    { fromSha: "a", toSha: "rt", fromLane: 0, toLane: 0, fromRow: 3, toRow: 4, kind: "straight" },
  ],
  laneCount: 3,
};
```

---

**`orphan.ts`** — two disjoint chains, no common ancestor.

Chain A: `a2 → a1` (root). Chain B: `b2 → b1` (root).
Timestamps: `a1=1000, b1=1500, a2=2000, b2=2500`.
Topo order: `b2, a2, b1, a1`.

```ts
export const orphanFixture: Commit[] = [
  { sha: "a1", parents: [],     author, message: "a root", timestamp: 1000 },
  { sha: "b1", parents: [],     author, message: "b root", timestamp: 1500 },
  { sha: "a2", parents: ["a1"], author, message: "a tip",  timestamp: 2000 },
  { sha: "b2", parents: ["b1"], author, message: "b tip",  timestamp: 2500 },
];

export const orphanExpected: LayoutResult = {
  rows: [
    { commit: orphanFixture[3]!, lane: 0, rowIndex: 0 }, // b2
    { commit: orphanFixture[2]!, lane: 1, rowIndex: 1 }, // a2
    { commit: orphanFixture[1]!, lane: 0, rowIndex: 2 }, // b1
    { commit: orphanFixture[0]!, lane: 1, rowIndex: 3 }, // a1
  ],
  edges: [
    { fromSha: "b2", toSha: "b1", fromLane: 0, toLane: 0, fromRow: 0, toRow: 2, kind: "straight" },
    { fromSha: "a2", toSha: "a1", fromLane: 1, toLane: 1, fromRow: 1, toRow: 3, kind: "straight" },
  ],
  laneCount: 2,
};
```

Rationale: `b2` lands at row 0 on lane 0, reserving lane 0 for `b1`. `a2` at row 1 has no reservation for itself; lane 0 is occupied (reserved for `b1`), so it takes lane 1.

---

**`long-lived-release.ts`** — main `m1..m5`, release `r1..r4` parallel, one hotfix merge.

DAG:
- `m5 → m4`
- `m4 = merge(m3, r2)`   ← hotfix merge from release into main
- `m3 → m2 → m1`
- `r4 → r3 → r2 → r1 → m1`
- `m1 = root`

Timestamps: `m1=1000, r1=1500, m2=2000, r2=2500, m3=3000, r3=3500, m4=4000, r4=4500, m5=5000`.
Topo order: `m5, r4, m4, r3, m3, r2, m2, r1, m1`.

Walk highlights:
- Row 0: `m5` → lane 0; reserve lane 0 for `m4`.
- Row 1: `r4` → lane 1 (fresh); reserve lane 1 for `r3`.
- Row 2: `m4` → lane 0; primary `m3` reserves lane 0; secondary `r2` reserves leftmost free = **lane 2**.
- Row 3: `r3` → lane 1; reserves lane 1 for `r2` (now `r2` is reserved on both lanes 1 and 2).
- Row 4: `r2` → leftmost reserving lane = **lane 1**; clears both reservations; reserves lane 1 for `r1`.
- Row 5: `m3` → lane 0; reserves for `m2`.
- Row 6: `m2` → lane 0; reserves for `m1`.
- Row 7: `r1` → lane 1; reserves lane 1 for `m1` (now reserved on both lanes 0 and 1).
- Row 8: `m1` → leftmost reserving lane = lane 0; clears both.

Lane 2 is transiently reserved at row 2 but no commit is ever placed on it, so `laneCount = 2`.

```ts
export const longLivedReleaseFixture: Commit[] = [
  { sha: "m1", parents: [],           author, message: "root",       timestamp: 1000 },
  { sha: "r1", parents: ["m1"],       author, message: "rel branch", timestamp: 1500 },
  { sha: "m2", parents: ["m1"],       author, message: "main 2",     timestamp: 2000 },
  { sha: "r2", parents: ["r1"],       author, message: "rel 2",      timestamp: 2500 },
  { sha: "m3", parents: ["m2"],       author, message: "main 3",     timestamp: 3000 },
  { sha: "r3", parents: ["r2"],       author, message: "rel 3",      timestamp: 3500 },
  { sha: "m4", parents: ["m3", "r2"], author, message: "hotfix",     timestamp: 4000 },
  { sha: "r4", parents: ["r3"],       author, message: "rel tip",    timestamp: 4500 },
  { sha: "m5", parents: ["m4"],       author, message: "main tip",   timestamp: 5000 },
];

export const longLivedReleaseExpected: LayoutResult = {
  rows: [
    { commit: longLivedReleaseFixture[8]!, lane: 0, rowIndex: 0 }, // m5
    { commit: longLivedReleaseFixture[7]!, lane: 1, rowIndex: 1 }, // r4
    { commit: longLivedReleaseFixture[6]!, lane: 0, rowIndex: 2 }, // m4
    { commit: longLivedReleaseFixture[5]!, lane: 1, rowIndex: 3 }, // r3
    { commit: longLivedReleaseFixture[3]!, lane: 1, rowIndex: 4 }, // r2
    { commit: longLivedReleaseFixture[4]!, lane: 0, rowIndex: 5 }, // m3
    { commit: longLivedReleaseFixture[2]!, lane: 0, rowIndex: 6 }, // m2
    { commit: longLivedReleaseFixture[1]!, lane: 1, rowIndex: 7 }, // r1
    { commit: longLivedReleaseFixture[0]!, lane: 0, rowIndex: 8 }, // m1
  ],
  edges: [
    { fromSha: "m5", toSha: "m4", fromLane: 0, toLane: 0, fromRow: 0, toRow: 2, kind: "straight" },
    { fromSha: "r4", toSha: "r3", fromLane: 1, toLane: 1, fromRow: 1, toRow: 3, kind: "straight" },
    { fromSha: "m4", toSha: "m3", fromLane: 0, toLane: 0, fromRow: 2, toRow: 5, kind: "straight" },
    { fromSha: "m4", toSha: "r2", fromLane: 0, toLane: 1, fromRow: 2, toRow: 4, kind: "merge"    },
    { fromSha: "r3", toSha: "r2", fromLane: 1, toLane: 1, fromRow: 3, toRow: 4, kind: "straight" },
    { fromSha: "r2", toSha: "r1", fromLane: 1, toLane: 1, fromRow: 4, toRow: 7, kind: "straight" },
    { fromSha: "m3", toSha: "m2", fromLane: 0, toLane: 0, fromRow: 5, toRow: 6, kind: "straight" },
    { fromSha: "m2", toSha: "m1", fromLane: 0, toLane: 0, fromRow: 6, toRow: 8, kind: "straight" },
    { fromSha: "r1", toSha: "m1", fromLane: 1, toLane: 0, fromRow: 7, toRow: 8, kind: "straight" },
  ],
  laneCount: 2,
};
```

---

**Fixture rules (recap):**
- Every fixture file imports `Commit` and `LayoutResult` from `../../../registry/git-graph/types`.
- Every fixture exports `<name>Fixture` and `<name>Expected`. No default exports.
- `author` constant is local to each file (`{ name: "A" }`) to avoid `exactOptionalPropertyTypes` friction on `email` / `avatarUrl`.
- SHAs are 1–3 char strings. The algorithm does not care about sha format.
- Timestamps are ascending integers. Don't use strings unless explicitly testing string-timestamp handling (no such test in Phase 2).

- **GOTCHA**: `noUncheckedIndexedAccess` makes `linearFixture[0]` typed as `Commit | undefined`. The non-null assertion `!` in the expected blocks is intentional and safe — the fixture length is known at authoring time. Do not rewrite these to be "safer"; the `!` is the terse idiomatic form here and a runtime guard would just fail later on the same condition.
- **GOTCHA**: The relative import path from `tests/unit/fixtures/` to registry types is `../../../registry/git-graph/types` — three levels up.
- **VALIDATE**: `pnpm exec tsc -p tsconfig.json --noEmit` exits 0 with all six fixture files present.

### 8. CREATE `tests/unit/fixtures/index.ts`

- **IMPLEMENT**:
  ```ts
  export { linearFixture, linearExpected } from "./linear";
  export { featureBranchFixture, featureBranchExpected } from "./feature-branch";
  export { mergeFixture, mergeExpected } from "./merge";
  export { octopusFixture, octopusExpected } from "./octopus";
  export { orphanFixture, orphanExpected } from "./orphan";
  export { longLivedReleaseFixture, longLivedReleaseExpected } from "./long-lived-release";
  ```
- **VALIDATE**: Typechecks; imports resolve.

### 9. DELETE `tests/unit/sanity.test.ts`

- **IMPLEMENT**: `git rm tests/unit/sanity.test.ts`
- **RATIONALE**: It existed only to guarantee `vitest run` exited 0 during Phase 1. Real tests arrive in the next task.
- **VALIDATE**: `git status` shows the deletion staged.

### 10. CREATE `tests/unit/layout.test.ts`

- **IMPLEMENT**:
  ```ts
  import { describe, expect, test } from "vitest";
  import { computeLayout } from "../../registry/git-graph/lib/layout";
  import {
    featureBranchExpected,
    featureBranchFixture,
    linearExpected,
    linearFixture,
    longLivedReleaseExpected,
    longLivedReleaseFixture,
    mergeExpected,
    mergeFixture,
    octopusExpected,
    octopusFixture,
    orphanExpected,
    orphanFixture,
  } from "./fixtures";
  import type { Commit, LayoutResult } from "../../registry/git-graph/types";

  const cases: Array<[name: string, input: Commit[], expected: LayoutResult]> = [
    ["linear",              linearFixture,            linearExpected],
    ["feature-branch",      featureBranchFixture,     featureBranchExpected],
    ["merge",               mergeFixture,             mergeExpected],
    ["octopus",             octopusFixture,           octopusExpected],
    ["orphan",              orphanFixture,            orphanExpected],
    ["long-lived-release",  longLivedReleaseFixture,  longLivedReleaseExpected],
  ];

  describe("computeLayout — fixtures", () => {
    for (const [name, input, expected] of cases) {
      test(`${name} matches expected layout`, () => {
        expect(computeLayout(input)).toEqual(expected);
      });
    }
  });

  describe("computeLayout — invariants", () => {
    test("is deterministic across repeated calls", () => {
      for (const [name, input] of cases) {
        const a = JSON.stringify(computeLayout(input));
        const b = JSON.stringify(computeLayout(input));
        expect(a, `fixture ${name} drifted between runs`).toBe(b);
      }
    });

    test("does not mutate its input", () => {
      const snapshot = structuredClone(longLivedReleaseFixture);
      computeLayout(longLivedReleaseFixture);
      expect(longLivedReleaseFixture).toEqual(snapshot);
    });

    test("places every commit exactly once", () => {
      for (const [name, input] of cases) {
        const result = computeLayout(input);
        expect(result.rows, `fixture ${name}`).toHaveLength(input.length);
        const shas = new Set(result.rows.map((r) => r.commit.sha));
        expect(shas.size, `fixture ${name} has duplicate rows`).toBe(input.length);
      }
    });

    test("laneCount equals max row lane + 1", () => {
      for (const [name, input] of cases) {
        const result = computeLayout(input);
        const maxLane = Math.max(-1, ...result.rows.map((r) => r.lane));
        expect(result.laneCount, `fixture ${name}`).toBe(maxLane + 1);
      }
    });
  });
  ```
- **GOTCHA**: `toEqual` is deep-equal including array order. The plan specifies an edge ordering convention (row-order, primary-first). The implementation MUST match — don't push primary/merge edges into different buckets and concat.
- **GOTCHA**: Orphan fixture intentionally places `b2` on lane 0 before `a2`, due to ts-desc tiebreak (b2=2500 > a2=2000). If your impl produces `a2` on lane 0 and `b2` on lane 1, the tiebreak is wrong — fix the sort, don't edit the fixture.
- **VALIDATE**: `pnpm test` — 10 tests pass (6 fixture equality + 4 invariants).

### 11. RUN full validation suite locally

- **IMPLEMENT**:
  ```bash
  pnpm install --frozen-lockfile
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm test:e2e --project=chromium
  ```
  (E2E against chromium only is enough for a non-UI phase; full 3-browser runs in CI.)
- **VALIDATE**: All four exit 0. If lint complains about the new files, fix the lint — do NOT disable rules.

### 12. COMMIT

- **IMPLEMENT**:
  ```bash
  git add registry/ tests/unit/ tsconfig.json package.json
  git status      # confirm nothing unexpected; sanity.test.ts should be staged as deleted
  git commit -m "Phase 2: layout engine, types, fixtures, equality + invariant tests"
  ```
- **GOTCHA**: Do not `git add -A` — the repo's convention (CLAUDE.md) is to stage specific paths to avoid accidentally committing local junk (`.claude/`, editor state).
- **VALIDATE**: `git log -1 --stat` shows new files under `registry/git-graph/`, `tests/unit/`, plus root `tsconfig.json` and modified `package.json`, and deletion of `tests/unit/sanity.test.ts`.

### 13. CONFIRM before pushing branch

- **IMPLEMENT**: Pause and ask the user to approve the branch push. Show the user `git log --oneline main..HEAD` and `git diff --stat main..HEAD` before the ask.
- **ON APPROVAL**: `git push -u origin phase-2-layout-engine`
- **VALIDATE**: `gh run list --branch phase-2-layout-engine --limit 1` shows the CI workflow queued or running.

### 14. CONFIRM before opening PR

- **IMPLEMENT**: Pause and ask the user to approve opening the PR.
- **ON APPROVAL**:
  ```bash
  gh pr create --title "Phase 2: layout engine" --body "$(cat <<'EOF'
  ## Summary
  - `computeLayout` pure function + types at `registry/git-graph/`
  - Six hand-authored fixtures, each colocating input + expected `LayoutResult`
  - Deep-equality tests (not snapshots) — plan defines correctness, not first-run output
  - Determinism + input-immutability + row-cardinality + laneCount invariants
  - Root `tsconfig.json` so `pnpm typecheck` covers `registry/` and `tests/`
  - Replaces Phase 1 sanity test
  - `EdgeKind` is `'straight' | 'merge'` for Phase 2; `'fork'` deferred to Phase 3 (bezier)

  ## Deferred
  - Real-repo fixtures (React, Linux, etc.) → Phase 2.5
  - `fromGitLog()` helper → Phase 2.5
  - Bezier geometry + `fork` edge kind → Phase 3 (gutter primitive)
  - Property-based tests with fast-check → backlog

  ## Test plan
  - [ ] `pnpm lint` green
  - [ ] `pnpm typecheck` green (now covers `registry/` + `tests/`)
  - [ ] `pnpm test` — 10 tests pass (6 equality + 4 invariants)
  - [ ] `pnpm test:e2e` — existing smoke still green on all 3 browsers
  EOF
  )"
  ```
- **VALIDATE**: PR URL returned; `gh pr checks` shows the 4 CI jobs (lint, typecheck, unit, e2e×3) running or green.

### 15. CONFIRM before merging

- **IMPLEMENT**: Wait for all CI jobs green. Pause and ask the user to approve the merge.
- **ON APPROVAL**: `gh pr merge --squash --delete-branch`
- **VALIDATE**:
  - `git checkout main && git pull --ff-only` shows the new squash commit on main.
  - `pnpm test` still passes on main.

---

## TESTING STRATEGY

### Unit Tests

Vitest, `tests/unit/layout.test.ts`. Two kinds:

1. **Equality tests** — one per fixture. `expect(computeLayout(input)).toEqual(expected)` where `expected` is hand-authored in the fixture file. No snapshots; the plan is the source of truth.
2. **Invariant tests** — properties that must hold for ALL fixtures, checked in a loop:
   - Determinism: `JSON.stringify(computeLayout(f))` identical across two calls.
   - Input immutability: fixture identical before/after.
   - Row cardinality: one row per input commit, no duplicates.
   - `laneCount === max(row.lane) + 1`.

### Integration Tests

None for Phase 2. The existing Playwright smoke test (consumer app title) still runs in CI to confirm no regression in the app scaffolding. Real integration tests for the component arrive in Phase 3 (gutter) and Phase 4 (headline table).

### Edge Cases

Explicitly covered by the six fixtures:

- Linear history (no branching)
- Feature branch forked from early commit, merged back
- Explicit 2-parent merge
- 3-parent (octopus) merge
- Multiple disjoint roots (orphan histories merged into same log window)
- Long-lived parallel branch with one partial merge

Explicitly NOT covered in Phase 2 (deferred):

- Real-world repos with 1000s of commits (Phase 2.5)
- Performance characteristics under large N (Phase 5)
- Malformed input (unknown parent sha, duplicate sha, cycle) — add `errors.spec.ts` in Phase 5 per PRD §12

Implementation note: `computeLayout` must handle "parent sha not in window" gracefully (don't emit an edge). It is allowed to throw on duplicate shas or detected cycles; document whichever behavior you pick inline.

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
Expect: 10 passed (6 fixture equality tests + 4 invariant tests).

### Level 3: Integration Tests
```bash
pnpm test:e2e --project=chromium
```
Expect: existing smoke still green. Phase 2 adds no E2E coverage.

### Level 4: Manual Validation

No manual inspection step is needed — the expected `LayoutResult` for each fixture is hand-authored in the plan and colocated in the fixture file. Test failures point directly at a mismatch line; Vitest's diff output names the offending field.

If a fixture's expected value turns out to be wrong on review, fix the plan AND the fixture in the same commit. Do not silently update the expected value to match buggy implementation output — that's the exact failure mode we removed snapshots to avoid.

### Level 5: Post-merge Validation
```bash
git checkout main
git pull --ff-only
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test
```
Expect: all green on main post-merge.

---

## ACCEPTANCE CRITERIA

- [ ] `registry/git-graph/types.ts` exports `Commit`, `Ref`, `LayoutResult`, `LayoutRow`, `LayoutEdge`, `EdgeKind` — exact names, no renames.
- [ ] `registry/git-graph/lib/layout.ts` exports exactly one function: `computeLayout(commits: Commit[]): LayoutResult`.
- [ ] `computeLayout` has zero runtime dependencies outside its own module and `../types`.
- [ ] `registry/git-graph/tsconfig.json` exists and extends `tsconfig.base.json`.
- [ ] Root `tsconfig.json` covers `registry/**` and `tests/**`; `pnpm typecheck` passes on it.
- [ ] Root `package.json` `typecheck` script runs both the per-app recursive pass and the root `tsc` pass.
- [ ] Six fixtures exist at `tests/unit/fixtures/{linear,feature-branch,merge,octopus,orphan,long-lived-release}.ts`, each exporting `<name>Fixture` (input `Commit[]`) and `<name>Expected` (hand-authored `LayoutResult`).
- [ ] `tests/unit/layout.test.ts` has 6 equality tests (`toEqual`) + 4 invariant tests; all pass.
- [ ] No snapshot files exist under `tests/unit/__snapshots__/`.
- [ ] `tests/unit/sanity.test.ts` is deleted.
- [ ] `EdgeKind` is `'straight' | 'merge'` (no `'fork'` in Phase 2).
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e --project=chromium` all exit 0 locally.
- [ ] CI green on the PR (lint, typecheck, unit, e2e×3).
- [ ] No component code (React/SVG/Tailwind) added — Phase 2 is pure layout only.
- [ ] No new runtime deps added to any `package.json`.

---

## COMPLETION CHECKLIST

- [ ] All 15 tasks completed in order.
- [ ] Each task's VALIDATE step passed immediately.
- [ ] All Level 1–5 validation commands pass.
- [ ] All six fixture equality tests pass on first run with the plan's hand-authored expected values.
- [ ] Determinism test green on a re-run.
- [ ] PR open → all CI jobs green → merged.
- [ ] No Phase 3 concerns (bezier, SVG, React, `fork` edge kind) leaked into Phase 2.

---

## NOTES

### Design decisions locked in this phase

- **Types at `registry/git-graph/types.ts`**, not `git-graph.types.ts`. Cleaner for later `lib/` neighbors.
- **Algorithm tiebreaker order**: topological (children-first) → `timestamp` desc → `sha` asc. Sha as the last resort guarantees a total order, which is required for determinism.
- **Edge classification (Phase 2)**: `straight` = primary-parent edge (`parents[0]`); `merge` = secondary-parent edge (`parents[i>0]`). Semantic, not geometric — a `straight` edge may cross lanes. Phase 3 introduces `fork` when bezier rendering needs to distinguish cross-lane primary-parent edges from same-lane ones; until rendering exists, adding `fork` just creates an ambiguity surface.
- **Primary parent = `parents[0]`**. This matches Git's convention (first parent of a merge is "mainline").
- **Edge emission order**: rows walked top-to-bottom; within each row's emission, primary-parent edge first, then secondary-parent edges in `parents` order. This is tested via `toEqual` array-order equality.
- **Unknown parents are silently ignored** (no edge emitted, no lane reserved). Realistic for windowed `git log` input.
- **Duplicate shas are implementation-defined** — the function may throw or use last-wins. Document inline. None of the six fixtures contain duplicates.
- **Transient lane reservations**: a lane may be reserved for a parent sha and then "converge" into an earlier lane when that parent is placed. If no commit is ever placed on that lane, it does not count toward `laneCount`. `long-lived-release` exercises this (lane 2 transiently reserved at row 2, laneCount=2).
- **Tests use `toEqual`, not `toMatchSnapshot`**. Expected results are hand-authored in the plan. This breaks the circularity where first-run output becomes truth.
- **Internal topo-sort is mandatory**. Consumers should not need to pre-sort.

### Deferred / backlog

- **Real-repo fixtures** (React, Linux, shadcn/ui, Next.js, TypeScript) — Phase 2.5. This is a separate, small phase because the fixtures are large (capture `git log --format` output, parse into `Commit[]`, compare) and the risk surface (layout bugs under real-world data) is different from the synthetic cases.
- **`fromGitLog()` helper** — Phase 2.5, alongside real-repo fixtures that need it.
- **Bezier path math (`lib/bezier.ts`)** — Phase 3. Pure geometry; takes a `LayoutEdge` + row height + lane width and returns an SVG path string. No React. Phase 3 consumes it.
- **Property-based testing with `fast-check`** — future nice-to-have. Randomly generate DAGs and assert invariants (no cycles in output, every edge references existing rows, `laneCount` correct, determinism). Low priority until a real bug motivates it.
- **Performance benchmarks** — Phase 5 (virtualization) is where 10k-commit performance gets real attention. Phase 2 is correctness-first.

### Confidence score

**10/10** for one-pass execution. The hand-authored expected results for all six fixtures — including the tricky `long-lived-release` and `octopus` cases — are worked out step-by-step in Task 7. The implementer's job is purely "produce this output for this input," with no room for ambiguity about what "correct" means. `EdgeKind` is reduced to two variants so there's no edge-classification gray zone. Tiebreaker order is a total order, so sort determinism is guaranteed. Edge emission order is specified.

The remaining sources of risk are all purely mechanical — a typo in the expected values, an off-by-one in `toRow` — and those will fail tests with a precise diff pointing at the exact line to fix.
