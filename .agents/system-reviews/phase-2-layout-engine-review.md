# System Review — Phase 2: Layout Engine

## Meta Information

- **Plan reviewed:** `.agents/plans/phase-2-layout-engine.md`
- **Execution report:** `.agents/execution-reports/phase-2-layout-engine.md`
- **Plan command:** `.claude/commands/core_piv_loop/plan-feature.md`
- **Execute command:** `.claude/commands/core_piv_loop/execute.md`
- **Date:** 2026-04-27

## Overall Alignment Score: 8/10

Phase 2 shipped on a single PR with one fixture-level plan bug (long-lived-release rowIndex labels contradicted the stated tiebreak), one early adoption of a Phase 5 perf task (MinHeap), and one expansion of input-validation rigor (three malformed-input guards). The first is a process miss in planning; the latter two are net-positive divergences that originated in code review, not execution drift. CI was green on the first push, all 13 tests passed against the hand-authored expecteds, and `pnpm typecheck` cleanly absorbed the new root-tsc pass.

Points off for: (a) the long-lived-release contradiction was exactly the failure mode Phase 2.6 ("Plan Self-Consistency Check") is meant to prevent — a hand-trace would have caught it pre-emit; (b) the plan's "may throw or last-wins" language on duplicate shas conflicted with its own "do NOT silently produce garbage" directive, forcing the executor to pick.

## Divergence Analysis

```yaml
- divergence: long-lived-release fixture rowIndex labels (m3 ↔ r2 swap at rows 4/5)
  planned: r2 at row 4, m3 at row 5 (per fixture's expected rows[] and walk highlights)
  actual:  m3 at row 4, r2 at row 5
  reason:  Plan's stated tiebreak (timestamp desc) puts m3(ts=3000) before r2(ts=2500). The 5 other fixtures depend on this ordering; the plan's narrative for this one fixture contradicted itself.
  classification: good ✅ (correcting plan to match its own algorithm)
  justified: yes
  root_cause: missing hand-trace pass at plan time (Phase 2.6 should have caught it)

- divergence: binary MinHeap class instead of sort-per-pop in topo
  planned: ready.sort(compare); ready.shift() per iteration, perf deferred to Phase 5
  actual:  encapsulated MinHeap<T> with O(log n) push/pop
  reason:  Code review pass requested perf fix; user explicitly approved early adoption since heap is small, encapsulated, and Phase 2.5 real-repo input is imminent.
  classification: good ✅ (better approach found, user-sanctioned scope expansion)
  justified: yes
  root_cause: not a plan defect — review-driven optimization

- divergence: three malformed-input guards (duplicate sha, cycle, NaN timestamp)
  planned: implementation "may throw or take last occurrence"; errors.spec.ts deferred to Phase 5
  actual:  throws on each, with three dedicated tests
  reason:  rowBySha.get(e.toSha)! non-null assertion was unsafe under cyclic input — would crash with confusing TypeError. Plan's "do NOT silently produce garbage" wording supports throwing; "may throw or last-wins" wording allows either.
  classification: good ✅ (security/robustness; better matches plan's spirit)
  justified: yes
  root_cause: ambiguous plan — two adjacent statements gave conflicting guidance

- divergence: NaN-timestamp test required two commits, not one
  planned: implicit — single bad commit assumed sufficient
  actual:  test had to add a second commit because heap.size=1 never triggers comparator
  reason:  validation lives inside comparator; it never fires when nothing to compare
  classification: bad ❌ (minor) — test design oversight, not plan defect, but a recurring class of "validation-in-hot-path" footgun
  justified: n/a (caught and fixed during execution)
  root_cause: missing checklist item — when validation is inside a comparator/visitor, tests must force the path to fire

- divergence: artifact files (.agents/code-reviews/*.md) untracked at gh pr create time
  planned: implicit — plan committed only registry/, tests/, tsconfig.json, package.json
  actual:  uncommitted artifact warning surfaced during PR creation (harmless; merged cleanly, then artifacts committed in follow-up b9240ea)
  classification: bad ❌ (process noise) — convention for when artifacts get committed is unwritten
  justified: n/a
  root_cause: CLAUDE.md doesn't document the artifact-commit cadence
```

## Pattern Compliance

- [x] Followed codebase architecture (`registry/git-graph/` greenfield, types-only import boundary, no React/SVG leaked in)
- [x] Used documented patterns (kebab-case files, `type` over `interface`, named exports, LF, `@/` correctly NOT used in registry)
- [x] Applied testing patterns correctly (`*.test.ts` under `tests/unit/`, `toEqual` not snapshots — exactly per plan)
- [x] Met validation requirements (lint, typecheck, unit, e2e×3 all green on PR)
- [x] Native-binding pin discipline preserved (Phase 2 added no deps; nothing to pin)
- [x] CONFIRM gates honored (push, PR create, merge each user-approved per execution report)

## System Improvement Actions

### Update CLAUDE.md

- [ ] **Document artifact-commit cadence.** Plan + code-reviews + execution-report files in `.agents/` are committed in a follow-up commit on `main` *after* the implementation PR squash-merges. Do not bundle them into the implementation PR — they aren't feature artifacts and would dilute the diff. Phase 1 and Phase 2 both followed this pattern; codify it before Phase 3.

  Suggested wording (append to "Workflow" section):

  > Artifacts in `.agents/plans/`, `.agents/code-reviews/`, `.agents/system-reviews/`, and `.agents/execution-reports/` are committed in a single follow-up commit on `main` after the implementation PR squash-merges — never inside the implementation PR itself. This keeps PR diffs limited to feature code and prevents the "uncommitted artifact" warning during `gh pr create`.

- [ ] **Document `pnpm typecheck` two-pass shape.** With Phase 2, `typecheck` now means *per-app recursive pass* + *root `tsc -p tsconfig.json`* covering `registry/` and `tests/`. Future phases adding new top-level dirs (e.g. `cli/` for the install command later) must update root `tsconfig.json`'s `include` glob, not the per-app configs.

  Suggested wording (append to "Stack (pinned)"):

  > `pnpm typecheck` runs two passes: per-workspace via `pnpm -r --parallel typecheck`, then a root `tsc -p tsconfig.json --noEmit` over `registry/**` and `tests/**`. New top-level source dirs outside `apps/` and `examples/` must be added to root `tsconfig.json` `include`, not to per-app tsconfigs.

### Update Plan Command (`.claude/commands/core_piv_loop/plan-feature.md`)

- [ ] **Add hand-trace requirement to Phase 2.6 (Plan Self-Consistency Check).** When a plan author embeds expected output for a deterministic algorithm (fixtures, expected rendering output, expected query results), they MUST walk the algorithm by hand for each fixture before emitting and confirm the expected output matches the stated algorithm. The long-lived-release contradiction is a textbook miss that this rule catches.

  Suggested addition under Phase 2.6:

  > **Hand-trace fixtures with embedded expected output.** If the plan colocates a hand-authored expected result with a fixture (the "plan as source of truth" pattern that breaks snapshot circularity), walk the stated algorithm step-by-step against each fixture and confirm every field of the expected output is reachable from the algorithm + tiebreak rules. Contradictions between narrative walk-through and embedded expected values are the highest-value bug class to catch at plan time — they cost ~30s to find now and a full retry to fix during execution.

- [ ] **Disambiguate "implementation-defined" error handling.** The plan said both "may throw or take last occurrence" *and* "do NOT silently produce garbage." In practice these conflict: last-wins on duplicate shas corrupts child counts and produces silent garbage. Pick one and codify in acceptance criteria, OR explicitly mark error handling as a security boundary that must throw.

  Suggested addition under "Rules that apply to every task":

  > **No "implementation-defined" error handling at security boundaries.** If invalid input would cause downstream non-null assertions to crash with confusing errors, or would corrupt internal state silently, the plan must specify *throw with a named error* and *include the error test in the same task as the validation*. "May throw or use last-wins" is not a valid spec — pick one.

### Update Execute Command (`.claude/commands/core_piv_loop/execute.md`)

- [ ] **Add `git status` check before `gh pr create`.** Untracked files (artifact directories, local notes) should be a decision point, not a passive warning the executor scrolls past. Add to step 2.e (user-gate destructive actions):

  > Before `gh pr create`, run `git status` and surface any untracked files to the user. Decide explicitly: include in this PR, commit separately on the branch, or leave for a post-merge follow-up commit on main. Don't let `gh pr create`'s "N untracked changes" warning be the first the user hears about it.

- [ ] **Force-the-path checklist for validation-in-hot-path tests.** When a test asserts that an internal helper (comparator, visitor, validator inside a sort/heap/traversal) throws on bad input, the executor must verify the input forces the helper to fire. The single-commit NaN-timestamp test was a 30-second confusion that a checklist item prevents.

  Suggested addition under step 3 (testing):

  > **Hot-path validation tests:** when an error is raised inside a comparator, visitor, or callback that only fires under specific structural conditions (e.g. `heap.size ≥ 2`, `array.length > 1`, branch with ≥ 2 children), construct test inputs that force the path. A single-element input will not exercise a comparator. If the assertion can pass via "the validator was never called," the test is a false positive.

### Create New Command

- [ ] None for this phase. The repeated patterns are documentation gaps, not automation gaps. If we see a third instance of artifact-commit-after-merge being a manual decision, consider `/post-merge-artifacts` that stages `.agents/` files and commits them with a templated message — but two phases isn't enough signal yet.

## Key Learnings

**What worked well:**

- **"Plan as source of truth" via hand-authored expecteds.** Every `toEqual` failure pointed at a precise field, never at "is the snapshot stale?" — the single biggest contributor to one-pass success on a non-trivial algorithm. Make this the default for every future deterministic-data-structure phase.
- **External-system audit caught nothing because there was nothing to catch.** Phase 2 added no deps and touched no remote services, so the audit was a 30-second confirmation. The plan-template overhead was proportional to risk.
- **`exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` were uneventful.** Local `author` constants per fixture and `for...of` iteration sidestepped the friction the plan flagged. Pre-emptive plan guidance worked.
- **CONFIRM gates around push / PR create / merge prevented surprise.** Three pause points, three explicit user approvals, no rework. Worth keeping verbatim in every future phase.

**What needs improvement:**

- **Plan-time hand-trace of fixtures with embedded expected output.** Phase 2.6 caught most identifier mismatches but missed the long-lived-release algorithm/label contradiction because the rule didn't explicitly cover "expected output matches stated algorithm." Tightening Phase 2.6 closes this.
- **Error-handling spec ambiguity at the function-boundary level.** "May throw or use last-wins" deferred a decision the executor had to make under pressure. For pure functions with security-sensitive inputs (anything with non-null-assertions downstream), default to "throw" in the plan.
- **Artifact-commit cadence is folklore, not policy.** Two phases have followed the post-merge-on-main pattern; CLAUDE.md doesn't say so. One sentence in CLAUDE.md prevents Phase 3 from re-deciding.

**For next implementation (Phase 3 — gutter primitive):**

- **Apply hand-trace rule.** Phase 3 will introduce bezier path strings and a third `EdgeKind` (`fork`). If the plan colocates expected SVG path strings with fixtures, walk the bezier math by hand for each before emitting expected values.
- **Specify error handling up front.** What does the gutter do with a `LayoutResult` that has `laneCount: 0`? With duplicate `rowIndex` values? With edges referencing rows not in `rows[]`? Pick "throw" or "render empty" before writing tasks, not during execution.
- **Plan the artifact-commit step explicitly.** With CLAUDE.md updated per above, Phase 3's plan can simply say "after merge: `git checkout main && git pull && git add .agents/ && git commit && git push`" as a final task. No re-deciding.
- **Carry the MinHeap forward.** It's already in `registry/git-graph/lib/layout.ts`; Phase 3 should not duplicate it for any priority-queue need but should also resist promoting it to a shared `lib/heap.ts` until a second consumer materializes (probably Phase 5).
