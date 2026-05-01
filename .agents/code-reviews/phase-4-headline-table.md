# Phase 4 — Code Review

Scope: post-merge review of squashed commit `3bde94c` against `main` (`Phase 4: headline <GitGraph> table (#4)`). Only the Phase 4 implementation files are in scope here; the unrelated `.kilocode/`, `.pi/`, `.qoder/`, `.agents/skills/`, and `skills-lock.json` entries that rode along in the squash are out of scope for technical review (process issue, flagged separately at the end).

**Stats (Phase 4 files only):**

- Files Modified: 2 (`registry/git-graph/git-graph.css`, `tests/unit/fixtures/index.ts`)
- Files Added: 18 (1 component, 2 lib helpers, 3 consumer-app pages, 7 e2e specs, 2 e2e PNG baselines, 1 fixture, 2 unit specs)
- Files Deleted: 0
- New lines: ~840 source + 2 PNGs

---

## Findings

### #1 — `head` prop in `/graph` page is wrong for 5 of 7 fixtures

```
severity: low
file: examples/consumer-app/app/graph/page.tsx
line: 30
issue: head = fixture.commits[0]?.sha picks the root, not the tip, for all fixtures except linear.
detail: Fixture authoring is inconsistent — linearFixture[0] is "a4" (newest), but
  featureBranchFixture[0] is "m1" (oldest root), same for merge/octopus/orphan/long-lived-release/with-refs.
  So the gallery page passes head="m1" for feature-branch when the actual tip is "m3". This is
  semantically wrong and would surface as a misplaced working-tree edge if anyone toggled
  showWorkingTreeRow on this page (the gallery doesn't, so it's dead code today). It also
  diverges from /graph/interactions which correctly hardcodes head="m3".
suggestion: Add an explicit head per fixture in the FIXTURES array, e.g.
  { name: "feature-branch", commits: featureBranchFixture, head: "m3" }, ... } and pass head
  through. Or compute the tip by picking the row at layout.rows[0] (which the component already does
  internally for layout but isn't exposed). Cheapest fix: hardcode the right head per fixture.
```

### #2 — `onCommitHover(null)` fires every time the cursor crosses a row boundary

```
severity: low
file: registry/git-graph/git-graph.tsx
line: 167-168
issue: onMouseEnter on row B fires after onMouseLeave on row A; consumers see a transient null between rows.
detail: A consumer wiring onCommitHover → "previewSha" state will see the preview flicker to null
  every time the user drags the cursor across rows, then immediately resolve to the new sha. For
  most UIs this is fine (state update batches). But if the consumer renders an expensive detail
  preview keyed on null vs sha, the null transient causes unnecessary unmount/remount.
  The plan explicitly accepts this ("both emit onCommitHover(null) once mouse leaves the row"),
  so this is per-spec — but it's worth flagging for Phase 5 to consider lifting hover tracking
  to the container with a single onMouseLeave there.
suggestion: Either accept the spec'd behavior and document it on the prop, or move
  onMouseEnter/Leave to the root container and resolve which row is hovered via event.target's
  data-sha. Defer to Phase 5; do not change here.
```

### #3 — Controlled→uncontrolled transition can leak stale internal selection

```
severity: medium
file: registry/git-graph/git-graph.tsx
line: 64-67
issue: setSelected always updates internal state; if the consumer was passing selectedSha and stops, internal state may not reflect their last intent.
detail: The bug fix during execution (always update internalSelected) was correct for the
  Escape-clears-selection case, but it has a side effect: while in controlled mode, every
  click/arrow/Escape mutates internalSelected even though that state is unused. If the consumer
  then drops the selectedSha prop entirely (controlled→uncontrolled), the component reads the
  last value setSelected wrote in controlled mode, which may be from a path the consumer rejected
  (they saw onSelectChange("f1") and chose not to update their state). Concrete repro: consumer
  controls with selectedSha="m3"; user clicks f1; onSelectChange fires with "f1"; consumer
  ignores it (keeps selectedSha="m3"); display correctly shows m3 selected; consumer later sets
  selectedSha={undefined}; selection jumps to f1 instead of falling back to defaultSelectedSha.
  React's canonical pattern warns against switching modes; we silently allow it.
suggestion: Two options. (a) Track an isControlled ref that snapshots first render; warn in dev
  if it changes (matches React's <input> behavior). (b) When entering uncontrolled mode (prop
  becomes undefined), reset internalSelected to defaultSelectedSha via useEffect. Option (a) is
  more honest; option (b) papers over the misuse. Either is fine. Not blocking — a real consumer
  hitting this is unlikely.
```

### #4 — `relativeTime` silently returns "unknown" for numeric strings that look like timestamps

```
severity: low
file: registry/git-graph/lib/format.ts
line: 13
issue: ts: number | string accepts strings, but Date.parse("1700000000000") returns NaN, not a date.
detail: Commit.timestamp is typed number | string in registry/git-graph/types.ts. A consumer
  who hydrates commits from JSON where timestamps are stringified numbers (common with bigint
  workarounds) will see "unknown" for every row instead of a relative time. Date.parse only
  understands ISO-like strings.
suggestion: Coerce numeric strings before parsing:
    const parsed = typeof ts === "number"
      ? ts
      : /^\d+$/.test(ts) ? Number(ts) : Date.parse(ts);
  Add a unit test: relativeTime("1700000000000", 1700000000000 + 5000) === "just now".
```

### #5 — Hardcoded fixture row counts in graph-render spec drift if fixtures change

```
severity: low
file: tests/e2e/graph-render.spec.ts
line: 3-11
issue: rowCount per fixture is hardcoded; adding/removing a commit in a fixture silently passes the unit suite but breaks this spec.
detail: Cheap maintenance hazard. The spec could compute rowCount = fixture.length at module
  load by importing fixtures, which is what the unit suite does.
suggestion: import { featureBranchFixture, ... } from "../unit/fixtures" at the top of the spec
  and replace the literal counts with .length. Playwright's tsconfig already covers tests/**.
  Keeps the spec self-updating when a fixture grows.
```

### #6 — `onClick` on row also fires when clicking ref badges (event bubbles)

```
severity: low
file: registry/git-graph/git-graph.tsx
line: 165-168
issue: Clicking a ref badge selects the row and fires onCommitClick. No way to wire badge-specific clicks.
detail: This is probably desired (clicking anywhere on the row → select row), but if Phase 5 adds
  per-badge interactions (e.g., "click branch → check out"), the bubbling will conflict. Worth
  noting now so Phase 5 doesn't have to undo it.
suggestion: No change for Phase 4. Phase 5 should add stopPropagation on a future
  onRefClick handler if/when introduced.
```

### #7 — graph-keyboard scrollIntoView spec couples to fixed viewport math

```
severity: low
file: tests/e2e/graph-keyboard.spec.ts
line: 51-66
issue: viewportSize { height: 200 } + 5 ArrowDowns assumes the last row's box.y + height fits within 200 + 1px slack.
detail: The page also renders a heading, an echo <pre>, and two buttons above the GitGraph. The
  test passed on all 3 browsers locally, but the assertion box.y + box.height <= 200 + 1 only
  holds because scrollIntoView({ block: "nearest" }) scrolls the document so the last row
  bottom lines up with the viewport bottom. If the consumer-app page's surrounding markup grows
  (a dev adds another button), the math may need adjusting. Not flaky now, but brittle.
suggestion: Replace the absolute bound with: assert lastRow is in viewport via
  await expect(lastRow).toBeInViewport(). That uses Playwright's intersection-observer-based
  check and is markup-independent.
```

### #8 — Empty-state shell has no `tabIndex`; screen readers may skip the listbox role

```
severity: low
file: registry/git-graph/git-graph.tsx
line: 76-83
issue: The data-empty="true" shell has role="listbox" and aria-label but no tabIndex.
detail: An empty listbox with role but no focusability is an a11y dead-end — screen readers can
  announce it but keyboard users can't reach it. Probably fine for an empty state (nothing to
  navigate), but inconsistent with the populated path which is tabIndex=0.
suggestion: No change needed if the design intent is "empty = not interactive." If you want
  consistent focusability, add tabIndex={-1} (announceable, not in tab order).
```

---

## Style / nit observations (non-blocking)

- `registry/git-graph/git-graph.tsx` re-declares `DEFAULTS` (laneWidth/rowHeight/...) instead of importing from `git-graph-gutter.tsx`. Matches plan's explicit guidance ("do not import DEFAULTS"), but the duplication is a maintenance footgun if the gutter ever changes its defaults. The plan acknowledges this is "already coupled by virtue of being CSS variables" — true, but only at runtime via CSS var override; the JS prop defaults are not coupled to anything.
- `refVarName` uses an exhaustive switch on `Ref["kind"]`. If a future kind is added (e.g., `"stash"`), TS will flag the missing branch — good. But the function returns `"branch" | "tag" | "remote"`, not derived from the input — a stronger typing approach would map kinds to vars in a const record. Not worth changing.
- The badge container uses `display: flex; gap: 4` inline. Fine, but `git-graph.css` is the natural home for this if it grows.

---

## Process observations (out of scope for code, in scope for next-phase plans)

- The squash-merge included `.agents/plans/phase-4-headline-table.md`, `.agents/skills/`, `.kilocode/`, `.pi/`, `.qoder/`, and `skills-lock.json` despite CLAUDE.md's "Artifact-commit cadence" rule (`.agents/plans/` should be a follow-up commit on `main`, not part of the implementation PR). This is a process violation, not a code defect. Cause: those files were untracked at branch-cut and someone (the GitHub squash UI, or a manual `git add` before merge) pulled them in. Recommend: add the `.agents/plans/` and noisy local-tool dirs (`.kilocode/`, `.pi/`, `.qoder/`) to `.gitignore` if they should never be tracked, or accept them as tracked going forward.
- The plan's Phase 0 spike was executed in-place (modifying the production spec to log deltas, then reverting) rather than via the throwaway `_spike` page approach. The measurement still produced the right tolerance (1.0px from 0.0 measured worst-case). No defect.

---

## Verdict

**No critical or high-severity issues.** Phase 4 ships a coherent, well-tested headline component. The medium finding (#3, controlled→uncontrolled state leak) is an edge case that won't bite typical consumers. The remaining findings are low-severity polish items, mostly worth carrying forward into Phase 5's "Inherited findings" rather than fixing now.

**Carry-forward recommendations for Phase 5:**

- #1 (head per fixture) — fix when adding the docs-site demo page (Phase 5 will surface this).
- #2 (onCommitHover null transient) — revisit if Phase 5 introduces a detail panel that's expensive to mount.
- #3 (controlled/uncontrolled stale state) — add a dev-mode warning the next time the component is touched.
- #4 (numeric-string timestamps) — easy win in any future Phase 5 polish PR.
- #5 (hardcoded fixture counts) — consider when adding more fixtures.

Acceptance criteria from the plan are met; lint, typecheck, 42 unit tests, 67 E2E tests across 3 browsers, and 2 chromium-linux screenshot baselines all green at merge time.
