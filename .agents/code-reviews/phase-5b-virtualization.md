# Code Review — Phase 5B (Virtualization: 10k fixture, gutter range, virtualizer integration, E2E)

**Stats:**

- Files Modified: 4 (`registry/git-graph/git-graph.tsx`, `registry/git-graph/git-graph-gutter.tsx`, `tests/unit/fixtures/index.ts`, `.agents/plans/phase-5-virtualization-install-docs.md`)
- Files Added: 5 (`scripts/capture-fixture.mjs`, `tests/unit/fixtures/large.fixture.json`, `tests/unit/fixtures/large.fixture.meta.json`, `examples/consumer-app/app/graph/large/page.tsx`, `tests/e2e/graph-virtualization.spec.ts`)
- Files Deleted: 0
- New lines (excluding the 3.2 MB JSON fixture and the plan-file delta): ~75 in `git-graph-gutter.tsx`, ~280 in `git-graph.tsx`, ~3 in `index.ts`, ~75 in `capture-fixture.mjs`, ~30 in `/graph/large/page.tsx`, ~98 in the new E2E spec
- Deleted lines: ~110 (the pre-refactor body of `git-graph.tsx`)

Validation status (all green at review time): `pnpm typecheck`, `pnpm test` (65 unit tests across 7 files), `pnpm lint`, `pnpm test:e2e` (79 passed, 26 Linux-only screenshot tests skipped on Windows). Production build of `examples/consumer-app` succeeds; bundle composition discussed below.

---

## Findings

```
severity: high
file: tests/unit/fixtures/index.ts
line: 8-10
issue: Adding largeFixture to the shared barrel pulls a 2.7 MB JS chunk into every client page that imports any fixture
detail: The barrel now does `import largeFixtureJson from "./large.fixture.json"`
  (a 3.2 MB JSON file). Webpack treats JSON imports as having side effects and
  inlines them into a chunk shared by every client component that imports from
  this barrel. Verified via `pnpm --filter consumer-app build`:

    Route (app)              Size     First Load JS
    /graph                   4.33 kB  115 kB    ← server component, no chunk 938
    /graph/large             2.86 kB  749 kB    ← legitimately needs largeFixture
    /graph/interactions      2.96 kB  749 kB    ← does NOT use largeFixture
    /graph/working-tree      2.82 kB  749 kB    ← does NOT use largeFixture
    /gutter                  769 B    741 kB    ← does NOT use largeFixture

  Inspecting `app-build-manifest.json`, all four client pages above pull
  `static/chunks/938-5f3ab9b8fa476c2d.js` (2,677,258 bytes / 2.55 MiB), which
  contains the captured shas (verified by grepping for the fixture HEAD sha).
  Three of those four pages have no use for it. That's ~2.5 MB of unnecessary
  JS shipped to /graph/interactions, /graph/working-tree, and /gutter — a 6×
  First-Load-JS regression on those routes.

  /graph stays slim because it is a server component and largeFixture is never
  serialized into the client payload. The regression hits client routes only,
  but it hits them every time.
suggestion: Move the largeFixture import out of the shared barrel. Either:
  (a) Put it in its own module — `tests/unit/fixtures/large.ts` — and have
      callers `import { largeFixture } from "tests/unit/fixtures/large"`
      directly. The shared barrel re-exports stay JSON-free.
  (b) Move the file to a non-barrel location (e.g.,
      `tests/unit/fixtures/large/index.ts`) and update the single consumer
      (`/graph/large/page.tsx`) to import from there.

  Either fix should drop /graph/interactions, /graph/working-tree, /gutter back
  to ~115 kB First Load. Add a build-size assertion or a CI bundle-budget gate
  (Phase F has CI work in flight) to prevent regression.
```

```
severity: medium
file: registry/git-graph/git-graph.tsx
line: 206
issue: aria-activedescendant references a DOM id that is not guaranteed to exist when virtualization is active
detail: The container sets `aria-activedescendant={rowId(selectedRow.rowIndex)}`
  whenever `selectedRow` is defined. Each row's DOM `id` is set on the row
  element. With virtualization, only rows in the current window are mounted —
  if `selectedSha` is set (e.g., via `defaultSelectedSha` for a row far from
  the viewport, or after the user scrolls away from a previously-selected row)
  and the selected row is outside the windowed range, no element with the
  referenced id exists. ARIA spec requires the referenced element to exist;
  screen readers fail-soft (announce nothing or fall back), which silently
  degrades a11y. Pre-Phase-B this could not happen because every row was
  always rendered.
suggestion: Either (a) only set `aria-activedescendant` when the selected
  row's rowIndex is inside `[virtualItems[0].index, virtualItems.at(-1).index]`,
  or (b) on selection change, programmatically scroll the selected row into
  view (call `scrollToIndex(selectedRow.rowIndex, { align: "auto" })` from a
  `useEffect` keyed on `selectedSha`) so the id is always live. Option (b) is
  the cleaner UX — it also fixes the case where a consumer sets `selectedSha`
  externally to a row that's currently scrolled out of view.
```

```
severity: medium
file: registry/git-graph/git-graph.tsx
line: 351-354
issue: scrollEl state mirrors a ref but does not survive the ref pointing to a different element
detail: `useEffect(() => { setScrollEl(props.scrollContainerRef.current); }, [props.scrollContainerRef])`
  runs once on mount (the ref *object* is identity-stable from `useRef`, so the
  dep doesn't change). If a consumer ever uses a callback-ref pattern that
  swaps `.current` to a new DOM element later (rare but valid — e.g., a
  remount-the-scroll-container interaction), the virtualizer keeps observing
  the stale element. The "Post-execution corrections" plan note acknowledges
  the problem this fixes; it does not acknowledge this remaining gap.
suggestion: Trust this only for the typical case (ref attached once on mount).
  If the consumer remounts the scroll container, document the limitation in
  the registry's typedoc / API page in Phase G. Alternative: change the prop
  shape to a callback ref (`scrollContainerRef?: (el: HTMLElement | null) => void`)
  and have the consumer call it from their `ref={...}`, but that changes the
  public API and is more invasive than the bug warrants.
```

```
severity: low
file: registry/git-graph/git-graph.tsx
line: 188-193
issue: display:grid with gridTemplateColumns is dead style — all children are position:absolute
detail: The container uses `display: grid; gridTemplateColumns: ${gutterWidth}px 1fr`
  but every child (the gutter wrapper at line 209 and every row at line 234)
  is `position: absolute`. Absolutely-positioned children do not participate
  in grid layout, so the grid declaration affects nothing. The plan body
  prescribed this style verbatim; we followed it. Not a bug — the layout
  works because absolute positioning + explicit width carries it — but the
  grid declarations are misleading to future readers.
suggestion: Replace with `position: relative; height: totalSize` only.
  Drop `display: grid` and `gridTemplateColumns`. Visual output is identical;
  the simpler styles match what's actually doing the work.
```

```
severity: low
file: registry/git-graph/git-graph.tsx
line: 117, 389
issue: rootClassName computed twice
detail: `useGitGraphState` (line 117) computes
  `["git-graph", props.className].filter(Boolean).join(" ")` and the empty-
  state shell in the default-export `GitGraph` (line 389) recomputes the same
  expression. Stylistic only — but the two will silently drift if the class
  list ever evolves.
suggestion: Extract a tiny helper `function rootClassName(p: GitGraphProps)`
  near the top of the file and call it from both sites. Two-line change.
```

```
severity: low
file: registry/git-graph/git-graph.tsx
line: 60-74, 133
issue: GitGraphState carries the entire props object, which couples the body to the props shape
detail: `useGitGraphState` returns `{ ...state, props }`. `<GitGraphBody>`
  destructures `props` from state and reads `props.onCommitClick`,
  `props.onCommitHover`. This works but means any future consumer-facing prop
  added to `GitGraphProps` is automatically usable inside the body without
  explicit threading — the dependency is implicit.
suggestion: Extract the callbacks the body actually uses into the state
  object explicitly:
    return { ..., onCommitClick: props.onCommitClick, onCommitHover: props.onCommitHover, ... }
  Then `GitGraphBody` reads them from state directly instead of via
  `state.props.onCommitClick`. Makes the body's contract with the hook
  visible at a glance. Optional polish.
```

```
severity: low
file: registry/git-graph/git-graph.tsx
line: 227-229
issue: defensive `if (!row) return null` is dead code under matched count
detail: `virtualizer({ count: state.layout.rows.length })` guarantees that
  `vi.index` is in `[0, layout.rows.length)`. With `noUncheckedIndexedAccess`
  on, `layout.rows[vi.index]` is typed `LayoutRow | undefined`, which is why
  the guard is needed for the type system. But it can never fire at runtime.
  Not a bug — typing requirement. Leaving the guard is fine; just noting.
suggestion: Either annotate `// eslint-ignore — type-only guard, count
  invariant prevents undefined`, or use a non-null assertion
  `const row = layout.rows[vi.index]!;`. Stylistic.
```

```
severity: low
file: examples/consumer-app/app/graph/large/page.tsx
line: 23
issue: scroll-container border uses a graph-specific CSS variable for an unrelated element
detail: `border: "1px solid var(--graph-row-selected-border)"` reuses a token
  whose semantic meaning is "color used for the selected-row indicator". The
  scroll container is not a graph internal — it's a host wrapper. If a
  theming consumer recolors `--graph-row-selected-border`, the harness page
  border tracks that change unexpectedly.
suggestion: Use a generic neutral or just `1px solid #888`, or omit the
  border entirely. Harness pages aren't theming reference; visual consistency
  with the gallery isn't load-bearing.
```

```
severity: low
file: tests/e2e/graph-virtualization.spec.ts
line: 80
issue: 100 ms perf assertion has only ~6 ms headroom over execute-time webkit measurements (94 ms observed)
detail: The threshold formula in the plan is `MAX_FRAME_MS = 100` when worst
  real-row max ≤ 80 ms. The execute-time spike showed webkit max 60 ms, but
  the production E2E run on the same machine produced webkit max 94 ms. CI
  runners (typically slower than dev workstations) plus retry-once flake
  smoothing should still keep this passing — but the headroom is thin. If CI
  shows even occasional 100–110 ms maxes, raise the threshold rather than
  retrying.
suggestion: Either widen to `MAX_FRAME_MS = 150` for CI safety (still catches
  a broken virtualizer, which produces 200–2000 ms+ frames), or add a CI-only
  branch:
    const MAX_FRAME_MS = process.env.CI ? 150 : 100;
  Not blocking — first CI run will tell us whether 100 holds.
```

```
severity: low
file: scripts/capture-fixture.mjs
line: 28-57
issue: Inline parser duplicates registry/git-graph/lib/from-git-log.ts and the two will drift
detail: The plan's "Decision: write the script in JS and inline a minimal
  parser" notes the tradeoff. Concretely the inlined parser already differs
  from the registry source — it throws plain `Error`s with a different
  message prefix (`capture-fixture: …`) where the registry uses
  `fromGitLog: …`. If the registry parser gains new behavior (e.g., the
  Phase 5A code review's tab-bearing-subject handling, which we did inherit
  here), this script must be updated by hand or fixtures regenerated with the
  script will quietly diverge from production parsing.
suggestion: Add a comment at line 28 reminding future maintainers to keep
  this parser in sync with `registry/git-graph/lib/from-git-log.ts`. Or, when
  Phase G adds tsx-based scripts (Phase F may also), rewrite this to
  `import { fromGitLog } from "../registry/git-graph/lib/from-git-log";`.
```

---

## Non-issues confirmed

- `registry/git-graph/git-graph-gutter.tsx` — the no-`range` path is byte-for-byte structurally identical to the pre-Phase-B render: same `<svg>` attributes, same `<g data-role="edges">` and `<g data-role="nodes">` order, no extra wrapper. The `range` path adds a `<g transform="translate(0, ${-fromRow * rowHeight})">` wrapper, which only takes effect when `range` is provided. Phase 3 chromium-on-Linux screenshot baselines should match unchanged. Geometry test (`gutter-screenshots.spec.ts:40`, runs on chromium) passes locally.
- `registry/git-graph/git-graph.tsx` — the empty-state shell at line 391 is reached *before* the branching to `<GitGraphInElement>` / `<GitGraphInWindow>`, so the empty path doesn't trigger virtualizer hooks. Hooks-rule compliant. Each child component calls exactly one virtualizer hook; the parent's branch is at the React-element level, not inside a hook call.
- Edge filtering in the windowed path (`gutter.tsx:62-65`) — uses correct overlap semantics. Long-running edges (e.g., a branch from row 100 to row 8000) produce a single bezier path whose endpoints are far outside the SVG viewBox; SVG natively clips at the viewBox bounds, so no off-canvas drawing cost beyond the path-d parse. Verified via DOM inspection during the spike: with window at row 4000, gutter SVG height was 920 px (= 23 × 40) and contained edges whose `d` attributes referenced y-coords as far as 320 000 px after the `translate(0, -160 000)` transform, all clipped by the 920 px viewBox.
- `useEffect` mirror at `git-graph.tsx:96-102` is preserved unchanged — the Phase 4 controlled→uncontrolled mirror is still in place. Phase D will replace it per the plan's carry-forward #3.
- `scripts/capture-fixture.mjs` shells via `execFileSync` (not `execSync`), so the repo path is passed as a literal arg, not interpreted by a shell — no command-injection surface even if `--repo` contains spaces or shell metacharacters. The 16 MB `maxBuffer` covers the 10 000-line × ~200-byte/line case (~2 MB observed) with 8× headroom.
- `tests/unit/fixtures/large.fixture.meta.json` records the captured HEAD sha (`f4e0d4ed0cb44f5f106579d20824f49ec41247f3`), so the fixture is reproducible from the same upstream tree if regeneration is ever needed.
- `useVirtualizer`/`useWindowVirtualizer` are called unconditionally inside their respective leaf components — hook order is stable across renders.
- Plan post-execution corrections are recorded in the plan body (lines 1390–1424) per CLAUDE.md cadence; per the artifact-commit policy these will land on `main` after the implementation PR merges, separate from the implementation diff.

---

## Verdict

One **high-severity** bundle-bloat regression caused by the barrel re-export of the 3.2 MB JSON fixture; small, mechanical fix (extract `largeFixture` to a non-barrel module). Two medium-severity items: the a11y `aria-activedescendant`-points-at-unmounted-id case (worth fixing in Phase B since virtualization just introduced it), and the `scrollEl` state-mirror's gap on ref-element swaps (probably fine to defer with a doc note in Phase G).

Six low-severity items are stylistic polish or thin-CI-headroom watch-items; defer or apply opportunistically.

No critical or security-relevant issues. No correctness bugs in the virtualization integration itself — the SPIKE measurements + 12-test 3-browser E2E suite establish the integration works as designed. The `_spike` route-naming and `useVirtualizer` ref-timing failure modes are already documented in the plan's "Post-execution corrections" section.

Recommend: apply the high-severity bundle fix and at least the medium a11y fix before merge; defer the rest.
