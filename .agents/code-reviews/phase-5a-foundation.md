# Code Review — Phase 5A (Foundation: errors, validate, fromGitLog, deps)

**Stats:**

- Files Modified: 5 (`registry/git-graph/types.ts`, `registry/git-graph/lib/layout.ts`, `apps/docs/package.json`, `examples/consumer-app/package.json`, `pnpm-lock.yaml`)
- Files Added: 6 (`registry/git-graph/lib/{errors,validate,from-git-log}.ts`, `tests/unit/{errors,validate,from-git-log}.test.ts`)
- Files Deleted: 0
- New lines: ~59 in tracked-modified + ~17 + ~33 + ~38 + ~32 + ~64 + ~57 in new files
- Deleted lines: ~3 (the three plain `Error` throws replaced)

Validation status (all green at review time): `pnpm typecheck`, `pnpm test` (60 tests, 7 files), `pnpm lint`, `pnpm install --frozen-lockfile` — all pass.

---

## Findings

```
severity: medium
file: registry/git-graph/lib/from-git-log.ts
line: 11
issue: A tab character in the commit subject silently truncates the message
detail: We split the line on `\t` and validate `parts.length < 6`, but never check
  for `parts.length > 6`. If a commit subject contains a tab character (rare but
  valid in git), `split` returns more than 6 parts; the destructure picks the
  first six, so `message` becomes only the slice of subject before the first
  tab and the trailing portion is silently discarded. The plan claims `%s`
  strips tabs but that is folklore — modern git does not strip tabs from
  subjects.
suggestion: After the `< 6` check, change the parse to take the first five
  fields explicitly and join the rest as the message:
    const sha = parts[0]!;
    const parentsRaw = parts[1]!;
    const ctRaw = parts[2]!;
    const name = parts[3]!;
    const email = parts[4]!;
    const message = parts.slice(5).join("\t");
  Add a unit test with a tab-bearing subject to lock the behavior.
```

```
severity: medium
file: registry/git-graph/lib/from-git-log.ts
line: 26
issue: Non-numeric timestamp silently produces NaN; layout misbehaves downstream
detail: `Number(ctRaw) * 1000` returns NaN when `ctRaw` is non-numeric. NaN is a
  `number`, so layout.ts's `toTimestampNumber` (which rejects only `string`
  unparseables) returns NaN without error. The MinHeap comparator then does
  `tb - ta` on NaN, which returns NaN, which is treated as `>= 0`, breaking
  topological ordering. The bad row is accepted into the layout, ordering is
  silently wrong.
suggestion: After computing `timestamp`, validate:
    if (!Number.isFinite(timestamp)) {
      throw new Error(
        `fromGitLog: malformed timestamp on line ${i + 1}: ${ctRaw}`,
      );
    }
  Add a unit test with non-numeric `ctRaw`. (This stays a plain `Error`, not a
  GitGraphInputError, consistent with the existing format-mismatch decision in
  the plan.)
```

```
severity: low
file: registry/git-graph/lib/from-git-log.ts
line: 8
issue: CRLF line endings (`\r\n`) leave a trailing `\r` on every message
detail: We split on `\n`, so on Windows-line-ending input each non-empty `line`
  ends with `\r`. After splitting on `\t`, the final field (message) carries
  the trailing `\r`, which propagates into `Commit.message`. In practice the
  Phase 5 capture script uses `child_process.execFileSync` (no shell pipe, no
  CRLF transformation), so the production path is safe. But `fromGitLog` is a
  public API on the registry — a consumer redirecting git log through a
  Windows shell could hit this.
suggestion: Strip a trailing `\r` once during line iteration, e.g.
  `const line = (lines[i] ?? "").replace(/\r$/, "");`. Cheap; closes a real
  Windows footgun. Optional unit test with CRLF input.
```

```
severity: low
file: registry/git-graph/lib/from-git-log.ts
line: 18
issue: The destructure cast `as [string, string, string, string, string, string]` is correct but obscures intent
detail: The `parts.length < 6` guard makes the cast safe, but readers have to
  reason about the relationship between guard and cast. A reader who tightens
  the guard later (e.g., adding `!== 6` validation) could leave the cast
  inconsistent. This is a stylistic concern, not a bug.
suggestion: Either drop the cast and use indexed access with `!` (matches the
  rest of the codebase's noUncheckedIndexedAccess convention as seen in
  layout.ts:33-67), or keep as-is. Not blocking.
```

```
severity: low
file: tests/unit/from-git-log.test.ts
line: (none — coverage gap)
issue: Test coverage misses the parser's edge cases identified above
detail: The 8 tests cover the happy path well but do not exercise: (a) tabs in
  subject, (b) non-numeric `ctRaw`, (c) CRLF input. If the medium-severity
  fixes above are applied, those cases need tests. If they are not applied,
  the gap is even more important to flag because the bugs are silent.
suggestion: Add three tests matching the fixes proposed in the medium-severity
  findings.
```

---

## Non-issues confirmed

- `registry/git-graph/lib/errors.ts` — `Object.setPrototypeOf(this, GitGraphInputError.prototype)` is the standard ES5-target defensive pattern for `instanceof` reliability post-transpile. Required because TS down-compilation of `class extends Error` historically broke `instanceof`. Correct as written.
- `registry/git-graph/lib/validate.ts` — Deliberately omits duplicate-sha and cycle checks (plan §"CREATE validate.ts" GOTCHA: defer to `computeLayout`). The `allowMissingParents === true` comparison is the correct shape under `exactOptionalPropertyTypes`.
- `registry/git-graph/lib/layout.ts` — Three throws mechanically converted to `GitGraphInputError`. Messages preserved verbatim, so existing `expect(...).toThrow(/duplicate sha/)`-style tests in `tests/unit/layout.test.ts` continue to pass (verified: 13 layout tests green).
- `registry/git-graph/types.ts` — Re-export-only addition. No runtime impact.
- Dependency additions — `@tanstack/react-virtual@3.13.24` and `lucide-react@1.14.0` both verified live via `pnpm view` before pinning. `clsx@2.1.1` was already present in both apps. None ship native bindings, so no `pnpm.overrides` entries needed (matches plan §Dependencies audit).

---

## Plan-level inconsistencies surfaced (not code defects, but worth recording)

```
severity: low
file: .agents/plans/phase-5-virtualization-install-docs.md
line: 98 vs 121
issue: lucide-react version conflict between audit text and identifiers table
detail: §External-System Assumption Audit cites `0.469.0` (line 98); §Plan
  Self-Consistency Identifiers table cites `1.14.0` (line 121). Identifiers
  table is canonical. Verified via `pnpm view lucide-react@1.14.0 version` →
  exists, is `latest`. Phase 5A used `1.14.0`. The audit line is stale draft
  text.
suggestion: Update the audit section in the plan during the post-merge
  artifact commit, or note in the plan's "Post-execution corrections" section
  that 1.14.0 is the version actually used.
```

```
severity: low
file: .agents/plans/phase-5-virtualization-install-docs.md
line: 968, 1232 vs 123, 932
issue: serve version conflict between CI job and identifiers table
detail: §UPDATE ci.yml uses `serve@14.2.4` (line 968); §VALIDATION COMMANDS
  also `14.2.4` (line 1232); §Plan Self-Consistency Identifiers table and
  §VERIFY route-handler use `14.2.6` (lines 123, 932). Pick one before Phase F
  begins. Not a Phase 5A concern.
suggestion: Reconcile to one version when starting Phase F. Both versions
  exist on npm and behavior is identical for static-file serving.
```

---

## Verdict

Two medium-severity bugs in `from-git-log.ts` worth fixing before this code reaches a registry consumer (the parser is intended to be a public adapter). Both have small, mechanical fixes plus matching tests. Three low-severity items are optional polish.

No critical or high-severity issues. No security concerns (pure parsing, no I/O, no dynamic eval). No performance concerns (parser is O(n) over input length; tests for 10k lines fit comfortably under sub-millisecond budget).

Recommend: apply the two medium fixes + their tests, then commit Phase 5A.
