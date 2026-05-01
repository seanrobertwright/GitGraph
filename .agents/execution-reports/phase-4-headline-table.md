# Phase 4 — Execution Report

## Meta Information

- Plan file: `.agents/plans/phase-4-headline-table.md`
- Implementation PR: `#4` (squash-merged as `3bde94c`)
- Code-review fixes commit: `24b7ee9`
- Code-review artifact commit: `9427945`
- Branch state at report time: `main`

**Files added (Phase 4 scope, in-tree under `registry/`, `examples/`, `tests/`):**

- `registry/git-graph/git-graph.tsx` — headline component
- `registry/git-graph/git-graph.css` — appended ref-badge / row-hover / row-selected tokens
- `registry/git-graph/lib/format.ts` — `relativeTime`, `shortSha`
- `registry/git-graph/lib/working-tree.ts` — synthetic working-tree row helper
- `examples/consumer-app/app/graph/page.tsx` — fixture gallery
- `examples/consumer-app/app/graph/interactions/page.tsx` — hover/click/select harness
- `examples/consumer-app/app/graph/working-tree/page.tsx` — working-tree opt-in harness
- `tests/unit/fixtures/with-refs.ts` + `index.ts` barrel re-export
- `tests/unit/format.test.ts`, `tests/unit/working-tree.test.ts`
- `tests/e2e/graph-render.spec.ts`, `graph-interactions.spec.ts`, `graph-keyboard.spec.ts`, `graph-refs.spec.ts`, `graph-alignment.spec.ts`, `graph-working-tree.spec.ts`, `graph-screenshots.spec.ts`
- 2 chromium-linux PNG baselines under `tests/e2e/graph-screenshots.spec.ts-snapshots/`

**Files modified during code-review-fix pass (`24b7ee9`):**

- `examples/consumer-app/app/graph/page.tsx` (#1 — explicit `head` per fixture)
- `registry/git-graph/git-graph.tsx` (#3 — controlled→uncontrolled mirror via `useEffect`)
- `registry/git-graph/lib/format.ts` (#4 — numeric-string timestamp coercion)
- `tests/e2e/graph-render.spec.ts` (#5 — derive row counts from fixtures)
- `tests/e2e/graph-keyboard.spec.ts` (#7 — `toBeInViewport()` over absolute math)
- `tests/unit/format.test.ts` (regression test for #4)
- `.gitignore` (ignore noisy local-tool dirs `.kilocode/`, `.pi/`, `.qoder/`, `.agents/skills/`, `skills-lock.json`)

**Lines changed (Phase 4 source scope only, excluding skill/tool noise that rode along in the squash):** ~883 insertions across 20 files in `registry/`, `examples/`, `tests/`.

---

## Validation Results

- **Lint**: ✓ (per code-review verdict at merge time)
- **Type Checking**: ✓ — `pnpm typecheck` (per-workspace + root tsc over `registry/**` + `tests/**`)
- **Unit Tests**: ✓ — 42 tests pass (Vitest)
- **E2E Tests**: ✓ — 67 specs across 3-browser matrix (Chromium / Firefox / WebKit), 2 chromium-linux screenshot baselines green
- **Alignment measurement**: worst-case 0.0px delta between gutter node centers and metadata row centers across all 3 browsers (Phase 0 spike target was ≤1.0px)

---

## What Went Well

- **Composition over re-architecture.** The headline component cleanly composes the Phase 3 `<GitGraphGutter>` primitive via CSS Grid (column 1 = absolute-positioned SVG, column 2 = stacked rows). No primitive changes were needed, validating Phase 3's interface design.
- **Pixel-perfect alignment landed first try.** Reusing `DEFAULTS.rowHeight` for both the SVG row stride and the metadata row div height produced 0.0px measured delta — well under the 1.0px tolerance the Phase 0 spike established.
- **Controlled/uncontrolled selection followed React canonical pattern.** `selectedSha` / `defaultSelectedSha` / `onSelectChange` parallels `<input>` and slotted in without API thrash.
- **Test pyramid stayed proportionate.** Layout-affecting concerns landed in unit tests (format, working-tree synthesis); rendering / interaction / a11y / theming concerns landed in E2E (where the DOM and CSS-variable resolution actually matter). 67 E2E specs across 3 browsers caught the SVG `toBeVisible()` Chromium/WebKit gotcha that CLAUDE.md already documented.
- **Inherited Phase 3 finding #4 was honored.** The coupling comment was mirrored in `tests/e2e/graph-alignment.spec.ts` so a future `DEFAULTS.rowHeight` change surfaces both call-sites.

---

## Challenges Encountered

- **Squash-merge swept in unrelated tracked files.** The PR squash pulled in `.kilocode/`, `.pi/`, `.qoder/`, `.agents/skills/`, and `skills-lock.json` (local-tool scratch dirs) alongside the Phase 4 implementation. These weren't .gitignored at branch-cut and got staged inadvertently. Process violation flagged in the code review; addressed in `24b7ee9` by adding them to `.gitignore`.
- **`.agents/plans/phase-4-headline-table.md` rode along in the implementation PR** instead of landing in the post-merge artifact-commit per CLAUDE.md's "Artifact-commit cadence" rule. Same root cause (untracked-at-branch-cut → swept into squash).
- **Controlled→uncontrolled state leak (review finding #3).** The pre-fix code always wrote to `internalSelected` even in controlled mode, which would surface stale state if a consumer dropped the `selectedSha` prop after the component had been controlled. Edge case, but real. Fix mirrors the prop into `internalSelected` via `useEffect` on every change after mount.
- **Spike was executed in-place** rather than via a throwaway `_spike` page, mutating the production spec to log alignment deltas and reverting after measurement. The measurement was correct, but the approach diverged from the plan and left no artifact of the measurement run.

---

## Divergences from Plan

**Phase 0 alignment spike executed in production spec, not throwaway page**

- Planned: scaffold a throwaway `examples/consumer-app/app/graph/_spike/page.tsx` that logs gutter-node-center vs row-center deltas, run Playwright once, delete.
- Actual: instrumented the eventual production alignment spec with delta logging, ran it, removed the logging.
- Reason: faster iteration during execution; the measurement still produced the right tolerance (0.0px worst case across 3 browsers).
- Type: Better approach found (arguably) — but lost the spike artifact and mutated production code temporarily.

**Plan artifact landed in implementation PR, not post-merge follow-up commit**

- Planned: per CLAUDE.md "Artifact-commit cadence", `.agents/plans/phase-4-headline-table.md` should land in a focused commit on `main` after the PR squash-merges.
- Actual: included in the squash-merge of `3bde94c`.
- Reason: file was untracked at branch-cut, was added to the working tree during planning, and was inadvertently swept into the implementation PR's commit.
- Type: Process violation (not a code defect).

---

## Skipped Items

Per code-review verdict, the following findings were **deferred to Phase 5** and recorded in the review artifact for carry-forward:

- **#2 — `onCommitHover(null)` transient between rows.** Per-spec behavior; revisit only if Phase 5 introduces an expensive detail panel keyed on hover state.
- **#6 — Ref-badge clicks bubble to row `onClick`.** No need until Phase 5 introduces per-badge interactions (e.g., "click branch → checkout"). Add `stopPropagation` on `onRefClick` then.
- **#8 — Empty-state shell lacks `tabIndex`.** Design intent is "empty = not interactive"; left alone.

Plan-scope deferrals (per plan §Solution Statement, all explicitly Phase 5 work):

- **Virtualization** — not implemented; headline component renders all rows.
- **Row enter/exit animations** — not implemented.
- **Docs-site demo page** — not implemented; `/graph` route in `consumer-app` remains the E2E host.
- **`<GitGraph.Row>` compound slots** — deferred indefinitely; advanced consumers compose `<GitGraphGutter>` directly.

---

## Recommendations

**Plan command improvements**

- The Phase 0 spike instructions should explicitly require a throwaway artifact path *and* a "spike output" note in the plan body to capture the measurement. Otherwise spikes silently get inlined into production specs.
- Plans authored against an untracked working tree should grep `git status` for unrelated untracked files at branch-cut and `.gitignore` them before opening the PR. The `.kilocode/` etc. sweep was preventable.

**Execute command improvements**

- Before squash-merge, run `git diff --name-only main...HEAD` and confirm every changed path matches the plan's "Primary Systems Affected". Anything outside that scope is a sweep-in to investigate before merging.
- The artifact-commit cadence should be a checklist item the executor confirms before opening the PR, not just a CLAUDE.md rule.

**CLAUDE.md additions**

- Add an explicit "Untracked-file hygiene at branch-cut" line to the Workflow section: *"Before opening a PR, `git status` should show no untracked files outside `.agents/`. Untracked local-tool dirs (`.kilocode/`, `.pi/`, `.qoder/`, etc.) must be gitignored before the implementation PR opens, never after, to avoid sweep-in via squash-merge."* — this is the second time scratch dirs have caused PR noise.
- The "Phase 0 spike" pattern, if used again, deserves its own entry: spike code lives at `_spike/` paths, logs measurements to test output (visible in CI), and the plan body records the measured value before the spike code is removed.

---

## Verdict

Phase 4 ships the headline `<GitGraph>` component cleanly. Acceptance criteria from the plan are met: drop-in component, controlled+uncontrolled selection, keyboard nav, opt-in working-tree row, ref badges, pixel-perfect alignment (0.0px worst case), 42 unit tests + 67 E2E specs across 3 browsers all green. No critical or high-severity findings. The medium finding (#3, controlled→uncontrolled state) was fixed in `24b7ee9`. The remaining low-severity items are recorded in the code-review artifact for Phase 5 carry-forward.

Two process issues — squash-merge sweep-in of unrelated tooling dirs, and plan artifact landing inside the implementation PR — are the only items worth changing before Phase 5 begins.
