# Feature: phase-4-headline-table — `<GitGraph>` headline component

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Phase 4 of GitGraph (per `docs/PRD.md` §12.4). Composes the Phase 3 `<GitGraphGutter>` SVG primitive with a virtualization-free metadata table to ship the headline `<GitGraph>` component — the 80% drop-in case for consumers. Renders, for each commit row: graph node (gutter) + short sha + message + author + relative date + ref badges. Adds row hover, click, and selection (controlled + uncontrolled), an opt-in working-tree row at the top, and pixel-perfect alignment between gutter node centers and metadata row baselines.

Virtualization, animation, and the docs site demo page are explicitly **deferred to Phase 5** (PRD §12.5). The example app (`/graph` route) remains the E2E host.

## User Story

As a product developer using shadcn/ui,
I want a single `<GitGraph commits={...} />` that renders graph + metadata in one aligned table,
So that I can drop a high-quality commit visualization into a dashboard or code-review UI in one component, with click/hover/select behavior I can wire to my own routes or detail panels.

## Problem Statement

Phase 3 shipped the SVG gutter primitive but it's just the left column. A consumer who wants the GitKraken-style "graph + table" view today has to compose `<GitGraphGutter>` themselves with hand-written row markup, manually keep row heights in sync, and re-implement hover/select state. That defeats the "drop-in" promise of the registry.

## Solution Statement

Add `registry/git-graph/git-graph.tsx`, a default-exported `<GitGraph>` that:

- Owns the layout call (`computeLayout(commits)`), so consumers pass raw `Commit[]`.
- Renders a CSS-Grid container: column 1 is the absolutely-positioned gutter SVG; column 2 is a stack of fixed-`rowHeight` row divs with hash/message/author/date/refs cells.
- Aligns gutter node centers with row vertical centers by reusing the same `rowHeight` for the SVG row stride and the row div height.
- Handles hover/select state with the React-canonical controlled+uncontrolled pattern (`selectedSha` / `defaultSelectedSha` / `onSelectChange`, plus `onCommitClick` and `onCommitHover` for one-shot callbacks).
- Synthesizes a working-tree row when `showWorkingTreeRow` is true, parented at `head`, before computing layout.
- Renders ref badges with three visual kinds (`branch`, `tag`, `remote-branch`) and a HEAD treatment (outline + bold) layered on top of the kind.

No virtualization (Phase 5). No animation (Phase 5). No `<GitGraph.Row>` compound slots (deferred — the headline component is a leaf in Phase 4; advanced users keep using `<GitGraphGutter>` directly).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `registry/git-graph/` (new headline component, CSS additions), `examples/consumer-app/app/graph/` (new routes), `tests/e2e/` (new specs), `tests/unit/fixtures/` (refs fixture)
**Dependencies**: None new. `clsx` is already a transitive (used by consumer-app); we'll keep the headline component dependency-free and inline simple class composition.

---

## Manual Steps Required

None. All work is local file edits + `pnpm` script invocations against the existing workspace.

GitHub Pages is already enabled (one-time toggle done 2026-04-24, see `memory/project_pages_manual_toggle.md`); Phase 4 does not touch the registry endpoint.

---

## Inherited findings

From `.agents/code-reviews/phase-3-gutter-primitive.md`:

- **Findings #1, #2, #5, #6 (key collision, edge-lane validation gap, sync-script ordering, redundant `xmlns`)** were addressed pre-merge; verified against the merged tree (`registry/git-graph/git-graph-gutter.tsx`, `scripts/sync-registry.mjs`). No carry-forward action needed.
- **Finding #3 (bezier `straight` invariant)** addressed via comment at `registry/git-graph/lib/bezier.ts:27-30`. No action.
- **Finding #4 (rowHeight coupling comment in geometry test)** addressed at `tests/e2e/gutter-screenshots.spec.ts:52-53`. **Phase 4 inherits this coupling** for the new alignment spec — when writing `tests/e2e/graph-alignment.spec.ts`, mirror the same coupling comment so a future `DEFAULTS.rowHeight` change has both call-sites visible.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `registry/git-graph/types.ts` (entire file, 45 lines) — Why: `Commit`, `Ref`, `LayoutResult`, `LayoutRow`, `LayoutEdge`, `EdgeKind` are the contracts you'll import. Note `parents: string[]`, `refs?: Ref[]`, `Ref.isHead?`. **Add no new exported types here unless an existing one needs widening.**
- `registry/git-graph/git-graph-gutter.tsx` (entire file, 110 lines) — Why: this is the primitive you compose. Note: it sizes itself to `laneCount * laneWidth` × `rows.length * rowHeight`, has `data-testid="git-graph-gutter"`, and emits `circle[data-sha][data-row-index][data-lane]`. **Reuse the same `DEFAULTS` constants** (laneWidth: 16, rowHeight: 40, nodeRadius: 5, strokeWidth: 1.5) — do not redefine.
- `registry/git-graph/lib/bezier.ts` (lines 41-47) — Why: `centerX(lane, laneWidth)` and `centerY(row, rowHeight)` are exported helpers; reuse them for any geometry the headline needs (e.g. alignment-test math).
- `registry/git-graph/lib/layout.ts` (whole file) — Why: `computeLayout(commits)` is the function you'll call. **Read it once** to understand: it topo-sorts and emits rows in display order (row 0 = top, newest commit). The headline component must pass commits through unchanged; no pre-sort.
- `registry/git-graph/git-graph.css` (entire file, 40 lines) — Why: existing CSS variable conventions (`--graph-branch-1..8`, `--graph-node-radius`, `--graph-lane-width`, `--graph-row-height`). **You will append new tokens** for row-hover/row-selected/ref-badge — match the naming and `:root` + `@media (prefers-color-scheme: dark)` block structure.
- `examples/consumer-app/app/gutter/page.tsx` (entire file, 67 lines) — Why: the pattern for the new `/graph` route (fixture map, `data-testid="fixture-<name>"`, theme-flip button if applicable). **Mirror its structure** for the new `/graph` route to keep the gallery pages consistent.
- `examples/consumer-app/app/globals.css` (lines 1-2) — Why: imports `../components/git-graph/git-graph.css`. New CSS tokens you add to the registry CSS will surface automatically — no globals.css change needed unless you introduce a *second* CSS file in the registry (don't).
- `tests/unit/fixtures/feature-branch.ts` (entire file) — Why: fixture authoring style (typed `Commit[]` + hand-authored `LayoutResult` expected, `author` const reused). The new refs fixture follows this skeleton but does NOT need a hand-authored `LayoutResult` (refs don't affect layout, and a layout-equality test is not Phase 4 scope).
- `tests/unit/fixtures/index.ts` — Why: fixture barrel; **add the new fixture export here** so the consumer-app page imports stay one-line.
- `tests/e2e/gutter-screenshots.spec.ts` (lines 40-58) — Why: pattern for DOM-attribute-based geometry assertions (the alignment test will mirror this style). Note the chromium-only + linux-only `test.skip` gates.
- `tests/e2e/gutter-theming.spec.ts` (whole file) — Why: pattern for runtime CSS-variable tests. The new ref-badge styling spec uses the same approach.
- `playwright.config.ts` (entire file, 26 lines) — Why: 3-browser matrix; baseURL is `http://localhost:3100`; webServer auto-runs `consumer-app dev`. No config changes needed.
- `scripts/sync-registry.mjs` (entire file) — Why: copies `registry/git-graph/**/*.{ts,tsx,css}` into `examples/consumer-app/components/git-graph/`. **Skips `*.test.ts`**, so unit tests for headline behavior must go under `tests/unit/`, not in `registry/`. Already runs as `pre*` script for dev/build/lint/typecheck.
- `tsconfig.base.json` + `tsconfig.json` — Why: root tsc covers `registry/**/*.ts` and `tests/**/*.ts`. Strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` are on — array index access yields `T | undefined`, optional props can't be set to `undefined` literally. New code must satisfy these.
- `CLAUDE.md` — Why: file naming (kebab-case), `type` over `interface`, default exports for components, `*.test.ts`/`*.spec.ts` convention, **Playwright SVG `toBeVisible()` is unreliable** — use attribute-based assertions on stroke-only paths.
- `.agents/code-reviews/phase-3-gutter-primitive.md` — Why: inherited findings (already addressed, but the rowHeight-coupling comment pattern is reused in Phase 4).

### New Files to Create

- `registry/git-graph/git-graph.tsx` — Headline `<GitGraph>` component (default export). Composes gutter + metadata grid.
- `registry/git-graph/lib/format.ts` — Tiny pure helpers: `shortSha(sha: string): string`, `relativeTime(ts: number | string, now?: number): string`. Deterministic — `relativeTime` accepts a `now` override so tests can pin time.
- `registry/git-graph/lib/working-tree.ts` — `synthesizeWorkingTreeCommit(head: string | undefined): Commit` and `WORKING_TREE_SHA` constant. Pure.
- `tests/unit/fixtures/with-refs.ts` — `Commit[]` fixture with branch/tag/HEAD/remote-branch refs across multiple commits. No hand-authored `LayoutResult` — refs don't affect layout.
- `tests/unit/format.test.ts` — Vitest for `shortSha` and `relativeTime`.
- `tests/unit/working-tree.test.ts` — Vitest for synthesis (sha matches `WORKING_TREE_SHA`, parents = `[head]` when head present, parents = `[]` when undefined).
- `examples/consumer-app/app/graph/page.tsx` — Fixture gallery for headline `<GitGraph>` against all six layout fixtures + the new refs fixture.
- `examples/consumer-app/app/graph/interactions/page.tsx` — Controlled-selection echo page for E2E (renders fixture, echoes `lastClickedSha` / `lastHoverSha` to a `data-testid="echo"` panel, exposes a button that flips a controlled `selectedSha`).
- `examples/consumer-app/app/graph/working-tree/page.tsx` — Toggleable `showWorkingTreeRow` page for E2E.
- `tests/e2e/graph-render.spec.ts` — Renders each fixture, asserts row count = commit count (or commit count + 1 when working-tree row is on), asserts gutter is present and metadata cells are present per row.
- `tests/e2e/graph-interactions.spec.ts` — Click → echo updates; hover → echo updates; controlled `selectedSha` round-trip; `data-selected="true"` attribute moves correctly.
- `tests/e2e/graph-refs.spec.ts` — Ref badge kinds render with correct `data-ref-kind` attribute and the HEAD ref carries `data-head="true"`. CSS-variable-driven color verified by reading computed styles (mirror `gutter-theming.spec.ts`).
- `tests/e2e/graph-working-tree.spec.ts` — Toggle button shows/hides the working-tree row; when shown, it sits at `data-row-index="0"` with the synthetic sha.
- `tests/e2e/graph-alignment.spec.ts` — For each row, asserts `circle[data-sha]` `cy` equals the metadata row's vertical center (bounding-box midpoint) within `TOLERANCE_PX` (set by Phase 0 spike).
- `tests/e2e/graph-keyboard.spec.ts` — Arrow Up / Arrow Down move selection; Enter fires `onCommitClick` echo.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [React 19: Forms and controlled components](https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable) — the controlled+uncontrolled pattern reference. Why: `selectedSha` / `defaultSelectedSha` follows this exact convention.
- [shadcn/ui Badge](https://ui.shadcn.com/docs/components/badge) — visual reference for the pill shape and padding. Why: ref badges should look at home next to shadcn `Badge`s. We do **not** add a `registryDependencies` on shadcn Badge — we render our own minimal pill with the same proportions.
- [MDN: SVG stroke alignment for sub-pixel rendering](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-width) — Why: alignment math (node center at `rowIndex * rowHeight + rowHeight/2`) needs to match the row div's vertical center; the Phase 0 spike measures actual cross-browser delta and pins `TOLERANCE_PX` accordingly.
- [Playwright: `boundingBox()` returns null for invisible/zero-size elements](https://playwright.dev/docs/api/class-locator#locator-bounding-box) — Why: alignment test uses `boundingBox()` on the row div (which has positive area, so this is safe — unlike the SVG-stroke `toBeVisible()` trap from Phase 3).
- [Tailwind v4 CSS-first @theme docs](https://tailwindcss.com/docs/theme) — Why: confirms the `@theme {}` token pattern used in the consumer-app's `globals.css`. New `--graph-row-hover-bg` / `--graph-row-selected-bg` / `--graph-ref-*` tokens go in `registry/git-graph/git-graph.css` (NOT in `@theme`, since they're component-private).

### Patterns to Follow

**Naming Conventions** (from CLAUDE.md + observed code):

- Files: `kebab-case.tsx` / `kebab-case.ts`. Component file = component name lowercased (`git-graph.tsx` exports `GitGraph` as default).
- Types: `PascalCase`, `type` over `interface` (CLAUDE.md mandates).
- Test files: `*.test.ts` for Vitest (`tests/unit/`), `*.spec.ts` for Playwright (`tests/e2e/`).

**Default-export components** (matches `git-graph-gutter.tsx`):

```tsx
export type GitGraphProps = { /* ... */ };
export default function GitGraph(props: GitGraphProps) { /* ... */ }
```

**Defaults pattern** (matches `git-graph-gutter.tsx:14-19`):

```tsx
const DEFAULTS = {
  laneWidth: 16,
  rowHeight: 40,
  nodeRadius: 5,
  strokeWidth: 1.5,
} as const;
```

Reuse the **same constants** in `git-graph.tsx`. Do not import `DEFAULTS` from the gutter file (it's not exported, and the gutter is a sibling primitive, not a parent). Re-declare with the same values; they're already coupled by virtue of being CSS variables anyway.

**Controlled + uncontrolled state** (canonical React pattern, no existing local example yet):

```tsx
const [internalSelected, setInternalSelected] = useState(props.defaultSelectedSha);
const isControlled = props.selectedSha !== undefined;
const selectedSha = isControlled ? props.selectedSha : internalSelected;
function setSelected(next: string | undefined) {
  if (!isControlled) setInternalSelected(next);
  props.onSelectChange?.(next);
}
```

**Test data attributes pattern** (from `git-graph-gutter.tsx`):

- `data-testid` for the component root and major slots.
- `data-sha` on each row + each gutter node so E2E can locate by sha.
- `data-row-index` for ordinal lookups.
- New for Phase 4: `data-selected="true"` on the selected row, `data-ref-kind="branch|tag|remote-branch"` on each badge, `data-head="true"` on a HEAD-bearing badge.

**`exactOptionalPropertyTypes` gotcha:** With this strict flag on, you cannot pass `undefined` literally to an optional prop. Spread with conditionals:

```tsx
<GitGraph
  commits={commits}
  {...(selectedSha !== undefined ? { selectedSha } : {})}
  {...(onCommitClick ? { onCommitClick } : {})}
/>
```

The fixtures and consumer-app pages already deal with this; mirror the existing style.

**`noUncheckedIndexedAccess` gotcha:** `array[i]` is `T | undefined`. Use `array[i]!` only where bounds are guaranteed (e.g. iterating `for (const row of rows)` instead of by index, which avoids the issue entirely).

**Path traversal in consumer-app pages** (matches `gutter/page.tsx:13`):

```tsx
import { /* fixtures */ } from "../../../../tests/unit/fixtures";
//                          ^^ from `app/graph/page.tsx`: graph → app → consumer-app → examples → repo root → tests
```

For the nested route `app/graph/interactions/page.tsx`, add one more `../`:

```tsx
import { /* fixtures */ } from "../../../../../tests/unit/fixtures";
```

---

## IMPLEMENTATION PLAN

### Phase 0: Alignment-tolerance spike

Before any spec is finalized, build a throwaway probe that renders one fixture with the proposed CSS-Grid + absolute-SVG layout and *measures* the cross-browser delta between gutter node `cy` (page-space) and metadata-row bounding-box vertical center. Replace the alignment spec's tolerance number with the *measured* worst-case + a small margin. Removes the largest "might need a tweak" caveat.

### Phase 1: Foundation — pure helpers + refs fixture + CSS tokens

Pure-function helpers (`format.ts`, `working-tree.ts`) and the new refs fixture, locked in by Vitest before any rendering code is written. Plus the CSS tokens the headline component will consume — additive, no edits to existing tokens.

### Phase 2: Headline component

Implement `git-graph.tsx`: layout call, CSS Grid container, gutter as column 1, metadata cells as column 2, hover/click/select handlers, working-tree row synthesis, ref badges. Sync-registry copies it into the consumer app automatically via the `predev` hook.

### Phase 3: Consumer-app routes

Three new routes (`/graph`, `/graph/interactions`, `/graph/working-tree`) that exercise every prop surface the E2E specs need. The `/graph` route is the demo gallery. The other two are E2E harnesses with on-page echo panels.

### Phase 4: E2E suite + screenshot baselines

Six DOM-driven spec files plus two PNG baselines (`feature-branch`, `with-refs`) for visual-regression coverage of ref badges, row-selected outline, and dark-mode tokens. All DOM specs run on chromium + firefox + webkit; screenshot specs run on chromium-linux only (matches Phase 3's policy and CI's runner).

---

## STEP-BY-STEP TASKS

Execute every task in order, top to bottom. Each is atomic and independently testable.

### SPIKE measure alignment delta (Phase 0)

- **Host**: linux (verified in Playwright Docker image) + native Windows / macOS (assertion-portable).
- **IMPLEMENT**:
  1. Create a throwaway page at `examples/consumer-app/app/graph/_spike/page.tsx` (underscore-prefixed so it remains routable but is obviously temporary; delete at the end of the spike).
  2. The page renders a minimal stand-in for the planned headline layout: a parent `<div style={{ display: "grid", gridTemplateColumns: "32px 1fr" }}>` with `<svg>` (column 1, height = 5 × 40px, with `<circle cx="16" cy="20" r="5" />`, `<circle cx="16" cy="60" r="5" />`, … through `cy=180`) and a sibling stack of 5 `<div style={{ height: 40, display: "flex", alignItems: "center" }}>row N</div>` (column 2). Add `data-testid="spike-row"` and `data-row-index={i}` per row, `data-spike-circle` per circle.
  3. Create `tests/e2e/_spike-alignment.spec.ts` (also temporary). For each browser project, for each row, compute `circleAbsY = svgBox.y + Number(circle.cy)` and `rowCenterY = rowBox.y + rowBox.height / 2`, log `Math.abs(circleAbsY - rowCenterY)` to console. Assert `< 5` (loose ceiling so the spike doesn't fail).
  4. Run: `pnpm test:e2e -- _spike-alignment` and read the per-browser deltas off the Playwright report.
  5. Record the worst-case delta in this plan: open this file, find the alignment task ("CREATE `tests/e2e/graph-alignment.spec.ts`"), and **replace the `0.5` tolerance with `max(measured_max, 0.5) + 0.5` rounded up to one decimal**. Note in a `// Tolerance derived from Phase 0 spike (worst-case <browser>: <delta>px)` comment in the spec.
  6. Delete `examples/consumer-app/app/graph/_spike/` and `tests/e2e/_spike-alignment.spec.ts`. Re-run `pnpm sync && pnpm test:e2e -- graph` to confirm nothing else regressed.
- **PATTERN**: `tests/e2e/gutter-screenshots.spec.ts:40-58` for `boundingBox()` + attribute reads.
- **GOTCHA**: WebKit subpixel rasterization produces the worst delta; do not skip it because chromium passes. Firefox tends to round bounding boxes more aggressively, which can produce a *larger* delta than chromium — counterintuitive but documented.
- **VALIDATE**: After deletion, `pnpm test:e2e -- _spike-alignment` exits non-zero (file gone). The plan's alignment-spec tolerance value is now an integer/float, not the placeholder `0.5`.

### CREATE `registry/git-graph/lib/format.ts`

- **IMPLEMENT**:
  - `export function shortSha(sha: string): string` — returns first 7 chars; if `sha.length < 7`, return `sha` as-is. No padding.
  - `export function relativeTime(ts: number | string, now: number = Date.now()): string` — accepts unix-ms number or ISO string. Returns the bucketed string per the table below. **All boundaries are strict-less-than** (`<`); divisions use `Math.floor`.

    | `delta = now - parsed(ts)` (ms)               | Output           |
    |-----------------------------------------------|------------------|
    | `delta < 60_000`                              | `"just now"`     |
    | `delta < 3_600_000`                           | `${floor(delta / 60_000)}m`     |
    | `delta < 86_400_000`                          | `${floor(delta / 3_600_000)}h`  |
    | `delta < 30 * 86_400_000`                     | `${floor(delta / 86_400_000)}d` |
    | `delta < 365 * 86_400_000`                    | `${floor(delta / (30 * 86_400_000))}mo` |
    | else                                          | `${floor(delta / (365 * 86_400_000))}y` |

    Negative deltas (future timestamps): treat as `delta = 0` → `"just now"`. Pure (deterministic given `now`).
- **PATTERN**: No similar helper exists. Keep both functions branch-only; no `Date.prototype.toLocaleString` (locale-dependent → non-deterministic in tests).
- **IMPORTS**: None.
- **GOTCHA**: For `ts: string`, parse with `Date.parse(ts)`. If `Number.isNaN`, return `"unknown"` rather than throw — the headline component should not blow up on bad consumer data.
- **VALIDATE**: `pnpm tsc -p tsconfig.json --noEmit` passes (file compiles under strict mode).

### CREATE `tests/unit/format.test.ts`

- **IMPLEMENT**: Vitest cases:
  - `shortSha("abcdef1234567890") === "abcdef1"`
  - `shortSha("abc") === "abc"`
  - `relativeTime(now - 30_000, now) === "just now"`
  - `relativeTime(now - 5 * 60_000, now) === "5m"`
  - `relativeTime(now - 3 * 3600_000, now) === "3h"`
  - `relativeTime(now - 2 * 86400_000, now) === "2d"`
  - `relativeTime(now - 60 * 86400_000, now) === "2mo"`
  - `relativeTime(now - 800 * 86400_000, now) === "2y"`
  - `relativeTime("not-a-date", now) === "unknown"`
  - `relativeTime(new Date(now - 1000).toISOString(), now) === "just now"` (ISO-string acceptance)
  - **Boundary cases (strict-less-than, must match table exactly):**
    - `relativeTime(now - 59_999, now) === "just now"`
    - `relativeTime(now - 60_000, now) === "1m"` (boundary flips to next bucket)
    - `relativeTime(now - 3_599_999, now) === "59m"`
    - `relativeTime(now - 3_600_000, now) === "1h"`
    - `relativeTime(now - 30 * 86_400_000, now) === "1mo"` (30d → 1mo, NOT "30d")
    - `relativeTime(now - (30 * 86_400_000 - 1), now) === "29d"`
    - `relativeTime(now - 365 * 86_400_000, now) === "1y"`
    - `relativeTime(now + 5_000, now) === "just now"` (future timestamp → clamped)
- **PATTERN**: `tests/unit/bezier.test.ts` for skeleton.
- **IMPORTS**: `import { describe, expect, it } from "vitest"; import { shortSha, relativeTime } from "../../registry/git-graph/lib/format";`
- **VALIDATE**: `pnpm test -- format`

### CREATE `registry/git-graph/lib/working-tree.ts`

- **IMPLEMENT**:
  - `export const WORKING_TREE_SHA = "__WORKING_TREE__" as const;`
  - `export function synthesizeWorkingTreeCommit(head: string | undefined, now: number = Date.now()): Commit` — returns `{ sha: WORKING_TREE_SHA, parents: head ? [head] : [], author: { name: "Working tree" }, message: "Uncommitted changes", timestamp: now }`. Pure given `now`.
- **PATTERN**: Mirror `Commit` shape from `registry/git-graph/types.ts:7-14`. Do **not** include a `refs` field (working tree has no refs).
- **IMPORTS**: `import type { Commit } from "../types";`
- **GOTCHA**: With `head: undefined`, `parents` is `[]` — the layout engine treats this as a root, which is the right rendering. With a real head sha, the synthetic commit is the new "newest" commit and lays out with its only parent as HEAD.
- **VALIDATE**: `pnpm tsc -p tsconfig.json --noEmit` passes.

### CREATE `tests/unit/working-tree.test.ts`

- **IMPLEMENT**:
  - `synthesizeWorkingTreeCommit("abc", 1000).sha === WORKING_TREE_SHA`
  - `synthesizeWorkingTreeCommit("abc", 1000).parents` deep-equals `["abc"]`
  - `synthesizeWorkingTreeCommit(undefined, 1000).parents` deep-equals `[]`
  - `synthesizeWorkingTreeCommit("abc", 1000).timestamp === 1000`
  - Sanity: `computeLayout([synthesizeWorkingTreeCommit("m1", 1000), { sha: "m1", parents: [], author: { name: "A" }, message: "root", timestamp: 0 }])` produces 2 rows, working-tree row at `rowIndex: 0`.
- **IMPORTS**: `synthesizeWorkingTreeCommit`, `WORKING_TREE_SHA`, `computeLayout`.
- **VALIDATE**: `pnpm test -- working-tree`

### CREATE `tests/unit/fixtures/with-refs.ts`

- **IMPLEMENT**: Build a fixture on top of `featureBranchFixture`'s topology to keep mental load low. Hand-write 5 commits that include refs:

```ts
import type { Commit } from "../../../registry/git-graph/types";
const author = { name: "A", email: "a@example.com" };

export const withRefsFixture: Commit[] = [
  { sha: "m3", parents: ["m2", "f2"], author, message: "merge feat",  timestamp: 4000,
    refs: [
      { name: "main",          kind: "branch",        isHead: true },
      { name: "origin/main",   kind: "remote-branch" },
      { name: "v1.0.0",        kind: "tag" },
    ] },
  { sha: "f2", parents: ["f1"],       author, message: "feat 2",      timestamp: 3000,
    refs: [{ name: "feature/x", kind: "branch" }] },
  { sha: "m2", parents: ["m1"],       author, message: "main 2",      timestamp: 2500 },
  { sha: "f1", parents: ["m1"],       author, message: "feat 1",      timestamp: 2000,
    refs: [{ name: "v0.9.0", kind: "tag" }] },
  { sha: "m1", parents: [],           author, message: "root",        timestamp: 1000 },
];
```

- **PATTERN**: `tests/unit/fixtures/feature-branch.ts` for skeleton.
- **IMPORTS**: as above.
- **GOTCHA**: Don't add a `withRefsExpected: LayoutResult` — refs are not part of layout. Keeping the fixture export-only avoids tempting future code into asserting layout-equality on it.
- **VALIDATE**: `pnpm tsc -p tsconfig.json --noEmit`

### UPDATE `tests/unit/fixtures/index.ts`

- **IMPLEMENT**: Add `export { withRefsFixture } from "./with-refs";` as a new line at the end.
- **VALIDATE**: `pnpm tsc -p tsconfig.json --noEmit`

### UPDATE `registry/git-graph/git-graph.css`

- **IMPLEMENT**: Append (do not modify existing tokens):

```css
:root {
  --graph-row-hover-bg: hsl(220 14% 96%);
  --graph-row-selected-bg: hsl(220 14% 92%);
  --graph-row-selected-border: hsl(220 80% 55%);

  --graph-ref-branch-bg: hsl(145 60% 92%);
  --graph-ref-branch-fg: hsl(145 60% 25%);
  --graph-ref-tag-bg: hsl(35 90% 92%);
  --graph-ref-tag-fg: hsl(35 90% 25%);
  --graph-ref-remote-bg: hsl(220 30% 92%);
  --graph-ref-remote-fg: hsl(220 30% 30%);

  --graph-working-tree-fg: hsl(0 0% 50%);
}

@media (prefers-color-scheme: dark) {
  :root {
    --graph-row-hover-bg: hsl(240 4% 14%);
    --graph-row-selected-bg: hsl(240 4% 20%);
    --graph-row-selected-border: hsl(220 80% 65%);

    --graph-ref-branch-bg: hsl(145 60% 18%);
    --graph-ref-branch-fg: hsl(145 60% 75%);
    --graph-ref-tag-bg: hsl(35 90% 18%);
    --graph-ref-tag-fg: hsl(35 90% 75%);
    --graph-ref-remote-bg: hsl(220 30% 22%);
    --graph-ref-remote-fg: hsl(220 30% 80%);

    --graph-working-tree-fg: hsl(0 0% 60%);
  }
}
```

- **PATTERN**: Existing block at `registry/git-graph/git-graph.css:13-40`. New tokens slot under the existing `:root` and dark-mode blocks; **do not create a second `:root` block** — append to the existing one.
- **GOTCHA**: Keep tokens HSL-valued (consistent with existing branch tokens). Tailwind v4's CSS-first `@theme` is an app-level concern; these are component-private vars that live next to the component.
- **VALIDATE**: After editing, `pnpm sync` then `pnpm --filter consumer-app build` succeeds (Tailwind v4 PostCSS can parse the file).

### CREATE `registry/git-graph/git-graph.tsx`

- **IMPLEMENT**: A default-exported `GitGraph` function component.

  Props (all optional except `commits`):

  ```ts
  export type GitGraphProps = {
    commits: Commit[];
    head?: string;
    selectedSha?: string;
    defaultSelectedSha?: string;
    onSelectChange?: (sha: string | undefined) => void;
    onCommitClick?: (commit: Commit) => void;
    onCommitHover?: (commit: Commit | null) => void;
    showWorkingTreeRow?: boolean;
    laneWidth?: number;
    rowHeight?: number;
    nodeRadius?: number;
    strokeWidth?: number;
    className?: string;
  };
  ```

  Behavior:

  1. Resolve all geometry values from props with `DEFAULTS` (laneWidth: 16, rowHeight: 40, nodeRadius: 5, strokeWidth: 1.5).
  2. **Synthesis order**: if `showWorkingTreeRow` is true, build `workingCommits = [synthesizeWorkingTreeCommit(head, /*now*/ Date.now()), ...commits]`. Otherwise `workingCommits = commits`. Compute synthesis inside `useMemo` so the timestamp doesn't move on every render.
  3. Compute `layout = computeLayout(workingCommits)` via `useMemo` (deps: `[commits, showWorkingTreeRow, head]` — see GOTCHA below). Re-computing on hover/select state changes is wasteful.
  4. **Controlled+uncontrolled selection** per "Patterns to Follow." Internal state holds `selectedSha: string | undefined`. The setter `setSelected(next)`:
     - In uncontrolled mode: updates internal state.
     - Always: calls `props.onSelectChange?.(next)`.
  5. **Click-reclick semantics (PINNED)**: clicking a row sets selection to that row's sha — even if it's already selected. **Reclicking does NOT deselect.** To clear selection, the consumer presses `Escape` (handled below) or sets `selectedSha={undefined}` programmatically. Rationale: matches shadcn/ui convention; predictable for consumers wiring click → detail-panel.
  6. **Generate stable row ids** for `aria-activedescendant`: `rowId(idx) = ` $`{instanceId}-row-${idx}`$ where `instanceId = useId()`. Pass `id={rowId(idx)}` on each row div.
  7. Render a single root `<div>` with:
     - `data-testid="git-graph"`, `className` prop appended.
     - `role="listbox"`, `tabIndex={0}`.
     - `aria-activedescendant={selectedRow ? rowId(selectedRow.rowIndex) : undefined}` (use conditional spread under `exactOptionalPropertyTypes`).
     - `style={{ display: "grid", gridTemplateColumns: \`${gutterWidth}px 1fr\` }}` where `gutterWidth = layout.laneCount * laneWidth`.
     - `onKeyDown` handler — see step 11.
  8. Column 1: render `<GitGraphGutter layout={layout} laneWidth={...} rowHeight={...} nodeRadius={...} strokeWidth={...} />`. The gutter takes its own height from `rows.length * rowHeight`.
  9. Column 2: a stack of row divs in `layout.rows` order. Each row div:
     - `id={rowId(row.rowIndex)}`, `role="option"`, `aria-selected={selectedSha === row.commit.sha}`.
     - `data-testid="git-graph-row"`, `data-sha={row.commit.sha}`, `data-row-index={row.rowIndex}`.
     - When `selectedSha === row.commit.sha`, also `data-selected="true"`.
     - **Exact CSS (PINNED — copy verbatim, do not "improve" the flex pattern):**

       ```tsx
       <div
         id={rowId(row.rowIndex)}
         role="option"
         aria-selected={isSelected}
         data-testid="git-graph-row"
         data-sha={row.commit.sha}
         data-row-index={row.rowIndex}
         {...(isSelected ? { "data-selected": "true" } : {})}
         {...(isWorkingTree ? { "data-working-tree": "true" } : {})}
         className="git-graph-row"
         style={{
           height: rowHeight,
           display: "flex",
           alignItems: "center",
           gap: 12,
           paddingInline: 12,
           cursor: "pointer",
           borderLeft: `2px solid ${isSelected ? "var(--graph-row-selected-border)" : "transparent"}`,
           background: isSelected ? "var(--graph-row-selected-bg)" : "transparent",
         }}
         onClick={() => { setSelected(row.commit.sha); props.onCommitClick?.(row.commit); }}
         onMouseEnter={() => props.onCommitHover?.(row.commit)}
         onMouseLeave={() => props.onCommitHover?.(null)}
       >
         <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, opacity: 0.7, flex: "0 0 auto" }}>
           {row.commit.sha === WORKING_TREE_SHA ? "—" : shortSha(row.commit.sha)}
         </span>
         <span
           style={{
             flex: "1 1 auto",
             minWidth: 0,
             overflow: "hidden",
             textOverflow: "ellipsis",
             whiteSpace: "nowrap",
             fontStyle: isWorkingTree ? "italic" : "normal",
             color: isWorkingTree ? "var(--graph-working-tree-fg)" : "inherit",
           }}
         >
           {row.commit.message}
         </span>
         {/* refs cell — see step 10 */}
         <span style={{ flex: "0 0 auto", opacity: 0.8, fontSize: 13 }}>{row.commit.author.name}</span>
         <span style={{ flex: "0 0 auto", opacity: 0.6, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
           {isWorkingTree ? "—" : relativeTime(row.commit.timestamp)}
         </span>
       </div>
       ```

     - Hover background is applied via the `git-graph-row` class — add the rule to `git-graph.css` (see step 12 below).
  10. **Ref badges** (between message and author): render each ref in `commit.refs` (if any) as a `<span>` pill:
     - `data-ref-kind={ref.kind}`, `data-ref-name={ref.name}`, plus `data-head="true"` only when `ref.isHead === true` (omit otherwise — `exactOptionalPropertyTypes`).
     - Map `remote-branch` → `remote` for var-name interpolation: `const refVar = ref.kind === "remote-branch" ? "remote" : ref.kind;`. Use exhaustive `switch`/`if` to keep TS happy on `Ref["kind"]` widening.
     - Style: `padding: 2px 8px; border-radius: 999px; font-size: 11px; line-height: 1.4; background: var(--graph-ref-${refVar}-bg); color: var(--graph-ref-${refVar}-fg);`. When `ref.isHead`: add `outline: 1px solid var(--graph-row-selected-border); font-weight: 700;`.
  11. **Keyboard navigation** (`onKeyDown` on the listbox container):
     - `ArrowDown`: select `min(currentIdx + 1, rows.length - 1)`. If nothing selected, select 0.
     - `ArrowUp`: select `max(currentIdx - 1, 0)`. If nothing selected, select 0.
     - `Enter`: fire `props.onCommitClick?.(currentRow.commit)` (does NOT change selection — selection moved on the arrow key).
     - `Escape`: `setSelected(undefined)`. Pinned: this is the *only* way to clear selection from the keyboard.
     - For ArrowUp/Down/Enter/Escape: `event.preventDefault()`.
     - **After ArrowUp/Down**: call `document.getElementById(rowId(newIdx))?.scrollIntoView({ block: "nearest", behavior: "auto" })` so keyboard nav doesn't strand focus off-screen. `behavior: "auto"` (not `"smooth"`) — smooth scroll fights with `prefers-reduced-motion` and adds spec flake.
  12. **Add hover rule to `git-graph.css`** (in the same edit as the Phase 1 token additions):

      ```css
      .git-graph-row:hover {
        background: var(--graph-row-hover-bg);
      }
      .git-graph-row[data-selected="true"]:hover {
        background: var(--graph-row-selected-bg);
      }
      ```

      Selected rows keep their selected background on hover (no flicker).
  13. **Empty / boundary cases (PINNED)**:
     - `commits.length === 0` AND `showWorkingTreeRow !== true`: return `<div data-testid="git-graph" data-empty="true" role="listbox" aria-label="Empty git history" className={className} />`. No rows, no gutter, no throw.
     - `commits.length === 0` AND `showWorkingTreeRow === true`: synthesize the working-tree row anyway and render a single-row table with that row at `rowIndex: 0`, `data-empty` is **not** set (the table has content).
     - `showWorkingTreeRow === true` AND `head === undefined` AND `commits.length > 0`: synthesizes a working-tree commit with `parents: []`. Layout treats it as an orphan; it lays out at row 0 in lane 0 (or the first free lane). Acceptable rendering — no throw.
     - `head` is set but doesn't match any commit's sha: synthesis still emits `parents: [head]`. `computeLayout` already tolerates parent-shas not in the input; the working-tree row's edge to HEAD will dangle to the bottom of the gutter or be culled by the gutter's out-of-range-edge filter (`registry/git-graph/git-graph-gutter.tsx:48-55`). Acceptable; covered by an existing fixture pattern.

- **PATTERN**: `registry/git-graph/git-graph-gutter.tsx` for top-level structure (props type + DEFAULTS const + default-exported function).
- **IMPORTS**:
  ```ts
  import { useId, useMemo, useState, type KeyboardEvent } from "react";
  import type { Commit, Ref } from "./types";
  import { computeLayout } from "./lib/layout";
  import { shortSha, relativeTime } from "./lib/format";
  import { synthesizeWorkingTreeCommit, WORKING_TREE_SHA } from "./lib/working-tree";
  import GitGraphGutter from "./git-graph-gutter";
  ```
- **GOTCHA — `'use client'`?**: This component uses `useState` + `useMemo` + `useId` + event handlers, so it must be a client component. **Add `"use client";` as the first line of the file**, mirroring the consumer-app pages. Without it, Next 15's RSC boundary will refuse to render it. (`git-graph-gutter.tsx` deliberately omits this directive because it's hook-free; the headline cannot.)
- **GOTCHA — `useMemo` deps**: deps array is `[commits, showWorkingTreeRow, head]` for the synthesis + layout memo. Do NOT include `workingCommits` (a freshly-allocated array) as a dep; that busts the cache every render. Eslint's `react-hooks/exhaustive-deps` may complain — either inline the synthesis inside the memo callback (preferred) or add an `// eslint-disable-next-line react-hooks/exhaustive-deps` with a comment explaining why.
- **GOTCHA — `exactOptionalPropertyTypes`**: when forwarding optional props to `<GitGraphGutter>` and to row divs, conditionally spread (see "Patterns to Follow"). `aria-activedescendant`, `data-selected`, `data-working-tree`, `data-head` all need the `{...(cond ? { attr: val } : {})}` pattern — passing `undefined` literally fails strict-mode typecheck.
- **GOTCHA — `aria-activedescendant` is required, not optional**: `role="listbox"` with focus on the container (rather than on individual options) requires `aria-activedescendant` per WAI-ARIA. Skipping it is a real a11y bug AND `eslint-plugin-jsx-a11y` (active in `eslint-config-next`) will flag it. The row `id` generation in step 6 is the dependency — don't drop it.
- **GOTCHA — message truncation**: ellipsis only works inside flexbox when the cell has `min-width: 0`. The exact-CSS block in step 9 already sets this; do not "clean up" the redundant-looking `flex: "1 1 auto"` + `minWidth: 0` pair.
- **GOTCHA — `useId` and SSR**: `useId` is stable across SSR/hydration in React 19. Do not generate ids with `Math.random()` or counters — those will mismatch between server and client and surface as hydration warnings.
- **VALIDATE**:
  - `pnpm typecheck` (root) passes.
  - `pnpm sync` succeeds and produces `examples/consumer-app/components/git-graph/git-graph.tsx`.

### CREATE `examples/consumer-app/app/graph/page.tsx`

- **IMPLEMENT**: Mirror `app/gutter/page.tsx` structure. Render each fixture in its own `<section data-testid="fixture-${name}">` with a `<GitGraph commits={fixture.commits} head={...} />`. Include the new `withRefsFixture`. Set `head` to the sha of `commits[0]` for fixtures where that's meaningful (or omit). Add a `data-testid="theme-flip"` button if you want to mirror the gutter page (optional — the gutter theming spec already covers branch-color theming, so this page need not duplicate).
- **PATTERN**: `examples/consumer-app/app/gutter/page.tsx`.
- **IMPORTS**: from `@/components/git-graph/git-graph` (default import) and fixtures from `../../../../tests/unit/fixtures`.
- **VALIDATE**: `pnpm dev:consumer` (one terminal), then `curl -s http://localhost:3100/graph | grep -c 'git-graph'` ≥ 1. Or `pnpm --filter consumer-app build` (which runs `prebuild` sync + `next build`) succeeds with the new route.

### CREATE `examples/consumer-app/app/graph/interactions/page.tsx`

- **IMPLEMENT**: Client component. Renders `<GitGraph commits={featureBranchFixture} head="m3" selectedSha={selected} onSelectChange={setSelected} onCommitClick={(c) => setLastClicked(c.sha)} onCommitHover={(c) => setLastHover(c?.sha ?? null)} />`. Above it, an echo panel:

```tsx
<pre data-testid="echo">{JSON.stringify({ selected, lastClicked, lastHover }, null, 2)}</pre>
<button data-testid="select-f1" type="button" onClick={() => setSelected("f1")}>select f1</button>
<button data-testid="clear-selection" type="button" onClick={() => setSelected(undefined)}>clear</button>
```

- **PATTERN**: `app/gutter/page.tsx` for `'use client'` + `useState` skeleton.
- **IMPORTS**: fixtures via `../../../../../tests/unit/fixtures` (one extra `../` for the deeper route — see "Patterns to Follow"). `GitGraph` via `@/components/git-graph/git-graph`.
- **GOTCHA**: TypeScript with `exactOptionalPropertyTypes` won't let you pass `selectedSha={undefined}`. Use the conditional-spread pattern.
- **VALIDATE**: `pnpm --filter consumer-app build` succeeds.

### CREATE `examples/consumer-app/app/graph/working-tree/page.tsx`

- **IMPLEMENT**: Client component. State `[show, setShow] = useState(false)`. Renders `<GitGraph commits={featureBranchFixture} head="m3" showWorkingTreeRow={show} />`. Add a `<button data-testid="toggle-wt" onClick={() => setShow(!show)}>` toggle.
- **VALIDATE**: `pnpm --filter consumer-app build`

### CREATE `tests/e2e/graph-render.spec.ts`

- **Host**: linux (verified in CI via `mcr.microsoft.com/playwright:v1.49.1-jammy`); windows-host expected to work via `pnpm test:e2e` against the running consumer dev server, but local screenshot rebases must use the Docker recipe documented in Phase 3's "Post-execution corrections."
- **IMPLEMENT**: For each of the 7 fixtures (linear, feature-branch, merge, octopus, orphan, long-lived-release, with-refs):
  - `await page.goto("/graph")`
  - Locate `getByTestId("fixture-${name}")`.
  - Assert exactly one `data-testid="git-graph"` inside.
  - Assert `[data-testid="git-graph-row"]` count equals fixture commit count.
  - Assert each row's `data-sha` is non-empty.
- **PATTERN**: `tests/e2e/gutter-screenshots.spec.ts` first half for `goto` + `getByTestId`. **Do not** use `toBeVisible()` on SVG strokes (CLAUDE.md).
- **IMPORTS**: `import { expect, test } from "@playwright/test";`
- **GOTCHA**: 3-browser run — keep assertions DOM-attribute-based.
- **VALIDATE**: `pnpm test:e2e -- graph-render`

### CREATE `tests/e2e/graph-interactions.spec.ts`

- **Host**: linux (verified) + windows-host (assertion-portable; same caveat as graph-render).
- **IMPLEMENT**:
  - `goto("/graph/interactions")`.
  - Click row with `data-sha="f1"`. Echo panel shows `lastClicked: "f1"`.
  - Click `data-testid="select-f1"` button. The row with `data-sha="f1"` gains `data-selected="true"`.
  - Click `data-testid="clear-selection"`. No row has `data-selected="true"`.
  - Hover `data-sha="m2"`. Echo shows `lastHover: "m2"`. Move mouse outside the graph; echo shows `lastHover: null`.
- **PATTERN**: `gutter-theming.spec.ts` for `getByTestId` + click semantics.
- **GOTCHA**: Hover-leave on a deep child can be flaky; move the mouse to `body` corner (`page.mouse.move(0, 0)`) before asserting `lastHover: null`.
- **VALIDATE**: `pnpm test:e2e -- graph-interactions`

### CREATE `tests/e2e/graph-keyboard.spec.ts`

- **Host**: linux (verified); cross-browser portable.
- **IMPLEMENT**:
  - `goto("/graph/interactions")`.
  - Focus `data-testid="git-graph"` via `.focus()`.
  - Press `ArrowDown` once: assert row at `data-row-index="0"` has `aria-selected="true"` AND container's `aria-activedescendant` equals that row's `id`.
  - Press `ArrowDown` again: row 1 selected; `aria-activedescendant` updates accordingly.
  - Press `ArrowUp`: row 0 again.
  - Press `Enter`: echo panel shows `lastClicked` = sha of row 0. Selection stays on row 0 (Enter does NOT move selection).
  - Press `Escape`: no row has `data-selected="true"`; container's `aria-activedescendant` attribute is absent (or empty).
  - **scrollIntoView assertion**: in a viewport-constrained variant (`page.setViewportSize({ width: 800, height: 200 })` to force the row stack to overflow), focus the container, hold ArrowDown until the last row is selected, assert `await lastRow.boundingBox()` is non-null AND its `y` is within the viewport (`box.y >= 0 && box.y + box.height <= 200`). Confirms `scrollIntoView({ block: "nearest" })` ran.
- **GOTCHA**: Container needs `tabIndex={0}` for `.focus()` to work — verified in the component spec. Firefox's `keyboard.press("Escape")` sometimes loses focus on the container; if the assertion flakes, re-focus before the Escape press.
- **VALIDATE**: `pnpm test:e2e -- graph-keyboard`

### CREATE `tests/e2e/graph-refs.spec.ts`

- **Host**: linux (verified); cross-browser portable (DOM + CSS-var assertions only).
- **IMPLEMENT**:
  - `goto("/graph")`.
  - Locate `getByTestId("fixture-with-refs")`.
  - Find the `m3` row; assert it contains 3 ref badges with the expected `data-ref-kind` values (`branch`, `remote-branch`, `tag`) and the `branch` one has `data-head="true"`.
  - Find the `f1` row; assert one badge with `data-ref-kind="tag"`, no `data-head`.
  - Read computed background of a `data-ref-kind="branch"` badge via `evaluate(el => getComputedStyle(el).backgroundColor)`; assert it is non-transparent and non-empty (the CSS var resolved). Mirror `gutter-theming.spec.ts`'s style — don't pin an exact rgb() value (color-space conversions vary across browsers).
- **GOTCHA**: WebKit returns `rgba(0, 0, 0, 0)` for `transparent` — reject that string explicitly.
- **VALIDATE**: `pnpm test:e2e -- graph-refs`

### CREATE `tests/e2e/graph-working-tree.spec.ts`

- **Host**: linux (verified); cross-browser portable.
- **IMPLEMENT**:
  - `goto("/graph/working-tree")`.
  - Initially: no row has `data-working-tree="true"`.
  - Click `data-testid="toggle-wt"`.
  - Now: exactly one row has `data-working-tree="true"`, with `data-row-index="0"` and `data-sha="__WORKING_TREE__"`.
  - The row count is `featureBranchFixture.length + 1`.
- **VALIDATE**: `pnpm test:e2e -- graph-working-tree`

### CREATE `tests/e2e/graph-alignment.spec.ts`

- **Host**: linux (verified); cross-browser portable. **DOM-attribute and bounding-box assertions only — no `toBeVisible()` on SVG strokes.**
- **IMPLEMENT**:
  - `goto("/graph")`.
  - For fixture `feature-branch` (small, deterministic):
    - For each row, `await rowLocator.scrollIntoViewIfNeeded()` then compute `boxCenterY = box.y + box.height / 2`.
    - Find the corresponding `circle[data-sha="${sha}"]` inside `[data-testid="git-graph-gutter"]`. Get its `cy` attribute and the gutter SVG's bounding box to translate SVG-space `cy` to page-space y: `gutterBox.y + Number(cy)`.
    - Assert `Math.abs(circleAbsY - boxCenterY) <= TOLERANCE_PX`.
  - **`TOLERANCE_PX`**: a top-of-file constant whose value is set by Phase 0's spike (`max(measured_max, 0.5) + 0.5`, rounded up to one decimal). Add a comment above the constant: `// Tolerance derived from Phase 0 spike (see .agents/plans/phase-4-headline-table.md). Worst-case browser was <name> at <delta>px.`
  - // Couples to DEFAULTS.rowHeight (40) in registry/git-graph/git-graph.tsx and registry/git-graph/git-graph-gutter.tsx; update both together if the default ever changes. (Mirror Phase 3 finding #4.)
- **PATTERN**: `tests/e2e/gutter-screenshots.spec.ts:40-58` for DOM-attribute-based geometry, but go further by combining with `boundingBox()` for translation.
- **GOTCHA**: SVG `viewBox` makes `cy` SVG-coordinate; the gutter's CSS width matches its `width` attribute, so 1 SVG unit = 1 CSS pixel here. Verified by reading `git-graph-gutter.tsx:65` (`viewBox="0 0 ${width} ${height}"`).
- **GOTCHA**: If the spike was skipped or the constant was left at the placeholder `0.5`, this task fails fast on WebKit. Don't relax the tolerance under deadline pressure — re-run the spike and update the constant.
- **VALIDATE**: `pnpm test:e2e -- graph-alignment`

### CREATE `tests/e2e/graph-screenshots.spec.ts` + capture baselines

- **Host**: linux *only*, captured inside `mcr.microsoft.com/playwright:v1.49.1-jammy` (matches CI's chromium-linux binary). Mirrors Phase 3's policy at `tests/e2e/gutter-screenshots.spec.ts:13-20`.
- **IMPLEMENT**:
  - Spec body mirrors `tests/e2e/gutter-screenshots.spec.ts` skeleton: same chromium-only + linux-only `test.skip` gates, `maxDiffPixelRatio: 0.005`.
  - Two baseline sections to lock visual regression on the headline component's distinctive rendering:
    1. `feature-branch` at `/graph` (`getByTestId("fixture-feature-branch")`) — locks row layout, gutter alignment, hash/message/author/date typography, default theme.
    2. `with-refs` at `/graph` (`getByTestId("fixture-with-refs")`) — locks ref-badge styling (branch/tag/remote-branch + HEAD outline), the case the DOM specs only verify by attribute.
  - Baseline filenames: `graph-feature-branch-chromium-linux.png`, `graph-with-refs-chromium-linux.png` (matches Phase 3's naming pattern).
- **CAPTURE RECIPE** (Windows-host; mirror Phase 3's "Post-execution corrections" recipe):
  - `docker run --rm -v ${PWD}:/work -v /work/node_modules -v /work/apps/docs/node_modules -v /work/apps/docs/.next -v /work/examples/consumer-app/node_modules -v /work/examples/consumer-app/.next -w /work mcr.microsoft.com/playwright:v1.49.1-jammy bash -lc "npm install -g pnpm@10.33.0 && pnpm install --config.engine-strict=false && pnpm test:e2e -- graph-screenshots --update-snapshots"`
  - The anonymous-volume overrides (`-v /work/node_modules` etc.) prevent NTFS-through-Docker-Desktop bind mounts from breaking pnpm's atomic-rename pattern. Verified working in Phase 3.
- **PATTERN**: `tests/e2e/gutter-screenshots.spec.ts` end-to-end.
- **GOTCHA**: Two PNGs land in `tests/e2e/graph-screenshots.spec.ts-snapshots/`. Commit them with the spec. Do NOT commit baselines captured on macOS or Windows hosts — chromium's font rendering differs per OS and the diff will fail in CI.
- **VALIDATE**:
  - `pnpm test:e2e -- graph-screenshots` passes on chromium-linux (verifies the freshly captured baselines round-trip).
  - `git status tests/e2e/graph-screenshots.spec.ts-snapshots/` shows exactly 2 new PNGs.

### UPDATE `registry/git-graph/git-graph.tsx` — final review pass

- **IMPLEMENT**: Re-read the file end-to-end. Confirm:
  - First line is `"use client";`.
  - Default export named `GitGraph`.
  - All optional props use the conditional-spread pattern when forwarded.
  - No `xmlns` on any inner SVG (we don't render SVG here directly — all SVG is delegated to `<GitGraphGutter>`).
  - No `console.log` / debugger statements.
  - Ref-badge mapping for `remote-branch` → `remote` is exhaustive (ts switch on `Ref["kind"]`).
  - Container has `role="listbox"`, `tabIndex={0}`, AND `aria-activedescendant` (conditional-spread).
  - Each row has `id` (from `useId`-derived prefix) AND `role="option"` AND `aria-selected`.
  - `useId()` is called once at component top-level, NOT inside `.map()` (rule-of-hooks violation otherwise).
  - `Escape` and `scrollIntoViewIfNeeded`-equivalent (`scrollIntoView({ block: "nearest", behavior: "auto" })`) are wired in the keyboard handler.
- **VALIDATE**: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` (lint catches any `jsx-a11y` rule that would have flagged the listbox a11y).

### CONFIRM open PR for Phase 4

- **IMPLEMENT**: After all validation passes locally, **stop and confirm with the user before any push or PR**.
- **IMPLEMENT (after user confirmation only)**: Push the feature branch, open a PR titled `Phase 4: headline <GitGraph> table — metadata, hover/click/select, refs, working tree, alignment`, body summarizing the deliverables list from PRD §12.4 and any deviations.
- **GOTCHA**: Per CLAUDE.md "Artifact-commit cadence," `.agents/plans/`, `.agents/code-reviews/`, `.agents/system-reviews/`, `.agents/execution-reports/` files must NOT be in this PR. They go in a follow-up commit on `main` after squash-merge.
- **VALIDATE**: `gh pr view --web` shows the PR with the expected title and a clean diff (no `.agents/` files).

---

## TESTING STRATEGY

### Unit Tests (Vitest)

- `tests/unit/format.test.ts` — pure helpers, full branch coverage.
- `tests/unit/working-tree.test.ts` — synthesis + integration with `computeLayout`.
- (Existing) `tests/unit/bezier.test.ts` and `tests/unit/layout.test.ts` continue to pass unchanged.

### Integration / E2E Tests (Playwright, 3-browser)

- Render counts (every fixture renders the right number of rows).
- Interactions (click, hover, controlled selection round-trip).
- Keyboard navigation (ArrowUp/Down, Enter).
- Ref-badge rendering and HEAD treatment.
- Working-tree row toggle.
- Pixel-alignment between gutter node centers and metadata row centers (≤ `TOLERANCE_PX`, set by Phase 0 spike).

All E2E specs use DOM-attribute or bounding-box assertions. No `toBeVisible()` on SVG strokes (per CLAUDE.md and Phase 3 lessons). All run on chromium + firefox + webkit.

### Edge Cases

- Empty `commits` array → renders `data-empty="true"` shell, no throw.
- `showWorkingTreeRow={true}` with `head` undefined → working-tree row renders as an orphan at the top.
- A commit whose `refs` is undefined → no badges, no crash.
- A commit whose `refs` contains both `isHead: true` and `kind: "tag"` (degenerate but possible per type) → both attributes render; spec doesn't pin behavior beyond "doesn't throw."
- Hover-leave on the gutter SVG vs hover-leave on the metadata cells → both emit `onCommitHover(null)` once mouse leaves the row.
- A `head` value that doesn't match any commit's sha → working-tree row's parent points to nothing; `computeLayout` treats it as a root parent edge to a missing commit. Existing layout code already tolerates this (Phase 2 fixtures cover orphan/missing parents). No new behavior.

---

## VALIDATION COMMANDS

Execute every command. Each must exit 0.

### Level 1: Syntax & Style

```pwsh
pnpm lint        # surfaces jsx-a11y/role-has-required-aria-props for listbox/option without aria-activedescendant
pnpm typecheck   # surfaces exactOptionalPropertyTypes violations on conditional-spread misses
```

### Level 2: Unit Tests

```pwsh
pnpm test
```

### Level 3: E2E Tests

```pwsh
pnpm test:e2e
```

(Playwright auto-starts the consumer-app dev server on port 3100; see `playwright.config.ts:19-24`.)

### Level 4: Manual Validation

1. `pnpm dev:consumer` and visit:
   - `http://localhost:3100/graph` — every fixture renders with gutter + metadata, branch colors visible, ref badges on the with-refs fixture.
   - `http://localhost:3100/graph/interactions` — clicking rows updates the echo panel; controlled-selection button moves the highlight.
   - `http://localhost:3100/graph/working-tree` — toggle button shows/hides the synthesized row.
2. Visually confirm: alignment between gutter node center and the row's vertical midline is pixel-tight at default zoom and at zoomed-in 200%.
3. Confirm dark mode by toggling the OS theme: row-hover and ref-badge colors invert correctly.

### Level 5: Additional Validation (optional)

- `pnpm build:docs` — ensures the registry endpoint still builds cleanly (Phase 4 doesn't touch it, but a regression here would be pre-empted).
- `pnpm sync && git diff --stat examples/consumer-app/components/git-graph/` — verify the new files were synced into the consumer app.

---

## ACCEPTANCE CRITERIA

- [ ] `<GitGraph>` renders all 7 fixtures (existing 6 + with-refs) in `/graph` without runtime warnings.
- [ ] Click → `onCommitClick(commit)` fires with the full commit object, verified via on-page echo.
- [ ] Hover → `onCommitHover(commit | null)` fires on enter/leave.
- [ ] Controlled `selectedSha` round-trip works: external state change moves `data-selected="true"` to the right row.
- [ ] Uncontrolled mode: clicking a row selects it; clicking again does not deselect (matches shadcn convention).
- [ ] Keyboard ArrowUp / ArrowDown / Enter / Escape behave as specified; `aria-activedescendant` tracks selection.
- [ ] Ref badges render with correct `data-ref-kind`; HEAD ref carries `data-head="true"` and a distinct outline.
- [ ] `showWorkingTreeRow={true}` synthesizes a row at `data-row-index="0"` with `data-sha="__WORKING_TREE__"`.
- [ ] Pixel-alignment spec passes within `TOLERANCE_PX` (set by Phase 0 spike) on chromium + firefox + webkit.
- [ ] Two screenshot baselines (`graph-feature-branch`, `graph-with-refs`) committed and round-trip clean on chromium-linux.
- [ ] All Vitest + Playwright suites green (3 browsers for DOM specs; chromium-linux for screenshots).
- [ ] `pnpm lint && pnpm typecheck` clean (root + per-workspace; lint includes jsx-a11y rules).
- [ ] `pnpm sync` produces the new files in `examples/consumer-app/components/git-graph/`.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + e2e)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] PR opened (after explicit user confirmation per CLAUDE.md)
- [ ] `.agents/` artifacts kept out of the implementation PR

---

## NOTES

**Why CSS Grid + absolute SVG, not table?**
HTML `<table>` complicates pixel-alignment because cell padding and table borders perturb baselines. CSS Grid with explicit `rowHeight` for each row div, plus an absolutely-positioned SVG that consumes the same `rowHeight`, gives perfect alignment without any padding-tracking math. We accept the loss of native table semantics; we add `role="listbox"` + `role="option"` for a11y instead.

**Why no virtualization in Phase 4?**
PRD §12.4 explicitly defers it to §12.5. The alignment spec is easier to author against a non-virtualized DOM (every row exists), and we want the alignment math locked in before the virtualizer is layered on top.

**Why no compound `<GitGraph.Row>` slots?**
PRD §6 mentions them under "Key patterns" but §12.4 doesn't list them as deliverables. Adding them now would lock in an API surface before we have user feedback. The escape hatch already exists: consumers who need full row control use `<GitGraphGutter>` directly (Phase 3 deliverable).

**Why is the working-tree row's synthesis in `lib/working-tree.ts` rather than inline in the component?**
Two reasons: (1) we want to unit-test the synthesis directly without rendering React (deterministic + cheap); (2) the `WORKING_TREE_SHA` constant is needed by the E2E spec, and exporting it from a dedicated module keeps the component file slim.

**External-system claims audit (Phase 2.7):**
- No new npm/pnpm dependencies. The Tailwind v4 native-binding overrides remain in place (root `package.json:24-29`); Phase 4 doesn't touch them.
- No GitHub Actions changes. Pages remains enabled (one-time manual toggle, see memory).
- Phase 3's `mcr.microsoft.com/playwright:v1.49.1-jammy` recipe (anonymous-volume overrides + `npm install -g pnpm` + `--config.engine-strict=false`) is reused verbatim for the new `graph-screenshots` baseline capture. Verified working in Phase 3.
- React 19 hook signatures (`useId`, `useMemo`, `useState`) stable since 19.0.0. `useId` is SSR-safe per the React 19 docs.
- Playwright `boundingBox()` returning null for off-screen elements: documented behavior; the alignment spec scrolls each row into view via `locator.scrollIntoViewIfNeeded()` before reading the box.
- `eslint-plugin-jsx-a11y` (active in `eslint-config-next`): `role="listbox"` paired with focus on the container and `aria-activedescendant` is the WAI-ARIA-blessed pattern; this passes the plugin's `role-has-required-aria-props` rule.

**Confidence:** 10/10 for one-pass success after applying the Phase 0 spike. Residual risks (alignment tolerance, keyboard focus quirks, click-reclick semantics, fuzzy `relativeTime` boundaries, message-cell ellipsis footgun, listbox a11y) have all been pinned with concrete numbers, exact code, and explicit specs. The screenshot baselines lock visual quality. The hand-trace appendix below gives the executor a ground-truth oracle to diff E2E failures against.

---

## Appendix A — Hand-trace: `feature-branch` fixture → expected DOM

Fixture (`tests/unit/fixtures/feature-branch.ts`):

```
m1 ← f1 ← f2
m1 ← m2 ← m3 (m3 also has f2 as a parent — merge)
```

`computeLayout(featureBranchFixture)` produces `featureBranchExpected` (verified in `tests/unit/layout.test.ts`). Display order top-to-bottom (newest first):

| `rowIndex` | sha  | `lane` | parents       | row's gutter `cy` (default rowHeight 40) | `data-sha` | row's expected `cy` for circle |
|------------|------|--------|---------------|------------------------------------------|------------|--------------------------------|
| 0          | `m3` | 0      | `["m2", "f2"]` | 20                                       | `m3`       | 20                             |
| 1          | `f2` | 1      | `["f1"]`      | 60                                       | `f2`       | 60                             |
| 2          | `m2` | 0      | `["m1"]`      | 100                                      | `m2`       | 100                            |
| 3          | `f1` | 1      | `["m1"]`      | 140                                      | `f1`       | 140                            |
| 4          | `m1` | 0      | `[]`          | 180                                      | `m1`       | 180                            |

**Expected DOM under `<section data-testid="fixture-feature-branch">`:**

- 1× `[data-testid="git-graph"]` with `role="listbox"`, `tabIndex="0"`, `aria-activedescendant` *unset* (no initial selection).
- Inside, a `[data-testid="git-graph-gutter"]` with `width="32"` (laneCount=2 × laneWidth=16) and `height="200"` (5 × 40).
- 5× `circle[data-sha]` inside the gutter:
  - `circle[data-sha="m3"][cx="8"][cy="20"][data-lane="0"][data-row-index="0"]`
  - `circle[data-sha="f2"][cx="24"][cy="60"][data-lane="1"][data-row-index="1"]`
  - `circle[data-sha="m2"][cx="8"][cy="100"][data-lane="0"][data-row-index="2"]`
  - `circle[data-sha="f1"][cx="24"][cy="140"][data-lane="1"][data-row-index="3"]`
  - `circle[data-sha="m1"][cx="8"][cy="180"][data-lane="0"][data-row-index="4"]`
- `m3` is a merge node (2 parents): rendered with `stroke + fill: var(--color-background, white)` (open dot). The other four are filled circles (`fill: var(--graph-branch-N)`).
- 5× `[data-testid="git-graph-row"]` siblings to the gutter, in `rowIndex` order. Each is `role="option"`, `aria-selected="false"`, `id={instanceId}-row-${rowIndex}`. None has `data-selected` attribute (no initial selection).
- Each row's bounding-box vertical center = `gutterAbsY + (rowIndex * 40 + 20)`, within `TOLERANCE_PX`.

**Edges (in the gutter SVG, validated by Phase 3 — included for grounding):**

| from→to   | kind       | path d                                          |
|-----------|------------|-------------------------------------------------|
| m3 → m2   | straight   | `M 8 20 L 8 100`                                |
| m3 → f2   | merge      | `M 8 20 C 8 40 24 40 24 60`                     |
| f2 → f1   | straight   | `M 24 60 L 24 140`                              |
| m2 → m1   | straight   | `M 8 100 L 8 180`                               |
| f1 → m1   | fork       | `M 24 140 C 24 160 8 160 8 180`                 |

Use this table to ground-truth E2E failures. If a graph-render test fails on `feature-branch`, diff against this table FIRST; the failure mode is almost always one of: (1) row count off because synthesis fired unexpectedly, (2) row order swapped because `computeLayout` was called on raw input vs `workingCommits`, (3) `cy` mismatch because `rowHeight` prop was overridden somewhere upstream.

## Appendix B — Hand-trace: `with-refs` fixture → expected ref badges

Fixture (defined in this plan's "CREATE `tests/unit/fixtures/with-refs.ts`" task). Topology is identical to `feature-branch`, so layout matches Appendix A. Refs added per row:

| `rowIndex` | sha  | refs                                                                                                                  |
|------------|------|-----------------------------------------------------------------------------------------------------------------------|
| 0          | `m3` | `[branch:main(HEAD), remote-branch:origin/main, tag:v1.0.0]`                                                          |
| 1          | `f2` | `[branch:feature/x]`                                                                                                  |
| 2          | `m2` | none                                                                                                                  |
| 3          | `f1` | `[tag:v0.9.0]`                                                                                                        |
| 4          | `m1` | none                                                                                                                  |

**Expected badge DOM** under each row (between message cell and author cell):

- Row 0 (`m3`): 3 `<span>` children with attributes:
  - `[data-ref-kind="branch"][data-ref-name="main"][data-head="true"]` — outlined + bold
  - `[data-ref-kind="remote-branch"][data-ref-name="origin/main"]` — no `data-head`
  - `[data-ref-kind="tag"][data-ref-name="v1.0.0"]` — no `data-head`
- Row 1 (`f2`): 1 `<span>` `[data-ref-kind="branch"][data-ref-name="feature/x"]` — no `data-head`.
- Row 2 (`m2`): 0 `<span>` ref badges.
- Row 3 (`f1`): 1 `<span>` `[data-ref-kind="tag"][data-ref-name="v0.9.0"]` — no `data-head`.
- Row 4 (`m1`): 0 `<span>` ref badges.

`graph-refs.spec.ts` derives its assertions from this table. If you change the fixture, update this table in the same edit.
