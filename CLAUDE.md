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

## Not tracked in git

- `.claude/` (local Claude Code config — user preference, not a team convention)
- `node_modules/`, `.next/`, `out/`, `dist/`, `build/`
- `coverage/`, `test-results/`, `playwright-report/`, `playwright/.cache/`
- `*.tsbuildinfo`, `*.log`, `.env*.local`

## Workflow

- `/gsd:*` commands are **not used** on this project. Plan phases conversationally using `.agents/plans/`.
- Execution reports land in `.agents/execution-reports/`, code reviews in `.agents/code-reviews/`, system reviews in `.agents/system-reviews/`.
- Any action that pushes, opens a PR, merges, or changes shared state: confirm with user first. Local file edits and test runs are fine to do without checking.
