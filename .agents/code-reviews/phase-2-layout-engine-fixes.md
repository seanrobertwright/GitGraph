# Code Review — Phase 2 Review Fixes

**Commit:** `5993e5d` on `phase-2-layout-engine` (follow-up to `583d333`)

**Stats:**
- Files Modified: 2 (`registry/git-graph/lib/layout.ts`, `tests/unit/layout.test.ts`)
- Files Added: 0
- Files Deleted: 0
- New lines: 117
- Deleted lines: 21

---

## Issues

```
severity: low
file: registry/git-graph/lib/layout.ts
line: 130-137
issue: Comparator re-parses string timestamps on every comparison
detail: When a commit has `timestamp` typed as a string, `toTimestampNumber` invokes `Date.parse` on each comparison the heap performs. For a heap of size k there are O(log k) comparisons per push/pop, and Phase 2 fixtures all use numbers so the path is free; but Phase 2.5's `fromGitLog()` will feed string timestamps in real volume. Repeated parsing of the same string is wasted work and will dominate large-N layout cost.
suggestion: Pre-compute a single numeric timestamp per commit before topoSort, e.g. build a `Map<sha, number>` once and have the comparator look up by sha. This also gives `toTimestampNumber`'s NaN guard a single point of failure outside the comparator hot path. Acceptable to defer to Phase 2.5 alongside the helper that introduces real string-timestamp inputs.
```

```
severity: low
file: registry/git-graph/lib/layout.ts
line: 165-212
issue: MinHeap class introduces ~50 lines for a Phase-2-correctness-only requirement
detail: The plan explicitly defers performance to Phase 5 ("Phase 2 is correctness-first"). The previous sort-per-pop implementation handled 9-node fixtures in a few microseconds and the plan's own perf-bench task lives in Phase 5. The heap is correct and well-implemented, but the LOC cost (and a private class — the only one in the registry so far) outweighs the Phase-2 benefit. This isn't a bug; it's an architectural-fit observation worth recording.
suggestion: Keep the heap — it is correct, encapsulated, and pays off as soon as Phase 5's real-repo inputs arrive. The cost of removing it now and re-adding it later is higher than carrying it. No change recommended; flagging because the original review marked perf as "No change needed now" and this commit went further than that. Noting for Phase 5 retrospective.
```

```
severity: low
file: registry/git-graph/lib/layout.ts
line: 19-21
issue: Cycle-detection error message doesn't name the cycle members
detail: When a cycle is detected, the error is "computeLayout: cycle detected in commit graph" with no information about which commits are involved. For a 9-commit fixture this is fine; for a real-repo input where one corrupted ref creates a cycle among ~5 commits in 1000s, debugging requires re-running with a manual diff of `sorted` vs `commits`. The unplaced shas (`commits.filter(c => !rowBySha.has(c.sha))` after the fact) would point straight at the cycle.
suggestion: Compute the set of unplaced shas (those in `commits` but not in `sorted`) and include them in the message: `throw new Error(`computeLayout: cycle detected involving: ${unplaced.join(", ")}`);`. Cheap to compute, dramatically better DX. Acceptable to defer to Phase 5 alongside the formal `errors.spec.ts` that PRD §12 calls for.
```

---

## Verified working

- **Cycle detection** (line 19): the duplicate-sha guard at line 12 ensures `commits.length === unique-shas count`, so `sorted.length !== commits.length` cleanly identifies cycle nodes (those whose child-count never reaches 0). Tested.
- **Heap correctness**: siftUp/siftDown standard binary-heap; pop with n=1 special-cased correctly (data popped, no sift). Edge case verified by orphan/octopus/long-lived-release fixtures (all 13 tests green, output byte-identical to pre-heap implementation per the determinism invariant).
- **Comparator total order**: `(timestamp desc, sha asc)` — total order on the input domain (shas are unique post-duplicate-check), so heap order is deterministic.
- **NaN timestamp throw**: NaN guard fires inside the comparator, which means the throw triggers only when at least one comparison runs (heap size ≥ 2). The test was updated to provide two commits to force a comparison; this matches the actual semantics. No silent-NaN-corrupts-sort path remains.
- **Mutation invariant** (test line 45): now iterates all 6 fixtures.
- **Error-path tests** (lines 71–97): cover duplicate sha, cycle, and unparseable timestamp. All pass.

---

## Verdict

No bugs introduced. The three findings above are forward-looking nudges (perf-cleanup deferrals, error-message ergonomics) — none block this PR. The fixes commit closes every medium/low item from the previous review.

Recommend: ship.
