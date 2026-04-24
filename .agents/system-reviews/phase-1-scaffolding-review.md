# System Review — Phase 1 Scaffolding

## Meta Information

- **Plan reviewed**: `.agents/plans/phase-1-scaffolding.md`
- **Execution report**: `.agents/execution-reports/phase-1-scaffolding.md`
- **Plan command**: `.claude/commands/core_piv_loop/plan-feature.md`
- **Execute command**: `.claude/commands/core_piv_loop/execute.md`
- **Date**: 2026-04-24

---

## Overall Alignment Score: 8/10

Plan-to-implementation alignment was strong. All 29 tasks executed in order; all validation steps passed; no acceptance criteria dropped. Score is held below 10 by a cluster of divergences rooted in the same class of planning blind spot: the plan made confident assertions about **external-system behavior** (npm transitive resolution, GitHub API permissions, git default-branch semantics, Next 15 static-route output shape) that did not survive contact with reality. Inside the codebase boundary, the plan was near-perfect.

---

## Divergence Analysis

```yaml
divergence: pnpm.overrides for @tailwindcss/oxide + @tailwindcss/node
planned: Pin tailwindcss@4.0.0 and @tailwindcss/postcss@4.0.0; trust transitive resolution.
actual: Added root-level pnpm.overrides pinning @tailwindcss/oxide@4.0.0 and @tailwindcss/node@4.0.0 after two cascading runtime errors.
reason: tailwindcss + @tailwindcss/postcss depend on the native oxide/node packages via ^4.0.0; pnpm resolved them to 4.2.4; oxide's ScannerOptions struct format changed between 4.0 and 4.2, causing "Missing field negated" then "Cannot convert undefined or null to object" at Next's CSS pipeline.
classification: good ✅
justified: yes — plan's "determinism principle" explicitly forbids silent version drift, so pinning the drifting transitive stack is faithful to plan intent.
root_cause: unclear plan — the plan's pin list was incomplete; it didn't account for the reality that Tailwind v4's native JS↔Rust boundary floats across minor versions. Plan author treated top-level pins as sufficient; in practice the drift happens inside the library family.
```

```yaml
divergence: @eslint/eslintrc@3.2.0 added explicitly to both apps
planned: Rely on transitive resolution via eslint-config-next, with a "fallback: add explicit pin if pnpm flags it missing" note in Task 9.
actual: Added it as explicit devDep in both apps' package.json on first failure.
reason: pnpm strict hoisting (shamefully-hoist=false, which the plan itself enforces) prevented each app's eslint.config.mjs from resolving the transitive dep.
classification: good ✅
justified: yes — plan anticipated this exact scenario and provided the fix path.
root_cause: unclear plan — instead of treating the fix as primary, plan listed it as conditional. Under deterministic scaffolding, conditionals waste execution time: first attempt fails, second succeeds. Should have been unconditional from the start.
```

```yaml
divergence: registry route param renamed git-graph → git-graph.json
planned: Task 15's generateStaticParams returns { name: "git-graph" }. Task 25's validation expects out/r/git-graph.json. Landing page advertises /r/git-graph.json.
actual: generateStaticParams returns { name: "git-graph.json" } so export lands at out/r/git-graph.json matching the advertised URL.
reason: Plan internal inconsistency — three sections disagreed about whether ".json" was part of the URL path or a separately-applied file extension.
classification: good ✅
justified: yes — matches the advertised URL and post-deploy curl validation.
root_cause: unclear plan — no cross-reference validation between the generateStaticParams value, the `cat apps/docs/out/r/git-graph.json` validation, and the install command on the landing page. A grep for "git-graph" across the plan would have surfaced the disagreement before execution.
```

```yaml
divergence: setup-info CI job dropped
planned: ci.yml with 5 jobs: setup-info + lint + typecheck + unit + e2e(×3).
actual: 4 concern-jobs — setup-info removed.
reason: setup-info's only work was pnpm install with no downstream consumer (each other job reinstalls); it was a no-op always-green job.
classification: good ✅
justified: yes — removed dead work.
root_cause: unclear plan — plan copied a template pattern (shared-setup job) without verifying it had a reader in the defined job graph. Applies to any CI plan: if you name a job, name its consumer.
```

```yaml
divergence: Orphan main commit + rebase to bootstrap PR
planned: Task 28 assumed main existed with shared history so phase-1-scaffold could PR into it.
actual: Created orphan empty commit on main, pushed it, flipped default branch via gh api, rebased phase-1-scaffold onto main, force-pushed, then opened PR.
reason: gh repo create --source . on a repo with no commits set phase-1-scaffold as remote default (first-push-wins). No main existed on origin.
classification: good ✅
justified: yes — got to a reviewable PR state.
root_cause: missing context — plan's Task 0 used `gh repo create --source .` but didn't sequence the first commit on main before creating the feature branch. The plan also listed Task 1 ("init local git") after Task 0, which re-ordered tasks would have prevented the issue. Workflow assumed a steady-state repo, not a greenfield one.
```

```yaml
divergence: Pages required a manual Settings toggle
planned: Task 27 claimed configure-pages@v5 with enablement: true auto-provisions Pages ("no manual Settings → Pages toggle required").
actual: First deploy failed: "Resource not accessible by integration - Create a Pages site". User manually set Settings → Pages → Source = GitHub Actions once; subsequent deploys green.
reason: Default GITHUB_TOKEN lacks admin scope to call the Pages creation API. enablement: true only works with a PAT that has admin.
classification: good ✅
justified: yes — no code change could have avoided the manual step with default tokens.
root_cause: unclear plan — plan asserted a claim about external system behavior without verification. The configure-pages README is itself misleading; plan propagated the misleading claim as "zero manual steps post-task-0."
```

```yaml
divergence: next lint auto-added allowJs: true to both tsconfigs
planned: Hand-authored tsconfigs with specific fields, no allowJs.
actual: First `next lint` run rewrote both apps' tsconfig.json to add "allowJs": true.
reason: Next's lint bootstrap heuristic. Outside our control.
classification: good ✅ (in the sense that leaving it alone was correct)
justified: yes — kept Next's intended state rather than fighting the tool.
root_cause: missing context — plan didn't flag that `next lint` mutates tsconfig on first run, which conflicts with the plan's determinism principle. Anyone comparing the plan's exact tsconfig shape to reality post-execution would see a divergence.
```

```yaml
divergence: Root eslint.config.mjs not created
planned: Listed under "New Files to Create" at repo root; same paragraph says per-app configs will be kept because they differ.
actual: Only per-app eslint.config.mjs files exist.
reason: Plan's own note that per-app configs differ made a root config purposeless.
classification: good ✅
justified: yes.
root_cause: unclear plan — the file list and the adjacent explanation disagreed. Either the file shouldn't have been listed, or the explanation should have clarified what content the root file holds.
```

```yaml
divergence: .claude/ added to .gitignore
planned: Not mentioned.
actual: User preference captured during commit stage; added to .gitignore.
reason: User doesn't want local Claude config committed.
classification: good ✅
justified: yes — user explicit preference.
root_cause: missing context — plan didn't account for the project layer's own tool artifacts (CLAUDE settings, IDE configs, etc.). Future plans should ask the user what local-only dirs exist before generating .gitignore.
```

---

## Pattern Compliance

- [x] **Followed codebase architecture** — there was no prior architecture; plan established it cleanly.
- [x] **Used documented patterns** — no CLAUDE.md existed at plan time; plan established naming/testing/gitignore conventions inline, which implementation followed.
- [x] **Applied testing patterns correctly** — Vitest for unit (`*.test.ts`), Playwright for e2e (`*.spec.ts`), as specified.
- [x] **Met validation requirements** — every Level 1–5 validation command passed, plus post-deploy curl checks.

No pattern violations.

---

## System Improvement Actions

### Update CLAUDE.md (project-level)

Create `D:\repos\GitGraph\CLAUDE.md` (does not exist yet) with the following **durable** knowledge this phase established:

```markdown
# GitGraph — Contributor Notes

## Dependency pinning policy

This repo hard-pins Tailwind v4 (`tailwindcss`, `@tailwindcss/postcss`) and its native transitive stack (`@tailwindcss/oxide`, `@tailwindcss/node`) via `pnpm.overrides` in the root `package.json`. Do not remove the overrides without re-verifying the CSS pipeline. Tailwind v4's JS↔Rust boundary changes across minor versions (`ScannerOptions` struct), and floating the natives produces opaque build errors at Next's CSS loader, not at `pnpm install`.

## Conventions

- Files: `kebab-case.ts[x]`. React components: `PascalCase`, default-exported.
- Types: `PascalCase`; prefer `type` over `interface`.
- Tests: `*.test.ts` (Vitest, under `tests/unit/`), `*.spec.ts` (Playwright, under `tests/e2e/`).
- Imports within an app: `@/` alias.
- Package manager: `pnpm` only; `engine-strict=true` enforces.

## CI/Deploy

- `configure-pages@v5` with `enablement: true` does **not** auto-enable Pages under the default `GITHUB_TOKEN`. If Pages ever resets, toggle Settings → Pages → Source = "GitHub Actions" manually. This is a one-time step per repo.
- `next lint` mutates `tsconfig.json` on first run to add `"allowJs": true`. This is intentional; do not revert.

## Not tracked in git

- `.claude/` (local Claude Code config)
- `.next/`, `out/`, `node_modules/`, `coverage/`, `test-results/`, `playwright-report/`
```

### Update Plan Command (`plan-feature.md`)

These are the process gaps this phase surfaced. Suggested additions:

- [ ] **Add Phase 2.6 — Plan Self-Consistency Check.** Before emitting the plan, grep across the document for each key identifier (route param names, URL paths, file names, version strings) and flag any disagreements. Example catch: "git-graph" appeared in `generateStaticParams`, in the validate-step filename, and in the landing-page URL, but with inconsistent `.json` handling.
- [ ] **Add Phase 2.7 — External-System Assumption Audit.** List every claim the plan makes about behavior of an external system not under the repo's control (npm resolution, GitHub API permissions, CLI tool side-effects, CI runner behavior). For each, either (a) verify the claim against current docs with a URL, or (b) mark it "assumption" and require the execute agent to validate before trusting it. Example missed claims: `enablement: true` auto-provisions Pages; transitive Tailwind natives stay at 4.0.0; `gh repo create --source .` creates a `main` default on remote.
- [ ] **Strengthen version-pinning guidance.** When the plan pins top-level packages from an ecosystem that ships native bindings (Tailwind v4, Rollup, esbuild, swc, lightningcss), include a section listing the transitive natives those packages pull and require pinning them via `pnpm.overrides` / npm `overrides` / yarn `resolutions` to match.
- [ ] **First-commit sequencing for greenfield plans.** If Task 0 calls `gh repo create --source .` on an empty working tree, Task 1 must be "create initial commit on main and push" before any feature branches are pushed. Otherwise default-branch resolution traps the execute agent.
- [ ] **Replace "conditional fix notes" with primary instructions.** The `@eslint/eslintrc` case is the tell: the plan listed the fix as "add if pnpm flags it missing". Under deterministic scaffolding, that guarantees one wasted iteration. If the author knows the fix, make it primary.
- [ ] **Require .gitignore to be generated interactively.** Plan should ask the user to list local-only directories (editor configs, tool state dirs like `.claude/`, local env files) before emitting .gitignore.

### Update Execute Command (`execute.md`)

- [ ] **Add step 2.d — Verify external claims on first failure.** When a plan instruction fails at execution time and the failure matches a claim the plan made about external-system behavior (a network error, a permission denial, a tool side-effect), halt and surface the claim to the user before retrying. Example: when `configure-pages@v5 enablement: true` returned "Resource not accessible by integration", the plan explicitly claimed this wouldn't happen; escalating fast saved time.
- [ ] **Add step 3.5 — Validate plan self-consistency before first use.** Before starting task execution, do a one-pass read that checks the plan's own `VALIDATE` commands against the `IMPLEMENT` contents of the same and adjacent tasks. Example: Task 15's IMPLEMENT produces `out/r/git-graph` but Task 25's VALIDATE expects `out/r/git-graph.json` — that's a plan bug detectable without running anything.
- [ ] **Document the "stop before destructive shared-state actions" rule more prominently.** This implementation paused correctly before `git push`, `gh pr create`, and `gh pr merge`. The pause is critical and worth keeping explicit in the execute command's list of "halt points".

### Create New Command

- [ ] `/validation:plan-lint` — a pre-execution lint pass on plan files. Checks: (a) key-identifier consistency across the plan (names, paths, versions), (b) every IMPLEMENT-listed file is used by at least one VALIDATE step or acceptance criterion, (c) every VALIDATE command's expected output is derivable from an IMPLEMENT step in the same or earlier task, (d) external-system claims are marked as either "verified" (with link) or "assumption". This phase's three plan-internal issues (route filename, root eslint.config.mjs, setup-info consumer) are all catchable by such a lint.

No new command needed for the Tailwind/Pages/bootstrap divergences — those belong in the plan command's external-assumption audit, not a separate tool.

---

## Key Learnings

**What worked well:**

- Hand-authored determinism held. No CLI scaffolder drift, no "it depends on when you ran it" behavior. Every file's content was known in advance.
- Plan's own `VALIDATE` steps catching real issues at the expected task (the registry filename mismatch was caught at Task 25's validation, not deep in production).
- Escalation on external-system failures (Tailwind drift, Pages permissions) rather than silently substituting versions or swallowing errors.
- User-gated confirmation points (Task 0 repo create; Tasks 28–29 push/merge) produced zero surprises.

**What needs improvement:**

- **External-system claims aren't audited.** Three divergences (Tailwind drift, Pages enablement, git default-branch) all fit this pattern: the plan asserted something confident about a system not under the repo's control, without a verification step. The plan command needs a dedicated external-assumption audit.
- **Plan self-consistency isn't checked.** The route filename inconsistency and the redundant root eslint.config.mjs are both detectable by a single grep pass over the plan before execution starts. Currently nothing does that pass.
- **Conditional fix notes cost an iteration every time.** If the plan author already knows the fix to a likely failure, listing it as conditional rather than primary wastes a round trip.

**For next implementation:**

- Add a "greenfield bootstrap" checklist to plans that touch git/GitHub from scratch: first-commit-on-main ordering, .gitignore interactive review, default-branch verification.
- When pinning any package in an ecosystem with native bindings, emit the full transitive-natives pin list from the planning step, not discover it during execution.
- Don't trust `configure-pages@v5 enablement: true` in plans that claim zero manual steps. Document it as "one-time manual toggle" up front.
