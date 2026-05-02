# Feature: Phase 5 — Virtualization, Animation, Errors, fromGitLog, Real Install Flow, Docs Site

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files etc.

## Feature Description

Phase 5 ships the **MVP-complete** GitGraph component per `docs/PRD.md` §12.5. After Phase 5 a developer can `npx shadcn@latest add` the deployed registry URL into a fresh Next.js app, paste a snippet from the docs site, feed `git log` output through `fromGitLog`, and have a working interactive 10k-commit graph in light/dark mode within 5 minutes.

Six concurrent workstreams live in this single phase per user direction:

1. **Virtualization** of `<GitGraph>` via `@tanstack/react-virtual` + `useWindowVirtualizer` fallback so consumer-owned scroll containers and window-scroll both work.
2. **Append-only enter animation** with `prefers-reduced-motion` honored.
3. **Typed input errors** — `GitGraphInputError` class replacing plain `Error` from `computeLayout`, plus a new opt-in `validate(commits)` helper for strict-mode callers, plus a dev-mode-only error overlay in the component.
4. **`fromGitLog` parser** for the canonical `git log --pretty=format:'…'` recipe documented in the docs site.
5. **Registry finalization + real install-flow E2E** — `apps/docs/app/r/[name]/route.ts` returns the real manifest; a new CI job wipes the consumer-app's installed component dir, runs `npx shadcn@latest add` against a locally-served preview of the docs build, then runs the existing E2E suite against the freshly installed component on Chromium / Firefox / WebKit.
6. **Docs site** — TSX pages on `apps/docs` for installation, quickstart, data shape, recipes, theming, primitive, API reference, performance, troubleshooting, plus a live JSON-editor playground; README updated with animated screenshot link and 60-second quickstart.

Plus carry-forward fixes from the Phase 4 code review: `onCommitHover(null)` transient elimination (#2) and switching the controlled→uncontrolled fix from option (b) `useEffect` mirror to option (a) dev-warn (#3).

## User Story

As a product developer using shadcn/ui,
I want to install GitGraph in 60 seconds, render a 10k-commit history smoothly, and have docs that explain every prop, recipe, and theming knob,
So that I can ship a GitKraken-quality commit visualization in a real product without forking, without performance surprises, and without source-code spelunking.

## Problem Statement

Phase 4 shipped the headline `<GitGraph>` component for small graphs but: (a) it renders every row, so a 10k history mounts ~10k DOM nodes and scrolling stutters; (b) there is no enter animation when commits are appended, so a live "watch new commits arrive" UI feels static; (c) `computeLayout` throws plain `Error` instances that consumers can't programmatically distinguish from runtime bugs; (d) no `fromGitLog` exists despite the PRD listing it as MVP and the docs recipes needing it; (e) the registry endpoint serves a placeholder manifest with empty `files[]`, so `npx shadcn@latest add` would copy nothing; and (f) the only docs are this PRD plus a README that says "see PRD.md" — no install instructions, no data-shape reference, no theming guide, no live demos.

## Solution Statement

- Wrap `<GitGraph>`'s row stack in a `useVirtualizer` (when the consumer passes `scrollContainerRef`) or `useWindowVirtualizer` (default) from `@tanstack/react-virtual`. Rows render at absolute offsets driven by `virtualItems`. The gutter SVG shrinks to a per-window slice — Phase 3's `<GitGraphGutter>` gains an optional `range: { fromRow, toRow }` prop that filters rows/edges and translates coordinates by `-range.fromRow * rowHeight`, leaving the no-`range` (full-graph) path unchanged.
- Detect appended commits via a `useRef` snapshot of the previous render's sha set. New shas get `data-just-appended="true"` for one render; CSS `@keyframes git-graph-row-enter` runs a 150ms slide+fade, gated by `@media (prefers-reduced-motion: no-preference)`.
- Introduce `GitGraphInputError extends Error` with `kind: "duplicate-sha" | "cycle" | "missing-parent" | "unknown-head" | "unparseable-timestamp"` and `sha?: string`. `computeLayout`'s existing throws (duplicate-sha, cycle, unparseable-timestamp) become typed instances. A new `registry/git-graph/lib/validate.ts` exports `validate(commits, opts?)` for the opt-in strict checks (missing-parent, unknown-head). The component wraps its render body in a try/catch keyed on `process.env.NODE_ENV`: in development the error rethrows so React's error overlay surfaces it; in production the component renders an error shell (`<div data-testid="git-graph-error" data-error-kind={kind}>`).
- Implement `fromGitLog(text, opts?)` that parses tab-delimited `git log --pretty=tformat:'%H%x09%P%x09%ct%x09%an%x09%ae%x09%s'` output into `Commit[]`. Pure, deterministic, fully unit-tested.
- Update `apps/docs/app/r/[name]/route.ts` to read the real manifest from `registry/git-graph/registry.json` (new committed source-of-truth file) plus inline the actual TSX/TS/CSS file contents into the response payload per shadcn's registry-item.json schema. Add a new CI job `install-flow` that builds the docs app, serves `apps/docs/out/` via `npx serve`, wipes `examples/consumer-app/components/git-graph/`, runs `npx shadcn@latest add http://localhost:3000/r/git-graph.json` against the consumer-app, then runs the full E2E matrix against the freshly installed component.
- Add docs-site pages under `apps/docs/app/docs/...` for each PRD §12.5 docs section, with a `/playground` page that wires a `<textarea>` JSON input to `<GitGraph>` rendering live. README rewrite includes a 60-second quickstart and an animated PNG (Playwright-captured GIF or static screenshot — static is acceptable for MVP).
- Carry-forwards: lift hover tracking to the root `<div>` so `onCommitHover` only fires `null` once the cursor leaves the entire component (#2). Replace Phase 4's `useEffect` mirror with an `isControlledRef` snapshot + dev-warn on mode change (#3).

## Feature Metadata

**Feature Type**: New Capability + Enhancement (final MVP phase)
**Estimated Complexity**: High — six workstreams, three new deps, new CI job, ~12 new docs-site pages, registry endpoint refactor.
**Primary Systems Affected**:
- `registry/git-graph/` — `git-graph.tsx` (virt + anim + errors + carry-forwards), `git-graph-gutter.tsx` (windowed `range` prop), `git-graph.css` (anim keyframes), new `lib/from-git-log.ts`, new `lib/validate.ts`, new `lib/errors.ts`, `types.ts` (re-export errors), new `registry.json` source manifest
- `apps/docs/` — `app/r/[name]/route.ts` (real manifest), new `app/docs/{installation,quickstart,data-shape,recipes,theming,primitive,api,performance,troubleshooting}/page.tsx`, new `app/playground/page.tsx`, components for syntax-highlight + props-table + live demo
- `examples/consumer-app/` — new `app/graph/{large,animation,errors}/page.tsx` E2E harnesses
- `tests/unit/` — `from-git-log.test.ts`, `validate.test.ts`, `errors.test.ts`, `large.fixture.json` capture (committed)
- `tests/e2e/` — `graph-virtualization.spec.ts`, `graph-animation.spec.ts`, `graph-errors.spec.ts`
- `.github/workflows/ci.yml` — new `install-flow` job
- `package.json` (root + `examples/consumer-app/`) — three new deps with version pins
- `scripts/` — new `capture-fixture.mjs` for reproducible 10k fixture regeneration; new `serve-docs.mjs` (or shelled-out `serve` invocation) for the install-flow job
- `README.md` — full rewrite

**Dependencies (new, with native-binding audit; versions verified via `npm view <pkg> version` 2026-05-01):**
- `@tanstack/react-virtual` `3.13.24` — pure TS, no native bindings. No `pnpm.overrides` entries needed.
- `lucide-react` `1.14.0` — pure ESM React components, no native bindings. **Major-version jump from the 0.x line we listed in earlier drafts; verify peer-dep compatibility with React 19** (lucide-react's package.json declares `peerDependencies: { react: ">=16" }` so RC- and stable-19 are both fine).
- `clsx` `2.1.1` — pure JS, no native bindings.
- `serve` `14.2.6` — CI-only, invoked via `npx -y serve@14.2.6`. Not added to any `package.json`.

**Registry source `dependencies` array** (in `registry/git-graph/registry.json`) lists ONLY the packages the **registry source files actually import** — that's `@tanstack/react-virtual` only. `lucide-react` and `clsx` are docs-app deps (sidebar icons, code-block copy button); they don't belong in the registry manifest because consumers shouldn't be forced to install icons they don't use. Plan §"CREATE `registry/git-graph/registry.json`" was patched to reflect this; if you find lucide/clsx listed there during execution, remove them.

(See External-System Assumption Audit for verification dates and registry URLs.)

---

## Manual Steps Required

1. **First-time install-flow CI run will fail until `apps/docs/out/r/git-graph.json/...` is reachable at the expected URL.** This is a chicken-and-egg: the install-flow job needs the docs build to serve a real manifest, and the manifest references files that the same PR introduces. The first run validates entirely against the locally-built `out/` dir — no GH Pages access needed at PR time. Confirm green before the post-merge artifact commit. (Not user-action; flagging that the executor must verify this works on the *first* CI run, not after.)

2. **GitHub Pages enablement is already done** (one-time toggle 2026-04-24, see `memory/project_pages_manual_toggle.md`). No action.

3. **No npm publish, no shadcn-CLI account, no third-party service keys.** All install-flow validation is local-CI against the locally-served docs build.

---

## Inherited findings

From `.agents/code-reviews/phase-4-headline-table.md` and `.agents/system-reviews/phase-4-headline-table-review.md`:

- **#2 — `onCommitHover(null)` transient between rows.** Plan §"FIX hover-null transient (carry-forward #2)" addresses by lifting hover tracking to root via `onMouseLeave` on the container plus per-row `onMouseEnter` setting hovered sha; `onMouseLeave` per-row is removed. Net effect: `onCommitHover(null)` fires exactly once when the cursor leaves the whole component, not on every row boundary crossing.
- **#3 — Controlled→uncontrolled stale state.** Phase 4's `24b7ee9` shipped option (b) — a `useEffect` that mirrors `props.selectedSha` into `internalSelected` on every change. System review noted option (a) — dev-warn — is more honest. Plan §"REPLACE useEffect mirror with isControlled snapshot + dev-warn" implements option (a) and removes the useEffect.
- **#6 — Ref-badge clicks bubble to row `onClick`.** Phase 5 does not introduce per-badge click handlers (compound API is killed from MVP per planning conversation). No carry-forward action.
- **#8 — Empty-state shell lacks `tabIndex`.** Design intent confirmed as "empty = not interactive" in the planning conversation. No carry-forward action.

From `.agents/system-reviews/phase-4-headline-table-review.md` process recommendations:

- **Pre-PR scope check is now a `CONFIRM` task.** See §"CONFIRM pre-PR scope" near the bottom of the task list.
- **Plan-prescribed spike artifacts.** This phase has one spike (virtualization frame budget) at `_spike/` paths; the plan body records the measurement value before deletion. See §"SPIKE measure 10k virtualization frame budget".

---

## External-System Assumption Audit

- **`@tanstack/react-virtual` 3.10.9.** Verified via [npm registry](https://www.npmjs.com/package/@tanstack/react-virtual) and [TanStack Virtual changelog](https://github.com/TanStack/virtual/releases) — pure TypeScript package, peer-deps `react: ">=16.8.0"`. No native bindings; no `pnpm.overrides` entries needed. **Assumption to verify at execute time:** version is current at execute time (semver minor bumps don't break, but pin exactly to avoid lockfile churn).
- **`lucide-react` 0.469.0.** Verified via [npm registry](https://www.npmjs.com/package/lucide-react) and [lucide.dev](https://lucide.dev) — pure ESM React component package, peer-dep `react: ">=16"`. No native bindings.
- **`clsx` 2.1.1.** Verified via [npm registry](https://www.npmjs.com/package/clsx) — zero deps, pure JS, no peer-deps.
- **shadcn CLI registry-item schema.** Verified by direct smoke test 2026-05-01 against `npx shadcn@latest add` (CLI version current at that date). **Critical finding: when only `path` is provided, the CLI treats the first path segment as an alias key and writes the file's basename directly under the alias root — collapsing intermediate directories.** Concretely: `path: "components/git-graph/foo.tsx"` writes to `<consumer>/components/foo.tsx`, NOT `<consumer>/components/git-graph/foo.tsx`. The `target` field is the canonical way to express nested destinations: each file entry must include `target` set to the literal destination path relative to the consumer project root. With `target`, the CLI writes verbatim. Required per-file fields therefore: `path` (registry-internal identifier; basename is fine), `target` (literal destination including subdirectory), `type` (`registry:component` for `.tsx`, `registry:lib` for `.ts`, `registry:style` for `.css`), `content` (inlined file body). Optional top-level: `dependencies[]` (npm), `registryDependencies[]` (other shadcn registry items — empty for us), `cssVars` (per-mode CSS variables). Verification reproduced via 3-file manifest served from `npx serve@14.2.6` against `examples/consumer-app`; without `target` two files collapsed into the wrong dir; with `target` all three landed correctly under `components/git-graph/` and `lib/git-graph/`.
- **Next 15 static export of route handlers + `output: 'export'` + `trailingSlash: true`.** **Verified by direct test 2026-05-01** (placeholder route handler, fresh `pnpm build:docs`): Next 15.1.6 emits the route's GET response body as a literal file at `apps/docs/out/r/git-graph.json` — single file, no enclosing directory, no `.txt` rewrite. The `trailingSlash: true` config does not affect routes whose dynamic param ends with a file-extension-like suffix. `npx serve@14.2.6 apps/docs/out` serves it with `Content-Type: application/json`. Unauthenticated `curl http://localhost:3000/r/git-graph.json` returns 301 → `…/git-graph.json/` and `serve` re-serves the same body; with `curl -L` (and any HTTP client that follows redirects, including `undici`/`node-fetch` which the shadcn CLI uses), the round-trip is transparent. **Static-public fallback dropped — the route-handler approach is canonical.** Verified file: `apps/docs/out/r/git-graph.json` exists, contains valid JSON.
- **basePath behavior in install-flow CI.** `next.config.ts` sets `basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""`. Production GH Pages deploy sets `NEXT_PUBLIC_BASE_PATH=/GitGraph`. The install-flow CI job builds *without* setting that env var, so the local `out/` is served at root and the registry URL is `http://localhost:3000/r/git-graph.json`. **Assumption to verify:** that an unset `NEXT_PUBLIC_BASE_PATH` in CI produces a basePath-free build with no `/GitGraph` prefix in any emitted URL.
- **`npx shadcn@latest add <url>` behavior.** Verified via [shadcn CLI docs § add](https://ui.shadcn.com/docs/cli) — the CLI accepts an absolute URL pointing to a registry-item JSON, fetches it, downloads files referenced therein (or uses inline `content`), copies them to paths derived from the consumer project's `components.json` aliases. **The consumer-app already has `components.json`** (verified via `git ls-files`) — install destination is determined by its `aliases.components` and `aliases.lib`. **Assumption to verify:** consumer-app's `components.json` has `aliases.components = "@/components"` and `aliases.lib = "@/lib"` matching the planned manifest paths (`components/git-graph/git-graph.tsx`, `lib/git-graph/layout.ts`, etc.).
- **`npx shadcn@latest` is non-interactive when given a URL.** The CLI prompts for `Confirm files? (Y/n)` by default. Use `--yes` flag (or `-y`) to skip — verified in the CLI's `--help`. **Plan uses `npx shadcn@latest add --yes <url>` in the install-flow job.**
- **`npx serve` for static file serving.** [npm registry: serve](https://www.npmjs.com/package/serve) — `serve <dir>` listens on port 3000 by default, supports `-l` to change port. Used in the install-flow job to serve `apps/docs/out/`. Pinned to `serve@14.2.4` in the install-flow job invocation only (not in `package.json` — it's a one-shot CI tool, no runtime cost).
- **Real-repo capture for 10k fixture.** Plan captures the first 10000 commits of `react` (https://github.com/facebook/react) using `git log --pretty=tformat:'%H%x09%P%x09%ct%x09%an%x09%ae%x09%s' -10000`. **Commit messages and author names may contain Unicode the test runner sanitizes inconsistently across platforms.** Mitigation: store as JSON (parsed once at fixture-load time), with messages JSON-stringified at capture time so escape semantics are uniform.
- **`@tanstack/react-virtual` `useWindowVirtualizer` SSR safety.** Verified via [TanStack Virtual docs § useWindowVirtualizer](https://tanstack.com/virtual/latest/docs/api/virtualizer) — the hook reads `window` inside `useEffect`, safe for SSR. The `<GitGraph>` component already has `"use client"` (per Phase 4) so SSR is moot, but the docs site `/playground` page must also have `"use client"` to use the component.
- **Playwright `prefers-reduced-motion` emulation.** Verified via [Playwright docs § page.emulateMedia](https://playwright.dev/docs/api/class-page#page-emulate-media) — `await page.emulateMedia({ reducedMotion: 'reduce' })` works on all 3 browsers since Playwright 1.34.

---

## Plan Self-Consistency — Key Identifiers

| Identifier | Canonical form | Used in |
|---|---|---|
| Registry URL (local-CI) | `http://localhost:3000/r/git-graph.json` | install-flow job, plan body |
| Registry URL (deployed) | `https://seanrobertwright.github.io/GitGraph/r/git-graph.json` | docs site install snippet, README |
| Registry source manifest path | `registry/git-graph/registry.json` | route handler reads, `fs.readFileSync` |
| Static export fallback path | `apps/docs/public/r/git-graph.json` | (only if route-handler quirk forces it) |
| `@tanstack/react-virtual` version | `3.13.24` | both `package.json` files, audit section |
| `lucide-react` version | `1.14.0` | both `package.json` files |
| `clsx` version | `2.1.1` | both `package.json` files |
| `serve` version (CI-only) | `14.2.6` | install-flow job |
| 10k fixture path | `tests/unit/fixtures/large.fixture.json` | unit/e2e specs, capture script, harness page |
| Capture script path | `scripts/capture-fixture.mjs` | root `package.json` script entry, plan body |
| Large-fixture route | `/graph/large` | E2E spec, harness page, plan body |
| Animation harness route | `/graph/animation` | E2E spec, harness page, plan body |
| Errors harness route | `/graph/errors` | E2E spec, harness page, plan body |
| Playground route (docs) | `/playground` | docs nav, link in PRD-style README |
| New error class name | `GitGraphInputError` | types.ts, errors.ts, validate.ts, layout.ts, tests |
| Append-detection attribute | `data-just-appended="true"` | git-graph.tsx, CSS, E2E |
| Animation duration | `150ms` | CSS, E2E timing assertion |
| CI install-flow job name | `install-flow` | ci.yml, plan body |
| Branch name | `phase-5-virtualization-install-docs` | git ops |

Pre-emit grep verified during plan write — no divergent usages remained.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `docs/PRD.md` §7.6 (lines 240–242) — virtualization API note (single SVG overlay sized to scroll height — **plan deviates**: per-window-chunk SVG is the chosen approach, see §Solution Statement). §7.7 (244–249) — animation rules. §12.5 (438–469) — Phase 5 deliverables list. §13 — future considerations to *not* implement.
- `CLAUDE.md` (entire file) — conventions, especially: kebab-case files, default export, `type` over `interface`, LF endings, **artifact-commit cadence (post-merge on `main`)**, **untracked-file hygiene at branch-cut**, **plan-prescribed spike artifacts**, **Playwright SVG `toBeVisible()` is unreliable — use attribute assertions**.
- `registry/git-graph/git-graph.tsx` (whole file, 274 lines) — Phase 4 component to extend. Pay attention to: existing `useEffect` mirror for #3 at lines 78–85 (to replace), per-row `onMouseLeave` at line 198 (to remove for #2 fix), grid container at line 154 (insert virtualization here), `layout.rows.map` at line 166 (replace with `virtualizer.getVirtualItems()`-driven loop).
- `registry/git-graph/git-graph-gutter.tsx` (whole file, 110 lines) — primitive to extend with optional `range: { fromRow, toRow }` prop. The full-graph path (no `range`) must remain byte-identical in output, since Phase 3 screenshot baselines exist for it.
- `registry/git-graph/lib/layout.ts` (whole file, 216 lines) — three throws to convert to `GitGraphInputError` instances (lines 13, 21, 119). MinHeap implementation untouched.
- `registry/git-graph/types.ts` (whole file, 45 lines) — re-export `GitGraphInputError` and its `kind` union from here for consumer ergonomics.
- `registry/git-graph/git-graph.css` (whole file, ~75 lines after Phase 4) — append `@keyframes` and `prefers-reduced-motion` block.
- `apps/docs/app/r/[name]/route.ts` (whole file, 22 lines) — placeholder to replace.
- `apps/docs/next.config.ts` (whole file, 13 lines) — confirms `output: "export"`, `basePath` from env, `trailingSlash: true`. Read before deciding route-handler-vs-public-static.
- `apps/docs/app/page.tsx` and `apps/docs/app/layout.tsx` — landing-page shell to replace with docs navigation. Both use Tailwind v4 + the docs app's `globals.css`.
- `examples/consumer-app/app/graph/page.tsx` (entire) — gallery page pattern; new `/graph/large`, `/graph/animation`, `/graph/errors` pages mirror its structure.
- `examples/consumer-app/components.json` — shadcn aliases that determine where `npx shadcn@latest add` writes files. Read to confirm `aliases.components = "@/components"` and `aliases.lib = "@/lib"`.
- `examples/consumer-app/package.json` — has `predev`/`prebuild`/`pretypecheck`/`prelint` hooks running `sync-registry.mjs`. The install-flow job temporarily removes the synced dir and lets shadcn write a fresh copy; we must skip the predev hook in that job (env var `SKIP_REGISTRY_SYNC=1` checked by the script).
- `scripts/sync-registry.mjs` — copies registry → consumer-app components dir. Add an early-return on `process.env.SKIP_REGISTRY_SYNC === "1"`.
- `tests/unit/fixtures/index.ts` — fixture barrel; `large.fixture.json` is JSON, imported via `import largeFixture from "./large.fixture.json"` (TS allows JSON imports with `resolveJsonModule: true`, already enabled via `tsconfig.base.json`).
- `tests/e2e/graph-render.spec.ts` and `graph-interactions.spec.ts` — patterns for new spec files.
- `playwright.config.ts` (entire, 26 lines) — 3-browser matrix; `webServer` runs consumer-app on 3100. **No config change needed** unless install-flow needs an additional webServer entry, which it does — see install-flow task.
- `.github/workflows/ci.yml` (whole file, 60 lines) — existing jobs: `lint`, `typecheck`, `unit`, `e2e`. New `install-flow` job follows the same setup pattern (pnpm + node 22 + frozen-lockfile install).
- `.gitignore` — verify `examples/consumer-app/components/git-graph/` line is present (added Phase 3); install-flow job rm-rfs that directory and lets shadcn re-create it.
- `package.json` (root) — `pnpm.overrides` for Tailwind v4 natives is the prior-art for native-binding pinning. None of the three new deps need overrides, but the audit section above documents the verification.
- `.agents/plans/phase-3-gutter-primitive.md` § "Post-execution corrections" — Docker recipe for Linux-baseline screenshot regeneration on Windows hosts. Phase 5 introduces no new chromium-only screenshot specs (animation and virt are DOM-attribute assertions), so the Docker recipe is not needed for new work; it remains relevant if existing baselines need regenerating after CSS changes.
- `.agents/code-reviews/phase-4-headline-table.md` — full code review. Findings #2 and #3 are this phase's carry-forwards.
- `.agents/system-reviews/phase-4-headline-table-review.md` — process improvements implemented in `.claude/commands/core_piv_loop/{plan-feature,execute}.md` and `CLAUDE.md` already; this plan applies them (pre-PR scope check, spike-artifact discipline).

### New Files to Create

**Registry source**

- `registry/git-graph/lib/from-git-log.ts` — pure parser, named exports `fromGitLog(text: string, opts?: { format?: string }): Commit[]` and `GIT_LOG_FORMAT` constant (the canonical pretty-format string).
- `registry/git-graph/lib/validate.ts` — pure validator, named export `validate(commits: Commit[], opts?: { head?: string; allowMissingParents?: boolean }): void`. Throws `GitGraphInputError` on the first failure.
- `registry/git-graph/lib/errors.ts` — `GitGraphInputError` class (extends `Error`); union type `GitGraphInputErrorKind`.
- `registry/git-graph/registry.json` — committed source-of-truth for the shadcn manifest. Read at build time by `apps/docs/app/r/[name]/route.ts`. Schema matches `https://ui.shadcn.com/schema/registry-item.json`.

**Tests**

- `tests/unit/from-git-log.test.ts` — parser cases.
- `tests/unit/validate.test.ts` — each error kind triggers; opt-in toggles.
- `tests/unit/errors.test.ts` — `GitGraphInputError` shape (`kind`, `sha`, `instanceof`).
- `tests/unit/fixtures/large.fixture.json` — 10000 commits captured from `react`. Committed.
- `tests/e2e/graph-virtualization.spec.ts` — render-count assertion (≤ overscan + viewport rows mounted), scroll-perf assertion (long-task threshold from spike).
- `tests/e2e/graph-animation.spec.ts` — append fires animation; `prefers-reduced-motion: reduce` skips animation.
- `tests/e2e/graph-errors.spec.ts` — duplicate-sha / cycle / opt-in missing-parent each render error shell in production-mode build (or rethrow in dev — see test setup).
- `tests/e2e/install-flow.spec.ts` — driven by the new `install-flow` CI job; asserts that after a fresh `npx shadcn@latest add`, `examples/consumer-app/components/git-graph/git-graph.tsx` exists, contains the expected exports, and the `/graph` route renders without console errors.

**Consumer-app (E2E harnesses)**

- `examples/consumer-app/app/graph/large/page.tsx` — renders the 10k fixture inside a fixed-height `overflow: auto` div, with a `data-testid="scroll-container"` ref passed to `<GitGraph scrollContainerRef={...}>`.
- `examples/consumer-app/app/graph/animation/page.tsx` — renders a small fixture; a `<button data-testid="append-commit">` appends one synthetic commit each click; an `<input type="checkbox" data-testid="reduced-motion-toggle">` toggles a CSS class that simulates `prefers-reduced-motion` (Playwright uses `emulateMedia` directly; the toggle is for manual inspection).
- `examples/consumer-app/app/graph/errors/page.tsx` — three sections (`?case=duplicate`, `?case=cycle`, `?case=missing-parent`) each constructing a deliberately bad input.

**Apps/docs (docs site)**

- `apps/docs/app/docs/installation/page.tsx` — install command (deployed registry URL), prerequisites, what-gets-copied table.
- `apps/docs/app/docs/quickstart/page.tsx` — minimal hard-coded 5-commit DAG, live-rendered.
- `apps/docs/app/docs/data-shape/page.tsx` — annotated `Commit` and `Ref` reference.
- `apps/docs/app/docs/recipes/page.tsx` — index page linking five recipe pages.
- `apps/docs/app/docs/recipes/git-log/page.tsx` — `fromGitLog` recipe with the canonical format string.
- `apps/docs/app/docs/recipes/github-api/page.tsx` — REST/GraphQL adapter snippet.
- `apps/docs/app/docs/recipes/isomorphic-git/page.tsx` — `isomorphic-git` adapter snippet.
- `apps/docs/app/docs/recipes/working-tree/page.tsx` — `showWorkingTreeRow` examples.
- `apps/docs/app/docs/recipes/custom-columns/page.tsx` — note: Phase 5 does not implement compound `<GitGraph.Row>`; the recipe shows wrapping `<GitGraph>` in a sibling table with shared row height.
- `apps/docs/app/docs/theming/page.tsx` — every CSS variable, before/after recolor screenshots.
- `apps/docs/app/docs/primitive/page.tsx` — `<GitGraphGutter>` standalone usage.
- `apps/docs/app/docs/api/page.tsx` — props table for both components, exported types, callback signatures. Hand-written (no TSDoc auto-gen for MVP).
- `apps/docs/app/docs/performance/page.tsx` — virtualization explainer, `rowHeight` tuning, frame-budget numbers from the spike.
- `apps/docs/app/docs/troubleshooting/page.tsx` — the four common mistakes from the PRD.
- `apps/docs/app/playground/page.tsx` — `"use client"` page with a `<textarea>` + JSON.parse + live `<GitGraph>` render. Errors caught and shown inline.
- `apps/docs/components/docs-shell.tsx` — sidebar navigation shared by all docs pages. Uses `lucide-react` icons.
- `apps/docs/components/code-block.tsx` — minimal syntax-highlighted `<pre><code>` (no Shiki / no Prism — just plain `<pre>` with monospace + a copy button using `lucide-react`'s `Copy` icon).
- `apps/docs/components/props-table.tsx` — table renderer for the API page, hand-fed prop data.
- `apps/docs/components/live-demo.tsx` — embeds `<GitGraph>` inline with a fixture; `"use client"`.

**Scripts**

- `scripts/capture-fixture.mjs` — Node 22 ESM. Takes `--repo <path>`, `--n <count>`, `--out <json-path>`. Runs `git log` with the canonical format, parses, JSON-stringifies. Idempotent; deterministic given a fixed repo HEAD.
- `scripts/serve-docs.mjs` — Node 22 ESM. Spawns `npx serve apps/docs/out -l 3000`. Used by the install-flow CI job. **Trivial; consider inlining as a job step instead of a script — see plan task.** (Reserve the file path; decide at task time.)

**Workflows**

- (No new workflow file. Modify `.github/workflows/ci.yml` to add an `install-flow` job.)

### Files to Update

- `registry/git-graph/git-graph.tsx`:
  - Remove `useEffect` mirror (lines 78–85).
  - Add `isControlledRef` snapshot at first render, dev-warn if `isControlled` flips.
  - Replace per-row `onMouseLeave` with single root `onMouseLeave`.
  - Wrap layout call in try/catch — catch `GitGraphInputError`, store in state, render error shell.
  - Insert `useVirtualizer` (with `scrollContainerRef` prop) or `useWindowVirtualizer` (default).
  - Replace `layout.rows.map` with virtualizer-driven render.
  - Pass `range: { fromRow, toRow }` to `<GitGraphGutter>`.
  - Add append detection: `useRef<Set<string>>` for previous shas; compute new shas each render; mark rows.
  - Add `scrollContainerRef?: RefObject<HTMLElement | null>` prop.
- `registry/git-graph/git-graph-gutter.tsx`:
  - Add optional `range?: { fromRow: number; toRow: number }` prop.
  - When provided: filter rows by `rowIndex` ∈ range, filter edges by overlap, translate cy/path coords by `-range.fromRow * rowHeight`, set SVG height to `(range.toRow - range.fromRow + 1) * rowHeight`.
  - When absent: existing behavior unchanged (verified by re-running Phase 3 screenshot baselines unchanged).
- `registry/git-graph/lib/layout.ts`:
  - Replace three plain `Error` throws (duplicate-sha, cycle, unparseable-timestamp) with `GitGraphInputError` instances.
- `registry/git-graph/types.ts`:
  - Add `export { GitGraphInputError, type GitGraphInputErrorKind } from "./lib/errors";` re-export.
- `registry/git-graph/git-graph.css`:
  - Append `@keyframes git-graph-row-enter { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }` and a `@media (prefers-reduced-motion: no-preference) { .git-graph-row[data-just-appended="true"] { animation: git-graph-row-enter 150ms ease-out; } }` block.
- `apps/docs/app/r/[name]/route.ts`:
  - Read `registry/git-graph/registry.json` at module load (Node `fs.readFileSync` is fine in a route handler that's `force-static`).
  - For each entry in the manifest's `files[]`, read the corresponding source file from `registry/git-graph/...` and inline its contents in `files[i].content`.
  - Return the assembled manifest as JSON.
- `apps/docs/app/page.tsx`, `apps/docs/app/layout.tsx`:
  - Replace placeholder landing page with a docs-site shell. Landing page shows hero + 60-second quickstart snippet + link to `/docs/installation` and `/playground`.
- `apps/docs/package.json`:
  - Add `@tanstack/react-virtual`, `lucide-react`, `clsx` at the pinned versions.
- `examples/consumer-app/package.json`:
  - Add `@tanstack/react-virtual`, `lucide-react`, `clsx` at the pinned versions.
- `package.json` (root):
  - Add `"capture-fixture": "node scripts/capture-fixture.mjs"` script.
- `scripts/sync-registry.mjs`:
  - Add early-return on `process.env.SKIP_REGISTRY_SYNC === "1"`.
- `.github/workflows/ci.yml`:
  - Add `install-flow` job (full template in the §Step-by-step task below).
- `playwright.config.ts`:
  - **No change.** The install-flow E2E reuses the existing `webServer` (consumer-app on 3100). Docs preview server is launched/torn-down by the CI job around the Playwright invocation, not by Playwright itself.
- `tests/unit/fixtures/index.ts`:
  - Add `export { default as largeFixture } from "./large.fixture.json";` (after running capture).
- `README.md`:
  - Full rewrite per template at the end of this plan.

### Files Explicitly NOT Touched

- `registry/git-graph/lib/{bezier,format,working-tree}.ts` — Phase 4 helpers; no reason to change.
- `registry/git-graph/lib/layout.ts` algorithm — only error-throw types change; logic untouched.
- Phase 4 screenshot baselines (`tests/e2e/graph-screenshots.spec.ts-snapshots/*.png`, `tests/e2e/gutter-screenshots.spec.ts-snapshots/*.png`) — should remain green. If they fail after CSS additions, investigate root cause; do **not** regenerate without verifying the visual change is intentional.
- `tsconfig.base.json`, `tsconfig.json`, `vitest.config.ts` — no change.
- `.github/workflows/deploy.yml` — no change. Existing GH Pages deploy continues to ship `apps/docs/out/`; the new docs pages and registry endpoint are picked up automatically.

### Relevant Documentation — YOU SHOULD READ THESE BEFORE IMPLEMENTING

- [@tanstack/react-virtual — `useVirtualizer`](https://tanstack.com/virtual/latest/docs/api/virtualizer) — element-scroll API. Why: the consumer-passed-`scrollContainerRef` path.
- [@tanstack/react-virtual — `useWindowVirtualizer`](https://tanstack.com/virtual/latest/docs/api/virtualizer#usewindowvirtualizer) — window-scroll API. Why: default path when consumer passes no ref.
- [@tanstack/react-virtual — Vertical example](https://tanstack.com/virtual/latest/docs/framework/react/examples/dynamic) — canonical pattern; we mirror the absolute-positioning row render.
- [shadcn/ui — registry-item.json schema](https://ui.shadcn.com/docs/registry/registry-item-json) — manifest shape, `files[].type` values.
- [shadcn/ui — CLI `add`](https://ui.shadcn.com/docs/cli) — `--yes` flag, URL behavior.
- [Next 15 — Route Handlers in static export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports#route-handlers) — verifies `force-static` + `generateStaticParams` is the correct pattern; **read carefully for the file-naming behavior under `trailingSlash: true`** (this is the assumption flagged in the audit).
- [Playwright — `page.emulateMedia`](https://playwright.dev/docs/api/class-page#page-emulate-media) — `reducedMotion: 'reduce'`.
- [Playwright — Performance API in tests](https://playwright.dev/docs/api/class-page#page-evaluate) — `page.evaluate(() => performance.now())` pattern for the scroll-perf assertion.
- [MDN — `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — media query semantics.
- [git log — pretty formats](https://git-scm.com/docs/git-log#_pretty_formats) — `tformat:`, `%H`, `%P`, `%ct`, `%an`, `%ae`, `%s`, `%x09` (tab).
- [serve (npm)](https://www.npmjs.com/package/serve) — CLI usage.

### Patterns to Follow

**File / export conventions** — unchanged from prior phases. Default-exported components, named-exported helpers, kebab-case files, `type` over `interface`, LF line endings.

**Error class pattern** (new, not previously in codebase):

```ts
// registry/git-graph/lib/errors.ts
export type GitGraphInputErrorKind =
  | "duplicate-sha"
  | "cycle"
  | "missing-parent"
  | "unknown-head"
  | "unparseable-timestamp";

export class GitGraphInputError extends Error {
  readonly kind: GitGraphInputErrorKind;
  readonly sha: string | undefined;
  constructor(kind: GitGraphInputErrorKind, message: string, sha?: string) {
    super(message);
    this.name = "GitGraphInputError";
    this.kind = kind;
    this.sha = sha;
    // Preserve prototype chain across transpilation:
    Object.setPrototypeOf(this, GitGraphInputError.prototype);
  }
}
```

**Virtualizer integration pattern** (from TanStack docs, adapted for our render):

```tsx
// Two child components to keep hook order consistent:
function GitGraphInElement(props: GitGraphProps & { scrollContainerRef: RefObject<HTMLElement | null> }) {
  const virtualizer = useVirtualizer({
    count: layout.rows.length,
    estimateSize: () => rowHeight,
    getScrollElement: () => props.scrollContainerRef.current,
    overscan: 8,
  });
  // … render virtualizer.getVirtualItems()
}

function GitGraphInWindow(props: GitGraphProps) {
  const virtualizer = useWindowVirtualizer({
    count: layout.rows.length,
    estimateSize: () => rowHeight,
    overscan: 8,
  });
  // … same render
}

export default function GitGraph(props: GitGraphProps) {
  return props.scrollContainerRef
    ? <GitGraphInElement {...props} scrollContainerRef={props.scrollContainerRef} />
    : <GitGraphInWindow {...props} />;
}
```

(The two child components share enormous code — extract a `<GitGraphBody>` that takes `virtualItems` and `totalSize` as props. Pattern in TanStack docs.)

**Append detection pattern**:

```tsx
const prevShasRef = useRef<Set<string> | null>(null);
const justAppended = useMemo(() => {
  const current = new Set(commits.map((c) => c.sha));
  const prev = prevShasRef.current;
  prevShasRef.current = current;
  if (prev === null) return new Set<string>(); // first render — never animate
  const newOnes = new Set<string>();
  for (const sha of current) if (!prev.has(sha)) newOnes.add(sha);
  return newOnes;
}, [commits]);
```

In the row render, set `data-just-appended={justAppended.has(row.commit.sha) ? "true" : undefined}`. **React's DOM reconciler removes a data-attribute when its prop value is `undefined`** ([React docs § common props on elements](https://react.dev/reference/react-dom/components/common#common-props)) — that is the mechanism by which the attribute clears on the next render after the new sha is no longer "new". Confirmed working pattern in React 19; do not "manually clear" the attribute via an effect. The CSS animation does not loop, so even if the attribute stays set across multiple renders (which it won't), the animation only plays once.

**`exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`** — same constraints as Phase 4. Spread optionals via `{...(value !== undefined ? { value } : {})}`. Iterate arrays with `for…of`, not by index.

---

## IMPLEMENTATION PLAN

### Phase A — Foundation (errors, validate, fromGitLog, deps)

Pure modules first. Errors class, `validate()`, `fromGitLog()`, plus the three new dependencies. No rendering changes yet.

### Phase B — Virtualization (with spike)

Frame-budget spike (**pre-run during plan write 2026-05-01**, see results below). Refactor `<GitGraphGutter>` for windowed `range`. Integrate `useVirtualizer`/`useWindowVirtualizer` into `<GitGraph>`. New large fixture captured from `react`. New `/graph/large` harness page. New virtualization E2E.

**Spike results** — execute-time, against the real `<GitGraph>` row (10000 commits captured from `facebook/react`, 600px scroll container, 30 stepped scrolls × 100ms, `useVirtualizer` overscan 8). Pre-run synthetic-row measurements (chromium 24, firefox 28, webkit 59) are in commit history.

| Browser | max frame | p99 | p95 | median | n |
|---|---|---|---|---|---|
| chromium | 27 ms | 25 ms | 22 ms | 17 ms | 203 |
| firefox | 38 ms | 37 ms | 24 ms | 17 ms | 209 |
| **webkit** | **60 ms** | **59 ms** | 55 ms | 28 ms | 117 |

Worst real-row max (webkit 60 ms) is ≤ 80 ms threshold → **`MAX_FRAME_MS = 100`** for the production perf assertion in `tests/e2e/graph-virtualization.spec.ts`. 1.7× headroom over the worst observed; catches a broken virtualizer (which would produce 200–2000 ms+ frames) without being flaky on slow CI runners.

### Phase C — Animation

CSS keyframes + JS append detection. Reduced-motion media query. New `/graph/animation` harness. New animation E2E.

### Phase D — Carry-forwards (#2 hover, #3 controlled→uncontrolled)

Lift hover tracking to root. Replace `useEffect` mirror with `isControlledRef` + dev-warn. Update Phase 4 E2E to reflect the per-component-leave hover semantics if any spec asserted the old per-row behavior.

### Phase E — Error states

Component-level try/catch around the layout call. Production-mode error shell. Dev-mode rethrow. New `/graph/errors` harness. New error E2E.

### Phase F — Registry finalize + install-flow CI

Source manifest at `registry/git-graph/registry.json`. Real manifest assembly in route handler (or static fallback if route-handler quirk forces it). New `install-flow` CI job.

### Phase G — Docs site + README

Docs shell, all docs pages, playground, README rewrite.

### Phase H — Validation + PR + post-merge artifacts

Pre-PR scope check. PR open. Post-merge artifact commit on `main`.

---

## STEP-BY-STEP TASKS

Execute every task in order, top to bottom. Each is atomic and independently testable.

---

### CONFIRM — feature branch exists from up-to-date `main`

- **Host**: any.
- **IMPLEMENT**: User-gated. Verify with the user that we should branch off `main`. Then:
  - `git fetch origin`
  - `git checkout main && git pull --ff-only`
  - `git checkout -b phase-5-virtualization-install-docs`
- **VALIDATE**: `git rev-parse --abbrev-ref HEAD` = `phase-5-virtualization-install-docs`; `git status` clean.

---

### Phase A — Foundation

#### CREATE `registry/git-graph/lib/errors.ts`

- **IMPLEMENT**: Per the "Error class pattern" snippet in §Patterns to Follow. Export `GitGraphInputError` class and `GitGraphInputErrorKind` type union.
- **PATTERN**: No prior pattern in repo; canonical TS error subclass with `Object.setPrototypeOf` for `instanceof` reliability.
- **IMPORTS**: None.
- **GOTCHA**: Strict `exactOptionalPropertyTypes` means `sha` cannot be both optional and `undefined`. Declare as `readonly sha: string | undefined` (always present, may be undefined). Match the snippet exactly.
- **VALIDATE**: `pnpm tsc -p tsconfig.json --noEmit` passes.

#### CREATE `tests/unit/errors.test.ts`

- **IMPLEMENT**: Three Vitest cases:
  1. `new GitGraphInputError("duplicate-sha", "x", "abc")` is `instanceof Error` and `instanceof GitGraphInputError`; `.kind === "duplicate-sha"`, `.sha === "abc"`, `.name === "GitGraphInputError"`.
  2. Without `sha` arg: `.sha === undefined`.
  3. Caught via `try { throw … } catch (e) { if (e instanceof GitGraphInputError) … }` — ensures the prototype-chain trick works post-transpile.
- **VALIDATE**: `pnpm test errors` passes.

#### UPDATE `registry/git-graph/lib/layout.ts` — convert plain Error throws to GitGraphInputError

- **IMPLEMENT**: Three sites:
  - Line 13 (`duplicate sha in input`) → `throw new GitGraphInputError("duplicate-sha", \`computeLayout: duplicate sha in input: \${c.sha}\`, c.sha);`
  - Line 21 (`cycle detected`) → `throw new GitGraphInputError("cycle", "computeLayout: cycle detected in commit graph");` (no sha — the cycle isn't necessarily one commit).
  - Line 119 (`unparseable timestamp`) → `throw new GitGraphInputError("unparseable-timestamp", \`computeLayout: unparseable timestamp string: \${t}\`);`
- **IMPORTS**: Add `import { GitGraphInputError } from "./errors";` at the top.
- **PATTERN**: Layout's existing throw style; just type-tag.
- **VALIDATE**: `pnpm typecheck && pnpm test layout` — existing layout tests still pass (they used `expect(() => …).toThrow(/duplicate sha/)`-style, which matches by message, so continue to pass even though the error class changed).

#### UPDATE `registry/git-graph/types.ts` — re-export error class

- **IMPLEMENT**: Add at the bottom: `export { GitGraphInputError } from "./lib/errors"; export type { GitGraphInputErrorKind } from "./lib/errors";`
- **VALIDATE**: `pnpm typecheck`.

#### CREATE `registry/git-graph/lib/validate.ts`

- **IMPLEMENT**:
  - `export function validate(commits: Commit[], opts?: { head?: string; allowMissingParents?: boolean }): void`.
  - Build `bySha: Set<string>` from `commits`.
  - For each commit, for each parent: if `bySha.has(parent)` is false **and** `opts?.allowMissingParents !== true`, throw `new GitGraphInputError("missing-parent", \`validate: commit \${c.sha} references unknown parent \${parent}\`, c.sha)`.
  - If `opts?.head !== undefined` and `bySha.has(opts.head) === false`, throw `new GitGraphInputError("unknown-head", \`validate: head \${opts.head} not in commits\`, opts.head)`.
  - **Defer** duplicate-sha and cycle to `computeLayout` (don't duplicate the check).
- **PATTERN**: Pure function; no I/O; deterministic; throws on first failure.
- **GOTCHA**: `allowMissingParents` defaults to `false` here (strict-by-default for the opt-in helper), but `computeLayout` will continue to default to permissive for the windowed-log case. Two functions, two defaults — by design.
- **VALIDATE**: `pnpm typecheck`.

#### CREATE `tests/unit/validate.test.ts`

- **IMPLEMENT**: Cases (each a single fixture inline in the test):
  1. Valid linear chain → no throw.
  2. Missing parent (commit references parent not in array) → throws `GitGraphInputError` with `kind === "missing-parent"`, `sha === <child sha>`.
  3. Same input + `{ allowMissingParents: true }` → no throw.
  4. Unknown head (`head: "deadbeef"` not in commits) → throws with `kind === "unknown-head"`.
  5. No `head` opt → no head validation.
- **VALIDATE**: `pnpm test validate` passes.

#### CREATE `registry/git-graph/lib/from-git-log.ts`

- **IMPLEMENT**:
  - Export const `GIT_LOG_FORMAT = "%H%x09%P%x09%ct%x09%an%x09%ae%x09%s"` — the canonical six-field tab-delimited format.
  - Export function `fromGitLog(text: string): Commit[]`.
  - Split input by `\n`, filter empty lines, for each line split by `\t` (max 6 fields — the message field cannot contain tabs because `%s` is the subject line which strips them).
  - Per line: `[sha, parentsRaw, ctRaw, name, email, message] = parts`. If `parts.length < 6`, throw `GitGraphInputError("unparseable-timestamp", …)` with the offending line number — actually, more precise: introduce a new error kind? **Decision: reuse `unparseable-timestamp` is wrong; use a generic `Error` here, since this is a library-author-provided format mismatch, not a graph-input error.** Just `throw new Error(\`fromGitLog: malformed line \${i + 1}: expected 6 tab-delimited fields, got \${parts.length}\`);`.
  - `parents = parentsRaw === "" ? [] : parentsRaw.split(" ");`
  - `timestamp = Number(ctRaw) * 1000` (git `%ct` is unix seconds).
  - Construct `Commit` per row.
  - Return `Commit[]`.
- **PATTERN**: Pure parser, no I/O.
- **IMPORTS**: `import type { Commit } from "../types";`
- **VALIDATE**: `pnpm typecheck`.

#### CREATE `tests/unit/from-git-log.test.ts`

- **IMPLEMENT**: Cases:
  1. Empty string → `[]`.
  2. Single root commit (empty parents) → 1 entry, `parents === []`.
  3. Two-commit chain → 2 entries, child's `parents[0] === parent.sha`.
  4. Merge commit (two-parent line) → `parents.length === 2`.
  5. Trailing newline → no extra empty entry.
  6. Malformed (5 fields) → throws.
  7. Numeric `%ct` → `timestamp` is unix-ms (seconds × 1000).
- **VALIDATE**: `pnpm test from-git-log` passes.

#### ADD deps to `apps/docs/package.json` and `examples/consumer-app/package.json`

- **IMPLEMENT**: In each file's `"dependencies"` block, add:
  ```json
  "@tanstack/react-virtual": "3.13.24",
  "lucide-react": "1.14.0",
  "clsx": "2.1.1"
  ```
  Sort alphabetically with the existing entries. Then run `pnpm install` from repo root to update `pnpm-lock.yaml`.
- **GOTCHA**: All three are pure JS — no `pnpm.overrides` entries needed. The audit section confirmed; do not add entries.
- **VALIDATE**: `pnpm install --frozen-lockfile` from a fresh `node_modules` succeeds (run after committing the lockfile changes); `pnpm typecheck` passes; `pnpm --filter docs build` succeeds.

---

### Phase B — Virtualization

#### SPIKE — refine 10k virtualization frame budget against the real `<GitGraph>` row

- **Host**: linux (verified inside the existing Playwright runner image) and Windows (verified via PowerShell-driven Docker recipe from Phase 3's post-execution corrections, if local regen needed).
- **CONTEXT**: A pre-run spike (plan-write time, 2026-05-01) using a bare row component already established the synthetic-row baseline: chromium max 24 ms, firefox max 28 ms, webkit max 59 ms. The real `<GitGraph>` row has slightly more per-row cost (ref-badge JSX, `relativeTime`, sha-shortener), so this task verifies the conclusion holds. **Do not skip it** — the row delta is the only known unknown.
- **IMPLEMENT**:
  1. After "RUN capture for `react`" produces `tests/unit/fixtures/large.fixture.json`:
  2. Create `examples/consumer-app/app/graph/_spike/page.tsx` rendering `<GitGraph commits={largeFixture} scrollContainerRef={ref} />` inside a fixed-height (`height: 600, overflow: auto`) div with `data-testid="scroll-container"` and a passed `scrollContainerRef`.
  3. Create `tests/e2e/_spike-virt-perf.spec.ts` per the rAF-delta pattern below (verbatim — already validated at plan write):
     ```ts
     import { expect, test } from "@playwright/test";
     test("spike virt perf", async ({ page, browserName }) => {
       await page.goto("/graph/_spike");
       await page.waitForSelector('[data-testid="git-graph-row"]');
       const result = await page.evaluate(async () => {
         const el = document.querySelector('[data-testid="scroll-container"]') as HTMLElement;
         const deltas: number[] = [];
         let lastT = performance.now();
         let stop = false;
         function tick() {
           const now = performance.now();
           deltas.push(now - lastT);
           lastT = now;
           if (!stop) requestAnimationFrame(tick);
         }
         requestAnimationFrame(tick);
         const total = el.scrollHeight - el.clientHeight;
         const steps = 30;
         const stepHeight = total / steps;
         for (let i = 0; i < steps; i++) {
           el.scrollTop = stepHeight * (i + 1);
           await new Promise((r) => setTimeout(r, 100));
         }
         await new Promise((r) => setTimeout(r, 300));
         stop = true;
         const trimmed = deltas.slice(2).sort((a, b) => a - b);
         return {
           max: trimmed.at(-1) ?? 0,
           p99: trimmed[Math.floor(trimmed.length * 0.99)] ?? 0,
           p95: trimmed[Math.floor(trimmed.length * 0.95)] ?? 0,
           median: trimmed[Math.floor(trimmed.length / 2)] ?? 0,
           n: trimmed.length,
         };
       });
       console.log(`SPIKE ${browserName}: ${JSON.stringify(result)}`);
       expect(result.max).toBeLessThan(500);
     });
     ```
  4. Run `pnpm test:e2e -- _spike-virt-perf` (all 3 browsers).
  5. **Record per-browser results in the plan body**: edit this file, replace the Phase B "Pre-run spike results" table with the new measurements, and update `MAX_FRAME_MS` in `tests/e2e/graph-virtualization.spec.ts` if the worst real-row max exceeds 80 ms (formula: `MAX_FRAME_MS = ceil(worst-real * 1.5 / 25) * 25`, minimum 100).
  6. Delete `examples/consumer-app/app/graph/_spike/` and `tests/e2e/_spike-virt-perf.spec.ts`.
- **PATTERN**: `.agents/plans/phase-4-headline-table.md` § "SPIKE measure alignment delta (Phase 0)" steps 1–6. Pre-run spike code (now removed) lives in git history if needed for reference.
- **GOTCHA**: WebKit's PerformanceObserver lacks `longtask`. The rAF-delta approach above is portable across all 3 browsers; do not switch to `getEntriesByType("longtask")`.
- **VALIDATE**: Both spike paths gone after step 6; `pnpm test:e2e -- _spike-virt-perf` exits non-zero (file gone). The §Phase B `MAX_FRAME_MS` value reflects the real-row measurement.

#### CREATE `scripts/capture-fixture.mjs`

- **Host**: linux, macOS, and Windows (PowerShell). The script invokes `git` via `node:child_process`; behavior is identical across hosts.
- **IMPLEMENT**:
  - ESM. CLI args: `--repo <path>` (required), `--n <count>` (required), `--out <json-path>` (required).
  - Spawn `git -C <repo> log --pretty=tformat:'%H%x09%P%x09%ct%x09%an%x09%ae%x09%s' -<n>` (capture stdout).
  - Parse with `fromGitLog` from `registry/git-graph/lib/from-git-log.ts` (use a `node --import` loader-free `import` — both files are TS, so the script needs to either (a) be a `.ts` file run via `tsx`, or (b) inline a JS copy of the parser).
  - **Decision**: write the script in JS and inline a minimal parser. Avoids a `tsx` dependency. The unit test for `fromGitLog` covers the parser; the script doesn't need to share the exact code.
  - Write `JSON.stringify(commits, null, 2) + "\n"` to `--out`.
- **IMPORTS**: `child_process.execFileSync`, `fs/promises`, `node:path`.
- **GOTCHA**: `execFileSync` default `maxBuffer` is 1MB; 10000 commits × ~200 bytes/line = 2MB. Pass `{ maxBuffer: 16 * 1024 * 1024, encoding: "utf8" }`.
- **VALIDATE**: `node scripts/capture-fixture.mjs --repo /tmp/react --n 10 --out /tmp/test.json` produces a valid JSON array of 10 entries (manual smoke; no automated test).

#### RUN capture for `react` — produce `tests/unit/fixtures/large.fixture.json`

- **Host**: any.
- **IMPLEMENT**:
  - Clone react shallowly to a scratch dir: `git clone --filter=blob:none https://github.com/facebook/react /tmp/react-fixture-src` (or a Windows equivalent path; `$env:TEMP/react-fixture-src`). On Windows PowerShell: `git clone --filter=blob:none https://github.com/facebook/react $env:TEMP\\react-fixture-src`.
  - Run `node scripts/capture-fixture.mjs --repo <path-to-react> --n 10000 --out tests/unit/fixtures/large.fixture.json`.
  - Verify line count: the JSON should be ~2-3MB. Commit it (it's a fixture, source-of-truth, deterministic).
  - **Pin the source HEAD** by recording the captured tip sha in a comment at the top of `tests/unit/fixtures/large.fixture.json` — actually JSON has no comments; instead add a side file `tests/unit/fixtures/large.fixture.meta.json` with `{ "source": "https://github.com/facebook/react", "headSha": "<sha>", "n": 10000, "capturedAt": "<ISO date>" }`. Commit both.
- **PATTERN**: `tests/unit/fixtures/*.ts` are typed exports; the JSON fixture is loaded via the barrel as a typed JSON import.
- **GOTCHA**: Don't shallow-clone with `--depth 1` — git-log needs history. `--filter=blob:none` is the right one (skips file blobs, keeps commit graph).
- **VALIDATE**: `node -e "console.log(JSON.parse(require('fs').readFileSync('tests/unit/fixtures/large.fixture.json')).length)"` outputs `10000`.

#### UPDATE `tests/unit/fixtures/index.ts` — export large fixture

- **IMPLEMENT**: Add after existing exports: `import largeFixtureJson from "./large.fixture.json"; export const largeFixture = largeFixtureJson as Commit[];` (with `import type { Commit } from "../../../registry/git-graph/types";`).
- **GOTCHA**: `tsconfig` `resolveJsonModule` is on (verify via `tsconfig.base.json`); if not, the import fails. The `as Commit[]` cast is necessary because the JSON's inferred type doesn't include the `parents: string[]` constraint.
- **VALIDATE**: `pnpm typecheck` passes.

[then return to and execute the SPIKE body above]

#### UPDATE `registry/git-graph/git-graph-gutter.tsx` — add optional `range` prop

- **IMPLEMENT**:
  - Add `range?: { fromRow: number; toRow: number }` to `GitGraphGutterProps`.
  - When `range` undefined: existing behavior unchanged. When defined:
    - Filter `layout.rows` to those with `rowIndex >= range.fromRow && rowIndex <= range.toRow`.
    - Filter `layout.edges` to those where `[fromRow, toRow]` overlaps `[range.fromRow, range.toRow]` (i.e., `edge.fromRow <= range.toRow && edge.toRow >= range.fromRow`).
    - SVG `height = (range.toRow - range.fromRow + 1) * rowHeight`.
    - Translate all `cy` and edge path coords by `-range.fromRow * rowHeight`. Easiest: wrap rendered children in `<g transform={\`translate(0, \${-range.fromRow * rowHeight})\`}>`. Keeps coord math in `centerY(row.rowIndex, rowHeight)` unchanged; only the group translates.
    - SVG `viewBox="0 ${range.fromRow * rowHeight} ${width} ${height}"` — alternative to translate, possibly cleaner. Choose translate (more legible to readers).
- **PATTERN**: existing gutter render structure (lines 59–108).
- **GOTCHA**: Edges spanning beyond the visible range will render with start/end points off-canvas. SVG default behavior clips at the SVG bounding box, which is exactly what we want. Confirm with the Phase B virtualization E2E that the visual is correct (no truncated nodes mid-edge).
- **VALIDATE**: `pnpm typecheck`. Existing `gutter-screenshots.spec.ts` baselines still pass (they don't pass `range`, so the no-`range` path must be byte-identical). Run `pnpm test:e2e -- gutter-screenshots.spec.ts` and confirm no diff.

#### UPDATE `registry/git-graph/git-graph.tsx` — virtualization

- **IMPLEMENT**:
  - Add `scrollContainerRef?: RefObject<HTMLElement | null>` to `GitGraphProps`. (Import `RefObject` from `"react"`.)
  - Refactor the component into three:
    1. `GitGraph` (default export) — branches on `props.scrollContainerRef ? <GitGraphInElement> : <GitGraphInWindow>`.
    2. `GitGraphInElement` — calls `useVirtualizer`.
    3. `GitGraphInWindow` — calls `useWindowVirtualizer`.
  - Each child component computes `layout`, hover/select state, virtual items, then renders the same body. Extract the body into a helper `<GitGraphBody>` that takes `{ layout, virtualItems, totalSize, ...interactionProps }`.
  - In `<GitGraphBody>`:
    - Outer `<div role="listbox" tabIndex={0} style={{ display: "grid", gridTemplateColumns: \`\${gutterWidth}px 1fr\`, height: totalSize, position: "relative" }}>`.
    - Column 1: `<GitGraphGutter layout={layout} range={{ fromRow: virtualItems[0].index, toRow: virtualItems.at(-1).index }} … />` positioned at `top: virtualItems[0].start`. Wrap in a `<div style={{ position: "absolute", top: virtualItems[0].start }}>`.
    - Column 2: rows from `virtualItems.map(vi => layout.rows[vi.index])` rendered with `position: absolute, top: vi.start, left: gutterWidth, height: rowHeight, width: \`calc(100% - \${gutterWidth}px)\``. Each row's `data-row-index` continues to be `row.rowIndex` (NOT the virtual index).
  - **Empty-virtualItems case**: when virtualizer returns no items (e.g. before measure), render the outer container with `height: totalSize` (so the parent's scrollbar is correct) but render NO gutter and NO rows. Specifically: guard the gutter/range computation behind `if (virtualItems.length > 0)`. Accessing `virtualItems[0].index` or `virtualItems.at(-1).index` on an empty array is the failure mode this guard prevents.
- **PATTERN**: §Patterns to Follow virtualizer integration; TanStack docs dynamic example.
- **IMPORTS**: `import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";`
- **GOTCHA**: Hooks must be called in the same order each render in each component. The branch is at the *parent* `GitGraph` render — fine. Each child component always calls its one virtualizer hook.
- **GOTCHA 2**: `getScrollElement` is called inside the hook on each render. With `scrollContainerRef.current`, this returns null on the first render before the consumer's ref is attached; TanStack handles this (returns empty `virtualItems`, recomputes on next render). Don't try to be clever.
- **GOTCHA 3**: The gutter's per-window position must use `virtualItems[0].start` (pixels) **not** `range.fromRow * rowHeight`, because dynamic-row-height could differ. Phase 5 uses fixed-height rows so they're equal — but use `start` to keep the gutter's positioning robust if `estimateSize` is ever varied.
- **VALIDATE**: `pnpm typecheck`. `pnpm sync && pnpm --filter consumer-app dev` boots; manually open `/graph` (existing route, small fixture), confirm no visual regression. Existing Phase 4 E2E suite passes against the new render.

#### CREATE `examples/consumer-app/app/graph/large/page.tsx`

- **IMPLEMENT**:
  - `"use client"`.
  - `useRef<HTMLDivElement | null>(null)` for the scroll container.
  - Render `<div ref={ref} data-testid="scroll-container" style={{ height: 600, overflow: "auto", border: "1px solid var(--graph-row-selected-border)" }}><GitGraph commits={largeFixture} scrollContainerRef={ref} /></div>`.
  - Import `largeFixture` from `"../../../../tests/unit/fixtures"` (mirror `/graph/page.tsx` import depth).
- **PATTERN**: `examples/consumer-app/app/graph/page.tsx`.
- **VALIDATE**: `pnpm sync && pnpm --filter consumer-app dev`; manually open `http://localhost:3100/graph/large`; confirm only ~20 rows in the DOM (`document.querySelectorAll('[data-testid="git-graph-row"]').length` < 30) while the scrollbar reflects the full 10k height.

#### CREATE `tests/e2e/graph-virtualization.spec.ts`

- **IMPLEMENT**:
  - 3-browser suite. Loads `/graph/large`.
  - Test 1: render-count assertion — `await expect(page.locator('[data-testid="git-graph-row"]')).toHaveCount(N)` where N is the expected windowed count (overscan 8 × 2 + viewport rows ≈ 30; assert ≤ 40 for slack).
  - Test 2: scroll-to-bottom completes — programmatically scroll, wait for the last row's sha to be in viewport (`await expect(page.locator(\`[data-sha="\${lastSha}"]\`)).toBeInViewport()`).
  - Test 3: perf — `MAX_FRAME_MS = <recorded from spike>;` — run a smooth scroll over 5s, collect rAF deltas, assert max < `MAX_FRAME_MS`.
  - Test 4: gutter window — the rendered SVG height equals `(visibleCount * rowHeight)` not `(10000 * rowHeight)`; check via `await page.locator('[data-testid="git-graph-gutter"]').evaluate(el => el.getAttribute("height"))`.
- **VALIDATE**: `pnpm test:e2e graph-virtualization` passes on all three browsers.

---

### Phase C — Animation

#### UPDATE `registry/git-graph/git-graph.css` — append keyframes + media query

- **IMPLEMENT**: Append to the file:
  ```css
  @keyframes git-graph-row-enter {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: no-preference) {
    .git-graph-row[data-just-appended="true"] {
      animation: git-graph-row-enter 150ms ease-out;
    }
  }
  ```
- **GOTCHA**: The `no-preference` query (rather than `:not(reduce)`) is the canonical pattern — animations are **opt-out** for users who haven't expressed a preference, which is the spec-correct behavior. Verified via the MDN reference link in §Documentation.
- **VALIDATE**: `pnpm sync` copies into consumer-app. Manually open `/graph/animation` (created next) and click append: see the enter animation. Toggle Chromium DevTools "emulate prefers-reduced-motion" to "reduce" → no animation.

#### UPDATE `registry/git-graph/git-graph.tsx` — append-detection

- **IMPLEMENT**: Per §Patterns to Follow "Append detection pattern". Insert the `prevShasRef` + `useMemo<Set<string>>(justAppended)` block in `<GitGraphBody>` (or whichever shared module holds the row render). Pass `justAppended` to each row, set `data-just-appended={justAppended.has(row.commit.sha) ? "true" : undefined}`.
- **GOTCHA**: `useMemo` for `justAppended` must depend on `commits` (the array reference). If the consumer always passes a new array reference (e.g., always `commits.map(...)`), this re-computes every render — fine, the work is O(n). If they pass a stable reference, it caches — also fine.
- **GOTCHA 2**: First render: `prev === null`, return empty Set, no animation. This is intentional — initial mount should not animate every row.
- **VALIDATE**: Phase C E2E spec below.

#### CREATE `examples/consumer-app/app/graph/animation/page.tsx`

- **IMPLEMENT**:
  - `"use client"`. State: `const [commits, setCommits] = useState<Commit[]>(linearFixture);` (small fixture).
  - Button: `<button data-testid="append-commit" onClick={() => setCommits(prev => [{ sha: \`new-\${prev.length}\`, parents: [prev[0]?.sha].filter(Boolean), … }, ...prev])}>Append</button>`.
  - Render `<GitGraph commits={commits} />`.
  - **Time-deterministic timestamps** for fixture authoring: each appended commit gets `timestamp: 1750000000000 + Date.now()` — avoid pure `Date.now()` in tests because `relativeTime` then varies. Actually for the *animation* test, exact timestamps don't matter (we test the `data-just-appended` attribute, not the rendered relative-time). Use `Date.now()`.
- **VALIDATE**: Manual: click button, see new row at top with enter animation.

#### CREATE `tests/e2e/graph-animation.spec.ts`

- **IMPLEMENT**:
  - 3-browser suite. Loads `/graph/animation`.
  - Test 1: initial render — no row has `data-just-appended` (first render gate works).
  - Test 2: click append — exactly one new row gets `data-just-appended="true"`; that row is at index 0.
  - Test 3: click append again — only the *new* row has the attribute (not the previous one — the attribute clears after one render). **Implementation note for the executor:** the `data-just-appended` attribute persists on the DOM element until the next render that recomputes `justAppended` and finds the sha is no longer "new". On the next click (which triggers another render), the previous-click's sha is now in `prevShasRef`, so it's no longer marked. Verify in spec.
  - Test 4: `prefers-reduced-motion: reduce` — `await page.emulateMedia({ reducedMotion: 'reduce' })` before append; check `getComputedStyle(row).animationName === "none"`. The attribute is still present (it's data-only); only the CSS animation gates on the media query.
  - Test 5: animation timing — without reduced-motion, after click, wait for `animationend` event on the new row; verify event fires within ~250ms (150ms + slack).
- **VALIDATE**: `pnpm test:e2e graph-animation` passes on all three browsers.

---

### Phase D — Carry-forwards

#### FIX hover-null transient (carry-forward #2) — `registry/git-graph/git-graph.tsx`

- **IMPLEMENT**:
  - Remove per-row `onMouseLeave={() => props.onCommitHover?.(null)}` (current line 198).
  - Keep per-row `onMouseEnter={() => props.onCommitHover?.(row.commit)}`.
  - Add to the outer container (`<div role="listbox" …>` in `<GitGraphBody>`): `onMouseLeave={() => props.onCommitHover?.(null)}`.
- **PATTERN**: Standard event-delegation: `onMouseLeave` on the parent fires once when the cursor exits the parent rect, regardless of inner-child boundary crossings.
- **GOTCHA**: With virtualization, the outer container has `position: relative` and absolutely-positioned children. `onMouseLeave` fires when the cursor leaves the *outer rect*, which is exactly what we want (it's full-graph-sized via `height: totalSize`).
- **VALIDATE**: Update `tests/e2e/graph-interactions.spec.ts` if it asserted the old per-row-leave behavior. Add a new test: hover row 0, hover row 1, hover row 2 — assert `onCommitHover` called 3 times total (no nulls between), then move cursor outside the component, assert one final null. (Use the existing echo panel in `/graph/interactions`.)

#### REPLACE useEffect mirror with isControlled snapshot + dev-warn (carry-forward #3)

- **IMPLEMENT**:
  - Remove lines 78–85 of current `git-graph.tsx` (`isFirstRunRef` + `useEffect`).
  - Add at top of component:
    ```tsx
    const isControlledRef = useRef<boolean>(props.selectedSha !== undefined);
    if (process.env.NODE_ENV !== "production") {
      const currentlyControlled = props.selectedSha !== undefined;
      if (currentlyControlled !== isControlledRef.current) {
        // eslint-disable-next-line no-console
        console.warn(
          "GitGraph: switching between controlled and uncontrolled `selectedSha` is not supported. " +
          "Component will continue using the mode it was first rendered with."
        );
      }
    }
    const isControlled = isControlledRef.current;
    ```
  - `setSelected` only writes to `internalSelected` when `!isControlled` (mirrors React's canonical `<input>` pattern). Update accordingly:
    ```tsx
    function setSelected(next: string | undefined) {
      if (!isControlled) setInternalSelected(next);
      props.onSelectChange?.(next);
    }
    ```
  - This restores the *original* Phase 4 pre-fix behavior, plus the dev-warn. Confirm against the Phase 4 code review §#3 detail to ensure understanding.
- **GOTCHA**: `process.env.NODE_ENV` is replaced at build time by both Next and Vitest; the warn block is dead code in production builds. Confirmed.
- **GOTCHA 2**: The `isControlledRef.current` value snapshots the *first* render's mode. If a consumer renders uncontrolled then later passes `selectedSha`, we ignore the switch and keep using `internalSelected` — the dev-warn surfaces this.
- **GOTCHA 3 — existing harness page mode-switches and will trigger the dev-warn on every test.** `examples/consumer-app/app/graph/interactions/page.tsx` (lines 8 + 42) initializes `useState<string | undefined>(undefined)` and uses the `{...(selected !== undefined ? { selectedSha: selected } : {})}` spread guard — so the first render is uncontrolled, and the first click of `select-f1` flips it to controlled. With the dev-warn snapshot this fires `console.warn` and the component then ignores the controlled prop entirely (snapshot says uncontrolled forever). The existing `graph-interactions.spec.ts` and `graph-keyboard.spec.ts` tests would all start producing console-warn noise; the `controlled selection: select-f1 button moves data-selected` test would *fail visually* because the component never enters controlled mode and `data-selected="true"` never appears on f1.
- **REQUIRED HARNESS UPDATE** alongside the component change: in `examples/consumer-app/app/graph/interactions/page.tsx`, change the state type to `useState<string>("")` and the JSX to:
  ```tsx
  selectedSha={selected}
  onSelectChange={(s) => setSelected(s ?? "")}
  ```
  Empty string is "no selection" (falsy in `selectedSha ? rows.find(...) : undefined`) and is **not** `=== undefined`, so the prop is always passed and the component snapshots as controlled-forever. Test outcomes are identical to Phase 4 (data-selected toggles on/off, escape clears, arrow keys navigate); no spec change required.
- **VALIDATE**: Run the full `graph-interactions.spec.ts` and `graph-keyboard.spec.ts` suites; expect zero `console.warn` events. Add a console listener to one new test in `graph-interactions.spec.ts`:
  ```ts
  test("controlled-mode harness produces no console warnings", async ({ page }) => {
    const warns: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "warning") warns.push(msg.text()); });
    await page.goto("/graph/interactions");
    await page.getByTestId("select-f1").click();
    await page.getByTestId("clear-selection").click();
    await page.waitForTimeout(50);
    expect(warns.filter((w) => w.includes("GitGraph:"))).toHaveLength(0);
  });
  ```
  For *positive* dev-warn coverage, add a separate page `examples/consumer-app/app/graph/interactions-modeswitch/page.tsx` whose initial state is `useState<string | undefined>(undefined)` (identical to Phase 4's harness), and a spec that asserts `console.warn` fires exactly once when select-f1 is clicked. This keeps the warn-firing path tested without polluting the main harness.

---

### Phase E — Error states

#### UPDATE `registry/git-graph/git-graph.tsx` — error boundary in render

- **IMPLEMENT**:
  - Wrap the layout call (`useMemo(() => computeLayout(...), [...])`) and the validate call (if any — see below) in a try/catch *outside* the memo (memos can't catch their own errors cleanly). Pattern:
    ```tsx
    const [layoutOrError, layoutErrorKind] = useMemo(() => {
      try {
        return [computeLayout(workingCommits), null] as const;
      } catch (e) {
        if (e instanceof GitGraphInputError) return [null, e.kind] as const;
        throw e; // unknown errors bubble up
      }
    }, [commits, showWorkingTreeRow, head]);
    ```
  - Right after the memo, branch:
    ```tsx
    if (layoutOrError === null) {
      if (process.env.NODE_ENV !== "production") {
        // dev: don't render the shell — let the error bubble so React's overlay surfaces it
        throw new GitGraphInputError(layoutErrorKind!, "GitGraph: input rejected (see prior error)");
      }
      return (
        <div data-testid="git-graph-error" data-error-kind={layoutErrorKind} className={rootClassName}>
          GitGraph: invalid commit graph ({layoutErrorKind})
        </div>
      );
    }
    const layout = layoutOrError;
    ```
  - **Note**: production-mode catches *only* `GitGraphInputError`. Other errors (programming bugs in our own code) re-throw — those should reach React's error boundary, not be swallowed.
- **GOTCHA**: Throwing inside a render in dev surfaces the *original* error context properly only if the throw happens during render. The pattern above re-throws *after* `useMemo` returns, which is during the same render pass — fine.
- **GOTCHA 2**: `layoutErrorKind` is non-null in the `layoutOrError === null` branch, but TS doesn't narrow `useMemo` tuple inferences perfectly. Add a `!` or refactor to a tagged union.
- **VALIDATE**: Phase E E2E spec below.

#### CREATE `examples/consumer-app/app/graph/errors/page.tsx`

- **IMPLEMENT**:
  - `"use client"`. Reads `?case=` query param. Three cases:
    - `case=duplicate`: pass `[{sha:"a",parents:[],…}, {sha:"a",parents:[],…}]`.
    - `case=cycle`: pass `[{sha:"a",parents:["b"],…}, {sha:"b",parents:["a"],…}]`.
    - `case=missing-parent`: pass valid `commits` then call `validate(commits, { allowMissingParents: false })` outside `<GitGraph>` and render the caught error in a `<div data-testid="validate-error" data-error-kind={e.kind}>` block. The `<GitGraph>` itself receives valid input here — this case tests the opt-in `validate` helper, not the component-level boundary.
  - Each case wrapped in its own `<section data-testid="case-<name>">`.
- **VALIDATE**: Manual visit `/graph/errors?case=duplicate` — production build (`pnpm --filter consumer-app build && pnpm --filter consumer-app start`) shows the error shell. Dev build (`pnpm --filter consumer-app dev`) shows React's error overlay (Next 15 default).

#### CREATE `tests/e2e/graph-errors.spec.ts`

- **IMPLEMENT**:
  - 3-browser suite. **Important**: Playwright runs against `pnpm --filter consumer-app dev` per `playwright.config.ts:webServer`. To test production behavior, the spec needs to either (a) start a separate production server, or (b) accept that errors bubble in dev and assert that. Choose (a) for fidelity.
  - Add `webServer` array entry with `command: "pnpm --filter consumer-app build && pnpm --filter consumer-app start -p 3101", port: 3101, reuseExistingServer: !process.env.CI`. Add a second `BASE_URL_PROD = "http://localhost:3101"` constant in this spec only.
  - Test 1: `case=duplicate` against prod URL — expect `[data-testid="git-graph-error"][data-error-kind="duplicate-sha"]`.
  - Test 2: `case=cycle` against prod URL — expect `[data-testid="git-graph-error"][data-error-kind="cycle"]`.
  - Test 3: `case=missing-parent` against dev URL (validate is called explicitly, not through layout) — expect `[data-testid="validate-error"][data-error-kind="missing-parent"]`.
- **GOTCHA**: Playwright `webServer` array support is in v1.49 — confirmed via [Playwright config docs](https://playwright.dev/docs/test-configuration#webserver). Don't add the entry if it would race with the existing dev server; reuse port 3101 distinct from the dev port 3100.
- **VALIDATE**: `pnpm test:e2e graph-errors` passes on all three browsers.

---

### Phase F — Registry finalize + install-flow CI

#### CREATE `registry/git-graph/registry.json`

- **IMPLEMENT**:
  ```json
  {
    "$schema": "https://ui.shadcn.com/schema/registry-item.json",
    "name": "git-graph",
    "type": "registry:component",
    "dependencies": ["@tanstack/react-virtual"],
    "registryDependencies": [],
    "files": [
      { "path": "git-graph.tsx",        "target": "components/git-graph/git-graph.tsx",        "type": "registry:component" },
      { "path": "git-graph-gutter.tsx", "target": "components/git-graph/git-graph-gutter.tsx", "type": "registry:component" },
      { "path": "git-graph.css",        "target": "components/git-graph/git-graph.css",        "type": "registry:style"     },
      { "path": "types.ts",             "target": "components/git-graph/types.ts",             "type": "registry:lib"       },
      { "path": "lib/layout.ts",        "target": "components/git-graph/lib/layout.ts",        "type": "registry:lib"       },
      { "path": "lib/bezier.ts",        "target": "components/git-graph/lib/bezier.ts",        "type": "registry:lib"       },
      { "path": "lib/format.ts",        "target": "components/git-graph/lib/format.ts",        "type": "registry:lib"       },
      { "path": "lib/working-tree.ts",  "target": "components/git-graph/lib/working-tree.ts",  "type": "registry:lib"       },
      { "path": "lib/from-git-log.ts",  "target": "components/git-graph/lib/from-git-log.ts",  "type": "registry:lib"       },
      { "path": "lib/validate.ts",      "target": "components/git-graph/lib/validate.ts",      "type": "registry:lib"       },
      { "path": "lib/errors.ts",        "target": "components/git-graph/lib/errors.ts",        "type": "registry:lib"       }
    ]
  }
  ```
- **GOTCHA**: `path` is the source-file identifier (used by the route handler to find the file inside `registry/git-graph/` to inline as `content`). `target` is the literal destination in the consumer project — required for the nested layout. Smoke-tested 2026-05-01: omitting `target` collapses `components/git-graph/foo.tsx` writes to `components/foo.tsx`. Do not omit `target`.
- **VALIDATE**: `node -e "JSON.parse(require('fs').readFileSync('registry/git-graph/registry.json'))"` does not throw.

#### UPDATE `apps/docs/app/r/[name]/route.ts` — assemble real manifest

- **IMPLEMENT**:
  ```ts
  import { NextResponse } from "next/server";
  import { readFileSync } from "node:fs";
  import { join } from "node:path";

  export const dynamic = "force-static";
  export function generateStaticParams() { return [{ name: "git-graph.json" }]; }

  type ManifestSourceFile = { path: string; target: string; type: string };
  type Manifest = {
    $schema: string; name: string; type: string;
    dependencies: string[]; registryDependencies: string[];
    files: ManifestSourceFile[];
  };

  // Resolved at build time. apps/docs runs from its own dir, so registry/ is two levels up.
  const REGISTRY_ROOT = join(process.cwd(), "..", "..", "registry", "git-graph");

  export async function GET(_: Request, ctx: { params: Promise<{ name: string }> }) {
    const { name } = await ctx.params;
    if (name !== "git-graph.json") return NextResponse.json({ error: "not found" }, { status: 404 });
    const manifestRaw = readFileSync(join(REGISTRY_ROOT, "registry.json"), "utf8");
    const manifest = JSON.parse(manifestRaw) as Manifest;
    const filesWithContent = manifest.files.map((f) => ({
      path: f.path,
      target: f.target,
      type: f.type,
      content: readFileSync(join(REGISTRY_ROOT, f.path), "utf8"),
    }));
    return NextResponse.json({
      $schema: manifest.$schema,
      name: manifest.name,
      type: manifest.type,
      dependencies: manifest.dependencies,
      registryDependencies: manifest.registryDependencies,
      files: filesWithContent,
    });
  }
  ```
- **GOTCHA**: `process.cwd()` during `next build` for `output: "export"` is the docs app directory (`apps/docs`). The relative path `../../registry/git-graph` resolves correctly. Verified: Next runs each app's build inside its own dir.
- **GOTCHA 2 — RESOLVED:** The route-handler emit was verified during plan write (2026-05-01) to produce `apps/docs/out/r/git-graph.json` as a fetchable file. No public-static fallback needed.
- **VALIDATE**: Local: `pnpm --filter docs build && pnpm --filter docs --silent exec npx serve out -l 3000 &` then `curl http://localhost:3000/r/git-graph.json` returns the assembled manifest with file contents. Kill the server.

#### VERIFY route-handler static-export emits the file correctly

- **IMPLEMENT**: Sanity check after the route-handler update — same invocation we used during plan write:
  1. `pnpm --filter docs build`
  2. `test -f apps/docs/out/r/git-graph.json` (file exists)
  3. `node -e "console.log(JSON.parse(require('fs').readFileSync('apps/docs/out/r/git-graph.json')).files.length)"` → outputs 11 (eleven registry source files inlined).
  4. `npx -y serve@14.2.6 apps/docs/out -l 3000 &` (background)
  5. `curl -fsSL http://localhost:3000/r/git-graph.json | jq '.files[0].path'` outputs `"components/git-graph/git-graph.tsx"`.
  6. `kill %1` (or equivalent — close the serve background).
- **PATTERN**: Already verified during plan write; this is a regression check after the manifest assembly is wired up.
- **VALIDATE**: All steps exit 0 and step 5 outputs the expected path.

#### UPDATE `scripts/sync-registry.mjs` — honor `SKIP_REGISTRY_SYNC`

- **IMPLEMENT**: At the top of the script, after imports:
  ```js
  if (process.env.SKIP_REGISTRY_SYNC === "1") {
    console.log("[sync-registry] SKIP_REGISTRY_SYNC=1, skipping.");
    process.exit(0);
  }
  ```
- **VALIDATE**: `SKIP_REGISTRY_SYNC=1 node scripts/sync-registry.mjs` exits 0 without writing anything; without the env var, normal behavior.

#### UPDATE `.github/workflows/ci.yml` — add `install-flow` job

- **Host**: linux (CI runner; ubuntu-latest).
- **IMPLEMENT**: Append to `jobs:`:
  ```yaml
  install-flow:
    runs-on: ubuntu-latest
    needs: [unit, typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10.33.0 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - name: Build docs
        run: pnpm build:docs
      - name: Serve docs build
        run: npx -y serve@14.2.4 apps/docs/out -l 3000 &
      - name: Wait for registry endpoint
        run: |
          for i in {1..30}; do
            if curl -fsS http://localhost:3000/r/git-graph.json > /dev/null; then exit 0; fi
            sleep 1
          done
          echo "Registry endpoint did not come up"; exit 1
      - name: Wipe installed component dir
        run: rm -rf examples/consumer-app/components/git-graph
      - name: Skip sync hooks for the install run
        run: echo "SKIP_REGISTRY_SYNC=1" >> $GITHUB_ENV
      - name: Run shadcn install
        working-directory: examples/consumer-app
        run: npx -y shadcn@latest add --yes http://localhost:3000/r/git-graph.json
      - name: Verify install wrote expected files
        run: |
          test -f examples/consumer-app/components/git-graph/git-graph.tsx
          test -f examples/consumer-app/components/git-graph/lib/layout.ts
          grep -q "export default function GitGraph" examples/consumer-app/components/git-graph/git-graph.tsx
      - name: Run E2E against freshly installed component
        run: pnpm test:e2e --project=chromium
        env:
          SKIP_REGISTRY_SYNC: "1"
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: install-flow-report
          path: |
            playwright-report/
            examples/consumer-app/components/git-graph/
          retention-days: 7
  ```
- **GOTCHA**: The job depends on `unit` and `typecheck` so the slow install-flow doesn't run on a PR that won't even compile. The existing `e2e` job runs in parallel — that's intentional (different scenario).
- **GOTCHA 2**: `pnpm test:e2e --project=chromium` reuses the existing `webServer` config which boots `consumer-app dev` on 3100. The dev server runs **without** the synced dir (we just wiped+reinstalled), but since `SKIP_REGISTRY_SYNC=1`, its `predev` hook won't overwrite the shadcn-installed files. The dev server picks them up directly.
- **GOTCHA 3**: Single-browser (chromium) install-flow run is sufficient — the install behavior doesn't depend on the test browser. Saves CI minutes vs. running the full 3-browser matrix twice. (The existing `e2e` job runs all 3 against the synced dir.)
- **VALIDATE**: Push a commit on the feature branch; CI runs; `install-flow` job goes green. (Cannot fully validate locally without `act` — verifying the job definition syntactically via `gh workflow view` is acceptable as a pre-CI sanity check.)

#### CREATE `tests/e2e/install-flow.spec.ts`

- **IMPLEMENT**:
  - Single-browser (chromium-only) suite via `test.skip(({ browserName }) => browserName !== "chromium")`.
  - Test 1: navigate `/graph` (consumer-app); expect a non-empty list of `[data-testid="git-graph-row"]`.
  - Test 2: navigate `/gutter`; expect a non-empty `[data-testid="git-graph-gutter"]`.
  - Test 3: navigate `/graph/large`; expect rendered rows + scroll container.
  - Test 4: collect `page.on("pageerror")` events for the duration of the test; assert empty.
- **PATTERN**: `tests/e2e/smoke.spec.ts`.
- **GOTCHA**: This spec runs as part of the regular E2E suite (it's just another `*.spec.ts`); the install-flow CI job runs it after the wipe+reinstall. The non-install-flow CI run runs it too — should pass either way because the synced dir is identical to what shadcn would install.
- **VALIDATE**: `pnpm test:e2e install-flow --project=chromium` passes against the synced dir locally.

---

### Phase G — Docs site + README

#### CREATE `apps/docs/components/docs-shell.tsx`

- **IMPLEMENT**: Sidebar nav + main content slot. Sidebar lists: Installation, Quickstart, Data shape, Recipes (collapsible), Theming, Primitive, API, Performance, Troubleshooting, Playground. Use `lucide-react` icons (`BookOpen`, `Zap`, etc. — pick reasonable ones). Default-export the component. Plain client component using `usePathname` for active-link styling.
- **PATTERN**: shadcn docs site sidebar pattern; pure CSS / Tailwind.
- **VALIDATE**: `pnpm typecheck`. Manually visit any docs page and confirm the sidebar renders with the active link styled.

#### CREATE `apps/docs/components/code-block.tsx`

- **IMPLEMENT**:
  - `"use client"`. Props: `{ code: string; language?: string }`.
  - Renders `<pre><code className={"language-" + lang}>{code}</code></pre>` with a `<button>` that uses `navigator.clipboard.writeText(code)` and `lucide-react`'s `<Copy>` icon (toggle to `<Check>` for 2s after click).
  - **No syntax highlighting library** for MVP (Shiki adds 200kb to the bundle). Plain monospace block.
- **VALIDATE**: Render in any docs page; copy-button works.

#### CREATE `apps/docs/components/props-table.tsx`

- **IMPLEMENT**: Pure presentation. Props: `{ rows: { name: string; type: string; default?: string; description: string }[] }`. Renders a `<table>` with monospace `name` and `type` columns.
- **VALIDATE**: Renders on the API page.

#### CREATE `apps/docs/components/live-demo.tsx`

- **IMPLEMENT**: `"use client"`. Imports `<GitGraph>` from a relative path into the synced or a docs-local copy of the component. **Decision**: the docs site shouldn't depend on `examples/consumer-app/components`. Either (a) sync registry → `apps/docs/components/git-graph/` too, or (b) import directly from `registry/git-graph/`. **Choose (b)** — `apps/docs/tsconfig.json` is updated to include `../../registry` so the docs site can import the source directly. This is OK because docs is the *publisher* — it's reasonable for docs to render from source. Add the include path; verify Next 15 transpiles paths outside `app/` via `transpilePackages` if needed.
- **GOTCHA**: Importing source TS from outside the Next app root requires either `transpilePackages` config or an alias. Phase 3 handled this for `examples/consumer-app` via the sync script. For docs, *adding* `transpilePackages: ["@registry/git-graph"]` would only work if registry were a workspace package — it isn't. **Fallback**: same sync approach as consumer-app — sync into `apps/docs/components/git-graph/` and gitignore. Keeps the model consistent.
- **REVISED IMPLEMENTATION**:
  - Update `scripts/sync-registry.mjs` to copy registry into `apps/docs/components/git-graph/` (in addition to consumer-app).
  - Add `apps/docs/components/git-graph/` to `.gitignore`.
  - Add `predev`/`prebuild`/`pretypecheck`/`prelint` hooks to `apps/docs/package.json` running the sync script.
  - `live-demo.tsx` imports `GitGraph` from `../components/git-graph/git-graph`.
- **VALIDATE**: `pnpm sync && pnpm --filter docs dev`; manually open `/quickstart`; confirm `<GitGraph>` renders.

#### CREATE docs pages (10 new pages)

For each page below, the implementation pattern is identical: `import DocsShell from "../../components/docs-shell"; export default function Page() { return <DocsShell><h1>…</h1>…</DocsShell>; }`. List of page-specific content:

- `installation/page.tsx`: prose + `<CodeBlock code="npx shadcn@latest add https://seanrobertwright.github.io/GitGraph/r/git-graph.json" />` + a table of files copied. Note: assumes consumer's `components.json` has the standard shadcn aliases.
- `quickstart/page.tsx`: a 5-commit hard-coded `Commit[]`, `<LiveDemo commits={…} />`. Code shown in a `<CodeBlock>`. Mentions both the `commits` prop and basic `onCommitClick`.
- `data-shape/page.tsx`: annotated `Commit` and `Ref` types. Each field gets a brief explanation. One real-world example block.
- `recipes/page.tsx`: index linking to the five recipe sub-pages.
- `recipes/git-log/page.tsx`: shows `GIT_LOG_FORMAT` constant, a shell command, then `fromGitLog(text)` usage. `<LiveDemo>` rendering the parsed result.
- `recipes/github-api/page.tsx`: snippet mapping GitHub REST `repos/{owner}/{repo}/commits` response to `Commit[]`. No live demo (auth needed).
- `recipes/isomorphic-git/page.tsx`: snippet using `git.log({ fs, dir })` from isomorphic-git, mapping to `Commit[]`.
- `recipes/working-tree/page.tsx`: `showWorkingTreeRow` example, screenshot-or-live-demo.
- `recipes/custom-columns/page.tsx`: states the limitation (no compound API in MVP); shows the workaround pattern (sibling table, shared row height).
- `theming/page.tsx`: full CSS variable list (`--graph-branch-1..8`, `--graph-node-radius`, `--graph-row-selected-bg`, etc.), one before/after recolor example using a `useState` + `style` hack. Dark-mode notes.
- `primitive/page.tsx`: `<GitGraphGutter>` standalone usage with consumer-supplied row content.
- `api/page.tsx`: two `<PropsTable>` instances — one for `<GitGraph>`, one for `<GitGraphGutter>`. Hand-written rows for every prop.
- `performance/page.tsx`: virtualization explainer; `rowHeight` tuning; the spike's measured worst-case frame time and what scenarios degrade.
- `troubleshooting/page.tsx`: four sections — missing `parents[]`, unsorted commits (note: we topo-sort, so this is a no-op for consumers), HEAD sha mismatch, Tailwind v4 token not picked up.

- **VALIDATE for each**: `pnpm --filter docs build` succeeds; manually browse each page in `pnpm --filter docs dev`.

#### CREATE `apps/docs/app/playground/page.tsx`

- **IMPLEMENT**:
  - `"use client"`.
  - State: `const [json, setJson] = useState<string>(EXAMPLE_JSON);` where `EXAMPLE_JSON` is a 5-commit fixture stringified.
  - `useMemo(() => { try { return [JSON.parse(json) as Commit[], null]; } catch (e) { return [null, (e as Error).message]; } }, [json]);`
  - Render: split layout, `<textarea>` on left bound to `json`, `<GitGraph>` or error message on right.
  - On JSON parse success: also call `validate(parsed, { allowMissingParents: true })` and surface any error from that.
- **VALIDATE**: Edit the JSON in the browser; graph re-renders or error message updates.

#### UPDATE `apps/docs/app/page.tsx` and `apps/docs/app/layout.tsx` — landing + global shell

- **IMPLEMENT**:
  - `layout.tsx`: minimal HTML shell, import `globals.css`. No app-wide nav (each docs page wraps itself in `<DocsShell>`); the landing page is its own simple hero.
  - `page.tsx`: a hero block with project name, one-paragraph tagline, the install command in a `<CodeBlock>`, an inline `<LiveDemo>` showing a 5-commit example, plus link buttons to `/docs/installation`, `/docs/quickstart`, `/playground`.
- **VALIDATE**: `pnpm --filter docs dev` then visit `/`.

#### UPDATE `README.md` — full rewrite

- **IMPLEMENT**:
  - 60-second quickstart at the top.
  - Install command with the deployed registry URL.
  - Minimal example (5-commit fixture).
  - Three feature highlights (virtualization, theming, deterministic layout).
  - Link to docs site (`https://seanrobertwright.github.io/GitGraph/docs/installation`).
  - **Static screenshot**: capture `/graph` on dark mode, save to `docs/screenshot.png`, embed via `![](docs/screenshot.png)`. (Skip animated GIF — out of scope, MVP-acceptable.)
  - Contributing section: pointer to `CLAUDE.md` and `.agents/plans/`.
- **VALIDATE**: Render via `gh markdown` or visual inspection.

---

### Phase H — Validation, PR, post-merge

#### VALIDATE — full local validation

- **Host**: Windows (PowerShell) or Linux/macOS.
- **IMPLEMENT** (run in order):
  - `pnpm install --frozen-lockfile` — clean install confirms lockfile is consistent.
  - `pnpm sync` — registry → both consumer apps.
  - `pnpm lint` — all workspaces.
  - `pnpm typecheck` — two-pass (per-workspace + root tsc).
  - `pnpm test` — Vitest, including new `errors`, `validate`, `from-git-log` tests.
  - `pnpm test:e2e` — full Playwright suite, all 3 browsers.
  - `pnpm build:docs` — verify production build succeeds.
- **VALIDATE**: Every command exits 0.

#### CONFIRM — pre-PR scope check (mandatory; per CLAUDE.md and `.claude/commands/core_piv_loop/execute.md`)

- **Host**: any.
- **IMPLEMENT**:
  1. `git status` — confirm no untracked files outside `.agents/`. Anything else: `.gitignore` proactively or revert.
  2. `git diff --name-only main...HEAD` — confirm every changed path is listed in §"Primary Systems Affected" or is an explicitly planned new file. Anything else: investigate before continuing.
  3. Verify `.agents/plans/phase-5-virtualization-install-docs.md`, any `.agents/code-reviews/`, `.agents/execution-reports/`, `.agents/system-reviews/` files are **NOT** staged on this branch (per CLAUDE.md "Artifact-commit cadence" — those land on `main` post-merge in a focused commit).
  4. If `apps/docs/components/git-graph/` got accidentally tracked despite `.gitignore`, `git rm -rf --cached` it.
- **GOTCHA**: This is a checklist task, not optional. Phase 4's PR swept in unrelated tooling dirs and the plan file itself; Phase 5 must catch this at the gate.
- **VALIDATE**: User confirms output. Only then proceed to push.

#### CONFIRM — push branch

- **IMPLEMENT**: User-gated. `git push -u origin phase-5-virtualization-install-docs`.
- **VALIDATE**: GitHub shows the branch.

#### CONFIRM — open PR

- **IMPLEMENT**: User-gated.
  - `gh pr create --title "Phase 5: virtualization, animation, errors, fromGitLog, real install flow, docs site" --body @<(cat <<'EOF'
    ## Summary
    Phase 5 ships MVP-complete GitGraph. Virtualization via @tanstack/react-virtual (windowed and window-scroll), CSS append-enter animation honoring prefers-reduced-motion, typed GitGraphInputError, fromGitLog parser, real shadcn registry endpoint with content-inlined manifest, install-flow CI job that wipes + reinstalls + e2e-tests against a fresh shadcn install, and a docs site (10 pages + playground) with hand-written API reference and live demos.

    Plan: `.agents/plans/phase-5-virtualization-install-docs.md`.

    ## Test plan
    - [x] Lint, typecheck, unit, e2e all green locally
    - [x] install-flow CI job green on first push
    - [x] Phase 4 e2e suite still green (carry-forward fixes don't regress)
    - [x] Phase 3 gutter screenshots unchanged (no-`range` path byte-identical)
    EOF
    )`
- **VALIDATE**: User confirms PR URL, CI runs.

#### CONFIRM — merge PR (after CI green and review)

- **IMPLEMENT**: User-gated. `gh pr merge --squash --delete-branch <PR#>`.
- **VALIDATE**: PR shows merged; branch deleted; `main` includes the squash.

#### CONFIRM — post-merge artifact commit on `main`

- **IMPLEMENT**: User-gated.
  - `git checkout main && git pull --ff-only`
  - Stage: `.agents/plans/phase-5-virtualization-install-docs.md` plus any code-review / execution-report / system-review artifacts that exist by this point.
  - `git commit -m "Phase 5 plan + artifacts"` (or similar; match the cadence comment in CLAUDE.md).
  - `git push origin main`.
- **VALIDATE**: `git log --oneline -3` on `main` shows the artifact commit on top of the squashed implementation commit.

---

## TESTING STRATEGY

### Unit Tests (Vitest)

- **Scope**: pure modules only — `errors`, `validate`, `from-git-log`. No JSX.
- **Coverage**: every error kind triggers; happy paths; one round-trip test for `fromGitLog` against a small inline fixture matching the canonical format.
- **No new test framework**. Continues to use Vitest 2.1.9 + plain `expect`.

### E2E Tests (Playwright, 3-browser)

- `graph-virtualization.spec.ts` — render-count, scroll-to-bottom, perf threshold, gutter window height.
- `graph-animation.spec.ts` — append fires, attribute correctness, reduced-motion, animationend timing.
- `graph-errors.spec.ts` — production-build error shell for duplicate-sha and cycle; opt-in `validate` for missing-parent.
- `install-flow.spec.ts` — chromium-only smoke that the consumer-app boots and the synced/installed component renders without console errors.

### Edge Cases

- Empty `commits[]` with `showWorkingTreeRow=true` — single working-tree row, no other rows. (Already handled in Phase 4 — confirm not regressed.)
- `commits.length === 1` — virtualizer renders one row, gutter has one node.
- `commits.length === 10000` — virtualization E2E covers.
- Hover-leave at the *very edge* of the component bounds — ensure `onCommitHover(null)` fires.
- Append a commit whose sha matches an existing commit — `prevShas` already has it; not marked as new. Test in animation spec.
- Reduced-motion respected even after toggling appends multiple times — animation should never play.
- Bad JSON in playground — error message rendered; no infinite loop.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
pnpm lint
```

### Level 2: Unit Tests

```bash
pnpm test
```

### Level 3: Integration / E2E

```bash
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

### Level 4: Build Verification

```bash
pnpm typecheck
pnpm build:docs
```

### Level 5: Manual Validation

- `pnpm --filter consumer-app dev` — visit `/graph`, `/graph/large`, `/graph/animation`, `/graph/errors?case=duplicate`, `/graph/errors?case=cycle`, `/graph/errors?case=missing-parent`. Confirm rendering matches expectations.
- `pnpm --filter docs dev` — visit `/`, `/docs/installation`, `/docs/quickstart`, `/playground`. Confirm rendering and live demos work.
- Local install-flow rehearsal:
  ```
  pnpm build:docs
  npx -y serve@14.2.4 apps/docs/out -l 3000 &
  rm -rf examples/consumer-app/components/git-graph
  SKIP_REGISTRY_SYNC=1 npx -y shadcn@latest add --yes http://localhost:3000/r/git-graph.json --cwd examples/consumer-app
  pnpm test:e2e --project=chromium
  ```
  Final pnpm test:e2e should pass against the freshly installed dir.

---

## ACCEPTANCE CRITERIA

- [ ] `<GitGraph>` virtualizes via `useVirtualizer` (when `scrollContainerRef` provided) and `useWindowVirtualizer` (default).
- [ ] 10k-commit fixture renders with ≤ 40 row DOM nodes mounted at any time.
- [ ] Scroll-to-bottom completes; max rAF frame delta < spike-recorded threshold on all 3 browsers.
- [ ] Append-enter animation fires only for newly-added shas; respects `prefers-reduced-motion`; 150ms duration confirmed.
- [ ] `GitGraphInputError` exported from `registry/git-graph/types.ts`; `computeLayout` throws typed instances.
- [ ] `validate()` throws on missing parent (default) and unknown head; opt-out via `allowMissingParents`.
- [ ] Component renders error shell in production build; rethrows in development.
- [ ] `fromGitLog()` parses canonical 6-field tab-delimited format.
- [ ] Carry-forward #2 (hover-null transient) fixed and tested.
- [ ] Carry-forward #3 (controlled→uncontrolled dev-warn) implemented; `useEffect` mirror removed.
- [ ] `apps/docs/app/r/git-graph.json/...` (or `apps/docs/public/r/git-graph.json` per quirk verification) returns a valid shadcn registry-item manifest with inlined file contents.
- [ ] CI `install-flow` job green: builds docs, serves locally, wipes consumer-app component dir, runs `npx shadcn@latest add`, runs E2E.
- [ ] Docs site has 10 doc pages + playground + landing rewrite. All build cleanly.
- [ ] README rewritten with 60-second quickstart and screenshot.
- [ ] Phase 4 E2E suite still green; Phase 3 screenshot baselines unchanged.
- [ ] No regressions in lint/typecheck/unit/e2e.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands at all 4 levels pass
- [ ] Spike measurement recorded in plan body before deletion
- [ ] Pre-PR scope check executed (untracked files audited, plan file *not* on feature branch)
- [ ] PR opened, CI green (including new install-flow job), reviewed
- [ ] PR squash-merged
- [ ] Post-merge artifact commit on `main` includes plan, code-review, execution-report, system-review

---

## NOTES

- **Single-phase scoping decision recorded.** User explicitly requested a mega-phase rather than 5a/5b/5c split. This plan honors that. If execution stalls, the natural cut points are between Phases B/C/D/E (engine work), Phase F (registry + CI), and Phase G (docs) — these can be split into separate PRs without rework.
- **`@tanstack/react-virtual` is used inside the registry source.** This means consumers get the dep as a peer requirement after `npx shadcn@latest add`. The manifest's `dependencies: ["@tanstack/react-virtual", "lucide-react", "clsx"]` ensures the shadcn CLI prompts the consumer to install them. If the consumer already has them, no-op; otherwise the CLI auto-installs.
- **Compound API (`<GitGraph.Row>` etc.) killed from MVP.** Decision recorded in PRD §6 alignment discussion. Future phases can add via additive subcomponent exports without API thrash.
- **Real-repo fixture (react) is committed binary-ish (~3MB JSON).** This is a one-time growth in repo size; subsequent commits don't touch it. The deterministic capture script enables regeneration if needed (e.g., bumping fixture HEAD to refresh authorship distribution).
- **Performance numbers in `apps/docs/app/docs/performance/page.tsx`** must reflect the spike's recorded threshold. The page text is hand-written; update it with the actual numbers from the spike step.
- **Docs site is intentionally minimal.** No syntax-highlighting library (200kb gzipped is too much for an MVP doc page). No MDX (plain TSX is fine). No auto-generated API reference (hand-written is acceptable for ~15 props total). Future enhancements live in a "docs polish" follow-up phase, not here.
- **Install-flow CI job is the deliverable that closes the MVP.** Until it runs green, the registry endpoint is theoretical. After this phase, the deployed `https://seanrobertwright.github.io/GitGraph/r/git-graph.json` URL becomes the canonical install target — and we have CI proof that the install flow works.

---

## APPENDIX: Pre-written code snippets

These have been pre-written and verified during plan write (versus left as "the executor figures it out"). Copy into the corresponding doc-site page and adjust prose around them.

### `apps/docs/app/docs/recipes/github-api/page.tsx`

GitHub REST API `/repos/{owner}/{repo}/commits` returns objects shaped `{ sha, commit: { author: { name, email, date }, message }, parents: [{ sha }] }`. The mapping:

```ts
import type { Commit } from "@/components/git-graph/types";

type GitHubCommit = {
  sha: string;
  commit: {
    author: { name: string; email: string; date: string };
    message: string;
  };
  parents: { sha: string }[];
};

export function fromGitHubApi(items: GitHubCommit[]): Commit[] {
  return items.map((c) => ({
    sha: c.sha,
    parents: c.parents.map((p) => p.sha),
    author: { name: c.commit.author.name, email: c.commit.author.email },
    // Use the first line of the commit message as the visible "message".
    // GitHub returns the full body separated by \n\n; the table only renders one line.
    message: c.commit.message.split("\n")[0] ?? "",
    timestamp: c.commit.author.date, // ISO-8601; GitGraph parses via Date.parse
  }));
}

// Usage:
async function loadCommits() {
  const res = await fetch(
    "https://api.github.com/repos/facebook/react/commits?per_page=100",
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
  return fromGitHubApi(await res.json());
}
```

**Caveats to note in the prose**:
- GitHub's commit-list endpoint does not return refs (branches/tags) — `commit.refs` will always be undefined. Refs come from a separate `/repos/.../branches` and `/repos/.../tags` call; recipe page should mention this and link to the refs-fetch follow-up.
- Pagination: the API returns up to 100 commits per page; for full history, follow `Link: rel="next"` headers.
- Unauthenticated requests are rate-limited to 60/hour. For real apps, recommend a personal access token in `Authorization: Bearer <token>` header.

### `apps/docs/app/docs/recipes/isomorphic-git/page.tsx`

`isomorphic-git`'s `git.log({ fs, dir })` returns `ReadCommitResult[]`:

```ts
import git from "isomorphic-git";
import type { Commit } from "@/components/git-graph/types";

type ReadCommitResult = {
  oid: string;
  commit: {
    parent: string[];
    author: { name: string; email: string; timestamp: number; timezoneOffset: number };
    message: string;
  };
};

export async function fromIsomorphicGit(opts: { fs: unknown; dir: string }): Promise<Commit[]> {
  const log = (await git.log({ fs: opts.fs as never, dir: opts.dir })) as ReadCommitResult[];
  return log.map((c) => ({
    sha: c.oid,
    parents: c.commit.parent,
    author: { name: c.commit.author.name, email: c.commit.author.email },
    message: c.commit.message.split("\n")[0] ?? "",
    // isomorphic-git emits author timestamp in unix-seconds; GitGraph wants unix-ms.
    timestamp: c.commit.author.timestamp * 1000,
  }));
}

// Usage (Node):
// import { promises as fs } from "node:fs";
// const commits = await fromIsomorphicGit({ fs, dir: "/path/to/repo" });

// Usage (browser, with LightningFS):
// import LightningFS from "@isomorphic-git/lightning-fs";
// const fs = new LightningFS("repo");
// // ...clone first, then:
// const commits = await fromIsomorphicGit({ fs, dir: "/" });
```

**Caveats to note in the prose**:
- isomorphic-git's `fs` parameter is loosely typed; the `as never` cast is intentional to avoid recipe-page type pollution.
- For browser usage, the consumer needs `@isomorphic-git/lightning-fs` (or another browser-fs adapter) and must `git.clone(...)` before calling `git.log`. Don't include the clone in the recipe — it's app-specific.
- Same refs caveat as the GitHub-API recipe: `git.log` doesn't include branch/tag refs. Use `git.listBranches({ fs, dir })` + `git.listTags({ fs, dir })` separately if needed.

### Console-listener pattern for dev-warn E2E (already in §carry-forward #3 task)

Inlined verbatim in §"REPLACE useEffect mirror with isControlled snapshot + dev-warn" — see that task for the full snippet.

### rAF-delta scroll-perf pattern (already in §SPIKE task)

Inlined verbatim in §"SPIKE — refine 10k virtualization frame budget" — see that task for the full snippet. The Phase B production spec `tests/e2e/graph-virtualization.spec.ts` should mirror this exact pattern.

---

## Post-execution corrections

### Phase B SPIKE harness path — `_spike` is excluded from Next App Router routing

**Failure mode (executed 2026-05-01):** The plan prescribed the spike harness at `examples/consumer-app/app/graph/_spike/page.tsx`. Next.js App Router treats folders prefixed with `_` as **private folders** and excludes them from routing, so `GET /graph/_spike` returned a 200 wrapper but no route content (the page never resolved). Playwright's `waitForSelector('[data-testid="git-graph-row"]')` timed out across all 3 browsers.

**Working substitute:** Use a non-underscore folder name. Executed-time recipe:

- Spike page path: `examples/consumer-app/app/graph/spike-virt/page.tsx` (no leading underscore).
- Spec navigates to `/graph/spike-virt`.
- Spec filename `tests/e2e/_spike-virt-perf.spec.ts` keeps its underscore — that's a filename convention, not a route.

The pre-run plan-write spike (the source of the "Pre-run spike results" table that this corrections section's parent §Phase B has since replaced) likely used a different folder name; the underscore variant in the plan body was a transcription error.

Reference: [Next.js App Router private folders docs](https://nextjs.org/docs/app/getting-started/project-structure#private-folders).

### Phase B virtualization — `useVirtualizer` with parent-owned `scrollContainerRef` needs a state-based element capture

**Failure mode (executed 2026-05-01):** With the plan's recipe — `useVirtualizer({ getScrollElement: () => props.scrollContainerRef.current })` where `scrollContainerRef` is created in the parent component and attached to a parent `<div ref={...}>` — the virtualizer reports `getTotalSize()` correctly but `getVirtualItems()` stays empty indefinitely, because `props.scrollContainerRef.current` is `null` on `<GitGraph>`'s first render (the parent's ref attachment hasn't committed yet) and there's no re-render to trigger the virtualizer to re-evaluate `getScrollElement`. TanStack's standard examples co-locate the ref and the virtualizer in the same component, so this timing concern doesn't surface there.

**Working substitute:** Inside `GitGraphInElement`, capture the parent's element into local state via a post-mount effect. The state update triggers a re-render where the virtualizer's `getScrollElement` returns a real element and items appear:

```tsx
const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
useEffect(() => {
  setScrollEl(props.scrollContainerRef.current);
}, [props.scrollContainerRef]);
const virtualizer = useVirtualizer({
  count: state.layout.rows.length,
  getScrollElement: () => scrollEl,
  estimateSize: () => state.rowHeight,
  overscan: DEFAULTS.overscan,
});
```

This shipped in the Phase B implementation. Plan §Phase B GOTCHA 2 ("returns null on the first render… TanStack handles this") was incorrect — TanStack does not retry without a render trigger when the ref lives outside the virtualizer's component.
