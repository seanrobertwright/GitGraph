# Feature: Phase 6A — Commit detail drawer + slot pattern

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Phase 6A introduces an off-canvas right-side detail drawer rendered alongside `<GitGraph>`, populated by a consumer-supplied `renderDetail` render-prop. The drawer's open/close state follows the controlled/uncontrolled pattern already established for `selectedSha` (`defaultDetailOpen`, `detailOpen`, `onDetailOpenChange`). The drawer's chrome reuses shadcn/ui's `sheet` primitive — pulled in via shadcn registry-dependency, not hand-rolled — so theme tokens, focus trap, ESC handling, and scroll-lock all come for free.

This phase establishes the **slot pattern** (single render-prop receiving the relevant `Commit`) that Phase 6D inline row expansion will reuse, and the **decoupled-state pattern** (selection ≠ detail-open) that Phase 6E keyboard navigation depends on.

## User Story

As a product developer using `<GitGraph>`,
I want a built-in detail drawer I can fill with my own React tree (commit message body, diff, links, anything),
So that I get GitKraken-quality commit-detail UX in my app without rolling my own drawer/focus-trap/scroll-lock and without giving up control over what content goes inside.

## Problem Statement

Today `<GitGraph>` exposes selection state (`selectedSha`, `onSelectChange`) and click events (`onCommitClick`), but consumers who want a detail drawer alongside the graph must:

1. Manage drawer open/close state themselves and decide how to couple it to selection.
2. Build the drawer (positioning, focus trap, ESC handler, scroll-lock, animation) from scratch — or pull in a separate library.
3. Re-derive the selected `Commit` from the sha string the component hands them.

This is the largest single piece of integration scaffolding sitting between "install GitGraph" and "ship a real product UI on top of it."

## Solution Statement

- Add four props to `<GitGraph>`: `renderDetail?: (commit: Commit | undefined) => ReactNode`, `defaultDetailOpen?: boolean`, `detailOpen?: boolean`, `onDetailOpenChange?: (open: boolean) => void`. The detail-open state mirrors the existing `selectedSha` controlled/uncontrolled snapshot pattern (`useGitGraphState` already does this — extend it).
- Selection and detail-open are **decoupled**: clicking a row sets selection AND fires `onDetailOpenChange(true)` in uncontrolled mode (a sensible default), but a consumer in controlled `detailOpen` mode can ignore that signal and decouple the two states completely.
- New file `registry/git-graph/git-graph-detail.tsx` wraps shadcn's `<Sheet>` + `<SheetContent>` (right-side variant). It consumes: the resolved `Commit | undefined`, `open` boolean, `onOpenChange` callback, and `renderDetail` content function.
- Registry manifest gains `registryDependencies: ["sheet"]` so `npx shadcn@latest add` of `git-graph` transitively installs `sheet.tsx` (and its single transitive npm dep, the `radix-ui` umbrella package) into the consumer's project at their configured `aliases.ui` destination.
- New harness page `examples/consumer-app/app/graph/detail/page.tsx` exercises both modes (uncontrolled-default and controlled-decoupled). New spec `tests/e2e/graph-detail.spec.ts` covers row-click → drawer open, ESC close, controlled detachment, no layout shift to the graph itself, and `renderDetail` receives the right commit.
- Docs additions: API table gains four rows; new recipe page `apps/docs/app/docs/recipes/detail-drawer/page.tsx` shows minimal and decoupled-controlled examples.

## Feature Metadata

**Feature Type**: New Capability (additive — no breaking changes to Phase 1–5 API)
**Estimated Complexity**: Medium — single-component prop additions, one new registry file, but introduces the project's first shadcn-ui registry dependency (`sheet`), which has a real install-flow blast radius.
**Primary Systems Affected**:
- `registry/git-graph/git-graph.tsx` — four new props, detail-open state, render `<GitGraphDetail>` alongside body
- `registry/git-graph/git-graph-detail.tsx` — NEW file
- `registry/git-graph/registry.json` — `registryDependencies: ["sheet"]`, new files entry
- `examples/consumer-app/components/ui/sheet.tsx` — NEW (shadcn install)
- `apps/docs/components/ui/sheet.tsx` — NEW (shadcn install)
- `examples/consumer-app/app/globals.css` — add `--color-secondary` and `--color-ring` tokens (light + dark)
- `apps/docs/app/globals.css` — same token additions
- `examples/consumer-app/lib/utils.ts` — already exists with `cn` export (verified by spike)
- `apps/docs/lib/utils.ts` — same
- `examples/consumer-app/app/graph/detail/page.tsx` — NEW harness
- `apps/docs/app/docs/recipes/detail-drawer/page.tsx` — NEW recipe page
- `apps/docs/app/docs/api/page.tsx` — four new prop rows
- `apps/docs/components/docs-shell.tsx` — recipe-list nav update (if recipes are listed there)
- `tests/e2e/graph-detail.spec.ts` — NEW spec
- `examples/consumer-app/package.json` and `apps/docs/package.json` — single new dep from `sheet` install (`radix-ui ^1.4.3`)

**Dependencies (new, transitive via shadcn `sheet`):** *(verified empirically by spike against shadcn CLI v4.6.0, 2026-05-03)*
- `radix-ui: ^1.4.3` — the new umbrella package consolidating Radix primitives. The CLI v4 `sheet.tsx` imports `Dialog` from this umbrella (`import { Dialog as SheetPrimitive } from "radix-ui"`), not from `@radix-ui/react-dialog`. Pure JS, no native bindings.
- (`clsx 2.1.1`, `lucide-react 1.14.0`, `tailwind-merge 2.6.0` already present from Phase 5 — no change.)
- **NOT added:** `class-variance-authority`. The shadcn CLI v4 `sheet.tsx` no longer uses `cva` — it composes side-variant classes via inline `side === "right" && "..."` ternaries. Earlier plan drafts listed cva incorrectly.

The registry source `dependencies` array in `registry/git-graph/registry.json` does NOT need to list `radix-ui` — it enters the consumer's project transitively via the shadcn CLI's resolution of `registryDependencies: ["sheet"]`.

---

## Manual Steps Required

1. **One-time `pnpm dlx shadcn@latest add sheet` in both `examples/consumer-app/` and `apps/docs/`** during execution (Tasks 1–2 below). Not user action — the executing agent runs this. Calling it out because: (a) it modifies both apps' `package.json` (transitive dep additions), (b) it writes new `components/ui/sheet.tsx` files that must be committed alongside the rest of the phase, (c) running the CLI requires network access — confirm network availability before starting.

2. **Verify shadcn CLI version at execute time** (`pnpm dlx shadcn@latest --version`). The CLI is moving and the `add` UX has changed twice in 2026. The plan was authored against CLI v3.0.0+ behavior: `pnpm dlx shadcn@latest add sheet` is non-interactive when invoked from a directory containing a valid `components.json`. If the CLI prompts for confirmation, re-invoke with `-y`.

3. **No GitHub Pages, npm, or third-party service interaction this phase.**

---

## Inherited findings

From `.agents/code-reviews/phase-5g-docs-site.md` and `.agents/system-reviews/phase-4-headline-table-review.md` (process):

- **Pre-PR scope check is a `CONFIRM` task.** See §"CONFIRM pre-PR scope" near the bottom.
- **Untracked-file hygiene at branch-cut.** The shadcn `add sheet` install creates `components/ui/sheet.tsx` and likely seeds `components/ui/.gitkeep` or similar in two app directories — inspect carefully before opening the PR. `examples/consumer-app/components/ui/` and `apps/docs/components/ui/` are NEW directories tracked-from-empty before this phase.
- **Playwright SVG visibility.** Not relevant this phase — no new SVG assertions; drawer assertions are on shadcn `sheet`'s `<div role="dialog">` element which has real bounding box.

No code-review carry-forwards from prior phases block this work.

---

## External-System Assumption Audit

- **shadcn CLI v4.6.0 install behavior — verified empirically by spike 2026-05-03.** From a worktree off `main`, `pnpm dlx shadcn@latest add sheet -y` was run inside `examples/consumer-app/` and `apps/docs/`. Confirmed: (a) CLI v4.6.0 returns 4.6.0 from `--version`; (b) it writes `components/ui/sheet.tsx` to the cwd-relative consumer-app's components directory (NOT the repo root); (c) the only npm dep added to the workspace's `package.json` is `radix-ui: ^1.4.3` — no `@radix-ui/react-dialog`, no `class-variance-authority`; (d) `pnpm typecheck` (full monorepo, both workspace passes + root pass) passes after install + adding `git-graph-detail.tsx` to `registry/git-graph/`. The CLI v4 ships a different `sheet.tsx` than the public `https://ui.shadcn.com/r/sheet.json` returns — the installed file uses `import { Dialog as SheetPrimitive } from "radix-ui"` (umbrella), not `@radix-ui/react-dialog`.
- **shadcn CLI `add sheet` writes to the workspace member's `package.json`, not the repo root.** Verified during the spike (consumer-app's `package.json` gained `radix-ui`; root's was untouched). The plan's earlier "GOTCHA: workspace-detection quirk" is removed accordingly.
- **Sheet `sheet.tsx` Tailwind v4 compatibility.** Verified clean — no `@apply`, no v3 plugin imports, no `cva` usage. Side-variant composition is inline ternaries (`side === "right" && "..."`).
- **Sheet exports.** Verified named exports of `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`. We use `Sheet`, `SheetContent`, `SheetTitle`.
- **Missing theme tokens — REAL plan correction surfaced by spike.** Neither `examples/consumer-app/app/globals.css` nor `apps/docs/app/globals.css` declares `--color-secondary` or `--color-ring`. The installed `sheet.tsx` references `bg-secondary` (close-button hover state via `data-[state=open]:bg-secondary`) and `ring-ring` / `ring-offset-background` (close-button focus ring). With these tokens missing, the drawer renders structurally but the close-button hover/focus styles fall back to undefined custom properties (no visible effect). Plan Task 4 extends both globals.css files with light + dark values for these tokens.
- **No `paths` mapping needed in `registry/git-graph/tsconfig.json` — REAL plan correction surfaced by spike.** Root `tsconfig.json` `include` is `registry/**/*.ts` and `tests/**/*.ts` — `.tsx` files are NOT in the root pass. The new `git-graph-detail.tsx` is typechecked via the SYNCED copies in `apps/docs/components/git-graph/` and `examples/consumer-app/components/git-graph/`, using each app's own `@/*` alias resolution — exactly like existing `git-graph.tsx` and `git-graph-gutter.tsx` already do. **The previously planned Task 4 (`paths` mapping in registry tsconfig) is dropped.** Verified by spike: typecheck passes without any registry-tsconfig change.
- **Radix Dialog SSR safety.** `radix-ui` Dialog uses `useEffect` for portal mounting. `<GitGraph>` is already `"use client"`; `<GitGraphDetail>` declares its own `"use client"` directive at the top. No SSR work needed.
- **Sheet portal and focus trap with virtualized graph.** Radix Dialog portals to `document.body` by default. The graph and the drawer don't share a stacking context, so virtualization scroll-position cannot be affected by drawer mount/unmount. **Assumption:** no consumer overrides Radix Dialog's portal target via global CSS (no public escape hatch we expose). If it becomes an issue post-phase, a `detailContainer?: HTMLElement | null` prop can be added in a follow-up.
- **`scripts/sync-registry.mjs` picks up `git-graph-detail.tsx` automatically — verified by spike** (sync output went from "11 files" to "12 files" after the new file was added, no script change required).
- **Native-binding pins.** `radix-ui` umbrella package is pure JS — no native bindings, no `pnpm.overrides` entries needed. (Tailwind v4 native pins remain in place from earlier phases — unchanged.)
- **No `gh` CLI side effects, no GitHub Actions token claims, no third-party action behavior** — this phase is registry/component code only; CI just runs the existing matrix.

---

## Plan Self-Consistency — Key Identifiers

| Identifier | Canonical form | Used in |
|---|---|---|
| Branch name | `phase-6a-detail-drawer` | git ops |
| Plan file | `.agents/plans/phase-6a-detail-drawer.md` | this file |
| New component file | `registry/git-graph/git-graph-detail.tsx` | registry.json, git-graph.tsx import, plan body |
| New harness route | `/graph/detail` | E2E spec, harness page, plan body, docs nav (no — internal harness only) |
| New recipe page | `apps/docs/app/docs/recipes/detail-drawer/page.tsx` | docs nav, plan body |
| New E2E spec | `tests/e2e/graph-detail.spec.ts` | playwright config (pattern auto-picks), plan body |
| Render-prop name | `renderDetail` | git-graph.tsx, types, docs api page, harness, plan body |
| Detail-open default-prop | `defaultDetailOpen` | git-graph.tsx, docs api page, harness, plan body |
| Detail-open controlled prop | `detailOpen` | git-graph.tsx, docs api page, harness, plan body |
| Detail-open change handler | `onDetailOpenChange` | git-graph.tsx, docs api page, harness, plan body |
| Drawer testid (root) | `git-graph-detail` | spec, drawer component, plan body |
| Sheet side variant | `right` | drawer component, plan body |
| Registry dep | `sheet` | registry.json `registryDependencies`, plan body |
| Sheet manifest URL | `https://ui.shadcn.com/r/sheet.json` | external-system audit, plan body |

Pre-emit grep verified during plan write — no divergent usages.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `docs/PRD.md` §12 Phase 6A (after the v0.2 update) — deliverables and validation criteria for this phase.
- `CLAUDE.md` (entire) — conventions, especially: **artifact-commit cadence on `main` post-merge**, **untracked-file hygiene at branch-cut**, kebab-case files, default exports, `type` over `interface`, LF line endings.
- `registry/git-graph/git-graph.tsx` (whole file, 498 lines) — extend `useGitGraphState` to include detail-open state mirroring the `selectedSha` snapshot pattern at lines 108–127. The new `<GitGraphDetail>` mounts at the same level as `<GitGraphBody>` — it does NOT live inside the virtualized listbox.
- `registry/git-graph/git-graph-gutter.tsx` — read for file-shape reference; new `git-graph-detail.tsx` follows the same layout (default-exported component, named-exported props type).
- `registry/git-graph/types.ts` — confirm `Commit` type shape; nothing new exported this phase (props type stays internal to `git-graph.tsx`).
- `registry/git-graph/registry.json` — current manifest with empty `registryDependencies: []`. Update to `["sheet"]` and add the new `git-graph-detail.tsx` files entry.
- `registry/git-graph/tsconfig.json` — extends base; **NO change required** (spike-verified). The new `.tsx` file is typechecked via synced copies in app workspaces, not via the registry tsconfig.
- `examples/consumer-app/components.json` — confirms `aliases.ui = "@/components/ui"` (verified above), so `pnpm dlx shadcn@latest add sheet` will write to `examples/consumer-app/components/ui/sheet.tsx`.
- `apps/docs/components.json` — same alias config, same destination.
- `examples/consumer-app/lib/utils.ts` and `apps/docs/lib/utils.ts` — both already export `cn` (the standard shadcn helper). `sheet.tsx` imports `cn` from `@/lib/utils`. **Verify before install** — if `cn` is missing, `pnpm dlx shadcn@latest add sheet` will scaffold `lib/utils.ts` itself, but it may overwrite — read first.
- `examples/consumer-app/app/graph/interactions/page.tsx` (whole file) — pattern for harness pages with controlled-from-mount selection. The new `/graph/detail` harness mirrors this structure with the addition of detail-open buttons.
- `tests/e2e/graph-interactions.spec.ts` (whole file) — pattern for testid-driven assertions and controlled/uncontrolled flow tests; the new `graph-detail.spec.ts` follows the same idiom.
- `apps/docs/app/docs/api/page.tsx` (whole file, 50 lines) — `GITGRAPH_PROPS` array; add four new entries.
- `apps/docs/components/docs-shell.tsx` — confirm it auto-discovers recipes or uses an explicit list. If explicit, add the new recipe page link.
- `apps/docs/app/docs/recipes/page.tsx` — the recipes index. Add a card linking to the new detail-drawer recipe.
- `scripts/sync-registry.mjs` — verify it copies `git-graph-detail.tsx` automatically (its `ALLOW` list at line 39 is `.ts/.tsx/.css` and its filename filter is permissive — yes, it will). No script change needed.
- `package.json` (root) — `pnpm.overrides` block for Tailwind v4 natives (unchanged).

### New Files to Create

**Registry source**

- `registry/git-graph/git-graph-detail.tsx` — default-exported `<GitGraphDetail>` component wrapping shadcn `<Sheet>`. Named export `GitGraphDetailProps`. ~80 LOC.

**Consumer-app harness**

- `examples/consumer-app/app/graph/detail/page.tsx` — exercises uncontrolled (default) mode and controlled-decoupled mode side-by-side.

**Docs**

- `apps/docs/app/docs/recipes/detail-drawer/page.tsx` — recipe page with minimal example + controlled-decoupled example.

**Tests**

- `tests/e2e/graph-detail.spec.ts` — five test cases enumerated in §TESTING STRATEGY.

**Installed by shadcn CLI (do not hand-write)**

- `examples/consumer-app/components/ui/sheet.tsx`
- `apps/docs/components/ui/sheet.tsx`

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [shadcn CLI — `add` command](https://ui.shadcn.com/docs/cli#add) — confirms invocation idiom and that `add <name>` works for primitives like `sheet`.
- [shadcn registry-item schema](https://ui.shadcn.com/docs/registry/registry-item-json) — `registryDependencies` semantics; transitive resolution.
- [shadcn `sheet` component](https://ui.shadcn.com/docs/components/sheet) — props (`open`, `onOpenChange`, `side`), composition (`<Sheet>`, `<SheetTrigger>`, `<SheetContent>`, `<SheetHeader>`, `<SheetTitle>`, `<SheetDescription>`).
- [Radix UI Dialog API](https://www.radix-ui.com/primitives/docs/components/dialog#api-reference) — underlying primitive; `onOpenChange` semantics, controlled/uncontrolled, focus management.
- [React `useState` lazy-init pattern](https://react.dev/reference/react/useState#avoiding-recreating-the-initial-state) — used in `useGitGraphState` for the `defaultDetailOpen` initial value.

### Patterns to Follow

**Controlled/uncontrolled snapshot pattern** — copy from `git-graph.tsx` lines 108–127 verbatim, parameterized for `detailOpen`:

```tsx
const [internalDetailOpen, setInternalDetailOpen] = useState<boolean>(props.defaultDetailOpen ?? false);
const isDetailControlledRef = useRef<boolean>(props.detailOpen !== undefined);
const hasWarnedDetailModeSwitchRef = useRef(false);
if (process.env.NODE_ENV !== "production") {
  const currentlyControlled = props.detailOpen !== undefined;
  if (currentlyControlled !== isDetailControlledRef.current && !hasWarnedDetailModeSwitchRef.current) {
    console.warn(
      "GitGraph: switching between controlled and uncontrolled `detailOpen` is not supported. " +
        "Component will continue using the mode it was first rendered with.",
    );
    hasWarnedDetailModeSwitchRef.current = true;
  }
}
const isDetailControlled = isDetailControlledRef.current;
const detailOpen = isDetailControlled ? !!props.detailOpen : internalDetailOpen;

function setDetailOpen(next: boolean) {
  if (!isDetailControlled) setInternalDetailOpen(next);
  props.onDetailOpenChange?.(next);
}
```

**Default click behavior (uncontrolled mode):** the `onClick` handler at line 315 of `git-graph.tsx` currently calls `setSelected(row.commit.sha)` and `onCommitClick?.(row.commit)`. Add a third call `setDetailOpen(true)` so clicking a row opens the drawer by default. Consumers in controlled `detailOpen` mode receive `onDetailOpenChange(true)` and can ignore it to decouple.

**File header / default export / "use client":** mirror `git-graph-gutter.tsx`. Top-of-file `"use client"` directive (already at top of `git-graph.tsx`) — `git-graph-detail.tsx` needs its own.

**Naming:** `GitGraphDetail` (component), `GitGraphDetailProps` (props type), file `git-graph-detail.tsx`. Matches existing `GitGraphGutter`/`GitGraphGutterProps`/`git-graph-gutter.tsx`.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation — install shadcn `sheet` in both apps, configure registry tsconfig

Sheet primitive lands first because `git-graph-detail.tsx` imports from it. Both apps must have `components/ui/sheet.tsx` for sync-registry to typecheck and for E2E to run.

### Phase 2: Core implementation — `git-graph-detail.tsx` + props on `<GitGraph>`

Detail component, then wire it into `<GitGraph>` with the four new props.

### Phase 3: Integration — registry manifest, harness page, docs

Manifest update for shadcn install path; harness for E2E; docs API + recipe.

### Phase 4: Testing & validation

E2E spec covering uncontrolled-default, controlled-decoupled, ESC, no-layout-shift, render-prop receives correct commit.

---

## STEP-BY-STEP TASKS

Execute every task in order. Each task is atomic and independently testable.

### 1. CREATE branch and install `sheet` into `examples/consumer-app/`

- **Host:** windows (verified empirically by spike 2026-05-03); linux/macOS untested but expected to work — the shadcn CLI is platform-neutral.
- **IMPLEMENT:**
  - From repo root, create branch: `git checkout -b phase-6a-detail-drawer`
  - `cd examples/consumer-app && pnpm dlx shadcn@latest add sheet -y`
  - Verify it wrote `examples/consumer-app/components/ui/sheet.tsx` and added `radix-ui: ^1.4.3` to `examples/consumer-app/package.json`'s `dependencies`. (clsx, lucide-react, tailwind-merge already present from Phase 5.)
- **PATTERN:** No existing pattern — first shadcn `add` of a UI primitive in this repo.
- **VALIDATE:** `pnpm --filter consumer-app typecheck` from repo root passes; `examples/consumer-app/components/ui/sheet.tsx` exists; `examples/consumer-app/package.json` `dependencies` contains exactly one new entry: `"radix-ui": "^1.4.3"`. Spike-confirmed CLI v4.6.0 writes to the workspace member, not the root.

### 2. INSTALL `sheet` into `apps/docs/`

- **Host:** windows (verified empirically by spike).
- **IMPLEMENT:**
  - `cd apps/docs && pnpm dlx shadcn@latest add sheet -y`
  - Verify: `apps/docs/components/ui/sheet.tsx` exists; `apps/docs/package.json` `dependencies` contains `"radix-ui": "^1.4.3"`.
- **VALIDATE:** `pnpm --filter docs typecheck` from repo root passes.
- **NOTE:** Both apps must have `sheet` installed before the new `git-graph-detail.tsx` lands — the synced copies in each app's `components/git-graph/` import `@/components/ui/sheet`, and each app's typecheck resolves that alias against its own `components/ui/sheet.tsx`. Spike confirmed: with sheet only in consumer-app, apps/docs typecheck fails with `TS2307: Cannot find module '@/components/ui/sheet'`.

### 3. RUN `pnpm install` at root to refresh lockfile

- **IMPLEMENT:** `pnpm install` (no `--frozen-lockfile`) — picks up the per-workspace package.json changes from Tasks 1 + 2.
- **VALIDATE:** `git diff pnpm-lock.yaml` shows additions only (no unrelated changes); `pnpm typecheck` passes.

### 4. EXTEND globals.css in both apps with `--color-secondary` and `--color-ring` tokens

- **IMPLEMENT:** Edit `examples/consumer-app/app/globals.css` and `apps/docs/app/globals.css` to add two new tokens to the light-mode `@theme` block and matching dark-mode overrides:
  - Light mode:
    ```css
    --color-secondary: hsl(240 4.8% 95.9%);
    --color-ring: hsl(240 5% 64.9%);
    ```
  - Dark mode (matching the file's existing dark-mode mechanism — `@media` block in consumer-app, `html[data-theme="dark"]` selector in docs):
    ```css
    --color-secondary: hsl(240 3.7% 15.9%);
    --color-ring: hsl(240 5% 64.9%);
    ```
  These values match the shadcn `new-york` baseline. Without them, the installed `sheet.tsx`'s close-button hover state (`data-[state=open]:bg-secondary`) and focus ring (`focus:ring-ring focus:ring-offset-2`) reference undefined custom properties.
- **PATTERN:** Existing token declarations in both globals.css files (e.g. `--color-background`, `--color-muted`).
- **GOTCHA:** Two different dark-mode mechanisms — consumer-app uses `@media (prefers-color-scheme: dark) { @theme { ... } }`, docs-app uses `html[data-theme="dark"] { ... }` (because Tailwind v4 hoists rules inside `@media (prefers-color-scheme: dark)` into compile-time-only blocks; docs-app's runtime theme toggle from Phase 5I needs the attribute-driven form). Mirror each file's existing dark-mode mechanism — do NOT switch one to match the other.
- **VALIDATE:** `pnpm typecheck` still passes (CSS doesn't affect TS); manually inspect `pnpm dev:consumer` and `pnpm dev:docs` showing the close-button hover changing background. (Visual sanity is verified later in Task 8's manual harness check; this task's validation is just "edits applied, typecheck green, no syntax errors in CSS.")

### 5. CREATE `registry/git-graph/git-graph-detail.tsx`

- **IMPLEMENT:** Default-exported component `GitGraphDetail`. Props:
  ```tsx
  export type GitGraphDetailProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    commit: Commit | undefined;
    renderContent: (commit: Commit | undefined) => ReactNode;
    className?: string;
  };
  ```
  Body: render `<Sheet open={open} onOpenChange={onOpenChange}>` with `<SheetContent side="right" className={className} data-testid="git-graph-detail">{renderContent(commit)}</SheetContent>`. No `<SheetHeader>`/`<SheetTitle>` — the consumer's `renderContent` owns the entire interior. Add `"use client"` directive at top.
- **PATTERN:** `git-graph-gutter.tsx` for file shape (default export, named-export props type, top-of-file `"use client"`).
- **IMPORTS:**
  ```tsx
  import type { ReactNode } from "react";
  import { Sheet, SheetContent } from "@/components/ui/sheet";
  import type { Commit } from "./types";
  ```
- **GOTCHA:** Radix Dialog (which `Sheet` wraps) requires an accessible label for screen readers. shadcn's `<SheetContent>` renders an empty `<SheetTitle>` slot if not given one, which Radix logs a warning for. Solution: render a visually-hidden `<SheetTitle>` with text "Commit detail" inside `<SheetContent>` if `renderContent` doesn't provide one — but we can't introspect children. Simpler: always render a `<VisuallyHidden><SheetTitle>Commit detail</SheetTitle></VisuallyHidden>` wrapper above `{renderContent(commit)}`. Use Radix's `@radix-ui/react-visually-hidden`, which `sheet.tsx` itself depends on transitively — if not, import shadcn's standard sr-only span: `<span className="sr-only">`. The `sr-only` Tailwind utility is built into v4.
- **VALIDATE:** `pnpm --filter consumer-app typecheck` passes (the registry tsconfig's `paths` now resolves the import); the file exists with no diagnostics from `tsc -p tsconfig.json --noEmit` at repo root.

### 6. UPDATE `registry/git-graph/git-graph.tsx` — add four detail props and wire `<GitGraphDetail>`

- **IMPLEMENT:**
  - Extend `GitGraphProps` (lines 25–40) with:
    ```tsx
    renderDetail?: (commit: Commit | undefined) => ReactNode;
    defaultDetailOpen?: boolean;
    detailOpen?: boolean;
    onDetailOpenChange?: (open: boolean) => void;
    ```
  - Extend `GitGraphState` (lines 65–81) with `detailOpen: boolean` and `setDetailOpen: (open: boolean) => void`.
  - Inside `useGitGraphState` (lines 102–173) add the controlled/uncontrolled snapshot block for `detailOpen` (verbatim from §Patterns to Follow above), placed immediately after the existing `selectedSha` snapshot block.
  - Add `detailOpen` and `setDetailOpen` to the returned `GitGraphState` object.
  - In `GitGraphBody` (lines 182–394), at the row's `onClick` (line 315): after `setSelected(...)` and `onCommitClick?.(...)`, add `setDetailOpen(true)`.
  - At the bottom of `GitGraphBody`'s returned JSX (after the last `</div>` of the listbox at line 392), conditionally render `<GitGraphDetail>` IF `props.renderDetail` is provided. Pass `open={detailOpen}`, `onOpenChange={setDetailOpen}`, `commit={selectedRow?.commit}`, `renderContent={props.renderDetail}`. Drawer must render OUTSIDE the listbox `<div>` — it portals to body anyway, but DOM-tree placement matters for React keying; place it as a sibling of the listbox.
  - Plumb `props.renderDetail` through `GitGraphBody`'s prop bag — extend `GitGraphBodyProps` to accept it (or read from `state` — simpler to pass via state).
- **PATTERN:** Existing `selectedSha` controlled/uncontrolled handling at lines 108–127.
- **IMPORTS:** Add `import GitGraphDetail from "./git-graph-detail";` at the top alongside the existing `GitGraphGutter` import. Add `type ReactNode` to the existing `react` import block.
- **GOTCHA:** The empty-state and error-state branches (lines 453–485) return early before `GitGraphInElement`/`GitGraphInWindow` mount. If `props.renderDetail` is provided but the graph is in an error state, the drawer should NOT render — early returns already preclude that. No change needed; just confirm.
- **GOTCHA:** Strict mode double-render of the dev-warn in `useGitGraphState` is suppressed by the existing `hasWarnedModeSwitchRef.current` guard for `selectedSha`. The new `hasWarnedDetailModeSwitchRef` does the same for `detailOpen`. Two refs, one each.
- **VALIDATE:** `pnpm typecheck` passes; `pnpm test` (vitest) passes — no new tests, but no regressions either.

### 7. UPDATE `registry/git-graph/registry.json`

- **IMPLEMENT:**
  - Add `"sheet"` to `registryDependencies` array.
  - Add `{ "path": "git-graph-detail.tsx", "target": "components/git-graph/git-graph-detail.tsx", "type": "registry:component" }` to `files`.
- **PATTERN:** existing entries.
- **VALIDATE:** `node -e "JSON.parse(require('fs').readFileSync('registry/git-graph/registry.json','utf8'))"` — schema-valid JSON.
- **GOTCHA:** The route handler at `apps/docs/app/r/[name]/route.ts` reads this file and inlines file `content`. After this update, a clean `pnpm build:docs` must regenerate `apps/docs/out/r/git-graph.json` with both the new file's content inlined and the new `registryDependencies` entry. Verify in Task 14.

### 8. CREATE `examples/consumer-app/app/graph/detail/page.tsx`

- **IMPLEMENT:** Two side-by-side sections:
  1. **Uncontrolled (default)** — pass only `renderDetail`. Drawer auto-opens on row click. Click-to-open + ESC close = full UX path with zero consumer state. Use `featureBranchFixture`.
  2. **Controlled-decoupled** — pass `selectedSha`, `onSelectChange`, `detailOpen={false}` (always closed), `onDetailOpenChange={() => {}}` (ignored). Plus a separate `data-testid="open-detail"` button that flips a local `detailOpen` boolean to `true`. Demonstrates that selection and drawer-open are independently controllable.
  - Each section's `renderDetail` returns:
    ```tsx
    <div data-testid="detail-content" data-sha={commit?.sha ?? ""}>
      <h3>{commit?.message ?? "No selection"}</h3>
      <code>{commit?.sha}</code>
    </div>
    ```
- **PATTERN:** `examples/consumer-app/app/graph/interactions/page.tsx` for harness shape and the empty-string sentinel for controlled selection.
- **VALIDATE:** `pnpm --filter consumer-app dev` (run in background, kill after check) — navigate to `http://localhost:3100/graph/detail`, confirm both sections render and a row click in the first section opens a drawer.

### 9. CREATE `tests/e2e/graph-detail.spec.ts`

- **Host:** linux (CI default); windows-locally via `pnpm e2e` if Playwright browsers installed natively.
- **IMPLEMENT:** Five test cases:
  1. **uncontrolled — row click opens drawer with right commit.** Goto `/graph/detail`. Click row `data-sha="f1"` in first section. Assert `[data-testid="git-graph-detail"]` is visible (toBeVisible OK — `<SheetContent>` is a real `<div>` with bbox). Assert `[data-testid="detail-content"]` has `data-sha="f1"`.
  2. **uncontrolled — ESC closes drawer.** Continue from #1; press `Escape`. Assert drawer is hidden (`toBeHidden()` or `toHaveCount(0)` — Radix unmounts on close).
  3. **controlled-decoupled — selection without drawer.** Goto `/graph/detail`. In second section, click row `f1`. Assert row has `data-selected="true"`. Assert no drawer is visible.
  4. **controlled-decoupled — open-detail button opens drawer independently.** Click `data-testid="open-detail"`. Assert drawer is visible. Assert detail-content `data-sha` matches the second-section's controlled-selection value (or empty if none).
  5. **no layout shift to graph.** Take a Playwright screenshot bbox of the `[data-testid="git-graph"]` listbox before opening drawer; click a row; take another. Assert the bbox `x`/`y`/`width`/`height` are byte-identical (or use `toEqual` on extracted values). Sheet is portaled — graph DOM is unaffected.
- **PATTERN:** `tests/e2e/graph-interactions.spec.ts` for testid-driven assertions; `tests/e2e/graph-render.spec.ts` for goto-pattern.
- **GOTCHA:** Radix Dialog mounts the `<SheetContent>` portal asynchronously. After click, await `[data-testid="git-graph-detail"]` to be attached before asserting visibility (`page.locator(...).waitFor({ state: "visible" })`).
- **VALIDATE:** `pnpm e2e tests/e2e/graph-detail.spec.ts` — all 5 tests pass on chromium, firefox, webkit (3-browser matrix).

### 10. UPDATE `apps/docs/app/docs/api/page.tsx`

- **IMPLEMENT:** Add four entries to `GITGRAPH_PROPS` array (after `onCommitHover`, before `showWorkingTreeRow`):
  ```ts
  { name: "renderDetail", type: "(commit: Commit | undefined) => ReactNode", description: "When provided, renders an off-canvas right-side drawer alongside the graph. The function receives the currently selected commit (or undefined if no selection) and returns the drawer's interior." },
  { name: "defaultDetailOpen", type: "boolean", default: "false", description: "Initial open state of the detail drawer in uncontrolled mode." },
  { name: "detailOpen", type: "boolean", description: "Controlled open state of the detail drawer. When provided, GitGraph treats the drawer as controlled and won't update internal open state." },
  { name: "onDetailOpenChange", type: "(open: boolean) => void", description: "Fires when the drawer requests an open-state change (controlled or uncontrolled). In controlled mode, return this signal back into detailOpen to commit; ignore to decouple from the default click-to-open behavior." },
  ```
- **VALIDATE:** `pnpm --filter docs typecheck`; manually navigate `/docs/api` after `pnpm dev:docs`.

### 11. CREATE `apps/docs/app/docs/recipes/detail-drawer/page.tsx`

- **IMPLEMENT:** Two `<CodeBlock>` sections:
  1. **Minimal** — render-prop only:
     ```tsx
     <GitGraph
       commits={commits}
       renderDetail={(c) => c ? (
         <>
           <h3 className="font-semibold mb-2">{c.message}</h3>
           <pre className="text-xs">{c.sha}</pre>
         </>
       ) : null}
     />
     ```
  2. **Decoupled controlled** — selection without auto-opening drawer:
     ```tsx
     const [sha, setSha] = useState<string | undefined>();
     const [open, setOpen] = useState(false);
     <GitGraph
       commits={commits}
       selectedSha={sha}
       onSelectChange={setSha}
       detailOpen={open}
       onDetailOpenChange={() => {/* ignore — only our button opens */}}
       renderDetail={(c) => /* ... */}
     />
     <button onClick={() => setOpen(true)}>Show detail</button>
     ```
- **PATTERN:** existing recipe pages under `apps/docs/app/docs/recipes/*/page.tsx`.
- **VALIDATE:** Renders without TS errors; `pnpm dev:docs` and visit `/docs/recipes/detail-drawer`.

### 12. UPDATE `apps/docs/app/docs/recipes/page.tsx`

- **IMPLEMENT:** Add a card linking to `/docs/recipes/detail-drawer` with title "Commit detail drawer" and short description. Mirror existing card shape.
- **VALIDATE:** Click-through from recipes index lands on the new page.

### 13. UPDATE `apps/docs/components/docs-shell.tsx` (if recipe nav is hand-listed)

- **IMPLEMENT:** Read the file. If recipes are listed as an array, add the new entry. If they are auto-discovered or sub-rendered via the recipes-index page, no change.
- **VALIDATE:** Recipe sidebar shows the new entry.

### 14. RUN full validation suite

- **IMPLEMENT:**
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test` (vitest unit)
  - `pnpm e2e` (full Playwright suite — confirms no regressions in interactions/render/animation/etc., plus the new `graph-detail.spec.ts`)
  - `pnpm build:docs` — confirms route handler regenerates `apps/docs/out/r/git-graph.json` with the new file content and `registryDependencies: ["sheet"]`. Inspect: `cat apps/docs/out/r/git-graph.json | jq '.registryDependencies, (.files | map(.path))'`
- **VALIDATE:** all pass; the inlined `git-graph-detail.tsx` content appears in the registry JSON.

### 15. UPDATE `.gitignore` if shadcn `add` introduced any local-tool scratch dirs

- **IMPLEMENT:** Run `git status` — if any new untracked files appear outside `examples/consumer-app/components/ui/sheet.tsx`, `apps/docs/components/ui/sheet.tsx`, plus the planned new files, decide: gitignore (if scratch) or stage (if intended). Common candidates: `.shadcn/` cache dirs.
- **VALIDATE:** `git status` shows only planned files.

### 16. CONFIRM pre-PR scope

- **IMPLEMENT (CONFIRM task — review with user before proceeding to Task 17):**
  1. `git status` — confirm no untracked files outside `.agents/`. Anything else: gitignore proactively (Task 15) or revert.
  2. `git diff --name-only main...HEAD` — verify every changed path is in "Primary Systems Affected" or is an explicitly planned new file. Expected:
     - `registry/git-graph/git-graph.tsx`, `git-graph-detail.tsx`, `registry.json`, `tsconfig.json`
     - `examples/consumer-app/components/ui/sheet.tsx`, `examples/consumer-app/lib/utils.ts` (only if shadcn modified it), `examples/consumer-app/package.json`
     - `examples/consumer-app/app/graph/detail/page.tsx`
     - `apps/docs/components/ui/sheet.tsx`, `apps/docs/lib/utils.ts` (only if shadcn modified it), `apps/docs/package.json`
     - `apps/docs/app/docs/api/page.tsx`, `apps/docs/app/docs/recipes/page.tsx`, `apps/docs/app/docs/recipes/detail-drawer/page.tsx`, possibly `apps/docs/components/docs-shell.tsx`
     - `tests/e2e/graph-detail.spec.ts`
     - `pnpm-lock.yaml`
     - root `package.json` (only if shadcn modified it)
  3. Verify NO `.agents/plans/`, `.agents/code-reviews/`, `.agents/execution-reports/`, `.agents/system-reviews/` files staged on the feature branch — those land on `main` post-merge per CLAUDE.md artifact-commit cadence.
- **GOTCHA:** Phase 4 was the second incident of sweep-in. This step is non-negotiable.

### 17. CONFIRM commit and push

- **IMPLEMENT (CONFIRM task — destructive/shared-state):**
  - Stage all planned changes; commit with message:
    ```
    Phase 6A: commit detail drawer + slot pattern

    Adds renderDetail, defaultDetailOpen, detailOpen, onDetailOpenChange props
    to <GitGraph>. Drawer chrome via shadcn sheet (registry dependency).
    Selection and detail-open state are decoupled — uncontrolled mode opens
    drawer on row click; controlled detailOpen lets consumers detach the two.

    Establishes the slot pattern Phase 6D row expansion will reuse.
    ```
  - `git push -u origin phase-6a-detail-drawer`
- **GOTCHA:** First push of branch — `CONFIRM` gate per CLAUDE.md.

### 18. CONFIRM open PR

- **IMPLEMENT (CONFIRM task — shared-state):** `gh pr create --base main --head phase-6a-detail-drawer --title "Phase 6A: commit detail drawer + slot pattern"` with a body summarizing deliverables, linking to PRD §12.6A, and listing validation evidence (CI green, manual harness verified).
- **POST-MERGE (separate from this PR — see CLAUDE.md):** artifact-commit `.agents/plans/phase-6a-detail-drawer.md` (this file), the eventual `.agents/code-reviews/phase-6a-detail-drawer.md`, `.agents/execution-reports/phase-6a-detail-drawer.md`, and any post-execution corrections, in a focused commit on `main`.

---

## TESTING STRATEGY

### Unit Tests

No new unit tests required. The new code is React component composition — its behavior is integration-test territory (E2E). The existing `tests/unit/layout.test.ts`, `bezier.test.ts`, etc. are unaffected.

### Integration / E2E Tests

`tests/e2e/graph-detail.spec.ts` — five cases above. Specifically:

- Uncontrolled row-click → drawer opens with correct commit (positive path)
- ESC closes drawer (Radix-provided behavior; verifies wiring)
- Controlled-decoupled selection without drawer-open (independence proof, both directions)
- Controlled-decoupled drawer-open without forced selection (consumer button opens drawer)
- No layout shift to the graph itself when drawer mounts/unmounts (portal sanity)

### Edge Cases

- **`renderDetail` provided but `commits` empty** — empty-state shell renders, drawer should NOT render (early return at git-graph.tsx line 453 precludes it). Manually verify; no E2E test (existing `graph-render.spec.ts` covers empty state).
- **`renderDetail` returns `null` for the first selected commit** — drawer is open but interior is empty. Visually fine; no test.
- **Mode-switch warning for `detailOpen`** — covered by existing pattern test idiom; add a 6th test case if desired but not required (carry-forward consideration if reviewer flags it).
- **Strict-mode double render** — guard ref pattern from existing `hasWarnedModeSwitchRef` is mirrored. Existing `controlled-mode harness produces no GitGraph console warnings` test (graph-interactions.spec.ts:75) will catch a regression where the new dev-warn fires spuriously.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
- `pnpm lint`

### Level 2: Type Checking
- `pnpm typecheck` (workspace pass + root pass over `registry/**` and `tests/**`)

### Level 3: Unit Tests
- `pnpm test`

### Level 4: E2E Tests
- `pnpm e2e tests/e2e/graph-detail.spec.ts` — new spec only, fast feedback
- `pnpm e2e` — full matrix, regression confirmation

### Level 5: Build + Registry-Manifest Sanity
- `pnpm build:docs` — verifies the static export still succeeds
- `cat apps/docs/out/r/git-graph.json | jq '.registryDependencies, (.files | map(.path))'` — confirms manifest contains `["sheet"]` and the new `git-graph-detail.tsx` files entry, with content inlined

### Level 6: Manual Harness Validation
- `pnpm dev:consumer` (or run consumer-app on 3100) → navigate `/graph/detail` → exercise both sections → visual sanity check on drawer animation, focus trap, ESC behavior, dark-mode parity

---

## ACCEPTANCE CRITERIA

- [ ] `<GitGraph>` accepts `renderDetail`, `defaultDetailOpen`, `detailOpen`, `onDetailOpenChange` props with the documented signatures
- [ ] Uncontrolled mode: clicking a row opens the drawer; ESC closes it; drawer interior reflects the clicked commit
- [ ] Controlled mode: setting `detailOpen={false}` keeps the drawer closed regardless of row clicks; setting `detailOpen={true}` opens it regardless of selection
- [ ] Mode-switch dev-warn fires exactly once when consumer toggles between controlled and uncontrolled `detailOpen`
- [ ] Drawer chrome inherits shadcn theme tokens; light and dark modes parity-correct (including close-button hover `bg-secondary` and focus ring `ring-ring` rendering against the new tokens added in Task 4)
- [ ] No layout shift to the graph itself when drawer opens/closes (portal placement)
- [ ] Registry manifest declares `registryDependencies: ["sheet"]`; a fresh `npx shadcn@latest add` on the deployed registry URL pulls in `sheet.tsx` transitively (deferred to next install-flow CI run; not asserted in this PR's E2E)
- [ ] Docs API page lists all four new props; recipe page demonstrates minimal and decoupled-controlled examples
- [ ] All existing E2E tests pass unmodified
- [ ] No new untracked files outside the planned set; no `.agents/` artifacts staged on the feature branch

---

## COMPLETION CHECKLIST

- [ ] All 18 tasks completed in order
- [ ] Each task's `VALIDATE` step passed before moving on
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e`, `pnpm build:docs` all green
- [ ] Manual harness verified on `/graph/detail`
- [ ] Acceptance criteria all checked
- [ ] PR open against `main` with descriptive body
- [ ] Post-merge: artifact-commit on `main` for plan, code-review, execution-report, system-review files (separate from PR)

---

## NOTES

**Why decoupled state (3b) over coupled (3a):** the user explicitly chose decoupled, and Phase 6E keyboard navigation will benefit. Arrow-key navigation should move selection without re-triggering drawer open every keystroke; only `Enter` (which already calls `onCommitClick`) and mouse-click should open the drawer by default. This is achievable with the decoupled model by NOT calling `setDetailOpen(true)` from the keyboard handler — only from the row's `onClick`. Confirmed in Task 6's `IMPLEMENT`: keyboard handler at lines 213–239 of `git-graph.tsx` is unchanged this phase.

**Why shadcn `sheet` over hand-rolled drawer:** focus trap, ESC, scroll-lock, portal management, and theme-token inheritance are all hard-won. Reusing them is the shadcn-native answer. The cost is one new transitive dep (`radix-ui` umbrella, spike-verified) — pure JS, already common in shadcn projects.

**Slot pattern for Phase 6D:** Phase 6D inline row expansion will use a sibling render-prop (likely `renderRowDetail?: (commit: Commit) => ReactNode`) that mounts inside the row instead of in a sheet. Same shape, different mount point. This phase's `renderDetail` establishes the precedent.

**Future considerations not addressed here:**
- A `detailContainer?: HTMLElement | null` prop to override Radix portal target — defer until a real consumer asks
- A trigger-element render-prop (icon button on hover) to give consumers an explicit drawer-open affordance separate from row click — defer to Phase 6E or later
- Multi-select with multi-detail (drawer showing N commits) — out of scope; selection is single-sha by design

**Confidence score: 9.5/10** after the 2026-05-03 derisking spike (executed in a worktree off `main`, then discarded). The spike empirically verified: shadcn CLI v4.6.0 install behavior, dep blast radius (one dep: `radix-ui`), workspace-vs-root write target (workspace, correctly), `sheet.tsx` actual contents (no cva, umbrella radix-ui import), typecheck propagation through synced copies (works without registry-tsconfig changes), `sync-registry.mjs` auto-pickup of the new file, and the missing-theme-token issue (real, fixed by Task 4). The remaining 0.5 is unavoidable empirical risk: CI matrix surprises (Radix Dialog portal behavior on Playwright's webkit + chromium + firefox), shadcn-CLI breaking changes between plan-write and plan-execute, transient registry-fetch failures during install. None of those are addressable from a plan; they get caught at execute time and recorded as Post-execution corrections.
