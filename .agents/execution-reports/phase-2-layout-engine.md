# Execution Report — Phase 2: Layout Engine

## Meta Information

- **Plan file:** `.agents/plans/phase-2-layout-engine.md`
- **PR:** #2, squash-merged as `a64fcfa` on main
- **Follow-up artifacts commit:** `b9240ea`
- **Files added:**
  - `registry/git-graph/types.ts`
  - `registry/git-graph/lib/layout.ts`
  - `registry/git-graph/tsconfig.json`
  - `tsconfig.json` (root)
  - `tests/unit/layout.test.ts`
  - `tests/unit/fixtures/{linear,feature-branch,merge,octopus,orphan,long-lived-release,index}.ts`
- **Files modified:** `package.json` (typecheck script)
- **Files deleted:** `tests/unit/sanity.test.ts`
- **Lines changed:** +550 / −6 (squash diff)

## Validation Results

- **Syntax & Linting:** ✓ `pnpm lint` clean across all workspaces.
- **Type Checking:** ✓ `pnpm typecheck` covers per-app + new root `tsc` pass over `registry/` and `tests/`.
- **Unit Tests:** ✓ 13/13 passing (6 fixture equality + 4 invariants + 3 malformed-input).
- **Integration Tests (E2E):** ✓ Smoke spec green on chromium/firefox/webkit in CI.
- **CI:** All 6 jobs green on PR #2 (lint, typecheck, unit, e2e×3).

## What Went Well

- **Hand-authored expected fixtures eliminated the snapshot circularity.** Every `toEqual` failure during implementation pointed at a precise field, never at "is the snapshot stale?" The plan's directive to author expected values up front was the single biggest contributor to one-pass execution.
- **Tiebreak hand-trace per fixture caught the long-lived-release contradiction immediately.** Walking the algorithm by hand on each fixture before running the tests surfaced the row-4/row-5 m3-vs-r2 inconsistency as a plan-level issue, not an implementation bug — saved a debugging detour.
- **Heap encapsulation as a private class kept layout.ts readable.** The MinHeap is ~50 lines but lives at the bottom of the file with a clear contract; the topo-sort body reads as if a heap were built-in.
- **Error-path tests (3 of 13) pulled their weight.** Adding tests for duplicate / cycle / unparseable timestamp during the fix pass caught the subtle "comparator only fires when heap.size ≥ 2" detail — which would have been a latent bug otherwise.
- **`exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` integration was uneventful.** Local `author` constants in each fixture sidestepped the optional-field friction the plan flagged; `for...of` loops kept index-narrowing minimal.

## Challenges Encountered

- **Plan internal contradiction in long-lived-release.** The stated topological order (`m5, r4, m4, r3, m3, r2, m2, r1, m1` from ts-desc tiebreak) didn't match the rowIndex labels (which placed r2 at row 4, m3 at row 5). Resolved by trusting the stated algorithm — consistent with the other 5 fixtures — and updating the fixture's rowIndex labels in the same commit.
- **NaN-timestamp test failed initially with a single-commit input.** The heap never compares with size = 1, so `toTimestampNumber` was never invoked. Fixed by adding a second commit to force a comparison. Worth keeping in mind for any future "this throws on bad input" tests where the validation lives inside a comparator.
- **Untracked `.agents/code-reviews/*.md` triggered a "3 uncommitted changes" warning during `gh pr create`.** Harmless (PR was created cleanly), but a sign that the artifact directories should probably be committed alongside the implementation rather than after the PR opens.

## Divergences from Plan

**1. `long-lived-release` fixture rowIndex labels**

- Planned: r2 at row 4, m3 at row 5 (per the fixture's expected `rows[]` and walk highlights).
- Actual: m3 at row 4, r2 at row 5.
- Reason: The plan's stated tiebreak (timestamp desc) — which all 5 other fixtures depend on — produces m3 (ts=3000) before r2 (ts=2500) when both are in the ready set. The plan's narrative contradicted itself; fixture was updated to match the algorithm.
- Type: Plan assumption wrong (internal inconsistency in fixture authoring).

**2. Binary min-heap instead of sort-per-pop**

- Planned: `ready.sort(compare); ready.shift()` per iteration. Plan defers perf to Phase 5.
- Actual: Encapsulated `MinHeap<T>` class with O(log n) push/pop.
- Reason: Code review pass requested fixes for "all errors"; user explicitly asked for the perf fix even though the original review marked it "No change needed now." The heap is correct, encapsulated, and pays off as soon as Phase 5 / Phase 2.5 real-repo inputs arrive. Cost of removing-and-re-adding later exceeds the cost of carrying it.
- Type: Better approach found (early adoption of Phase 5 perf scope).

**3. Three malformed-input guards added in review pass**

- Planned: Implementation "may throw or take last occurrence" on duplicates / cycles; document inline. `errors.spec.ts` deferred to Phase 5.
- Actual: Throws on duplicate sha (entry), cycle (post-topoSort length check), and unparseable Date.parse (inside `toTimestampNumber`); each has a dedicated test.
- Reason: The `rowBySha.get(e.toSha)!` non-null assertion was unsafe under cyclic input — would crash with a confusing TypeError rather than a clear error. Guarding the boundary explicitly costs ~10 LOC and three tests; matches the plan's spirit ("don't silently produce garbage") more directly than the deferral.
- Type: Security concern (input validation) + Better approach found.

## Skipped Items

- **Phase 5 backlog items remained skipped as planned:** real-repo fixtures, `fromGitLog()` helper, bezier geometry, `fork` edge kind, fast-check property tests, perf benchmarks. None promoted into Phase 2.
- **Cycle error message naming the cycle members:** flagged in the second review as a low-severity ergonomics improvement; deferred to Phase 5's formal `errors.spec.ts`.
- **Pre-computed timestamp cache in comparator:** flagged for Phase 2.5 alongside the helper that introduces real string-timestamp inputs.

## Recommendations

### Plan command improvements

- **Mandate a hand-trace pass for any fixture whose expected output is non-trivial.** The long-lived-release contradiction was a textbook case of "the plan's narrative diverged from its own algorithm." Adding a pre-commit checklist item — "for each fixture, walk the algorithm step-by-step and confirm rowIndex labels match the stated tiebreak order" — would have caught it in the planning phase, not execution.
- **Differentiate "strict throw" from "implementation-defined" for malformed input up front.** The plan said both "may throw or use last-wins" and "do NOT silently produce garbage." In practice these conflict — last-wins on duplicates corrupts child counts and produces silent garbage. Pick one, ideally throw, and codify it as part of acceptance criteria.

### Execute command improvements

- **Run `git status` before `gh pr create`** so untracked artifact files are surfaced as a decision point rather than a warning.
- **For test additions where the assertion lives inside a hot path (comparator, validator),** include a "force the path to fire" sanity check in the same commit. The single-commit NaN test failure was 30 seconds of confusion that a five-second `console.log` wouldn't have produced — but a checklist item would.

### CLAUDE.md additions

- **Note the artifact-commit cadence.** Phase 1 committed plan + reviews after merging the PR; Phase 2 followed the same pattern; if this is the project convention, document it in CLAUDE.md so future phases don't re-decide. Suggested wording: "Plan, code-review, and execution-report files in `.agents/` are committed in a follow-up commit on main after the implementation PR squash-merges. Do not bundle them into the implementation PR — they are not feature artifacts and would dilute the PR diff."
- **Document the `pnpm typecheck` two-pass shape.** With this phase, `typecheck` now means "per-app + root tsc over registry/ + tests/." Future phases adding new top-level directories (e.g., `cli/` for the install command in a later phase) should know to update the root `tsconfig.json` `include` glob, not the per-app configs.

## Closing

Phase 2 shipped as planned with one fixture-level correction and a scoped expansion in input-validation rigor. The plan's instruction to author expected fixture values rather than rely on snapshots is the single most important pattern from this phase, and it should be the default for every future phase that produces a deterministic data structure.
