# Code Review — Phase 2: Layout Engine

**Commit:** `583d333` on `phase-2-layout-engine`

**Stats:**
- Files Modified: 1 (`package.json`)
- Files Added: 12 (layout engine + types + tsconfigs + 6 fixtures + test + index)
- Files Deleted: 1 (`tests/unit/sanity.test.ts`)
- New lines: 454
- Deleted lines: 6

---

## Issues

```
severity: medium
file: registry/git-graph/lib/layout.ts
line: 71
issue: Non-null assertion on rowBySha.get(e.toSha) crashes on cyclic input
detail: We only push a partial edge when bySha.has(parent), but bySha membership does NOT guarantee the parent was actually placed. If the input contains a cycle, topoSort's Kahn's algorithm leaves every commit in the cycle unplaced (their child counts never reach 0). Any edge whose toSha is inside the cycle will then get rowBySha.get(e.toSha) === undefined, and the `!` assertion produces a runtime TypeError when we read `target.lane`. The plan permits throwing on cycles but requires documenting the chosen behavior; we currently do neither — we crash with a confusing "Cannot read properties of undefined (reading 'lane')".
suggestion: Either (a) detect cycles after topoSort (if `result.length !== commits.length`, throw with a clear message listing cycle members), or (b) skip edges where the parent row is missing and emit the placed subset. Option (a) is closer to the plan's intent ("allowed to throw on cycles"). Add one line before the edge map: `if (sorted.length !== [...new Set(commits.map(c => c.sha))].length) throw new Error("computeLayout: cycle detected in commit graph");` — and update the header comment to state this behavior alongside the duplicate-sha note.
```

```
severity: low
file: registry/git-graph/lib/layout.ts
line: 129-131
issue: Sort-per-pop in topological walk is O(n² log n)
detail: `ready.sort(compare)` runs on every iteration of the while loop, and `ready.shift()` is O(n). For the six Phase 2 fixtures (max 9 nodes) this is invisible, but the algorithm will dominate layout cost for realistic inputs (1k+ commits in Phase 5 virtualization). Phase 2 is explicitly correctness-first per the plan, so this is not a bug — just a known perf cliff worth flagging so Phase 5 doesn't rediscover it through a profiler.
suggestion: Swap the list-sort-shift pattern for a min-heap keyed on (-timestamp, sha) in Phase 5. No change needed now.
```

```
severity: low
file: registry/git-graph/lib/layout.ts
line: 100-102
issue: toTimestampNumber silently produces NaN for unparseable string timestamps
detail: `Date.parse("not a date")` returns NaN; the comparator then returns NaN for `tb - ta`, which makes `Array.prototype.sort` produce implementation-defined order — breaking the determinism contract advertised in the plan. No fixture exercises string timestamps, so this is latent.
suggestion: Either (a) assert the parse succeeded (`if (Number.isNaN(n)) throw new Error(\`invalid timestamp: ${t}\`)`), or (b) defer string-timestamp handling entirely to the future `fromGitLog()` helper and narrow the type here to `number` for Phase 2 + 2.5. Option (b) is simpler and matches the PRD's direction — the layout core doesn't need to parse dates.
```

```
severity: low
file: registry/git-graph/lib/layout.ts
line: 3-5
issue: Duplicate-sha behavior documented but not enforced or tested
detail: Header comment says "last occurrence wins" for duplicate shas, but in practice duplicates corrupt the child-count bookkeeping (each occurrence's parents increment the same parent's counter, so the parent never becomes ready when it should). The function likely returns fewer rows than input, not "last wins". The plan allows implementation-defined behavior here provided it's documented — our doc is wrong, not just permissive.
suggestion: Either (a) detect and throw on duplicate shas at function entry (`new Set(commits.map(c => c.sha)).size === commits.length`), or (b) rewrite the comment to describe the actual effect ("duplicate shas produce unspecified output; callers must dedupe"). Option (a) is friendlier and composes with the cycle-detection fix above.
```

```
severity: low
file: registry/git-graph/lib/layout.ts
line: 51-63
issue: Secondary-parent edges emitted even when primary parent is out-of-window
detail: When `parents[0]` is not in bySha we skip the primary edge and lane reservation, but we still iterate `parents[i>0]` and emit merge edges with `fromLane: targetLane`. If the commit itself was placed in a free lane (not a reservation), this is fine. If a windowed-out primary would have pulled the commit elsewhere... it can't, because reservations only exist for commits in bySha. So the behavior is consistent with the plan's rule ("unknown parents silently ignored"). Not a bug, but worth a sentence of doc since it's a subtle interaction. Flagged as low because no fixture exercises windowed input and Phase 2.5 (fromGitLog) will make this real.
suggestion: Add a fixture in Phase 2.5 where parents[0] is out-of-window but parents[1] is in-window, and lock the current behavior into a test.
```

```
severity: low
file: tests/unit/layout.test.ts
line: 54
issue: Input-immutability invariant only checks one fixture
detail: `does not mutate its input` snapshots and checks only `longLivedReleaseFixture`. The other five fixtures could be mutated without the test catching it. Low risk — the function is obviously non-mutating on inspection — but the invariant test as written under-advertises its coverage.
suggestion: Iterate over `cases` like the other invariants: `for (const [name, input] of cases) { const snap = structuredClone(input); computeLayout(input); expect(input, name).toEqual(snap); }`.
```

---

## Non-issues confirmed

- **`sorted[rowIndex]!` and `parents[i]!`** — bounded by `.length` checks or loop bounds; non-null assertions are safe.
- **`tb - ta` in comparator** — Unix-ms timestamps are ~1.7e12; subtraction stays within safe integer range.
- **Edge emission ordering** — row-walk order, primary-first-then-secondary per row, matches plan's stated convention and all six fixtures' expected arrays.
- **laneCount ignores transient reservations** — by design per plan §NOTES; `long-lived-release` specifically exercises this.
- **Duplicate topology sort per tiebreak** — orphan, feature-branch, merge, octopus, and long-lived-release all agree with strict `timestamp desc → sha asc`.

---

## Verdict

No critical or high-severity issues. One medium (cycle-induced TypeError) worth fixing before Phase 2.5 adds real-repo fixtures, which are the first realistic source of malformed input. All other findings are scope-appropriate deferrals or polish. The implementation is tight: 146 lines, zero runtime deps, 10/10 tests green, typecheck + lint + e2e clean.

Recommend: land as-is, open a follow-up for the cycle check + duplicate-sha guard (one small PR, matches the plan's "errors.spec.ts in Phase 5" item).
