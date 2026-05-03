# Phase 5D + 5E — Code Review

**Branch:** `phase-5d-carry-forwards-errors`
**Reviewer:** Claude Opus 4.7
**Date:** 2026-05-03
**Scope:** carry-forwards (#2 hover-null transient, #3 controlled→uncontrolled dev-warn) + error-state shell.

## Stats

- Files Modified: 3
- Files Added: 3
- Files Deleted: 0
- New lines: 130
- Deleted lines: 29

Modified:

- `examples/consumer-app/app/graph/interactions/page.tsx`
- `registry/git-graph/git-graph.tsx`
- `tests/e2e/graph-interactions.spec.ts`

Added:

- `examples/consumer-app/app/graph/errors/page.tsx`
- `examples/consumer-app/app/graph/interactions-modeswitch/page.tsx`
- `tests/e2e/graph-errors.spec.ts`

## Findings

```
severity: medium
file: registry/git-graph/git-graph.tsx
line: 112-120
issue: dev-warn re-fires on every render after a mode switch, not just once
detail: After the consumer flips `selectedSha` from undefined → defined, `isControlledRef.current` is intentionally NOT updated (so behavior stays pinned to the first-render mode). Consequence: every subsequent render where `currentlyControlled !== isControlledRef.current` re-emits the same `console.warn`. In a parent that re-renders for unrelated reasons (clock, scroll position, animation state), the warning becomes console spam. The new e2e test asserts `>= 1` which masks this — the test name says "exactly once" but the assertion permits any positive count.
suggestion: Add a `hasWarnedRef = useRef(false)` and gate the warn on `!hasWarnedRef.current`, setting it `true` after emission. This preserves the "warn once" intent the plan describes while keeping the snapshot semantics intact.
```

```
severity: low
file: registry/git-graph/git-graph.tsx
line: 112-120, 456-461
issue: render-time `console.warn` / `console.error` are double-emitted under React strict-mode
detail: Both side-effects sit in the render path of a function component. React strict-mode in dev intentionally double-invokes render to surface non-pure code, so each warn/error appears twice per logical render. Cosmetic only; doesn't affect production. Worth noting because the new test `>= 1` assertion was likely written for this reason.
suggestion: Either move the warn/error into a `useEffect` (would change semantics — fires after commit, not during render — but is the React-canonical place for dev-only side effects), or accept the double-emit and document it next to the warn/error block.
```

```
severity: low
file: tests/e2e/graph-errors.spec.ts
line: 10, 18
issue: `page.on("console", () => {})` no-op listener with misleading comment
detail: Playwright does not fail tests on `console.error` by default. The empty handler doesn't suppress anything — it just registers a do-nothing subscriber. The accompanying comment ("suppress expected dev-mode console.error") implies otherwise. Future readers will assume there's a suppression mechanism here when none exists.
suggestion: Remove both the listener and the comment. If you actually want to scope assertions away from the dev-mode error output, filter `warns/errors` arrays explicitly the way `graph-interactions.spec.ts` does.
```

```
severity: low
file: examples/consumer-app/app/graph/errors/page.tsx
line: 32
issue: redundant `as null` cast in `{ kind: null as null }`
detail: TypeScript already infers `null` for the literal `null`. The cast is a no-op. Likely a leftover from an earlier shape that returned a discriminated union.
suggestion: Replace with `{ kind: null }`. If the call site needs the type to widen, declare the return type explicitly: `useMemo<{ kind: GitGraphInputErrorKind | null } | null>(...)`.
```

```
severity: low
file: examples/consumer-app/app/graph/interactions/page.tsx
line: 8, 33
issue: empty-string sentinel for "no selection" couples harness to component's truthy-check
detail: The harness uses `useState<string>("")` and passes `selectedSha={selected}` always, relying on the component's `selectedSha ? ... : undefined` truthy check to treat "" as "no selection". Today this works because line 132 of `git-graph.tsx` is exactly that truthy check. If the component ever migrates to `selectedSha !== undefined` as the "is selected" predicate (which would be more semantically correct), this harness breaks silently — `data-selected="true"` would appear on the empty-string row find result (none), and clear-selection would no longer un-highlight. Tests would catch it, but the harness becomes a hidden coupling.
suggestion: Encapsulate the conversion in one helper at the boundary, e.g. `const selectedShaProp = selected || undefined;` and pass `selectedSha={selectedShaProp}`. Now the component contract is "undefined means no selection" both in this harness and the modeswitch one, and a future component refactor can't accidentally diverge.
```

```
severity: low
file: tests/e2e/graph-interactions.spec.ts
line: 38-67
issue: cross-row hover test name overstates what it proves
detail: The test asserts that `hovers.slice(0, -1).filter(h => h === "null")` is empty — i.e. no `null` was recorded BEFORE the final mouse-move-to-(0,0). That correctly catches a regression where per-row `onMouseLeave` fires `null` between rows. However, the MutationObserver only records *transitions* of the echo's `lastHover` text — if React batches a hover that immediately overwrites a transient null with the next row's sha within the same commit, the observer might not see the null at all (depending on whether the text node mutates twice or once). The test relies on the implementation detail that the harness writes through to the DOM on every onCommitHover call.
suggestion: Tighten by asserting on `hovers` containing the expected sequence (`["m1", "f1", "m2", "null"]` or a permissive variant) rather than just the absence of nulls. That way both regressions — extra nulls AND missing entries — are caught.
```

```
severity: low
file: registry/git-graph/git-graph.tsx
line: 442-454
issue: `useLayoutOrError` runs on empty-commits path even though the result is then thrown away
detail: When `commits.length === 0 && !showWorkingTreeRow`, `useLayoutOrError` is still called (it must be, for hooks-rule consistency), `computeLayout([])` runs, and the resulting `LayoutResult` is then ignored as the empty-shell branch returns. `computeLayout([])` is cheap, so this is not a perf concern — only a tiny clarity wart.
suggestion: Acceptable as-is. If it ever bothers, hoist the `commits.length === 0 && !showWorkingTreeRow` early-return into a `useMemo` that returns either `{ kind: "empty" }` or the layout result, unifying the three render branches behind one tagged-union switch.
```

```
severity: low
file: registry/git-graph/git-graph.tsx
line: 87-100
issue: `useLayoutOrError` re-throws non-`GitGraphInputError` from inside `useMemo`
detail: Throwing from inside `useMemo` is not wrong — React surfaces the error to the nearest error boundary, which is the intended behavior for "real" bugs. The wart is that the throw site shows up in stack traces as the memo callback, one frame removed from the actual `computeLayout` call. Minor; only matters during debugging.
suggestion: None — this is the lesser evil. Leaving `GitGraphInputError` as the only catchable kind is the right contract: typed input errors render the shell, real bugs blow up loudly.
```

## Verifications run

- `pnpm lint` — clean across both workspaces.
- `pnpm typecheck` — clean (per-workspace + root).
- `pnpm test` — 65/65 unit tests pass.
- `pnpm test:e2e --project=chromium` (focused on changed specs) — 10/10 pass.
- `pnpm test:e2e` (3 browsers, full suite) — 112 passed / 26 skipped (Linux-only screenshots).

No critical, high, or security issues. Single medium worth addressing pre-merge: the dev-warn re-firing under repeated re-renders.
