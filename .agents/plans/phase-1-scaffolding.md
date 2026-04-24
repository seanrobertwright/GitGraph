# Feature: Phase 1 — Scaffolding

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Stand up the GitGraph monorepo skeleton so later phases have a home. This phase ships **no component code**. It produces: a pnpm workspace rooted at `D:\repos\GitGraph`, two Next.js 15 apps (`apps/docs` + `examples/consumer-app`) each on Tailwind v4 with hand-authored shadcn-compatible scaffolding, an empty `registry/git-graph/` source folder, a placeholder `registry.json` endpoint on the docs app, a GitHub Pages deploy workflow for the docs app, a CI workflow running Vitest + Playwright on every PR, and one green Playwright smoke test that boots the consumer app and asserts the page title.

Success is measured by infrastructure, not features: the docs site deploys, the registry JSON is fetchable, and CI is green on an empty-feature PR.

**Determinism principle:** We hand-author every config and boilerplate file rather than using `create-next-app` or `shadcn init`. No CLI scaffolders means no template drift, no interactive prompts, no "it depends on when you run it" behavior. Every dependency is pinned to an exact version. The same plan run today and six months from now produces the same tree.

## User Story

As the GitGraph maintainer
I want a deployable, CI-wired monorepo skeleton with both the docs app and the consumer example app scaffolded
So that Phase 2+ can focus purely on the layout engine and component code instead of plumbing.

## Problem Statement

The repo currently contains only `docs/PRD.md`, `resources/graph-resources.md`, and `.claude/`. There is no git repo, no GitHub remote, no `package.json`, no workspace config, no apps, no test runners, no CI, no deploy pipeline. Every subsequent phase (layout engine, gutter, headline table, virtualization, install flow) depends on this infrastructure existing. Without it, we can't write a single test or ship a single byte.

## Solution Statement

Create the GitHub repo and initialize git. Build a pnpm workspace with two hand-authored Next.js 15 app members (`apps/docs`, `examples/consumer-app`) and a shared `registry/git-graph/` source folder. Both apps get Tailwind v4 wired via `@tailwindcss/postcss` + a CSS-first `@theme` block, plus a hand-written `components.json` + `lib/utils.ts` that matches shadcn's expected shape (so running `shadcn add` in Phase 5 works without surprises). The docs app gets a dynamic `/r/[name]/route.ts` that serves a hard-coded placeholder registry JSON under `output: 'export'`. Add `vitest.config.ts` and `playwright.config.ts` at repo root. Add one Playwright smoke test that boots `examples/consumer-app` and asserts its title. Add `.github/workflows/deploy.yml` (docs → GitHub Pages, auto-enabling Pages via `configure-pages@v5`) and `.github/workflows/ci.yml` (Vitest + Playwright on PR).

## Feature Metadata

**Feature Type**: New Capability (greenfield scaffolding)
**Estimated Complexity**: Medium — mechanical but wide surface area.
**Primary Systems Affected**: Whole repo (greenfield).

**Exact versions (pinned — do not substitute):**
- `node`: 22.x (`.nvmrc` = `22`)
- `pnpm`: `10.33.0`
- `next`: `15.1.6`
- `react`: `19.0.0`
- `react-dom`: `19.0.0`
- `@types/react`: `19.0.7`
- `@types/react-dom`: `19.0.3`
- `@types/node`: `22.10.5`
- `typescript`: `5.7.3`
- `tailwindcss`: `4.0.0`
- `@tailwindcss/postcss`: `4.0.0`
- `postcss`: `8.5.1`
- `clsx`: `2.1.1`
- `tailwind-merge`: `2.6.0`
- `eslint`: `9.18.0`
- `eslint-config-next`: `15.1.6`
- `vitest`: `2.1.9`
- `@playwright/test`: `1.49.1`

If any of these don't resolve at install time, halt and ask — don't substitute. (Rationale: the whole point of this revision is zero version drift.)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `docs/PRD.md` (entire file, especially §8 Technology Stack, §12 Phase 1, §15 Repository structure target, lines 253–280, 383–395, 511–563) — canonical source of truth for what Phase 1 must deliver and the exact target directory layout.
- `resources/graph-resources.md` — visual references only; informational for later phases.
- `memory/feedback_no_gsd.md` — workflow note; confirms we plan conversationally, no `/gsd:*` commands.

### New Files to Create

**Repo root**
- `package.json` — workspace root, `"private": true`, scripts, pinned dev deps.
- `pnpm-workspace.yaml` — declares `apps/*` and `examples/*` as members.
- `.npmrc` — `engine-strict=true`, `shamefully-hoist=false`.
- `.nvmrc` — `22`.
- `.gitignore` — Node + Next.js + pnpm + Playwright + Vitest.
- `.gitattributes` — `* text=auto eol=lf` (critical on Windows).
- `tsconfig.base.json` — strict, shared by both apps.
- `vitest.config.ts` — repo-root config.
- `playwright.config.ts` — repo-root config, 3-browser matrix, webServer on :3100.
- `README.md` — one-paragraph stub.
- `eslint.config.mjs` — flat config, extends `next/core-web-vitals` per app (we'll keep per-app configs since they differ).

**apps/docs (Next.js 15 App Router, static export)**
- `apps/docs/package.json`
- `apps/docs/next.config.ts`
- `apps/docs/tsconfig.json`
- `apps/docs/next-env.d.ts` (auto-regenerated by Next on first build; commit it)
- `apps/docs/postcss.config.mjs`
- `apps/docs/eslint.config.mjs`
- `apps/docs/components.json` — hand-authored shadcn config
- `apps/docs/lib/utils.ts` — `cn()` helper
- `apps/docs/app/layout.tsx`
- `apps/docs/app/page.tsx` — "coming soon" landing
- `apps/docs/app/globals.css` — `@import "tailwindcss";` + `@theme` with shadcn tokens + `--graph-branch-1..8` placeholders
- `apps/docs/app/r/[name]/route.ts` — placeholder registry endpoint

**examples/consumer-app (Next.js 15 App Router, dev-mode for Playwright)**
- `examples/consumer-app/package.json`
- `examples/consumer-app/next.config.ts`
- `examples/consumer-app/tsconfig.json`
- `examples/consumer-app/next-env.d.ts`
- `examples/consumer-app/postcss.config.mjs`
- `examples/consumer-app/eslint.config.mjs`
- `examples/consumer-app/components.json`
- `examples/consumer-app/lib/utils.ts`
- `examples/consumer-app/app/layout.tsx` — metadata title `GitGraph Consumer App`
- `examples/consumer-app/app/page.tsx` — `<h1>GitGraph Consumer App</h1>`
- `examples/consumer-app/app/globals.css`

**registry source (raw files — NOT a workspace member)**
- `registry/git-graph/.gitkeep`

**tests**
- `tests/e2e/smoke.spec.ts`
- `tests/unit/sanity.test.ts` — `expect(true).toBe(true)` to guarantee Vitest exits 0 regardless of version behavior.

**CI & deploy**
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

### Relevant Documentation — YOU SHOULD READ THESE BEFORE IMPLEMENTING

- [pnpm workspaces](https://pnpm.io/workspaces) — `pnpm-workspace.yaml` format.
- [Next.js 15 — static exports](https://nextjs.org/docs/app/guides/static-exports) — `output: 'export'` + `generateStaticParams` for dynamic routes.
- [Next.js basePath](https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath) — for GitHub Pages under `/GitGraph`.
- [Tailwind v4 with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs) — CSS-first `@theme`, `@tailwindcss/postcss`.
- [shadcn CLI — components.json](https://ui.shadcn.com/docs/components-json) — exact shape we hand-author.
- [Playwright — webServer](https://playwright.dev/docs/test-webserver) — auto-boot consumer app.
- [actions/deploy-pages](https://github.com/actions/deploy-pages) + [actions/configure-pages](https://github.com/actions/configure-pages) — `enablement: true` auto-provisions Pages.
- [GitHub CLI — repo create](https://cli.github.com/manual/gh_repo_create) — for task 0.

### Patterns to Follow

No existing codebase patterns. Establish these now:

- **Files:** `kebab-case.ts[x]`. React components default-exported as `PascalCase`.
- **Types:** `PascalCase`, prefer `type` over `interface`.
- **Tests:** `*.spec.ts` for Playwright, `*.test.ts` for Vitest.
- **Package manager:** pnpm only. `engine-strict` enforces this.
- **TS:** strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- **Imports within an app:** `@/` alias.
- **Git hygiene:** never commit `node_modules/`, `.next/`, `out/`, `test-results/`, `playwright-report/`, `coverage/`.
- **CI:** one job per concern (lint, typecheck, unit, e2e). Matrix only for e2e browsers.

---

## IMPLEMENTATION PLAN

### Phase 1a — Remote + local git
- GitHub repo created + wired to local.

### Phase 1b — Workspace bones
- Root config files, `.gitignore`/`.gitattributes`, tsconfig base.

### Phase 1c — Hand-authored apps
- `apps/docs` written file-by-file (no scaffolder).
- `examples/consumer-app` written file-by-file.
- First successful `pnpm install` + `pnpm --filter docs dev`.

### Phase 1d — Test runners
- Vitest + Playwright configs.
- Smoke test passing locally on all three browsers.

### Phase 1e — CI & deploy
- `ci.yml` green on a PR.
- `deploy.yml` with `configure-pages@v5 enablement: true` — auto-enables Pages on first run, no manual toggle.
- Public Pages URL + registry JSON fetch 200.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable. All commands assume cwd `D:\repos\GitGraph` unless stated.

### 0. CREATE GitHub repo (user-gated)

- **IMPLEMENT**: Confirm with the user first, then: `gh repo create seanrobertwright/GitGraph --public --description "React component for Git commit DAG visualization, shadcn-installable" --source . --remote origin`. Do NOT push yet — local git init happens in task 1.
- **GOTCHA**: `gh` requires auth (`gh auth status`). If unauthenticated, stop and ask the user to run `gh auth login`.
- **GOTCHA**: If the repo already exists, `gh repo create` errors. Use `gh repo view seanrobertwright/GitGraph` first; if present, skip the create and just `git remote add origin https://github.com/seanrobertwright/GitGraph.git` in task 1.
- **VALIDATE**: `gh repo view seanrobertwright/GitGraph --json url -q .url` prints the repo URL.

### 1. INIT local git and basic root files

- **IMPLEMENT**:
  - `git init -b main`
  - `git remote add origin https://github.com/seanrobertwright/GitGraph.git` (skip if task 0 already added it via `--source`)
  - Create `.gitattributes` with: `* text=auto eol=lf`
  - Create `.nvmrc` with: `22`
  - Create `.npmrc` with: `engine-strict=true\nshamefully-hoist=false`
  - Create `.gitignore` with Node/Next/pnpm/Playwright/Vitest entries: `node_modules/`, `.next/`, `out/`, `dist/`, `build/`, `coverage/`, `.turbo/`, `test-results/`, `playwright-report/`, `playwright/.cache/`, `.DS_Store`, `*.log`, `.env*.local`, `*.tsbuildinfo`.
- **GOTCHA**: `.gitattributes` must be committed in the first commit or earlier files inherit CRLF on Windows. Create it NOW before any other files.
- **VALIDATE**: `git rev-parse --is-inside-work-tree` → `true`; `git remote -v` shows origin.

### 2. CREATE pnpm-workspace.yaml

- **IMPLEMENT**:
  ```yaml
  packages:
    - "apps/*"
    - "examples/*"
  ```
- **GOTCHA**: `registry/` is intentionally NOT a workspace member.
- **VALIDATE**: File exists.

### 3. CREATE root package.json

- **IMPLEMENT**:
  ```json
  {
    "name": "gitgraph-monorepo",
    "private": true,
    "version": "0.0.0",
    "packageManager": "pnpm@10.33.0",
    "engines": { "node": ">=22" },
    "scripts": {
      "dev:docs": "pnpm --filter docs dev",
      "dev:consumer": "pnpm --filter consumer-app dev -p 3100",
      "build:docs": "pnpm --filter docs build",
      "lint": "pnpm -r --parallel lint",
      "typecheck": "pnpm -r --parallel typecheck",
      "test": "vitest run",
      "test:e2e": "playwright test"
    },
    "devDependencies": {
      "@playwright/test": "1.49.1",
      "@types/node": "22.10.5",
      "typescript": "5.7.3",
      "vitest": "2.1.9"
    }
  }
  ```
- **VALIDATE**: `pnpm install` completes (no app workspaces exist yet, so this just installs the root devDeps).

### 4. CREATE tsconfig.base.json

- **IMPLEMENT**:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "Bundler",
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "jsx": "preserve",
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "exactOptionalPropertyTypes": true,
      "skipLibCheck": true,
      "isolatedModules": true,
      "esModuleInterop": true,
      "allowSyntheticDefaultImports": true,
      "resolveJsonModule": true,
      "forceConsistentCasingInFileNames": true,
      "incremental": true
    }
  }
  ```
- **VALIDATE**: JSON parses.

### 5. CREATE apps/docs/package.json (hand-authored, no scaffolder)

- **IMPLEMENT**:
  ```json
  {
    "name": "docs",
    "version": "0.0.0",
    "private": true,
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "next lint",
      "typecheck": "tsc --noEmit"
    },
    "dependencies": {
      "clsx": "2.1.1",
      "next": "15.1.6",
      "react": "19.0.0",
      "react-dom": "19.0.0",
      "tailwind-merge": "2.6.0"
    },
    "devDependencies": {
      "@tailwindcss/postcss": "4.0.0",
      "@types/react": "19.0.7",
      "@types/react-dom": "19.0.3",
      "eslint": "9.18.0",
      "eslint-config-next": "15.1.6",
      "postcss": "8.5.1",
      "tailwindcss": "4.0.0",
      "typescript": "5.7.3"
    }
  }
  ```
- **VALIDATE**: JSON parses.

### 6. CREATE apps/docs/tsconfig.json

- **IMPLEMENT**:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "plugins": [{ "name": "next" }],
      "paths": { "@/*": ["./*"] },
      "noEmit": true
    },
    "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    "exclude": ["node_modules"]
  }
  ```
- **VALIDATE**: JSON parses.

### 7. CREATE apps/docs/next.config.ts

- **IMPLEMENT**:
  ```ts
  import type { NextConfig } from "next";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const config: NextConfig = {
    output: "export",
    basePath,
    images: { unoptimized: true },
    trailingSlash: true,
  };
  export default config;
  ```
- **GOTCHA**: `trailingSlash: true` required so GitHub Pages resolves `/r/git-graph/` → `index.html`. `images.unoptimized` required under `output: 'export'`.
- **VALIDATE**: TS parses cleanly.

### 8. CREATE apps/docs/postcss.config.mjs

- **IMPLEMENT**:
  ```js
  export default {
    plugins: {
      "@tailwindcss/postcss": {},
    },
  };
  ```
- **VALIDATE**: Module loads.

### 9. CREATE apps/docs/eslint.config.mjs

- **IMPLEMENT**:
  ```js
  import { FlatCompat } from "@eslint/eslintrc";
  const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
  export default [...compat.extends("next/core-web-vitals", "next/typescript")];
  ```
- **GOTCHA**: `@eslint/eslintrc` comes transitively via `eslint-config-next`; if pnpm flags it missing, add explicit `"@eslint/eslintrc": "3.2.0"` to devDeps.
- **VALIDATE**: `pnpm --filter docs lint` runs (may report no files; that's fine pre-commit).

### 10. CREATE apps/docs/components.json (hand-authored shadcn config)

- **IMPLEMENT**:
  ```json
  {
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "new-york",
    "rsc": true,
    "tsx": true,
    "tailwind": {
      "config": "",
      "css": "app/globals.css",
      "baseColor": "neutral",
      "cssVariables": true,
      "prefix": ""
    },
    "aliases": {
      "components": "@/components",
      "utils": "@/lib/utils",
      "ui": "@/components/ui",
      "lib": "@/lib",
      "hooks": "@/hooks"
    },
    "iconLibrary": "lucide"
  }
  ```
- **GOTCHA**: Empty `tailwind.config` string is correct for Tailwind v4 (CSS-first config — no JS file).
- **VALIDATE**: `pnpm dlx shadcn@2.1.8 diff` runs without erroring on config shape (optional sanity check; don't make it blocking).

### 11. CREATE apps/docs/lib/utils.ts

- **IMPLEMENT**:
  ```ts
  import { clsx, type ClassValue } from "clsx";
  import { twMerge } from "tailwind-merge";
  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```
- **VALIDATE**: `pnpm --filter docs typecheck` after step 16 passes.

### 12. CREATE apps/docs/app/layout.tsx

- **IMPLEMENT**:
  ```tsx
  import type { Metadata } from "next";
  import "./globals.css";
  export const metadata: Metadata = {
    title: "GitGraph",
    description: "React component for rendering Git commit history as a visual DAG.",
  };
  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
      </html>
    );
  }
  ```
- **VALIDATE**: TS parses.

### 13. CREATE apps/docs/app/page.tsx

- **IMPLEMENT**:
  ```tsx
  export default function Home() {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="text-4xl font-bold tracking-tight">GitGraph</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A shadcn-installable React component for rendering Git history as a visual DAG. Coming soon.
        </p>
        <pre className="mt-8 rounded-md border bg-muted p-4 text-sm">
          <code>npx shadcn@latest add https://seanrobertwright.github.io/GitGraph/r/git-graph.json</code>
        </pre>
      </main>
    );
  }
  ```
- **VALIDATE**: After install, `pnpm --filter docs dev` renders this at `/`.

### 14. CREATE apps/docs/app/globals.css

- **IMPLEMENT**: Full Tailwind v4 CSS-first config with shadcn tokens + graph branch vars.
  ```css
  @import "tailwindcss";

  @theme {
    --color-background: hsl(0 0% 100%);
    --color-foreground: hsl(240 10% 3.9%);
    --color-muted: hsl(240 4.8% 95.9%);
    --color-muted-foreground: hsl(240 3.8% 46.1%);
    --color-border: hsl(240 5.9% 90%);

    --graph-branch-1: 220 80% 55%;
    --graph-branch-2: 160 70% 45%;
    --graph-branch-3: 30 90% 55%;
    --graph-branch-4: 340 75% 55%;
    --graph-branch-5: 270 70% 60%;
    --graph-branch-6: 180 65% 45%;
    --graph-branch-7: 50 85% 55%;
    --graph-branch-8: 0 0% 50%;
  }

  @media (prefers-color-scheme: dark) {
    @theme {
      --color-background: hsl(240 10% 3.9%);
      --color-foreground: hsl(0 0% 98%);
      --color-muted: hsl(240 3.7% 15.9%);
      --color-muted-foreground: hsl(240 5% 64.9%);
      --color-border: hsl(240 3.7% 15.9%);
    }
  }
  ```
- **GOTCHA**: Tailwind v4 dark-mode variant is opt-in; for Phase 1 we use `prefers-color-scheme` so no JS is needed. Phase 3+ will likely switch to a `.dark` class variant — fine to change later.
- **VALIDATE**: `pnpm --filter docs build` succeeds and `apps/docs/out/index.html` references generated Tailwind classes.

### 15. CREATE apps/docs/app/r/[name]/route.ts

- **IMPLEMENT**:
  ```ts
  import { NextResponse } from "next/server";
  export const dynamic = "force-static";
  export function generateStaticParams() {
    return [{ name: "git-graph" }];
  }
  const PLACEHOLDER = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: "git-graph",
    type: "registry:component",
    dependencies: ["@tanstack/react-virtual", "lucide-react", "clsx"],
    registryDependencies: [],
    files: [],
  };
  export async function GET(_: Request, ctx: { params: Promise<{ name: string }> }) {
    const { name } = await ctx.params;
    if (name !== "git-graph") return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(PLACEHOLDER);
  }
  ```
- **GOTCHA**: Next 15 — `params` is a Promise; await it. `force-static` + `generateStaticParams` required under `output: 'export'`.
- **VALIDATE**: After step 25, `apps/docs/out/r/git-graph.json` exists with `"name": "git-graph"`.

### 16. CREATE apps/docs/next-env.d.ts

- **IMPLEMENT**:
  ```ts
  /// <reference types="next" />
  /// <reference types="next/image-types/global" />
  // NOTE: This file should not be edited
  // see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
  ```
- **GOTCHA**: Normally auto-generated; we hand-author so `typecheck` works before the first `next build`. Next will overwrite it identically on first build.
- **VALIDATE**: File exists.

### 17. CREATE examples/consumer-app/ — mirror of apps/docs

- **IMPLEMENT**: Repeat steps 5–16 for `examples/consumer-app` with these changes:
  - `package.json` → `"name": "consumer-app"`, same deps/versions as docs.
  - `next.config.ts` → no `output: 'export'`, no `basePath`. Just:
    ```ts
    import type { NextConfig } from "next";
    const config: NextConfig = {};
    export default config;
    ```
  - `app/layout.tsx` → `metadata.title = "GitGraph Consumer App"` (exact string — smoke test asserts it).
  - `app/page.tsx`:
    ```tsx
    export default function Home() {
      return (
        <main className="mx-auto max-w-3xl px-6 py-24">
          <h1 className="text-4xl font-bold">GitGraph Consumer App</h1>
          <p className="mt-2 text-muted-foreground">Phase 1 smoke target.</p>
        </main>
      );
    }
    ```
  - Skip `app/r/[name]/route.ts` — only docs has the registry endpoint.
- **VALIDATE**: After install, `pnpm --filter consumer-app dev -p 3100` serves on :3100 with `<title>GitGraph Consumer App</title>`.

### 18. CREATE registry/git-graph/.gitkeep

- **IMPLEMENT**: Empty file.
- **VALIDATE**: Path exists.

### 19. RUN pnpm install (first real install)

- **IMPLEMENT**: From repo root: `pnpm install`.
- **GOTCHA**: If any pinned version in steps 5/17 doesn't resolve, pnpm will error loudly. Do NOT bump versions to unstick — halt and escalate to the user.
- **VALIDATE**: `pnpm-lock.yaml` exists; `ls apps/docs/node_modules/next/package.json` shows `"version": "15.1.6"`.

### 20. CREATE vitest.config.ts

- **IMPLEMENT**:
  ```ts
  import { defineConfig } from "vitest/config";
  export default defineConfig({
    test: {
      include: ["tests/unit/**/*.test.ts", "registry/**/*.test.ts"],
      environment: "node",
    },
  });
  ```
- **VALIDATE**: After step 21, `pnpm test` exits 0.

### 21. CREATE tests/unit/sanity.test.ts

- **IMPLEMENT**:
  ```ts
  import { expect, test } from "vitest";
  test("sanity", () => {
    expect(true).toBe(true);
  });
  ```
- **GOTCHA**: Included so `vitest run` exits 0 regardless of "no tests found" behavior across versions.
- **VALIDATE**: `pnpm test` → 1 passed.

### 22. CREATE playwright.config.ts

- **IMPLEMENT**:
  ```ts
  import { defineConfig, devices } from "@playwright/test";
  export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
      baseURL: "http://localhost:3100",
      trace: "on-first-retry",
    },
    projects: [
      { name: "chromium", use: { ...devices["Desktop Chrome"] } },
      { name: "firefox", use: { ...devices["Desktop Firefox"] } },
      { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ],
    webServer: {
      command: "pnpm --filter consumer-app dev -p 3100",
      url: "http://localhost:3100",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  });
  ```
- **VALIDATE**: `pnpm exec playwright test --list` lists the 3 projects.

### 23. INSTALL Playwright browsers

- **IMPLEMENT**: `pnpm exec playwright install --with-deps chromium firefox webkit`
- **VALIDATE**: `pnpm exec playwright --version` prints `1.49.1`.

### 24. CREATE tests/e2e/smoke.spec.ts

- **IMPLEMENT**:
  ```ts
  import { test, expect } from "@playwright/test";
  test("consumer app loads with correct title and heading", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/GitGraph Consumer App/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/GitGraph Consumer App/);
  });
  ```
- **VALIDATE**: `pnpm test:e2e --project=chromium` exits 0; then `pnpm test:e2e` exits 0 on all three.

### 25. LOCAL BUILD CHECK — docs static export

- **IMPLEMENT** (bash):
  ```
  NEXT_PUBLIC_BASE_PATH=/GitGraph pnpm build:docs
  ```
  PowerShell equivalent: `$env:NEXT_PUBLIC_BASE_PATH="/GitGraph"; pnpm build:docs`
- **VALIDATE**:
  - `apps/docs/out/index.html` exists.
  - `apps/docs/out/r/git-graph.json` exists; `cat` shows the placeholder body with `"name": "git-graph"`.
  - `grep -q "/GitGraph/_next" apps/docs/out/index.html` — asset paths use the base path.

### 26. CREATE .github/workflows/ci.yml

- **IMPLEMENT**:
  ```yaml
  name: CI
  on:
    pull_request:
    push:
      branches: [main]
  jobs:
    setup-info:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
          with: { version: 10.33.0 }
        - uses: actions/setup-node@v4
          with: { node-version: 22, cache: pnpm }
        - run: pnpm install --frozen-lockfile

    lint:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
          with: { version: 10.33.0 }
        - uses: actions/setup-node@v4
          with: { node-version: 22, cache: pnpm }
        - run: pnpm install --frozen-lockfile
        - run: pnpm lint

    typecheck:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
          with: { version: 10.33.0 }
        - uses: actions/setup-node@v4
          with: { node-version: 22, cache: pnpm }
        - run: pnpm install --frozen-lockfile
        - run: pnpm typecheck

    unit:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
          with: { version: 10.33.0 }
        - uses: actions/setup-node@v4
          with: { node-version: 22, cache: pnpm }
        - run: pnpm install --frozen-lockfile
        - run: pnpm test

    e2e:
      runs-on: ubuntu-latest
      strategy:
        fail-fast: false
        matrix:
          browser: [chromium, firefox, webkit]
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
          with: { version: 10.33.0 }
        - uses: actions/setup-node@v4
          with: { node-version: 22, cache: pnpm }
        - run: pnpm install --frozen-lockfile
        - run: pnpm exec playwright install --with-deps ${{ matrix.browser }}
        - run: pnpm test:e2e --project=${{ matrix.browser }}
        - if: failure()
          uses: actions/upload-artifact@v4
          with:
            name: playwright-report-${{ matrix.browser }}
            path: playwright-report/
            retention-days: 7
  ```
- **VALIDATE**: After push + PR in step 28, all 5 jobs (lint, typecheck, unit, e2e×3) are green.

### 27. CREATE .github/workflows/deploy.yml

- **IMPLEMENT**:
  ```yaml
  name: Deploy docs to GitHub Pages
  on:
    push:
      branches: [main]
    workflow_dispatch:
  permissions:
    contents: read
    pages: write
    id-token: write
  concurrency:
    group: pages
    cancel-in-progress: false
  jobs:
    build-deploy:
      runs-on: ubuntu-latest
      environment:
        name: github-pages
        url: ${{ steps.deployment.outputs.page_url }}
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
          with: { version: 10.33.0 }
        - uses: actions/setup-node@v4
          with: { node-version: 22, cache: pnpm }
        - run: pnpm install --frozen-lockfile
        - name: Configure Pages
          uses: actions/configure-pages@v5
          with:
            enablement: true
        - name: Build docs
          env:
            NEXT_PUBLIC_BASE_PATH: /GitGraph
          run: pnpm build:docs
        - uses: actions/upload-pages-artifact@v3
          with:
            path: apps/docs/out
        - id: deployment
          uses: actions/deploy-pages@v4
  ```
- **GOTCHA**: `configure-pages@v5` with `enablement: true` auto-provisions Pages on first run — **no manual Settings → Pages toggle required**. Requires the `pages: write` + `id-token: write` permissions (set above).
- **VALIDATE**: After merge to `main`, the Actions tab shows this workflow green, and the run summary exposes a Pages URL.

### 28. FIRST COMMIT + PR

- **IMPLEMENT**:
  - `git add -A`
  - `git commit -m "Phase 1: monorepo scaffold, hand-authored apps, CI, Pages deploy"`
  - `git checkout -b phase-1-scaffold` (don't push to main directly; we want CI to run on the PR)
  - `git push -u origin phase-1-scaffold`
  - `gh pr create --title "Phase 1: scaffolding" --body "Greenfield scaffold per .agents/plans/phase-1-scaffolding.md. No component code yet."`
- **GOTCHA**: Verify `git status` shows nothing unexpected before committing. `git ls-files | wc -l` should be < 50 tracked files.
- **VALIDATE**: PR opens, all 5 CI jobs green.

### 29. MERGE + VERIFY DEPLOY

- **IMPLEMENT**: After review, `gh pr merge --squash --delete-branch`.
- **VALIDATE**:
  - `deploy.yml` run goes green.
  - `curl -sI https://seanrobertwright.github.io/GitGraph/` → `HTTP/2 200`.
  - `curl -s https://seanrobertwright.github.io/GitGraph/r/git-graph.json | jq .name` → `"git-graph"`.

---

## TESTING STRATEGY

### Unit Tests
One `sanity.test.ts` to guarantee `vitest run` exits green. Phase 2 replaces it with real layout tests.

### Integration Tests
One Playwright smoke test asserting the consumer app's title + heading. Runs on Chromium, Firefox, WebKit.

### Edge Cases
Scaffold-level only:
- Fresh clone → `pnpm install && pnpm test && pnpm test:e2e` all pass.
- `NEXT_PUBLIC_BASE_PATH=/GitGraph pnpm build:docs` produces a working static `out/`.
- No `node_modules`/`.next` tracked in git.
- Windows CRLF not leaking (`.gitattributes` committed in task 1).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
```bash
pnpm -r --parallel lint
pnpm -r --parallel typecheck
```

### Level 2: Unit Tests
```bash
pnpm test
```

### Level 3: Integration Tests
```bash
pnpm test:e2e                      # all three browsers
pnpm test:e2e --project=chromium   # faster inner loop
```

### Level 4: Manual Validation
```bash
pnpm dev:docs       # http://localhost:3000 → "coming soon"
pnpm dev:consumer   # http://localhost:3100 → "GitGraph Consumer App" heading

NEXT_PUBLIC_BASE_PATH=/GitGraph pnpm build:docs
ls apps/docs/out/r/git-graph.json
cat apps/docs/out/r/git-graph.json | jq .name    # "git-graph"
```

### Level 5: Post-merge Validation
```bash
curl -sI https://seanrobertwright.github.io/GitGraph/
curl -s https://seanrobertwright.github.io/GitGraph/r/git-graph.json | jq .name
gh run list --workflow=deploy.yml --limit 1
```

---

## ACCEPTANCE CRITERIA

- [ ] GitHub repo `seanrobertwright/GitGraph` exists; local git initialized with `main` default.
- [ ] `pnpm install` from a clean clone succeeds.
- [ ] `pnpm-workspace.yaml` lists `apps/*` and `examples/*`; `registry/` is NOT a workspace.
- [ ] `apps/docs` boots on :3000; landing page shows "coming soon" + install command.
- [ ] `examples/consumer-app` boots on :3100 with title and heading `GitGraph Consumer App`.
- [ ] Both apps have hand-authored `components.json` + `lib/utils.ts` matching shadcn's v2 shape.
- [ ] Both apps use Tailwind v4 with `@tailwindcss/postcss` and `@import "tailwindcss"` in `globals.css` (no `tailwind.config.js`).
- [ ] `apps/docs` builds with `output: 'export'`; `out/r/git-graph.json` matches shadcn registry-item schema.
- [ ] `pnpm test` + `pnpm test:e2e` exit 0 locally on all three browsers.
- [ ] `.github/workflows/ci.yml` runs lint, typecheck, unit, e2e×3 on every PR.
- [ ] `.github/workflows/deploy.yml` deploys `apps/docs/out` to Pages on merge to `main`, with Pages auto-enabled via `configure-pages@v5`.
- [ ] `https://seanrobertwright.github.io/GitGraph/` returns 200; `/r/git-graph.json` returns the placeholder.
- [ ] `.gitignore` + `.gitattributes` correct; no `node_modules/`, `.next/`, `out/`, `playwright-report/`, or `test-results/` in git; LF line endings.
- [ ] Every dependency matches the pinned versions in "Feature Metadata."

---

## COMPLETION CHECKLIST

- [ ] All 29 tasks completed in order.
- [ ] Each task's VALIDATE step passed immediately.
- [ ] All Level 1–5 validation commands pass.
- [ ] Smoke E2E green on all three browsers locally AND in CI.
- [ ] PR open → all CI jobs green → merged.
- [ ] Deploy workflow green; public URL + registry JSON both return 200.
- [ ] No GitGraph component code exists yet — Phase 1 is infrastructure only.

---

## NOTES

**Determinism is the design goal of this revision.** Every file hand-authored. Every version pinned. No CLI scaffolders. `configure-pages@v5 enablement: true` removes the one remaining manual step. This plan should produce the same tree run today or next year.

**Zero manual steps post-task-0.** Task 0 requires user auth for `gh` (one-time `gh auth login` if not already set up). Every other step is scriptable and verifiable.

**Design decisions locked in this phase** (don't relitigate later):
- pnpm workspace, Next 15 App Router for both apps, Tailwind v4 via `@theme`.
- Static export + `force-static` registry route for docs.
- Port 3100 for consumer app (3000 stays free for docs).
- Node 22 (`.nvmrc` + CI + `engines`).
- Dark mode via `prefers-color-scheme` for Phase 1; may switch to `.dark` class in Phase 3.

**Confidence score for one-pass execution: 10/10** — with the understood caveat that if any pinned version in "Feature Metadata" has been yanked from npm at execution time, the execution agent MUST halt and escalate rather than substitute. Silent version drift is the one failure mode this plan deliberately excludes; do not paper over it.
