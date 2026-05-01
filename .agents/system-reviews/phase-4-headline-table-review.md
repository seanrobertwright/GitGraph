# System Review — Phase 4: Headline `<GitGraph>` Table

## Meta Information

- **Plan reviewed:** `.agents/plans/phase-4-headline-table.md`
- **Code review:** `.agents/code-reviews/phase-4-headline-table.md`
- **Execution report:** `.agents/execution-reports/phase-4-headline-table.md`
- **Plan command:** `.claude/commands/core_piv_loop/plan-feature.md`
- **Execute command:** `.claude/commands/core_piv_loop/execute.md`
- **Date:** 2026-05-01

## Overall Alignment Score: 8/10

Phase 4 cleanly delivered the headline component: composition over re-architecture, 0.0px alignment delta on first try, 42 unit + 67 E2E tests across 3 browsers, no critical or high findings. Phase 3's lessons were absorbed (Playwright SVG attribute assertions, deferred-finding inheritance honored — finding #4's rowHeight-coupling comment was mirrored as instructed). The medium code-review finding (#3 controlled→uncontrolled) was fixed pre-merge in `24b7ee9`.

Two points off, both process not code:

1. **Squash-merge sweep-in of unrelated tooling dirs** (`.kilocode/`, `.pi/`, `.qoder/`, `.agents/skills/`, `skills-lock.json`) plus the plan artifact itself rode along in PR #4 instead of the post-merge artifact-commit. Recurring class of issue: untracked-at-branch-cut → swept into squash. The plan didn't have a pre-PR untracked-file audit and the executor didn't run one.
2. **Phase 0 spike executed in-place** despite the plan giving an explicit, paragraph-long recipe for a throwaway `_spike/` page + temporary `_spike-alignment.spec.ts`. Executor inlined the measurement into the production alignment spec, then reverted. Measurement was correct (0.0px), but the spike artifact was lost and the executor diverged from a step that was as prescriptive as the plan gets.

Neither is novel — sweep-in is the same shape as Phase 3's Docker-recipe brittleness (plan vs. host environment), and the spike shortcut is plain executor drift on an explicit instruction. The takeaway is automation: the executor needs a checklist gate, not more documentation.

## Divergence Analysis

```yaml
- divergence: Phase 0 spike executed in production spec, not throwaway _spike/ path
  planned: scaffold examples/consumer-app/app/graph/_spike/page.tsx +
           tests/e2e/_spike-alignment.spec.ts; log per-browser deltas; record
           worst-case in plan body; delete both.
  actual:  instrumented the eventual production tests/e2e/graph-alignment.spec.ts
           with delta logging; ran it; removed the logging; kept the spec.
  reason:  faster iteration; the measurement still produced 0.0px worst-case.
  classification: bad ❌ (mild)
  justified: no — the plan was explicit and the in-place approach left no
             artifact of the measurement run. Plan §"SPIKE measure alignment delta
             (Phase 0)" steps 1–6 were not optional.
  root_cause: executor drift on a fully-specified instruction. Not a plan-quality
              issue. The execute command does not currently treat plan-prescribed
              throwaway artifacts as a checklist item.

- divergence: .agents/plans/phase-4-headline-table.md landed in implementation PR squash
  planned: per CLAUDE.md "Artifact-commit cadence", the plan file lands in a
           focused commit on main AFTER the implementation PR squash-merges.
  actual:  swept into the squash of 3bde94c.
  reason:  file was untracked at branch-cut and was added during planning on the
           feature branch; never moved to main first.
  classification: bad ❌
  justified: no
  root_cause: missing pre-PR scope check. The executor didn't run a "every changed
              path matches Primary Systems Affected" sweep before opening the PR.
              CLAUDE.md states the rule; nothing enforces it.

- divergence: .kilocode/, .pi/, .qoder/, .agents/skills/, skills-lock.json swept
              into the implementation PR
  planned: not addressed by the plan — these are local-tool scratch dirs that
           weren't in scope.
  actual:  inadvertently tracked when the PR was opened; addressed post-merge by
           adding to .gitignore in 24b7ee9.
  reason:  untracked at branch-cut, not gitignored, then accidentally staged.
  classification: bad ❌
  justified: no
  root_cause: same as above plus a recurring gap: untracked local-tool dirs are
              never gitignored proactively. Second occurrence of "scratch dir
              caused PR noise" per the execution report.

- divergence: code-review #3 (controlled→uncontrolled state leak) addressed
  planned: not pre-specified — surfaced by the code review.
  actual:  fixed in 24b7ee9 with a useEffect mirror of selectedSha into
           internalSelected on every change.
  classification: good ✅
  justified: yes
  root_cause: legitimate edge case the plan didn't enumerate. The fix is the
              papering-over option (b) from the review's two suggestions, not the
              dev-warn option (a). Acceptable trade-off; consumers hitting this
              would silently get a stable result instead of a dev-warn — slightly
              less honest but lower surface area.

- divergence: none — inherited Phase 3 finding #4 was honored
  note: plan §"Inherited findings" instructed mirroring the rowHeight-coupling
        comment in graph-alignment.spec.ts; verified done. The
        deferred-finding-carry-forward channel CLAUDE.md added post-Phase-3
        worked on its first real test.
```

## Pattern Compliance

- [x] Followed codebase architecture (composition over re-architecture; CSS-Grid container; no primitive changes; `'use client'` boundary held — gutter primitive remained server-renderable)
- [x] Used documented patterns (kebab-case files, default export, `type` over `interface`, `DEFAULTS` re-declared per plan guidance, controlled/uncontrolled React canonical pattern)
- [x] Applied testing patterns correctly (Vitest unit for pure fns, Playwright e2e for DOM/CSS/interactions, attribute-based SVG assertions per CLAUDE.md, 3-browser matrix, chromium-only screenshot baselines)
- [x] Met validation requirements (lint + two-pass typecheck + 42 unit + 67 e2e × 3 browsers + 2 chromium-linux baselines)
- [x] Native-binding pin discipline preserved (no new deps)
- [x] CONFIRM gates honored (push, PR create, merge each user-approved per execution report)
- [x] Inherited-findings channel followed (Phase 3 finding #4 mirrored as instructed)
- [ ] **Artifact-commit cadence followed.** Plan file rode along in the implementation PR — failed. Recurring vs. Phase 3 which followed it cleanly.
- [ ] **Plan-prescribed throwaway artifacts respected.** Phase 0 spike inlined instead of executed at `_spike/` paths.

## System Improvement Actions

### Update CLAUDE.md

- [ ] **Untracked-file hygiene at branch-cut.** Second occurrence of scratch-dir sweep-in (the first was implicit in earlier phases per execution report's "second time" remark). Add to "Workflow" section, after the artifact-commit cadence bullet:

  > **Untracked-file hygiene at branch-cut.** Before opening a PR, `git status` on the feature branch must show no untracked files outside `.agents/`. Untracked local-tool scratch dirs (`.kilocode/`, `.pi/`, `.qoder/`, `.agents/skills/`, `skills-lock.json`, etc.) must be added to `.gitignore` *before* the implementation PR opens, never after, to avoid sweep-in via squash-merge. The pre-PR check is: `git status --porcelain` should list only files matching the plan's "Primary Systems Affected".

- [ ] **Plan-prescribed throwaway artifacts.** The Phase 0 spike pattern is now established and was diverged from once — codify before it gets diverged from again. Add to "Workflow" section:

  > **Plan-prescribed spike artifacts.** When a plan prescribes a throwaway spike (e.g. `_spike/` page, `_spike-*.spec.ts`), execute it as written — do not inline the measurement into the production tree. The spike's value is not just the number it produces but the recorded measurement run and the clean separation from production code. If the plan recipe genuinely doesn't fit the situation, append a "Post-execution corrections" section to the plan rather than silently substituting.

### Update Plan Command (`.claude/commands/core_piv_loop/plan-feature.md`)

- [ ] **Spike tasks must require recording the measured value in the plan body itself.** Phase 4's plan §"SPIKE" step 5 already says this ("replace the `0.5` tolerance with `max(measured_max, 0.5) + 0.5`"), but it's buried in step 5 of 6. Promote to a top-level rule under "Rules that apply to every task":

  > **Spike tasks: record the measurement in the plan.** Any task labeled SPIKE must conclude by editing the plan file to record the measured value (in the relevant downstream task body, with a comment citing the spike). Without this, the spike's output exists only in transient test logs and can't be audited later. Spike code itself lives at `_spike/`-prefixed paths and is deleted at the end of the task; the *measurement* is permanent and lives in the plan.

- [ ] **Pre-PR scope-check task.** The execute command should run `git diff --name-only main...HEAD` and confirm every path matches the plan's "Primary Systems Affected" before opening the PR. Plan command should *generate* this task into every plan's pre-PR checklist. Add to "Phase N: Validation & PR" template:

  > **Pre-PR scope confirmation.** Before opening the PR, run `git diff --name-only main...HEAD` and verify every changed path is listed under "Primary Systems Affected" or is an explicitly planned new file. Any out-of-scope path must be (a) gitignored if it's local-tool noise, (b) reverted if it's accidental, or (c) added to the plan's scope with a brief rationale before proceeding. Untracked files in `git status` must also be inspected — if they're scratch/tool dirs, gitignore them before opening the PR.

### Update Execute Command (`.claude/commands/core_piv_loop/execute.md`)

- [ ] **Add a pre-PR scope-check checklist item.** Mirror the rule from the plan command into the executor's playbook so it runs even when the plan-template version was overlooked. Suggested addition under pre-merge / pre-PR steps:

  > **Pre-PR scope check (mandatory).** Before invoking `gh pr create`:
  > 1. `git status` — confirm no untracked files outside `.agents/`. Anything else: gitignore or revert.
  > 2. `git diff --name-only main...HEAD` — confirm every changed path is in the plan's "Primary Systems Affected" or is an explicitly planned new file.
  > 3. If `.agents/plans/<phase>.md` is staged or committed on the feature branch, move it to a post-merge commit on `main` per CLAUDE.md's artifact-commit cadence. **Do not let a plan file ride along in an implementation PR.**

- [ ] **Honor plan-prescribed throwaway artifacts.** Add a rule next to the validation-recipe rule from Phase 3's review:

  > **Plan-prescribed throwaway artifacts (spikes).** When a plan instructs creating a `_spike/` page or `_spike-*.spec.ts`, create those exact files; do not inline the measurement into a production spec. The throwaway path is part of the plan's audit trail. The measurement value gets recorded in the plan body before the spike code is deleted.

### Create New Command

- [ ] **`/check-pr-scope`** — automates the three-step pre-PR scope check above. Two phases now show "scope sweep-in" friction (Phase 4's tooling-dir sweep, plus the plan-file-in-PR pattern). One command that runs `git status` + `git diff --name-only main...HEAD` and grep-matches against a plan's "Primary Systems Affected" section would close the loop. Bar for creating a command was "manual process repeated 3+ times" — this is the second occurrence; create it now if the next phase introduces a third trigger, otherwise wait one more phase.

## Key Learnings

**What worked well:**

- **Phase 3 lessons absorbed cleanly.** Playwright SVG attribute-based assertions per CLAUDE.md, 3-browser matrix caught the SVG `toBeVisible()` trap proactively, deferred-finding-inheritance channel survived first contact (Phase 3 finding #4 was honored). The system review feedback loop is producing real adherence gains.
- **Composition over re-architecture.** Headline component sat on top of `<GitGraphGutter>` via CSS-Grid with zero primitive changes. Validates Phase 3's interface design and the discipline of leaving the gutter as a pure server-renderable primitive.
- **Pixel-perfect alignment first try.** 0.0px worst-case across 3 browsers because `DEFAULTS.rowHeight` was reused for both SVG row stride and metadata row div height. Plan got the constraint right.
- **Inherited-findings channel paid off on its first real test.** CLAUDE.md addition post-Phase-3 ("Deferred code-review findings") flowed Phase 3's finding #4 directly into Phase 4's plan, which the executor then mirrored in `graph-alignment.spec.ts`. Two-phase round trip from documentation gap → CLAUDE.md update → next-plan inheritance → executor compliance.

**What needs improvement:**

- **Pre-PR scope discipline isn't automated.** Two distinct sweep-in classes hit Phase 4 — local-tool scratch dirs and the plan file itself. Both are catchable by a 30-second `git status` + `git diff --name-only main...HEAD` audit. The audit needs to be a checklist item, not a CLAUDE.md rule that may or may not be re-read each phase.
- **Plan-prescribed throwaway artifacts can be silently inlined.** Phase 0's spike was as prescriptive as a plan ever gets and still got shortcut. The execute command needs an explicit rule that throwaway paths in the plan are not optional.

**For Phase 5:**

- **Carry-forward findings to honor in plan §Inherited findings:**
  - #2 (`onCommitHover(null)` transient between rows) — revisit if Phase 5 introduces an expensive detail panel keyed on hover state.
  - #3 (controlled→uncontrolled stale state) — current fix uses option (b) papering-over; consider switching to option (a) dev-warn next time the component is touched.
  - #6 (ref-badge clicks bubble to row `onClick`) — add `stopPropagation` when introducing per-badge click handlers.
  - #8 (empty-state shell `tabIndex`) — add `tabIndex={-1}` if Phase 5 wants consistent focusability semantics.
- **Run the pre-PR scope check at PR-open time** even before the CLAUDE.md / execute-command updates land. The check is three commands; do it manually until it's codified.
- **Honor any spike instructions verbatim.** Phase 5 may have its own (virtualization frame-budget spike?). Use the prescribed `_spike/` path; don't inline.
- **Consider whether `.agents/skills/` should be gitignored or tracked.** Phase 4's `.gitignore` addition treats it as scratch; if any agent skill becomes shared team config, that decision needs revisiting.
