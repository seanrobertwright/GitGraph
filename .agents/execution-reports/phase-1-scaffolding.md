# Execution Report — Phase 1 Scaffolding

## Meta Information

- **Plan file**: `.agents/plans/phase-1-scaffolding.md`
- **Branch**: `phase-1-scaffold` → squash-merged into `main` (commit `e1ba881`)
- **PR**: https://github.com/seanrobertwright/GitGraph/pull/1
- **Lines changed**: +6651 / -0 across 42 files (includes `pnpm-lock.yaml`)

### Files added

Workspace root:

- `.gitattributes`, `.gitignore`, `.npmrc`, `.nvmrc`
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- `README.md`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `tsconfig.base.json`, `vitest.config.ts`, `playwright.config.ts`

`apps/docs/`:

- `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`
- `postcss.config.mjs`, `eslint.config.mjs`, `components.json`
- `lib/utils.ts`
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- `app/r/[name]/route.ts`

`examples/consumer-app/` (mirror minus the registry route):

- `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`
- `postcss.config.mjs`, `eslint.config.mjs`, `components.json`
- `lib/utils.ts`
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

Other:

- `registry/git-graph/.gitkeep`
- `tests/unit/sanity.test.ts`, `tests/e2e/smoke.spec.ts`
- `.agents/plans/phase-1-scaffolding.md` (the plan itself — per user choice to commit it)

### Files modified

None — this was greenfield.

---

## Validation Results

Local (Windows, Node 22, pnpm 10.33.0):

- **Lint** (`pnpm lint`): ✓ both apps clean
- **Typecheck** (`pnpm typecheck`): ✓ both apps clean
- **Unit** (`pnpm test`): ✓ 1/1 (sanity)
- **E2E** (`pnpm test:e2e`): ✓ 3/3 (chromium, firefox, webkit)
- **Build** (`NEXT_PUBLIC_BASE_PATH=/GitGraph pnpm build:docs`): ✓ produces `out/index.html` with `/GitGraph/_next` asset paths and `out/r/git-graph.json` with `"name": "git-graph"`

CI (PR #1):

- **lint**: ✓ (22s)
- **typecheck**: ✓ (16s)
- **unit**: ✓ (15s)
- **e2e (chromium)**: ✓ (51s)
- **e2e (firefox)**: ✓ (40s)
- **e2e (webkit)**: ✓ (57s)

Post-merge:

- **deploy.yml**: ✓ after one-time manual Pages Settings toggle
- **`curl -sI https://seanrobertwright.github.io/GitGraph/`**: `HTTP/1.1 200 OK`
- **`curl -s https://seanrobertwright.github.io/GitGraph/r/git-graph.json`**: returns the placeholder with `"name": "git-graph"`

---

## What Went Well

- **Hand-authored everything worked.** No `create-next-app`, no `shadcn init`, no interactive prompts. The determinism goal held — every file was known up front.
- **Pinned versions resolved cleanly.** All top-level pins (`next@15.1.6`, `react@19.0.0`, `tailwindcss@4.0.0`, etc.) installed without npm errors.
- **Test infrastructure green on first real run.** Vitest + Playwright (all 3 browsers) passed locally immediately after the configs were authored and browsers installed, with no debugging required.
- **Static export with `generateStaticParams` produced the registry JSON correctly** once the filename-in-param adjustment was applied.
- **Parallel `pnpm -r --parallel` scripts** ran both apps' lint/typecheck without manifest fiddling.
- **CI workflow matched local behavior.** No surprises on Ubuntu vs Windows despite `.gitattributes` being the only line-ending safeguard.

---

## Challenges Encountered

- **Tailwind v4 transitive version drift** was the single biggest time sink. `tailwindcss@4.0.0` and `@tailwindcss/postcss@4.0.0` depend on `@tailwindcss/oxide` and `@tailwindcss/node` via floating `^4.0.0` ranges; pnpm resolved them to `4.2.4`, and the Rust `ScannerOptions` struct format changed between those minor versions. First error was cryptic (`Missing field 'negated' on ScannerOptions.sources`), second was worse (`TypeError: Cannot convert undefined or null to object`). Required two rounds of `pnpm.overrides` additions to fully pin the native scanner stack.
- **`next lint` rewrote the app tsconfigs** on first run to add `"allowJs": true`. Not destructive, but caught me off guard mid-lint.
- **Default branch bootstrap.** `gh repo create --source .` + first-push-wins branch semantics left `phase-1-scaffold` as the remote default. Had to orphan-commit `main`, push it, flip default, then rebase phase-1 onto main to open a PR with shared history.
- **Pages auto-enablement didn't work.** `configure-pages@v5 enablement: true` can't create a Pages site with the default `GITHUB_TOKEN` — needed the manual Settings toggle the plan explicitly claimed we'd avoid.
- **Route-filename mismatch** in the plan. The landing page advertised `/r/git-graph.json`, but `generateStaticParams` used `{ name: "git-graph" }`, producing `/r/git-graph` (no extension). Caught at the first `build:docs` validation.

---

## Divergences from Plan

### Tailwind v4 native deps pinned via `pnpm.overrides`

- **Planned**: Pin only `tailwindcss` and `@tailwindcss/postcss` at top level; trust transitive resolution.
- **Actual**: Added `pnpm.overrides` to root `package.json` pinning `@tailwindcss/oxide@4.0.0` and `@tailwindcss/node@4.0.0`.
- **Reason**: Transitive drift to `4.2.4` broke Next's CSS pipeline at runtime with opaque scanner errors.
- **Type**: Plan assumption wrong (silent transitive drift exists inside Tailwind v4's native stack, not only at the top level).

### `@eslint/eslintrc@3.2.0` added explicitly to each app

- **Planned**: Relied on it coming transitively via `eslint-config-next`, with a fallback note.
- **Actual**: Added it as an explicit devDep in both apps.
- **Reason**: pnpm strict hoisting (plan's own `shamefully-hoist=false`) meant the transitive dep wasn't resolvable from each app's `eslint.config.mjs`. The plan's gotcha text anticipated this exact case.
- **Type**: Plan assumption wrong (expected fallback path taken in practice).

### Registry route param changed to `git-graph.json`

- **Planned**: `generateStaticParams` returns `{ name: "git-graph" }`; validate file at `out/r/git-graph.json`.
- **Actual**: Returns `{ name: "git-graph.json" }`; file lands at `out/r/git-graph.json` matching the install URL.
- **Reason**: Next 15 static export writes route handlers as files at the literal URL path. `name: "git-graph"` produced `out/r/git-graph` (no extension), which neither matched the plan's own validation step nor the install command shown on the landing page. The JSON body still contains `"name": "git-graph"` per the plan.
- **Type**: Plan internal inconsistency.

### `setup-info` CI job removed from `ci.yml`

- **Planned**: Five-job matrix including a `setup-info` job that installed deps with no downstream consumer.
- **Actual**: Four concern-jobs (lint, typecheck, unit, e2e×3). Every other job already runs its own `pnpm install --frozen-lockfile`.
- **Reason**: `setup-info` had no reader — its install work wasn't cached for other jobs, so it was a pure no-op that would always show green without evidencing anything.
- **Type**: Better approach found.

### Orphan `main` + rebase dance for PR bootstrap

- **Planned**: Task 28 assumed `main` already existed with shared history so a branch could PR into it.
- **Actual**: `gh repo create --source .` made `phase-1-scaffold` the remote default (first-push-wins). Created an orphan empty commit on `main`, pushed it, changed default via `gh api`, rebased `phase-1-scaffold` onto `main`, force-pushed, then opened the PR.
- **Reason**: Plan didn't account for the bootstrap sequencing when the repo starts with no commits.
- **Type**: Plan assumption wrong (sequencing gap for first-ever push).

### Pages enablement needed manual Settings toggle

- **Planned**: `configure-pages@v5 enablement: true` would auto-provision Pages ("no manual Settings → Pages toggle required").
- **Actual**: First deploy run failed with `Resource not accessible by integration - Create a Pages site`. User flipped Settings → Pages → Source = GitHub Actions once; subsequent deploys green.
- **Reason**: The default `GITHUB_TOKEN` lacks admin scope to call the Pages creation API. `enablement: true` requires a PAT with admin to be truly zero-touch.
- **Type**: Plan assumption wrong (public documentation for `configure-pages@v5 enablement` is misleading about token requirements).

### `.claude/` added to `.gitignore`

- **Planned**: Not mentioned.
- **Actual**: Added at user request during the commit stage.
- **Reason**: User preference — local Claude config shouldn't be committed.
- **Type**: Better approach found (captured as a project preference).

### Root `eslint.config.mjs` not created

- **Planned**: Listed as a root file under "New Files to Create", but the same section said per-app configs would be kept because they differ.
- **Actual**: Only per-app `eslint.config.mjs` files exist. `pnpm lint` delegates via `pnpm -r --parallel lint`.
- **Reason**: A root flat config with nothing to configure would be dead code.
- **Type**: Plan internal inconsistency resolved by omission.

### `next lint` auto-edited tsconfigs

- **Planned**: Exact tsconfig shape pre-authored, with no `allowJs`.
- **Actual**: Both `apps/docs/tsconfig.json` and `examples/consumer-app/tsconfig.json` gained `"allowJs": true` on first `next lint` run.
- **Reason**: Next's linter heuristic added it automatically. Left as-is per system signal it was intentional.
- **Type**: Tool-induced change outside our control.

---

## Skipped Items

None. All 29 tasks executed. The only item deferred to the user was the Pages Settings toggle (see divergence above), which was resolved the same session.

---

## Recommendations

### For future plans in this repo

- **Pin transitive natives for any Rust-backed JS library** (Tailwind v4's oxide/node, `lightningcss`, `swc`, `@rollup/rollup-*`, etc.). Any time a plan pins a JS package that ships native bindings as separate floating semver deps, list the natives under `pnpm.overrides` too.
- **Don't claim "zero manual steps" for first-time GitHub Pages setup.** The Settings toggle is effectively mandatory for the default workflow token. Either budget for it in the plan or document the PAT alternative.
- **Account for empty-repo bootstrap.** Any plan that opens a PR on task N needs to ensure `main` exists with a commit *before* the feature branch is pushed, or accept the orphan/rebase dance.
- **Validate plan internal consistency** — in this plan the landing-page URL and `generateStaticParams` value disagreed. A quick grep for the same string across the plan document would have caught it.

### For the repo going forward

- Consider adding a `pnpm approve-builds` step in CI or documenting which native build scripts are safe to run (currently pnpm warns about `esbuild`, `sharp`, `unrs-resolver`).
- `CLAUDE.md` additions worth considering:
  - "pnpm overrides policy: pin Tailwind v4 natives (`@tailwindcss/oxide`, `@tailwindcss/node`) to the same version as `tailwindcss`."
  - "Before tasks 28–29 of any bootstrap plan, verify `main` exists on origin with a commit; otherwise orphan-commit first."
  - "Avoid `setup-info`-style install-only CI jobs; every concern job installs anyway."

### For the execute workflow

- When a plan validation command fails, halt + escalate worked well here for the Tailwind issue. Keep doing that rather than blind version bumps.
- The signal "system-reminder: tsconfig.json was modified by a linter, this was intentional" was genuinely useful — it prevented me from reverting Next's auto-edits. That pattern is worth preserving.
