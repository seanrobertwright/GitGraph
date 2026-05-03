# Phase 5F — Code review

**Branch:** `phase-5f-registry-install-flow`
**Base:** `main`
**PR:** #11
**Reviewed:** 2026-05-03

## Stats

- Files Modified: 3 (`.github/workflows/ci.yml`, `apps/docs/app/r/[name]/route.ts`, `scripts/sync-registry.mjs`)
- Files Added: 2 (`registry/git-graph/registry.json`, `tests/e2e/install-flow.spec.ts`)
- Files Deleted: 0
- New lines: 145
- Deleted lines: 8

## Findings

```
severity: low
file: .github/workflows/ci.yml
line: 86-99
issue: SKIP_REGISTRY_SYNC=1 set twice (via $GITHUB_ENV step and via step-level env:)
detail: Step at line 87 writes SKIP_REGISTRY_SYNC=1 to $GITHUB_ENV, making it available to all subsequent steps in the job. Step at line 97-99 then re-declares it via the step-level env: block. The second declaration is redundant and can mislead a future reader into thinking SKIP applies *only* to the e2e step (it actually applies to the shadcn install step too — though there it's harmless because shadcn doesn't read it).
suggestion: Drop the env: block at lines 98-99. The $GITHUB_ENV write at line 87 is sufficient.
```

```
severity: low
file: .github/workflows/ci.yml
line: 95
issue: Smoke check greps for a literal "export default function GitGraph" signature
detail: If a future refactor switches to `const GitGraph = ...; export default GitGraph` or renames the function, the install-flow grep will fail loudly even though the install itself succeeded — producing a confusing CI red. The smoke check's intent is "the file isn't empty / wasn't truncated"; the literal-signature check is over-specified for that intent.
suggestion: Either drop the grep (file existence + non-zero size is enough), or assert `grep -q "GitGraph" git-graph.tsx` (any reference, not the literal default-export form).
```

```
severity: low
file: .github/workflows/ci.yml
line: 90
issue: `npx -y shadcn@latest` is unpinned — supply-chain flake/break vector for CI
detail: A breaking shadcn CLI release will break this CI job without any local change. The plan's external-system audit explicitly chose @latest to mirror the real consumer install experience, so this is intentional, not an oversight. Worth recording in the artifact so the next debugger doesn't waste time chasing a non-bug when the CLI changes its registry-item.json schema.
suggestion: No code change. If install-flow ever fails after a clean local run, first check `npm view shadcn version` against the last green CI run and pin to that version with a comment citing the regression.
```

```
severity: low
file: apps/docs/app/r/[name]/route.ts
line: 25
issue: 404 branch is unreachable under static export
detail: With `dynamic = "force-static"` and `generateStaticParams` returning only `git-graph.json`, Next.js generates exactly one route file at build time. No request for a different name can reach this handler in production — it's defense-in-depth that costs nothing but isn't load-bearing. Mentioning so a future reader doesn't add tests for the 404 path expecting it to fire at runtime.
suggestion: No change required. If `generateStaticParams` ever expands to multiple registry items, this guard becomes load-bearing — leave it.
```

```
severity: low
file: tests/e2e/install-flow.spec.ts
line: 4-7
issue: test.skip at describe-level fires per-test, adds matrix overhead without value
detail: Each non-chromium worker (firefox, webkit) still spins up a browser context and evaluates the skip predicate three times. Cost is minor (~1s per matrix worker per spec file), but the spec runs in *every* `pnpm test:e2e` invocation — including the existing 3-browser e2e job that has nothing to do with install-flow validation. The plan's PATTERN section accepts this; flagging so it's a conscious choice.
suggestion: No change required. If matrix runtime becomes a concern, gate the spec via a Playwright project-level filter (`testIgnore` for non-chromium projects) instead of in-spec skip.
```

```
severity: low
file: tests/e2e/install-flow.spec.ts
line: 9-19
issue: pageerror assertion is racy — errors that fire after the count check are missed
detail: `expect(errors).toEqual([])` checks the array at one moment; an exception thrown between the assertion and test teardown won't fail the test. This is a standard Playwright pattern with known limits. Not worth fixing for a smoke spec.
suggestion: No change required. If a real regression slips past, switch to `page.waitForLoadState("networkidle")` before the assertion to widen the capture window.
```

```
severity: info
file: apps/docs/app/r/[name]/route.ts
line: 21
issue: REGISTRY_ROOT relies on process.cwd() being the docs app dir
detail: Verified at build time (`pnpm --filter docs build` runs from `apps/docs/`). If a future tooling change shifts cwd (e.g. running next build from repo root), the relative `../../registry/git-graph` resolves wrong and the build fails with a clear ENOENT. Not a current issue; documented so future cwd changes get a heads-up.
suggestion: If the build invocation ever changes, replace with a path resolved from `__dirname` (or `import.meta.url`) instead of `process.cwd()`.
```

## Verified clean

- **Path traversal in route handler.** `f.path` flows from committed `registry/git-graph/registry.json` (not user input) into `readFileSync`. Static export means this runs at build time only, not against runtime requests. No user-controlled input reaches the filesystem.
- **registry.json `dependencies` array.** Verified `registry/git-graph/**` only imports `@tanstack/react-virtual`. `clsx` and `lucide-react` correctly excluded (docs-app concerns, not registry-source concerns) — consumers won't be forced to install icon/utility deps they don't use.
- **`SKIP_REGISTRY_SYNC=1` propagation.** Verified consumer-app's `predev`/`prebuild`/`prelint`/`pretypecheck` hooks all call `sync-registry.mjs`. The early-exit at line 12-15 of the script correctly bypasses all four. The install-flow CI job sequence (install → wipe → set SKIP → shadcn install → e2e) prevents any hook from clobbering shadcn's just-written files.
- **YAML structure.** Workflow parses to 5 jobs (lint/typecheck/unit/e2e/install-flow); install-flow correctly depends on `unit` and `typecheck` per plan rationale.
- **Background serve pattern.** `npx -y serve@14.2.6 ... &` then a 30s curl-poll wait is the standard GH Actions long-running-service pattern; works under bash on ubuntu-latest.
- **Local validation.** Typecheck, lint, unit, and `pnpm test:e2e install-flow --project=chromium` all pass. Static-export emits `apps/docs/out/r/git-graph.json` with all 11 files inlined; served + curl-fetched manifest is valid.

## Verdict

No critical, high, or medium issues. Six low/info notes — none blocking, four (CI redundancy, grep signature, route handler 404, race in pageerror) worth a follow-up touch-up if Phase G needs to revisit `ci.yml` or `install-flow.spec.ts`. The unpinned `shadcn@latest` is a known acceptance per plan.

Phase F ships a real, working shadcn registry: build emits a fully-populated manifest, CI exercises a fresh `npx shadcn@latest add` against the local build, and the synced consumer-app keeps working in parallel via the `SKIP_REGISTRY_SYNC` escape hatch.
