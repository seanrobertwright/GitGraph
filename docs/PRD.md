# GitGraph — Product Requirements Document

**Status:** Draft v0.1
**Last updated:** 2026-04-24
**Owner:** seanrobertwright@gmail.com

---

## 1. Executive Summary

GitGraph is a React component for rendering Git commit history as a visual DAG, distributed as a [shadcn/ui](https://ui.shadcn.com)-style installable component. Users install it with a single `npx shadcn@latest add <registry-url>` command, which copies the component source directly into their project — no npm package, no black-box dependency, fully themeable through Tailwind and CSS variables.

The component targets the visual quality bar of GitKraken and GitHub's network graph: crisp SVG rendering, smooth bezier curves, pixel-perfect row alignment between the graph gutter and commit metadata (hash, message, author, refs), and deterministic theming that inherits from the consumer's shadcn design tokens.

**MVP goal:** Ship a `<GitGraph>` component that renders a vertical, top-to-bottom commit DAG with branches, merges, tags, and HEAD indicators — installable via the shadcn CLI from a GitHub Pages–hosted registry, indistinguishable in polish from a first-party shadcn component.

---

## 2. Mission

Make the best-drawn, best-themed Git history visualization in the React ecosystem available as a copy-into-your-project component.

**Core principles:**

1. **Visual quality over feature breadth.** Every curve, stroke width, node size, and spacing value is deliberate. Fewer features drawn perfectly beats more features drawn passably.
2. **shadcn-native.** No runtime dependency. Source is copied into the consumer's project, styled with their Tailwind tokens, editable by them.
3. **Deterministic layout.** Same DAG → same pixels. Layout is a pure function; rendering is a pure projection of layout.
4. **Real-world data first.** The API is shaped around what `git log` and the GitHub API actually return, not around a demo-friendly builder DSL.
5. **Composable, not monolithic.** A headline `<GitGraph>` table component for the 80% case, with the `<GitGraphGutter>` primitive exposed for users who want to bring their own row layout.

---

## 3. Target Users

**Primary persona — the shadcn-using product developer.** Building a dashboard, internal tool, code review UI, or deploy tracker. Already uses shadcn/ui, already has Tailwind configured, already has a design system. Wants to add Git history visualization without pulling in a 200kb charting library or wrestling with a JS-only graph DSL.

- **Technical comfort:** High. Comfortable with React, Tailwind, and modifying copied component source.
- **Needs:** Drop-in install, theme inheritance from existing tokens, real-data API (`sha`, `parents[]`, `refs[]`), no runtime surprises.
- **Pain points with existing options:** `gitgraph.js` is archived and unmaintained. GitKraken is desktop-only. GitHub's graph is not reusable. Hand-rolled SVG layouts take weeks to get right.

**Secondary persona — the DevTools builder.** Building IDE extensions, Git clients, or code-hosting UIs where the graph IS the product. Needs the primitive (`<GitGraphGutter>`), not the headline table.

---

## 4. MVP Scope

### In Scope

**Core functionality**
- ✅ Vertical, top-to-bottom commit graph
- ✅ SVG-based rendering (no Canvas, no WebGL)
- ✅ Raw DAG input: `{ commits: [{ sha, parents[], author, message, refs, timestamp }] }`
- ✅ Deterministic lane assignment (topological + branch-persistence heuristic)
- ✅ Bezier curve edges between commits and their parents
- ✅ Visual distinction between normal and merge commit nodes
- ✅ Branch and tag labels as pill badges
- ✅ `HEAD` indicator styling
- ✅ Uncommitted/working-tree row at the top (opt-in)
- ✅ Branch colors indexed by lane, themeable via `--graph-branch-1..8` CSS variables
- ✅ Hover state + `onCommitClick` / `onCommitHover` callbacks
- ✅ Selected-row state
- ✅ Pixel-perfect alignment between gutter nodes and metadata row baselines
- ✅ Virtualized rendering for long histories (10k+ commits)
- ✅ Enter animation for newly appended commits

**Technical**
- ✅ React 19, Tailwind v4, TypeScript
- ✅ Zero runtime dependencies beyond `react`, `clsx`, `@tanstack/react-virtual`, `lucide-react`
- ✅ Full dark-mode support via shadcn token inheritance
- ✅ Unit tests for the layout engine (Vitest)
- ✅ Playwright screenshot regression tests for visual quality
- ✅ Complete end-to-end test suite exercising the component through a real consumer app
- ✅ Standalone **example app** — a fresh Next.js app that consumes the component via the shadcn CLI install flow, serving as both a real-world integration target and the host for E2E tests

**Distribution**
- ✅ shadcn CLI registry hosted on GitHub Pages
- ✅ Installable via `npx shadcn@latest add <registry-url>`
- ✅ Static docs site with live demos
- ✅ Copy-pasteable install command on landing page

### Out of Scope (deferred)

- ❌ Horizontal orientation
- ❌ Canvas/WebGL renderer for 100k+ commit graphs
- ❌ Git client functionality (no checkout, merge, fetch — viz only)
- ❌ Direct integration with `isomorphic-git`, `simple-git`, or GitHub API (consumer's responsibility; we ship raw-DAG shape + tiny `fromGitLog()` helper only)
- ❌ Commit diff rendering
- ❌ Graph filtering / branch hiding UI (consumer composes this themselves)
- ❌ Drag-to-rebase or any write operations
- ❌ npm-published package (shadcn-CLI install only)
- ❌ Storybook (demos live in the Next.js docs app)
- ❌ Internationalization of UI strings (we ship very few strings)

---

## 5. User Stories

1. **As a product developer,** I want to install the graph with one CLI command, so that I can start rendering commit history in under 60 seconds without evaluating npm packages.
   - *Example:* `npx shadcn@latest add https://seanrobertwright.github.io/GitGraph/r/git-graph.json` copies `components/ui/git-graph.tsx` and `lib/git-graph/layout.ts` into my project.

2. **As a product developer,** I want to pass a raw array of commits with `sha` and `parents`, so that I can feed real `git log --format` output directly without transforming to a library-specific schema.

3. **As a product developer,** I want the graph to inherit my shadcn theme, so that it looks native in light and dark mode without me writing custom CSS.
   - *Example:* Branch colors pick up from `--graph-branch-1` through `--graph-branch-8` which I can override in my `globals.css`.

4. **As a product developer,** I want commit rows to align perfectly with the graph nodes, so that text baselines sit on the same horizontal line as the node center.

5. **As a DevTools builder,** I want access to the `<GitGraphGutter>` primitive without the metadata table, so that I can render my own row content next to the graph.

6. **As a product developer,** I want `onCommitClick(commit)` and hover callbacks, so that I can open a detail panel or navigate to a route when the user interacts with a commit.

7. **As a product developer,** I want the graph to remain smooth at 10,000 commits, so that I don't need to paginate for realistic enterprise repos.

8. **As a design-system-conscious developer,** I want the component source in my repo, so that I can tweak bezier tension, node size, or animation timing without forking an npm package.

---

## 6. Core Architecture & Patterns

### High-level architecture

```
consumer DAG input
      │
      ▼
┌─────────────────────┐
│  layout.ts (pure)   │  ← deterministic lane assignment + edge geometry
└─────────────────────┘
      │ LayoutResult
      ▼
┌─────────────────────┐
│ <GitGraphGutter>    │  ← SVG-only primitive, themeable, no row content
└─────────────────────┘
      │ (composed with)
      ▼
┌─────────────────────┐
│ <GitGraph>          │  ← headline table: gutter + metadata columns + virtualization
└─────────────────────┘
```

Layout is a **pure function**. Rendering is a **pure projection** of layout. This separation is what makes the component unit-testable, deterministic, and trivially animatable (layout diffs become animations).

### Directory structure (in the source registry)

```
registry/
├── registry.json                      # shadcn CLI manifest
└── git-graph/
    ├── git-graph.tsx                  # headline <GitGraph> component
    ├── git-graph-gutter.tsx           # primitive <GitGraphGutter>
    ├── git-graph.types.ts             # Commit, Ref, LayoutResult, etc.
    ├── lib/
    │   ├── layout.ts                  # pure DAG → lane + edge layout
    │   ├── bezier.ts                  # edge path construction
    │   └── from-git-log.ts            # optional parser helper
    └── git-graph.css                  # CSS vars (--graph-branch-1..8, sizes)
```

### Key patterns

- **CSS-variable theming.** All colors, stroke widths, node radii, and row heights declared as CSS vars at the component root. Tailwind utility classes reference them via `hsl(var(--graph-branch-1))`, mirroring shadcn's token pattern.
- **Compound component API.** `<GitGraph>` is the table. `<GitGraph.Row>`, `<GitGraph.Gutter>`, `<GitGraph.Ref>` are slots for users who want to override parts of the row.
- **Controlled + uncontrolled hover/selection.** Follows shadcn's `value` / `defaultValue` + `onValueChange` convention.
- **Headless layout.** `computeLayout(commits)` is exported so advanced users can call it standalone and render themselves.

---

## 7. Tools / Features

### 7.1 `<GitGraph>` — headline table component

The 80% use case. Renders a full commit log as a table with the graph gutter on the left and metadata columns (hash, message, author, date, refs) on the right, all sharing a virtualized row height.

**Props:**
- `commits: Commit[]` — raw DAG input
- `head?: string` — sha of HEAD
- `selectedSha?: string` / `defaultSelectedSha?: string`
- `onCommitClick?: (commit: Commit) => void`
- `onCommitHover?: (commit: Commit | null) => void`
- `columns?: ColumnConfig[]` — override which metadata columns render
- `showWorkingTreeRow?: boolean`
- `rowHeight?: number` — default 40
- `className?: string`

### 7.2 `<GitGraphGutter>` — primitive

SVG-only graph gutter. Takes a layout result and renders lanes, edges, nodes. Consumer provides row content next to it.

**Props:**
- `layout: LayoutResult`
- `rowHeight: number`
- `laneWidth?: number`
- `nodeRadius?: number`
- `strokeWidth?: number`
- `className?: string`

### 7.3 Layout engine (`computeLayout`)

Pure TypeScript. Input: `Commit[]`. Output:

```ts
type LayoutResult = {
  rows: Array<{
    commit: Commit;
    lane: number;          // which vertical column this node sits in
    rowIndex: number;
  }>;
  edges: Array<{
    fromSha: string;
    toSha: string;
    fromLane: number;
    toLane: number;
    fromRow: number;
    toRow: number;
    kind: 'straight' | 'fork' | 'merge';
  }>;
  laneCount: number;
};
```

**Algorithm outline:**
1. Topological sort (children before parents, newest first).
2. Walk rows top-to-bottom. For each commit, assign it to the leftmost active lane that expects it as a parent; if none, assign a new lane.
3. When a commit has multiple parents (merge), the primary parent continues the current lane; secondary parents spawn or terminate other lanes.
4. Deterministic: same input → same lane assignment.

### 7.4 Bezier edge rendering

Edges are cubic bezier curves. Tension and control-point placement are tuned so:
- Straight same-lane edges render as exact vertical lines
- Fork/merge edges have a natural "S" that enters and exits nodes perpendicular to the node edge
- Curves never cross nodes they shouldn't
- At small row heights (compact mode), curves degrade gracefully to shorter S-shapes

### 7.5 Refs, tags, HEAD

Rendered as pill badges in the metadata column, styled with shadcn `Badge`-equivalent tokens. HEAD gets a distinct treatment (e.g., outline + bold). Tags differ from branch refs visually.

### 7.6 Virtualization

`@tanstack/react-virtual` drives row windowing. Gutter SVG is a single `<svg>` overlay sized to the full scroll height, with only visible edges/nodes rendered (culled by visible row range).

### 7.7 Animation

On commit list change:
- New rows at the top fade + slide in (150ms)
- Lane recolor animates over 200ms on branch-filter changes
- Respects `prefers-reduced-motion`

---

## 8. Technology Stack

**Runtime**
- React 19
- TypeScript 5.x
- Tailwind CSS v4 (CSS-first `@theme`)
- `clsx` — class composition
- `@tanstack/react-virtual` — row windowing
- `lucide-react` — icons (tag, HEAD indicator, merge glyph)

**Docs site**
- Next.js 15 (App Router)
- Static export to GitHub Pages
- shadcn/ui components for doc chrome

**Dev / tooling**
- Vitest — unit tests for layout engine (pure-function coverage)
- Playwright — screenshot regression tests AND full end-to-end test suite
- **Example app** (`examples/consumer-app/`) — a separate Next.js app inside this repo that installs the component via the shadcn CLI exactly as a real user would; serves as:
  - the host for all E2E tests (tests drive the example app, not the docs site)
  - a living proof that the install flow works end-to-end
  - the smoke target for CI on every PR
- pnpm workspaces — minimal bump from single-package to accommodate the example app; the root app (docs site) and `examples/consumer-app` are workspace members

**Distribution**
- shadcn CLI v3+ (supports third-party registry URLs)
- GitHub Pages for registry hosting

---

## 9. Security & Configuration

**Authentication:** None. The component renders DAG data the consumer already has; it does not fetch, authenticate, or transmit.

**Configuration:**
- Theming via CSS variables on the consumer's `:root` / `.dark`
- No environment variables required
- No runtime config file

**Security scope — in:**
- Safe rendering of commit messages and author names (treat as untrusted strings; render as `textContent`, never as HTML)
- SVG injection is not possible via normal props — all user data passes through React text nodes

**Security scope — out:**
- Consumer is responsible for authenticating and fetching Git data
- Consumer is responsible for sanitizing anything they render inside custom column renderers

**Deployment:**
- Registry is static JSON + TSX files served from GitHub Pages
- No backend, no API keys, no secrets

---

## 10. API Specification

### 10.1 Registry endpoint

```
GET https://seanrobertwright.github.io/GitGraph/r/git-graph.json
```

**Response shape** (shadcn CLI registry schema):

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "git-graph",
  "type": "registry:component",
  "dependencies": ["@tanstack/react-virtual", "lucide-react", "clsx"],
  "registryDependencies": [],
  "files": [
    { "path": "components/ui/git-graph.tsx", "type": "registry:component" },
    { "path": "components/ui/git-graph-gutter.tsx", "type": "registry:component" },
    { "path": "lib/git-graph/layout.ts", "type": "registry:lib" },
    { "path": "lib/git-graph/bezier.ts", "type": "registry:lib" },
    { "path": "lib/git-graph/types.ts", "type": "registry:lib" }
  ],
  "cssVars": {
    "light": { "graph-branch-1": "220 80% 55%", "...": "..." },
    "dark": { "graph-branch-1": "220 80% 65%", "...": "..." }
  }
}
```

### 10.2 Component API (consumer-facing)

```ts
type Commit = {
  sha: string;
  parents: string[];
  author: { name: string; email?: string; avatarUrl?: string };
  message: string;
  timestamp: number | string;
  refs?: Ref[];
};

type Ref = {
  name: string;
  kind: 'branch' | 'tag' | 'remote-branch';
  isHead?: boolean;
};
```

---

## 11. Success Criteria

**MVP success** = a developer unfamiliar with the project can run `npx shadcn@latest add <url>`, paste the example from the docs, feed in real `git log` output, and have a graph that looks indistinguishable from GitKraken in both light and dark mode — within 5 minutes.

**Functional:**
- ✅ Layout engine handles linear, branching, merge, octopus-merge, and orphan-commit fixtures correctly
- ✅ Graph renders without overlap for all fixtures in the test suite
- ✅ Row alignment is pixel-accurate (node center = metadata row baseline ± 0.5px)
- ✅ Dark mode works with zero consumer config
- ✅ 10,000-commit fixture scrolls at 60fps on a mid-tier laptop
- ✅ Screenshot tests pass on Chromium, Firefox, WebKit
- ✅ E2E suite passes against the example app on Chromium, Firefox, WebKit, covering: install flow, initial render, click/hover/select, keyboard nav, theming (light/dark/custom tokens), working-tree row, ref badges, virtualized 10k scroll, animation on commit append, reduced-motion mode, and error states (malformed DAG, missing parents, unsorted commits)

**Quality:**
- Bezier curves visually judged against GitKraken reference screenshots
- No jank on scroll even at max fixture size
- Install → render round-trip under 5 minutes for a new consumer

**UX:**
- Click → `onCommitClick` fires with full commit object
- Hover → row highlights; node emphasizes
- Keyboard navigation (arrow keys move selection) — stretch

---

## 12. Implementation Phases

### Phase 1 — Scaffold
**Goal:** Deployable skeleton with the registry URL live and the example app wired up.
**Deliverables:**
- ✅ pnpm workspace at repo root with two workspace members: `apps/docs` (Next.js docs site) and `examples/consumer-app` (Next.js consumer app)
- ✅ Both apps initialized with Tailwind v4 + shadcn CLI
- ✅ GitHub Pages deployment workflow (`.github/workflows/deploy.yml`) for the docs app
- ✅ Registry route returns a placeholder `registry.json`
- ✅ Landing page with "coming soon" demo slot
- ✅ Playwright installed, browsers pinned, CI matrix set up for Chromium/Firefox/WebKit
- ✅ Initial E2E smoke test: example app boots, navigates to `/`, asserts page title
- ✅ CI pipeline runs Vitest + Playwright E2E on every PR
**Validation:** Public docs URL serves the page; registry JSON is fetchable; CI green on an empty-feature PR.

### Phase 2 — Layout engine
**Goal:** Pure, unit-tested DAG-to-layout function.
**Deliverables:**
- ✅ `computeLayout(commits)` implemented
- ✅ Vitest suite covering: linear, feature-branch, merge, octopus, orphan, long-lived-release
- ✅ Determinism test (same input → byte-identical output across runs)
**Validation:** 100% of fixtures match expected lane assignments.

### Phase 3 — Gutter primitive
**Goal:** Visually production-grade SVG rendering, exercised through the example app.
**Deliverables:**
- ✅ `<GitGraphGutter>` renders nodes, straight lines, forks, merges
- ✅ Bezier tuning finalized
- ✅ CSS variables wired for colors, sizes, strokes
- ✅ Dark mode parity
- ✅ Component copied into the example app via a local file-based install (foreshadows the real CLI install in Phase 5)
- ✅ Example app exposes a `/gutter` route rendering every fixture
- ✅ Playwright screenshot baselines for all fixtures, captured from the example app
- ✅ E2E: theming test — example app toggles CSS variables at runtime, screenshot diff confirms color changes propagate
**Validation:** Side-by-side with GitKraken reference — visually judged "as good or better." Screenshot baselines stable across a re-run.

### Phase 4 — Headline `<GitGraph>` table
**Goal:** Drop-in component for the 80% use case, with full interaction E2E coverage.
**Deliverables:**
- ✅ Metadata columns (hash, message, author, date, refs) with shared row height
- ✅ Row hover/click/select with controlled + uncontrolled modes
- ✅ Ref badges (branch/tag/HEAD)
- ✅ Working-tree row
- ✅ Demo page on docs site with interactive fixture picker
- ✅ Example app `/graph` route renders the headline component against every fixture
- ✅ E2E suite expands to cover:
  - Clicking a row fires `onCommitClick` with the correct commit object (verified via on-page echo)
  - Hover highlights the correct row and node
  - Controlled `selectedSha` prop round-trip
  - Keyboard navigation (if implemented)
  - Ref badges render with correct kind (branch vs tag vs HEAD) and correct styling
  - Working-tree row appears only when `showWorkingTreeRow` is true
- ✅ Pixel-alignment test: Playwright measures node center vs row baseline, asserts within 0.5px
**Validation:** Full E2E suite green on all three browsers.

### Phase 5 — Virtualization + animation + install story + docs
**Goal:** Ship-ready, with consumer-facing documentation beyond the README.
**Deliverables:**
- ✅ `@tanstack/react-virtual` integration with 10k-commit fixture
- ✅ Enter/exit animations respecting `prefers-reduced-motion`
- ✅ `registry.json` finalized
- ✅ **Real install-flow E2E**: CI job wipes the example app's installed component files, runs `npx shadcn@latest add <registry-url>` against the deployed GitHub Pages registry (or a local preview for PR builds), then runs the full E2E suite against the freshly installed component — proves the CLI install path works end-to-end on every release
- ✅ E2E additions:
  - Virtualized 10k-commit scroll performance assertion (frames dropped below threshold)
  - Animation test with `prefers-reduced-motion: reduce` asserting animations are skipped
  - Append-commit test asserting enter animation fires
  - Error-state tests: malformed DAG, missing parents, unsorted commits (component should either render sensibly or surface a clear dev-mode warning)
- ✅ README with animated screenshot and 60-second quickstart
- ✅ **Component documentation site** (pages on the Next.js docs app — not just README), covering:
  - **Installation** — prerequisites (Next.js/Vite, Tailwind v4, shadcn CLI), exact install command, what files get copied where, how CSS variables are added to `globals.css`
  - **Quickstart** — minimal working example with hard-coded 5-commit DAG, live-rendered on the page
  - **Data shape** — annotated `Commit` and `Ref` type reference with one real-world example per field
  - **Recipes** — copy-pasteable working examples for the common cases:
    - Rendering from `git log --format` output (with the exact format string + `fromGitLog()` helper)
    - Rendering from GitHub REST/GraphQL API responses
    - Rendering from `isomorphic-git` output
    - Handling the working-tree / uncommitted row
    - Custom column renderers (author avatar, relative time, clickable sha)
    - Linking commit click to a route / detail drawer
  - **Theming** — full list of CSS variables, before/after examples of retheming branch colors, dark-mode notes, how to match a non-shadcn design system
  - **Primitive usage** — standalone `<GitGraphGutter>` example with consumer-supplied row content
  - **API reference** — every prop on `<GitGraph>` and `<GitGraphGutter>`, every exported type, every callback signature; auto-generated from TSDoc where possible
  - **Performance** — when virtualization kicks in, how to tune `rowHeight`, expected frame budgets, what to do for 100k+ commits (pointer to future Canvas renderer)
  - **Troubleshooting** — common mistakes: missing `parents[]`, unsorted commits, HEAD sha mismatch, Tailwind v4 token not picked up
  - **Live playground** — interactive page where the user edits a JSON DAG and sees the graph re-render, for exploring the data shape
**Validation:**
- Fresh Next.js app → install → render working fixture in under 5 minutes
- A developer who has never seen the component can build a non-trivial real-data integration using only the docs site (no source-code spelunking required)

---

## 13. Future Considerations

- **Canvas renderer** for 100k+ commit graphs (shared layout engine, swap-in `<GitGraphGutterCanvas>`)
- **Horizontal orientation** for space-constrained UIs
- **Real data adapters** — opt-in packages for `isomorphic-git`, GitHub GraphQL, GitLab API
- **Interactive features** — branch filtering UI, author filtering, time-range zoom
- **Commit detail slot** — standardized `<GitGraph.Detail>` drawer component
- **Diff visualization** — show files changed per commit inline
- **Keyboard navigation** — arrow keys, vim-style j/k, `/` to search
- **Mini-map** — overview scroll indicator for long histories
- **Blame integration** — hover a line in a file viewer, highlight introducing commit in the graph

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Bezier curves look "off" — subjective visual quality is hard to nail.** | High — the entire value prop hinges on this | Reserve extra time in Phase 3; build a side-by-side comparison page against GitKraken/GitHub screenshots; iterate until visually judged equivalent or better. |
| **Layout algorithm produces edge-crossings or lane thrashing on real-world repos.** | High — breaks trust | Test against real `git log` output from 5+ public repos (React, Linux, shadcn/ui, Next.js, TypeScript) during Phase 2. |
| **shadcn CLI registry format churns during development.** | Medium | Pin to a specific CLI version in docs; follow shadcn/ui main repo changelog weekly during build. |
| **Virtualized SVG + table row alignment drifts by subpixels.** | Medium — violates "perfect alignment" promise | Dedicated alignment test in Playwright that asserts node center = row baseline within 0.5px at multiple zoom levels. |
| **Tailwind v4 + React 19 ecosystem still settling — peer-dep breakage.** | Low-medium | Lock deps in example app; document known-good versions; smoke-test install on fresh project weekly. |

---

## 15. Appendix

### Related documents
- `./resources/graph-resources.md` — reference links (gitgraph.js archived, git-igitt, GitKraken screenshots)
- `./memory/feedback_no_gsd.md` — workflow preference: plan conversationally, no `/gsd:*`

### Key dependencies
- [shadcn/ui registry docs](https://ui.shadcn.com/docs/registry)
- [Tailwind v4 theme docs](https://tailwindcss.com/docs/theme)
- [@tanstack/react-virtual](https://tanstack.com/virtual/latest)
- [lucide-react](https://lucide.dev)

### Repository structure (target)

```
D:\repos\GitGraph\
├── apps/
│   └── docs/                     # Next.js docs + demo site (GitHub Pages target)
│       ├── app/
│       │   ├── page.tsx
│       │   ├── docs/
│       │   └── r/[name]/route.ts # registry JSON endpoint
│       ├── components/ui/        # shadcn chrome for the docs site itself
│       ├── next.config.ts
│       └── package.json
├── examples/
│   └── consumer-app/             # fresh Next.js app — installs component via shadcn CLI
│       ├── app/
│       │   ├── gutter/page.tsx   # exercises <GitGraphGutter>
│       │   └── graph/page.tsx    # exercises <GitGraph>
│       ├── components/ui/        # populated by `npx shadcn@latest add ...`
│       ├── lib/git-graph/        # populated by the install too
│       └── package.json
├── registry/
│   └── git-graph/                # source of truth — copied into consumer apps by shadcn CLI
│       ├── git-graph.tsx
│       ├── git-graph-gutter.tsx
│       ├── lib/
│       │   ├── layout.ts
│       │   ├── bezier.ts
│       │   └── from-git-log.ts
│       └── types.ts
├── tests/
│   ├── unit/
│   │   └── layout.test.ts        # Vitest — pure layout engine
│   └── e2e/
│       ├── install-flow.spec.ts  # shadcn CLI install → render
│       ├── interactions.spec.ts  # click/hover/select/keyboard
│       ├── theming.spec.ts       # CSS var overrides, dark mode
│       ├── virtualization.spec.ts
│       ├── animation.spec.ts     # incl. prefers-reduced-motion
│       ├── errors.spec.ts        # malformed DAG paths
│       └── screenshots/          # Playwright visual baselines
├── docs/
│   └── PRD.md                    # this file
├── resources/
│   └── graph-resources.md
├── .github/workflows/
│   ├── deploy.yml                # docs site → GitHub Pages
│   └── ci.yml                    # Vitest + Playwright E2E on every PR
├── pnpm-workspace.yaml
├── playwright.config.ts
├── vitest.config.ts
└── package.json                  # workspace root
```

---

## Decisions confirmed

- **A. pnpm workspace** with `apps/docs` + `examples/consumer-app` + a registry source folder. (Originally proposed as single-package; bumped to a lightweight workspace so the example app has a real home for E2E.)
- **B. React 19 + Tailwind v4** — confirmed.
- **C. `@tanstack/react-virtual`** — confirmed.
- **D. `lucide-react`** — confirmed.
- **E. Complete E2E testing** — confirmed, scope expanded: Vitest for the layout engine, Playwright for screenshot regression AND a full E2E suite driven through the example Next.js app. The example app itself is a deliverable, installs the component via the real `npx shadcn@latest add` flow in Phase 5, and is the host for all interaction/theming/virtualization/animation/error-state tests across Chromium, Firefox, and WebKit.

## Next steps

1. Begin **Phase 1 — Scaffold**: pnpm workspace, docs app + example app, Tailwind v4, shadcn CLI, GitHub Pages workflow, placeholder registry route, Playwright installed with a smoke E2E running in CI.
2. Move to **Phase 2 — Layout engine**, where test fixtures are the first real deliverable.
