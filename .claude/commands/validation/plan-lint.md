---
description: Pre-execution lint pass on a plan file — checks self-consistency and flags unverified external-system claims
argument-hint: [path-to-plan]
---

# Plan Lint

Lint a plan file before execution begins. Catches internal inconsistencies and unverified external-system claims — the two classes of planning bug that cost the most execution-time iterations.

**This is a static analysis of the plan document. Do not run any task from the plan. Do not modify any source files. Only read.**

## Plan to Lint

Plan file: `$ARGUMENTS`

If no argument given, ask the user which plan to lint.

## What to Check

### 1. Key-identifier consistency (grep-driven)

Extract each of the following from the plan and verify every occurrence across the document agrees:

- **File paths**: every path mentioned in "New Files to Create" should appear in at least one STEP-BY-STEP task and at least one VALIDATE or acceptance-criteria line.
- **URL paths and route segments**: e.g. `/r/git-graph.json`. Every occurrence (landing page, route handler, `generateStaticParams`, validate steps, curl commands, acceptance criteria) must agree on the exact string. Extension boundaries matter — `git-graph` vs `git-graph.json` is a real mismatch.
- **Version strings**: every pinned version listed in "Feature Metadata" should match what appears in tasks that create `package.json` files.
- **Port numbers**: every port mentioned (dev server, webServer, CI matrix) must agree.
- **Environment variable names**: same.
- **Branch and remote names**: `main` vs `master`, `origin` vs other remotes — must be consistent.

**Method:** for each identifier class, extract unique values with grep, then for each unique value verify it's used consistently where it appears.

### 2. Task-to-validation coverage

For each STEP-BY-STEP task:

- Does the task have a `VALIDATE` line? (Warn if not.)
- Does the `VALIDATE` command's expected artifact actually get produced by this task's `IMPLEMENT` or a prior task's `IMPLEMENT`? Example: if VALIDATE runs `cat apps/docs/out/r/git-graph.json`, then some IMPLEMENT step has to produce `apps/docs/out/r/git-graph.json`. If the IMPLEMENT step produces `apps/docs/out/r/git-graph` (no extension), flag it.
- Is the VALIDATE command non-interactive? (No `read`, no prompts, no `-i` flags.)

### 3. External-system assumptions

Flag every claim the plan makes about behavior of a system not under the repo's control. Each flagged claim must be either:

- **Verified** — followed by a URL to current documentation that confirms the claim, OR
- **Assumption** — explicitly marked as an assumption that the execute agent should validate before trusting.

Claim categories to scan for (non-exhaustive):

- npm/pnpm transitive resolution ("X will pull Y at version Z")
- GitHub Actions token permissions ("GITHUB_TOKEN can do X")
- `actions/*` third-party action behavior ("enablement: true auto-provisions Pages")
- `gh` CLI side effects ("`gh repo create --source .` sets X as default")
- Node/tool auto-generated file behavior ("Next will produce X on first build", "`next lint` will not touch tsconfig")
- Network availability of documentation URLs referenced in the plan
- Container/CI runner behavior ("Ubuntu runner has X preinstalled")

For each unflagged claim, emit a warning with the exact quote and suggest either a verification URL or the "assumption" tag.

### 4. Conditional-fix detection

Search for conditional language in `GOTCHA` or `IMPLEMENT` sections:

- "if X fails, add Y"
- "if pnpm flags it missing, add Z"
- "should usually work, but fall back to W"

Flag these. Under deterministic scaffolding, if the plan author knows the fix, it should be **primary** not conditional. Conditional fixes guarantee one wasted iteration on first execution.

### 5. Greenfield-bootstrap safety (only if plan creates a repo)

If the plan's Task 0 or early tasks include `git init`, `gh repo create`, or any remote-creation step:

- Verify Task 1 (or an equally early task) creates an initial commit on `main` and pushes it **before** any feature branch is created.
- If `gh repo create --source .` is used on a repo with no commits, warn: first-push-wins branch semantics will make the first feature branch the remote default.
- Verify the plan doesn't assume `main` already exists on origin when opening the first PR.

### 6. Destructive-action gating

Verify every task that does any of the following is flagged in the plan as "user-gated" or has a `CONFIRM` step before it:

- `git push` (especially first push of a branch)
- `git push -f`, `git reset --hard`, `git checkout --`
- `gh pr create`, `gh pr merge`, `gh pr close`
- Any `gh api --method {PATCH,DELETE,PUT}`
- Workflow runs that deploy to production-shared resources

If a destructive action is listed without a user-gate, flag it.

### 7. Implementation-defined error handling at integrity boundaries

Search the plan for language that defers a behavior choice to the implementer where downstream code would crash or silently corrupt state:

- "may throw or [do X]"
- "may [throw / use last-wins / ignore]"
- "implementation-defined"
- "either ... or ..." applied to error handling
- "document whichever behavior you pick"

For each match: if the input being described could (a) feed a non-null assertion (`!`), unchecked index access, or `Map.get(...)!` downstream, or (b) corrupt counts/relationships that other code depends on (duplicate keys in a map, cycles in a graph, NaN in arithmetic), flag it. The plan must specify *throw with a named error* and include the error test in the same task as the validation. "Pick one and document inline" is not a valid spec — pick at plan time.

### 8. Hand-traced fixtures with embedded expected output

If the plan includes fixtures that colocate input + hand-authored expected output (the "plan as source of truth" pattern that breaks snapshot circularity for deterministic algorithms), verify each expected value is reachable from the stated algorithm:

- Identify any section listing a non-trivial fixture with both `input` and `expected` (LayoutResult, expected SQL rows, expected SVG path strings, expected serialized payloads).
- For each such fixture, check whether the plan includes a step-by-step walk-through of the algorithm against the fixture's input.
- If the plan provides a walk-through with named row/step labels, verify the embedded expected values agree with the walk-through. The Phase 2 long-lived-release contradiction (m3 vs r2 row swap) is the canonical failure: walk-through said one order, expected `rows[]` labeled the opposite. Grep for this class — narrative description of an order vs. concrete labels in the expected block.
- If no walk-through exists for a non-trivial fixture, flag it: the plan author should either include the walk-through or downgrade the fixture's complexity. Without a walk-through, embedded expected values are unverifiable claims.

### 9. Hot-path validation tests

For any task whose `IMPLEMENT` adds a `throw` inside a comparator, visitor, reducer, recursive helper, or callback that only fires under specific structural conditions (`heap.size ≥ 2`, `array.length > 1`, recursion depth > 1, ≥ 2 children):

- Verify the corresponding test in the plan uses input that *forces the path to fire*. A single-element input does not exercise a comparator; a single-node tree does not exercise a recursive visitor.
- If the plan's test fixture for the throw path could pass via "the validator was never called," flag it. The Phase 2 NaN-timestamp-with-one-commit miss is the canonical failure.

### 10. Dead-reference check

- Every file listed in "New Files to Create" should appear in at least one STEP-BY-STEP task.
- Every pattern/library/doc in "CONTEXT REFERENCES" should be cited by at least one task's `IMPLEMENT`, `PATTERN`, or `GOTCHA`.
- Conversely: every file created by a task should have been declared in "New Files to Create" (not silently introduced).

## Output Format

Save your report to `.agents/plan-lint/[plan-basename]-lint.md` (create the directory if it doesn't exist).

Structure:

```markdown
# Plan Lint — [plan-basename]

**Plan**: [path]
**Lint date**: [date]

## Summary

- Critical issues: N
- Warnings: N
- Verified claims: N
- Unverified external claims: N

## Critical Issues

(Must be fixed before execution. Typically: internal inconsistencies, destructive actions without gates, conditional fixes that waste iterations.)

### [Issue title]

- **Location**: Task N, line X / "Section Name"
- **Finding**: [concrete description with exact quotes]
- **Impact**: [what will happen at execution time if uncorrected]
- **Fix**: [specific text or structural change to the plan]

## Warnings

(Should be addressed but won't block execution. Typically: unverified external claims, missing VALIDATE lines, dead references.)

### [Warning title]

- **Location**: [section/task]
- **Finding**: [description]
- **Suggested action**: [what to add or change]

## External-System Claims Audit

For each claim the plan makes about external-system behavior:

| Claim (short) | Quote | Location | Status |
|---|---|---|---|
| ... | "..." | Task N | Verified (link) / Assumption / **Unverified** |

## Greenfield Bootstrap Check (if applicable)

- [ ] Initial commit on `main` created before feature branches
- [ ] No `gh repo create --source .` on an empty tree without follow-up
- [ ] First PR target (`main`) will exist on origin before PR is opened

## Recommendations

Prioritized list of plan edits, if any.
```

## Verdict

End the report with one of:

- **PASS** — safe to execute as written.
- **PASS WITH WARNINGS** — safe to execute, but the warnings will likely cost minor iteration time.
- **FAIL** — critical issues present; execute agent should not start until the plan is updated.

## Important

- **Do not execute any task from the plan.** This is static analysis.
- **Do not modify any source file.** Only read the plan and write the lint report.
- **Be specific.** Quote the exact plan text, cite the task number, identify the exact disagreement. Vague findings ("plan could be clearer") are not actionable.
- **Be honest about verification.** If you haven't confirmed a documentation URL actually supports a plan's claim, mark the claim "Unverified" — don't assume.
