# GitGraph — Contributor Notes

## Purpose

React component for rendering Git commit history as a visual DAG, shadcn-installable. See `docs/PRD.md` for the product brief and phase plan.

## Stack (pinned)

- Node 22 (`.nvmrc`), pnpm 10.33.0 (`packageManager`, `engine-strict=true`).
- Next 15.1.6 (App Router), React 19.0.0.
- Tailwind v4.0.0 via `@tailwindcss/postcss`. CSS-first `@theme` in `app/globals.css` — no `tailwind.config.js`.
- TypeScript 5.7.3, strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- Vitest 2.1.9 (unit), Playwright 1.49.1 (e2e, 3-browser).

Exact versions in each app's `package.json`. Do not bump without verifying the transitive Tailwind native stack still matches (see below).

`pnpm typecheck` runs two passes: per-workspace via `pnpm -r --parallel typecheck`, then a root `tsc -p tsconfig.json --noEmit` over `registry/**` and `tests/**`. New top-level source dirs outside `apps/` and `examples/` (e.g. a future `cli/`) must be added to root `tsconfig.json`'s `include`, not to per-app tsconfigs.

## Dependency pinning policy

**Tailwind v4 native bindings:** `@tailwindcss/oxide` and `@tailwindcss/node` float transitively across Tailwind minor versions. Their Rust `ScannerOptions` struct shape changes between minors. Mismatch produces opaque errors at Next's CSS loader (`Missing field 'negated' on ScannerOptions.sources`, then `TypeError: Cannot convert undefined or null to object`) — never at install time.

Root `package.json` contains:

```json
"pnpm": {
  "overrides": {
    "@tailwindcss/oxide": "4.0.0",
    "@tailwindcss/node": "4.0.0"
  }
}
```

When changing the pinned Tailwind version: update these overrides to match. Do not remove them without re-verifying `pnpm build:docs` from a clean `node_modules`.

Applies more broadly: any time we pin a top-level package from an ecosystem that ships native bindings as separate packages (Rollup, esbuild, swc, lightningcss, Tailwind v4), pin the natives via `pnpm.overrides` too.

## Workspace layout

- `apps/docs/` — Next 15 static export (`output: 'export'`, `basePath=/GitGraph` on Pages). Docs site + registry endpoint at `/r/git-graph.json`.
- `examples/consumer-app/` — Next 15 dev-only target for Playwright smoke tests. Runs on port 3100.
- `registry/git-graph/` — raw component source files (populated starting Phase 2). Not a pnpm workspace member.
- `tests/unit/` — Vitest (`*.test.ts`).
- `tests/e2e/` — Playwright (`*.spec.ts`).

`pnpm-workspace.yaml` lists `apps/*` and `examples/*` only. `registry/` is intentionally excluded.

## Conventions

- Files: `kebab-case.ts[x]`. React components: `PascalCase`, default-exported.
- Types: `PascalCase`; prefer `type` over `interface`.
- Tests: `*.test.ts` for Vitest, `*.spec.ts` for Playwright.
- Imports within an app: `@/` alias (configured in each app's `tsconfig.json`).
- Package manager: `pnpm` only. `engine-strict=true` enforces Node 22.
- Line endings: LF. `.gitattributes` at root pins this — do not remove on Windows.

## CI / Deploy quirks

- **GitHub Pages auto-enablement is a myth under default tokens.** `actions/configure-pages@v5` with `enablement: true` fails with `Resource not accessible by integration - Create a Pages site` because `GITHUB_TOKEN` lacks admin scope. If Pages ever resets (new fork, mirror, repo recreation), toggle Settings → Pages → Source = "GitHub Actions" manually. One-time per repo; `enablement: true` becomes a no-op once enabled.
- **`next lint` mutates `tsconfig.json`** on first run in a fresh checkout to add `"allowJs": true`. This is intentional; do not revert.
- **Local screenshot baseline regeneration on Windows.** The `mcr.microsoft.com/playwright:v1.49.1-jammy` image's bundled corepack can fail on rotated npm registry signing keys, its Node 22.12 may be below transitive engine pins (e.g. `eslint-visitor-keys@5.0.1` requires ≥22.13), and NTFS-through-Docker-Desktop bind mounts throw `EACCES` on pnpm's atomic-rename pattern inside `node_modules`. Working PowerShell recipe documented in `.agents/plans/phase-3-gutter-primitive.md` post-execution corrections (anonymous volumes over `node_modules` + `npm i -g pnpm` + `--config.engine-strict=false`). CI is unaffected — it uses `actions/setup-node@v4` on a native Linux runner.

## Test recipes

- **Playwright assertions on SVG.** `toBeVisible()` returns false for stroke-only SVG elements (`<path fill="none">`, `<line>`, `<polyline>`) on Chromium and WebKit because their bounding boxes have zero area. Use `toHaveAttribute("d", /.+/)` or geometry-attribute checks (`cx`, `cy`, `r`) instead. Firefox is more lenient and is **not** a reliable signal that the assertion is portable — if a 3-browser spec passes only on Firefox, it's a false positive.

## Not tracked in git

- `.claude/` (local Claude Code config — user preference, not a team convention)
- `node_modules/`, `.next/`, `out/`, `dist/`, `build/`
- `coverage/`, `test-results/`, `playwright-report/`, `playwright/.cache/`
- `*.tsbuildinfo`, `*.log`, `.env*.local`

## Workflow

- `/gsd:*` commands are **not used** on this project. Plan phases conversationally using `.agents/plans/`.
- Execution reports land in `.agents/execution-reports/`, code reviews in `.agents/code-reviews/`, system reviews in `.agents/system-reviews/`.
- Any action that pushes, opens a PR, merges, or changes shared state: confirm with user first. Local file edits and test runs are fine to do without checking.
- **Artifact-commit cadence.** Files under `.agents/plans/`, `.agents/code-reviews/`, `.agents/system-reviews/`, and `.agents/execution-reports/` are committed in a single follow-up commit on `main` *after* the implementation PR squash-merges — never inside the implementation PR. They aren't feature artifacts and would dilute the PR diff. This also avoids the "N untracked changes" warning during `gh pr create`.
- **Deferred code-review findings.** When a code review identifies issues that don't block the current phase but should be addressed before a later phase begins, record the carry-forward in the **next phase's plan** under an "Inherited findings" section, citing the source review and the specific finding. The code-review artifact alone is insufficient — plans are read top-to-bottom by future executors; review artifacts are not.
- **Code-review artifacts are pre-fix snapshots.** A code-review document records issues at the moment of review, not the final state of the merged code. Most findings are typically addressed in the same PR before squash-merge. When auditing a phase retrospectively, verify each finding against the *merged tree* (`git show <merge-commit> -- <path>`) before claiming the issue persists — don't assume the review doc reflects what shipped.
- **Post-execution plan corrections.** If, during execution, a plan-prescribed recipe (Docker invocation, shell script, validation command) fails as written and a working substitute is discovered, append a "Post-execution corrections" section to the plan describing the failure mode and the working recipe. Commit on `main` after the implementation PR merges, in a focused commit separate from the artifact-commit (Phase 3's `56dd7ff` is the template). Preserves the lesson next to the plan it amends instead of burying it in execution logs.
