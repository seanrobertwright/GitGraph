# Phase 3 — Gutter Primitive — Code Review

**Stats:**

- Files Modified: 11
- Files Added: 9 source/test files + 6 PNG baselines
- Files Deleted: 0
- New lines: ~430 (excluding plan + PNGs)
- Deleted lines: ~12

Reviewed against Phase 3 plan (`.agents/plans/phase-3-gutter-primitive.md`), `CLAUDE.md` conventions, and existing Phase 1/2 patterns.

---

## Issues

### medium · React `key` collision risk under degenerate parent lists

```
severity: medium
file: registry/git-graph/git-graph-gutter.tsx
line: 64
issue: Edge key uses only `${edge.fromSha}-${edge.toSha}`, which collides if a commit has duplicate parents
detail: The `LayoutEdge` type permits two edges sharing the same (fromSha, toSha) pair. None of the six fixtures hit this case, but a degenerate commit with `parents: ["X", "X"]` (e.g. a malformed merge commit, or a pathological synthetic fixture) produces two edges with identical keys, and React will warn at runtime and may reuse DOM nodes incorrectly. Layout doesn't dedupe such edges — it emits one straight + one merge.
suggestion: Include the parent index or kind in the key, e.g. `${edge.fromSha}-${edge.toSha}-${edge.kind}`. Distinguishes the duplicate primary/secondary pair and is still deterministic.
```

### medium · Edge lanes not validated; only row lanes are

```
severity: medium
file: registry/git-graph/git-graph-gutter.tsx
line: 32-36
issue: Negative-lane validation only walks `layout.rows`, not `layout.edges`
detail: The plan specifies "lane < 0: throw at component top regardless of NODE_ENV." The implementation throws when `row.lane < 0` but silently renders if `edge.fromLane < 0` or `edge.toLane < 0`. With an internally-consistent `LayoutResult` from `computeLayout`, this can't happen — edges derive lanes from rows. But the component is now part of the public registry contract, and a hand-built `LayoutResult` (or a bug in a future layout extension) could violate the invariant. The current code would emit `var(--graph-branch-${(-1 % 8) + 1})` = `var(--graph-branch-0)`, which is undefined, falling back to whatever `stroke` resolves to — likely black. Silent visual error.
suggestion: Either extend the validation loop to scan edges, or document the invariant on `GitGraphGutterProps` so consumers know the responsibility is theirs. Lower-friction fix: skip the edge in production with the same dev-throw pattern used for out-of-range rows.
```

### low · `straight` kind produces wrong path if misclassified

```
severity: low
file: registry/git-graph/lib/bezier.ts
line: 28-30
issue: The `straight` branch unconditionally emits `M x1 y1 L x2 y2`, which renders a diagonal line if fromLane !== toLane
detail: After the layout-side classification (`registry/git-graph/lib/layout.ts:81-92`), a `straight` edge always has `fromLane === toLane`, so this is a contract-internal invariant. But if a future regression sneaks a cross-lane edge through with `kind: "straight"` (e.g. a typo in a new fixture, or a refactor that misorders the kind assignment), `bezier.ts` will silently emit a diagonal — visually wrong but the unit tests won't catch it because their input matches the contract. Defensive option: ignore `kind` in `bezier.ts` and key off `fromLane === toLane` directly.
suggestion: Either accept the current contract (fast, simple, tests cover the cases) and add a comment naming the invariant, or branch on `fromLane === toLane` instead of `kind === "straight"` to make the geometry self-consistent regardless of kind. The plan locked the current form, so a one-line invariant comment is the minimal fix.
```

### low · Geometry spec hardcodes rowHeight

```
severity: low
file: tests/e2e/gutter-screenshots.spec.ts
line: 51
issue: `Number(rowIndex) * 40 + 20` hardcodes default rowHeight; breaks silently if a future phase changes the default or the page passes a custom value
detail: The plan acknowledges this ("If a future phase changes the default, update this constant — there's no DRY way to share without leaking impl into tests"). Acceptable for Phase 3, but worth a comment in the test itself so the next person to change `DEFAULTS.rowHeight` knows where to look.
suggestion: Add a comment above the assertion: `// Couples to DEFAULTS.rowHeight in git-graph-gutter.tsx; update both together.`
```

### low · Sync script wipes destination before validating source walk

```
severity: low
file: scripts/sync-registry.mjs
line: 42
issue: `await rm(DEST, ...)` runs before `walk(SRC)`; if walk throws after rm completes, consumer-app's components dir is left empty
detail: A throw mid-walk (filesystem race, EPERM on a file, etc.) leaves the consumer app in a broken state with no synced files and no source files. The `prepare` lifecycle hook doesn't currently fail loudly enough that a developer would notice before running `pnpm dev` and seeing import errors. Low-impact because `walk` is a simple readdir loop with no real failure modes against a clean source tree, but worth a small hardening.
suggestion: Walk first, write to a temp dir, then atomic rename. Or simpler: delete only after walk succeeds — `const files = await walk(SRC); await rm(DEST, {recursive, force}); ...`.
```

### info · Optional cleanup — `xmlns` is redundant in JSX

```
severity: low
file: registry/git-graph/git-graph-gutter.tsx
line: 51
issue: React injects xmlns automatically for top-level <svg>; the explicit attribute is dead weight
detail: Harmless but adds bytes to every SSR response. React's reconciler emits the SVG namespace itself.
suggestion: Drop the `xmlns="http://www.w3.org/2000/svg"` line.
```

---

## Verified non-issues

- **Number formatting in path strings.** `Number.prototype.toString` is exact for IEEE-754-representable values; default opts (16/40) and the test custom opts (20/30) all produce integer outputs. Verified: 19 unit tests pass with hand-traced expecteds.
- **`(lane % 8) + 1` with negative lanes.** Currently unreachable for rows (validation throws first). Reachable for edges in pathological inputs — see the "edge lanes not validated" finding above.
- **`process.env.NODE_ENV !== "production"` substitution.** Next 15 inlines this at build via SWC; the prod bundle silently skips the throw. Verified pattern matches existing React ecosystem use.
- **Fixture path traversal in `gutter/page.tsx` (`../../../../tests/unit/fixtures`).** Hand-traced: `gutter/` → `app/` → `consumer-app/` → `examples/` → repo root → `tests/unit/fixtures`. Correct.
- **`'use client'` directive.** Only the page uses it (for `useState`-driven theme flip). The gutter component itself has no hooks/effects/handlers and is server-renderable. ✓
- **Theming spec replaced `toBeVisible()` with `toHaveAttribute("d", /.+/)`.** SVG `<path>` with `fill: none` has zero-area bounding box on Chromium/WebKit and fails `toBeVisible()`; the attribute check is functionally equivalent and passes on all 3 browsers. Verified.
- **Screenshot baselines.** Generated inside `mcr.microsoft.com/playwright:v1.49.1-jammy`, matching CI's Linux Chromium binary. 6 PNGs at expected paths.
- **Determinism.** `edgePath` is a pure function over four numbers; tests cover repeated-call equality.
- **Default exports for components per CLAUDE.md.** ✓
- **`type` over `interface` per CLAUDE.md.** ✓
- **kebab-case file names.** ✓

---

## Summary

Three medium-severity findings, two of them defensive-hardening rather than active bugs:

1. React key collision under degenerate parent lists (defensive — none of the fixtures hit it).
2. Edge-lane validation gap (defensive — `computeLayout` enforces the invariant; only hand-crafted `LayoutResult` could break it).
3. `straight`-kind misclassification renders silently wrong (contract-internal invariant; covered by tests but a rebrand of the bezier branch on `fromLane === toLane` would make the geometry self-consistent regardless of kind).

The low-severity findings are minor (test-comment hint, sync-script ordering, redundant `xmlns`).

None of the findings block merge. The fixture-driven equality tests, hand-authored bezier expecteds, and Linux-rendered screenshot baselines together form a strong coverage net for what Phase 3 actually ships. Recommend addressing finding #1 (collision key) before Phase 4 begins composing the gutter into the headline table; it's a one-line change and the only one with non-trivial blast radius.
