# System Review — Phase 3: Gutter Primitive

## Meta Information

- **Plan reviewed:** `.agents/plans/phase-3-gutter-primitive.md`
- **Execution report:** `.agents/execution-reports/phase-3-gutter-primitive.md`
- **Plan command:** `.claude/commands/core_piv_loop/plan-feature.md`
- **Execute command:** `.claude/commands/core_piv_loop/execute.md`
- **Date:** 2026-04-30

## Overall Alignment Score: 9/10

Phase 3 shipped all eight planned deliverables in a single PR (`c5589d8`), CI green on first push, all unit + e2e tests passing including hand-authored bezier expecteds and 6 Linux-rendered Chromium baselines. Two divergences, both *environmental* rather than plan-logic defects:

1. A Playwright API gotcha (`toBeVisible()` returns false on stroke-only SVG paths with zero-area bounding boxes) → swapped for `toHaveAttribute("d", /.+/)`.
2. The plan's Docker-baseline-regen recipe didn't run as written on a Windows host — three orthogonal workarounds (corepack signing-key rotation, transitive engine pin tighter than image's Node, NTFS-through-Docker-Desktop rename `EACCES`) had to be discovered live and were captured post-hoc in `56dd7ff`.

Neither divergence reflects unclear requirements or executor drift; both reflect Phase 2.7 (External-System Assumption Audit) gaps for *image internals* and *cross-OS Playwright behavior* — categories not currently called out by name in `plan-feature.md`. Carrying forward the Phase 2 score baseline (8/10), Phase 3 nets +1 for cleaner artifact-commit cadence (CLAUDE.md was updated post-Phase-2 and the cadence held without surprise) and stronger plan internal consistency (no fixture-level contradictions this time). One point off for the Docker recipe miss — the plan asserted a clean Linux-host invocation when the actual rendering host was Windows, and no audit caught the gap.

## Divergence Analysis

```yaml
- divergence: theming spec assertion — toBeVisible() → toHaveAttribute("d", /.+/)
  planned: expect(locator).toBeVisible() after CSS-var flip
  actual:  expect(locator).toHaveAttribute("d", /.+/)
  reason:  toBeVisible() returns false on Chromium and WebKit for SVG <path fill="none">
           because stroke-only elements have zero-area bounding boxes. Firefox is more
           lenient. Functionally equivalent assertion needed.
  classification: good ✅ (correcting a plan assumption that didn't survive contact with the API)
  justified: yes
  root_cause: missing Phase 2.7 audit category — "Playwright API behavior under SVG /
              stroke-only / zero-area elements" wasn't on the assumption list. Only DOM
              elements with non-zero bounding boxes survive toBeVisible() on Chromium/WebKit.

- divergence: Docker baseline-regen recipe — three workarounds layered on the planned single command
  planned: docker run … mcr.microsoft.com/playwright:v1.49.1-jammy bash -lc "corepack enable
           && pnpm install --frozen-lockfile && pnpm test:e2e --update-snapshots …"
  actual:  npm install -g pnpm@10.33.0 (corepack signing keys rotated)
           + pnpm install --config.engine-strict=false (image Node 22.12 < eslint-visitor-keys's 22.13 floor)
           + anonymous volumes over three node_modules dirs (NTFS-through-Docker-Desktop EACCES on rename)
  reason:  Recipe was written for a clean Linux host; rendering host is Windows + Docker Desktop.
           Three independent failure modes, each rooted in something the plan didn't audit:
           image-bundled corepack version, transitive engine pin in lockfile vs image's Node,
           bind-mount filesystem semantics for pnpm's atomic-rename pattern.
  classification: good ✅ (executor recovered correctly and recorded the working recipe)
  justified: yes
  root_cause: Phase 2.7 audit didn't cover (a) Docker image internals (which corepack/Node
              ships) or (b) cross-OS bind-mount semantics. The audit DID list "Screenshot
              rendering is OS- and browser-version-sensitive" but only for output drift,
              not for the toolchain inside the regen image.

- divergence: none — code-review findings addressed pre-merge
  note:    Initial draft of this review (and the execution report) claimed three medium findings
           were "deferred to Phase 4." That was wrong — verified against the merged tree:
           all six code-review findings (3 medium + 3 low/info) landed in PR #3 itself
           before squash-merge. Edge-lane validation, key includes kind, sync-script
           ordering, xmlns drop, rowHeight comment, 'straight'-kind invariant comment —
           all present in c5589d8.
  lesson:  The code-review artifact captures the reviewer's pre-fix snapshot, not the
           merged state. Future system-reviewers must verify findings against the merged
           tree, not assume the review doc is a current-state record.
```

## Pattern Compliance

- [x] Followed codebase architecture (registry → component, no inversions; CSS-first via @theme/`:root`; `'use client'` only where needed)
- [x] Used documented patterns (kebab-case files, default-exported PascalCase component, `type` over `interface`, LF, exact deps already pinned)
- [x] Applied testing patterns correctly (Vitest unit for pure fn, Playwright e2e for visual + behavior, Chromium-only screenshots, 3-browser theming)
- [x] Met validation requirements (lint + two-pass typecheck + unit + e2e×3 all green)
- [x] Native-binding pin discipline preserved (no new deps, nothing to pin)
- [x] CONFIRM gates honored (push, PR create, merge each user-approved)
- [x] Artifact-commit cadence followed per CLAUDE.md (post-merge `cebeee5`, then post-correction `56dd7ff`)
- [x] Phase-2 lesson applied: hand-traced bezier expecteds before emitting, no expected-vs-algorithm contradictions surfaced during execution

## System Improvement Actions

### Update CLAUDE.md

- [ ] **Document Playwright + SVG visibility gotcha.** This will recur — Phase 4 (headline table composing the gutter) will likely write more SVG assertions, and Phase 5's virtualization layer will too.

  Suggested wording (append to "Workflow" section, or create a "Test recipes" subsection):

  > **Playwright assertions on SVG.** `toBeVisible()` returns false for stroke-only SVG elements (`<path fill="none">`, `<line>`, `<polyline>`) on Chromium and WebKit because their bounding boxes have zero area. Use `toHaveAttribute("d", /.+/)` or geometry-attribute checks (`cx`, `cy`, `r`) instead. Firefox is more lenient and is not a reliable signal that the assertion is portable.

- [ ] **Document baseline-regen toolchain pin.** The working PowerShell recipe lives in `.agents/plans/phase-3-gutter-primitive.md`'s "Post-execution corrections" section. CLAUDE.md should cross-reference, not duplicate, until we have a second data point worth generalizing.

  Suggested wording (append to "CI / Deploy quirks" section):

  > **Local screenshot baseline regeneration on Windows.** The `mcr.microsoft.com/playwright:v1.49.1-jammy` image's bundled corepack can fail on rotated npm registry keys, its Node 22.12 may be below transitive engine pins (e.g. `eslint-visitor-keys@5.0.1` requires ≥22.13), and NTFS-through-Docker-Desktop bind mounts throw `EACCES` on pnpm's atomic-rename pattern inside `node_modules`. Working recipe documented in `.agents/plans/phase-3-gutter-primitive.md` post-execution corrections. CI is unaffected (it uses `actions/setup-node@v4` + native Linux runner).

- [ ] **Document deferred-finding carry-forward convention** (still useful even though Phase 3 didn't actually defer anything — Phase 4 or later will eventually have a finding worth carrying). Convention belongs in CLAUDE.md so it's discoverable when the situation arises.

  Suggested wording (append to "Workflow" section, after artifact-commit cadence):

  > **Deferred code-review findings.** When a code review identifies issues that don't block the current phase but should be addressed before a later phase begins, record the carry-forward in the **next phase's plan** under a "Inherited findings" section, citing the source review and finding. The code-review artifact alone is insufficient — plans are read top-to-bottom by future executors; review artifacts are not.

- [ ] **Document the code-review artifact's snapshot semantics.** The Phase 3 code-review document captured findings on a pre-merge state; all findings were fixed before squash-merge. Two reviewers (initial execution-report draft + initial system-review draft) misread the artifact as a current-state record. CLAUDE.md should clarify.

  Suggested wording (append to "Workflow" section):

  > **Code-review artifacts are pre-fix snapshots.** A code-review document records issues at the moment of review, not the final state of the merged code. Findings are typically addressed in the same PR before squash-merge. When auditing a phase retrospectively, verify each finding against the *merged tree* (`git show <merge-commit> -- <path>`) — do not assume the review doc reflects what shipped.

### Update Plan Command (`.claude/commands/core_piv_loop/plan-feature.md`)

- [ ] **Extend Phase 2.7 (External-System Assumption Audit) with two new categories.**

  Suggested addition under "Categories of claims that have burned past plans":

  > - **Container image internals.** When a plan instructs running commands inside a pinned Docker image (e.g. `mcr.microsoft.com/playwright:v1.49.1-jammy`), audit *what's bundled in the image*: which Node version, which corepack/pnpm/npm version, whether bundled signing keys are still valid. Lockfile transitive engine pins can be tighter than the image's Node. Image-bundled package managers can have stale signing-key bundles. List explicit fallbacks: `npm install -g pnpm@<version>` instead of `corepack enable`, or `--config.engine-strict=false` scoped to the image-only invocation.
  >
  > - **Cross-OS filesystem semantics for build tools.** When a plan instructs a developer to run a build/test step locally, audit OS-specific path and filesystem behavior. NTFS-through-Docker-Desktop bind mounts don't honor pnpm's atomic-rename pattern inside `node_modules` (use anonymous volumes over `node_modules` dirs). Windows-host commands should be written as PowerShell with `Get-ChildItem` / `Remove-Item`, not bash one-liners. If a recipe must work on both, provide both forms.

- [ ] **Add Playwright-on-SVG audit category to Phase 2.7.**

  Suggested addition (same section):

  > - **Playwright assertions on SVG / zero-area elements.** `toBeVisible()` is unreliable for stroke-only `<path>`, `<line>`, `<polyline>` (zero bounding box on Chromium and WebKit; passes on Firefox, which is misleading). Plans that prescribe Playwright assertions on SVG must specify attribute-based assertions (`toHaveAttribute("d", /.+/)`, `toHaveAttribute("cy", "20")`) or geometry-derived checks, not visibility.

- [ ] **Add a "host environment" header to local-validation tasks.** Tasks like Phase 3's task 17 (Docker-image baseline regen) should declare the *host OS* the recipe was authored against, and explicitly call out whether the recipe has been verified on alternate hosts.

  Suggested addition under "Rules that apply to every task":

  > **Host-environment declaration.** Tasks that prescribe a local validation recipe (Docker run, shell script, browser-tooling invocation) must declare the host OS the recipe was authored against in a `Host:` line at the top of the task. If the recipe is expected to work cross-platform, list the verified hosts. If only one host has been verified, say so — don't claim portability that wasn't tested.

### Update Execute Command (`.claude/commands/core_piv_loop/execute.md`)

- [ ] **Add post-correction commit pattern to the executor's playbook.** When execution discovers that a plan recipe didn't survive contact with the host environment, the working recipe should be appended to the plan as a "Post-execution corrections" section (not silently fixed in the head of the recipe), in a separate commit on `main` after the implementation merges. Phase 3's `56dd7ff` is the template.

  Suggested addition (under post-merge steps):

  > **Post-execution plan corrections.** If, during execution, a plan-prescribed recipe (Docker invocation, shell script, validation command) failed as written and a working substitute was discovered, append a "Post-execution corrections" section to the plan describing the failure mode and the working recipe. Commit this on `main` after the implementation PR merges, separately from the artifact-commit (so the correction has a focused commit message). This preserves the lesson next to the plan it amends, rather than burying it in execution logs.

### Create New Command

- [ ] None yet. Two phases now show "documentation gap fed forward into next phase" as the dominant friction class — but two phases still isn't enough signal for `/check-deferred-findings` or `/audit-host-env`. Reassess after Phase 4.

## Key Learnings

**What worked well:**

- **Phase 2's lessons were absorbed.** The hand-trace rule was applied to bezier expecteds (no expected-vs-algorithm contradictions), the artifact-commit cadence held without re-deciding (CLAUDE.md change paid off immediately), the error-handling spec was concrete (no "may throw or…" ambiguity in Phase 3's plan). System review is working as a feedback loop.
- **Layout owns kind classification.** Moving `'fork'` emission into `computeLayout` instead of the renderer kept the bezier function pure. Worth canonizing as "geometry-aware classification belongs in layout, not in render" for Phase 4 (which will face the same temptation with row-content edges).
- **Hand-authored bezier expecteds.** Same payoff as Phase 2's layout fixtures — every test failure pointed at a precise path-string delta, not at "is the snapshot stale?" Default this for every future deterministic-output phase.
- **Chromium-only baselines + Linux-image regen.** Limiting screenshot scope to one browser and rendering baselines against the same binary CI uses kept visual drift containable. The investment in the Docker-image recipe (despite the three workarounds) saved Phase 4 from re-inventing it.

**What needs improvement:**

- **External-system audit doesn't currently cover container image internals or cross-OS toolchain semantics.** Both gaps in Phase 3 traced to Phase 2.7 not having explicit categories for these. Two suggested additions above.
- **Playwright-API behavior under SVG isn't documented anywhere a future plan author would find it.** First time we wrote SVG assertions; first time we tripped on `toBeVisible()`. Codify before Phase 4 writes more SVG.
- **Deferred code-review findings have no carry-forward channel.** The "address before Phase 4" tag lives only in the code-review summary; Phase 4's planner will not automatically see it. Documented convention proposed above.

**For next implementation (Phase 4 — headline table):**

- **No Phase 3 carry-forward.** All code-review findings were addressed pre-merge; nothing to inherit. (My initial reading of the review document as deferred-findings was wrong — verified against `git show c5589d8`.)
- **Apply Playwright-SVG recipe.** All gutter assertions in the headline-table specs should use `toHaveAttribute` / geometry checks, not `toBeVisible()`. CLAUDE.md update lands first.
- **Audit container/cross-OS assumptions explicitly in the Phase 4 plan.** Phase 4 likely adds row-content rendering and possibly virtualization scaffolding; if any new local-validation recipe involves Docker, declare host OS up front.
- **Consider whether the gutter's `'use client'` boundary holds.** Phase 4's headline table will introduce real interactivity (hover, selection); the gutter itself should remain server-renderable. Make this explicit in the Phase 4 plan as an architectural invariant — don't let it drift.
