---
description: Execute an implementation plan
argument-hint: [path-to-plan]
---

# Execute: Implement from Plan

## Plan to Execute

Read plan file: `$ARGUMENTS`

## Execution Instructions

### 1. Read and Understand

- Read the ENTIRE plan carefully
- Understand all tasks and their dependencies
- Note the validation commands to run
- Review the testing strategy

### 1.5. Plan Self-Consistency Pre-Read

Before executing any task, do a one-pass read of the plan checking for internal inconsistencies. This is a 2-minute investment that prevents a 10-minute failure deep in execution.

Specifically check:

- **Cross-section key identifiers agree.** Each URL path, route segment, file path, version string, port number, env var, and branch name should have exactly one canonical form. If Task 15's `IMPLEMENT` produces `out/r/foo` but Task 25's `VALIDATE` expects `out/r/foo.json`, that's a plan bug — flag it to the user before starting Task 15, not after Task 25 fails.
- **Every `VALIDATE` artifact is produced by some `IMPLEMENT`.** If a validation checks for a file, some earlier task must create it.
- **Every file in "New Files to Create" is referenced by some task.** Dangling file declarations are unimplemented intent.
- **No conditional fixes in `GOTCHA`.** "If X fails, add Y" means the plan author knew the fix — apply Y preemptively, don't wait for X to fail.

If you find inconsistencies, halt and surface them to the user. Do not guess which side of the inconsistency to honor.

(If the project has `/validation:plan-lint`, consider running it first — it does this check systematically.)

### 2. Execute Tasks in Order

For EACH task in "Step by Step Tasks":

#### a. Navigate to the task
- Identify the file and action required
- Read existing related files if modifying

#### b. Implement the task
- Follow the detailed specifications exactly
- Maintain consistency with existing code patterns
- Include proper type hints and documentation
- Add structured logging where appropriate

#### c. Verify as you go
- After each file change, check syntax
- Ensure imports are correct
- Verify types are properly defined

#### d. Escalate on external-system failures

If a task fails with an error that originates from an external system (network response, permission denial from a remote API, tool side-effect the plan explicitly claimed wouldn't happen, transitive dependency resolving differently than the plan asserted): **halt and report to the user before any retry or version substitution.**

Examples of this class of failure:

- `pnpm install` resolves a transitive dep to a different version than the plan claimed, producing runtime errors in subsequent tasks.
- A GitHub Actions step fails with "Resource not accessible by integration" despite the plan asserting the token has permission.
- A CLI tool produces different output than the plan described (mutated a config, created a different directory layout, picked a different default branch).
- A documentation URL referenced in the plan 404s.

The cost of asking is low (30 seconds of user attention); the cost of silently substituting a version or swallowing a permission error is a latent bug. Silent version drift in particular is the failure mode plans often explicitly forbid — respect that.

#### e. User-gate every destructive or shared-state action

Before running any of the following, pause and get explicit user approval (even if the plan marks them as `CONFIRM`):

- `git push` (first push of a branch)
- `git push -f`, `git reset --hard`, `git checkout --`, `git clean -f`
- `gh pr create`, `gh pr merge`, `gh pr close`
- `gh api --method {PATCH,DELETE,PUT}` against any remote
- Workflow runs that deploy to production-shared resources (`gh workflow run` for a deploy workflow)
- `rm -rf` outside build artifacts
- Any action that sends messages, creates issues, posts to chat, or modifies shared infrastructure

Grouping multiple destructive actions into one confirmation is fine — show the user the full plan for the group, then act. One blanket "proceed through tasks N–M" from the user covers the group.

Reversible local actions (editing files, running tests, running builds, restarting local dev servers) do not need confirmation.

#### f. `git status` before `gh pr create`

Before opening any PR, run `git status` and surface every untracked file or unstaged change to the user as an explicit decision point — not a passive warning the executor scrolls past. For each, decide together: include in this PR, commit separately on the branch first, or leave for a post-merge follow-up. `gh pr create`'s own "N untracked changes" warning is too easy to ignore and produces dirty PRs or surprise leftovers on the working tree post-merge.

### 3. Implement Testing Strategy

After completing implementation tasks:

- Create all test files specified in the plan
- Implement all test cases mentioned
- Follow the testing approach outlined
- Ensure tests cover edge cases

**Hot-path validation tests:** when an error is raised inside a comparator, visitor, reducer, or callback that only fires under specific structural conditions (`heap.size ≥ 2`, `array.length > 1`, a node with ≥ 2 children, a recursion depth > 1), construct test inputs that force the path to fire. A single-element input will not exercise a comparator; a single-node tree will not exercise a recursive visitor. If the assertion can pass via "the validator was never called," the test is a false positive — the validation looks covered but the path is dead code under that fixture. Verify the path fires (a `console.log` during development is enough) before declaring the test complete.

### 4. Run Validation Commands

Execute ALL validation commands from the plan in order:

```bash
# Run each command exactly as specified in plan
```

If any command fails:
- Fix the issue
- Re-run the command
- Continue only when it passes

### 5. Final Verification

Before completing:

- ✅ All tasks from plan completed
- ✅ All tests created and passing
- ✅ All validation commands pass
- ✅ Code follows project conventions
- ✅ Documentation added/updated as needed

### 6. Post-execution plan corrections

If, during execution, a plan-prescribed recipe (Docker invocation, shell script, validation command, build incantation) failed *as written* and a working substitute was discovered live, append a "Post-execution corrections" section to the plan describing the failure mode and the working recipe verbatim. Commit this on `main` after the implementation PR merges, in a focused commit separate from the artifact-commit (so the correction has its own message and shows up in `git log` searches for the recipe).

This is the right pattern when:

- The plan's recipe was authored against a different host OS than the executor's.
- A pinned Docker image's bundled tooling (corepack, package manager, signing keys) drifted from what the plan assumed.
- A validation command's API behavior didn't match the plan (e.g. a Playwright assertion failing on SVG `<path fill="none">` because of zero-area bounding boxes).

Do **not** silently fix the recipe in the plan's head — that erases the lesson. Append, don't overwrite. A future reader regenerating the recipe on a fresh host needs to see both the original assumption and the discovered correction to know which constraints are load-bearing.

## Output Report

Provide summary:

### Completed Tasks
- List of all tasks completed
- Files created (with paths)
- Files modified (with paths)

### Tests Added
- Test files created
- Test cases implemented
- Test results

### Validation Results
```bash
# Output from each validation command
```

### Ready for Commit
- Confirm all changes are complete
- Confirm all validations pass
- Ready for `/commit` command

## Notes

- If you encounter issues not addressed in the plan, document them
- If you need to deviate from the plan, explain why
- If tests fail, fix implementation until they pass
- Don't skip validation steps
