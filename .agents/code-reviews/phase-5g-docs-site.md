# Phase 5G — Docs site + README — Code Review

## Stats

- Files Modified: 6
- Files Added: 20
- Files Deleted: 0
- New lines: ~860
- Deleted lines: ~21

## Issues

---

```
severity: high
file: apps/docs/app/docs/performance/page.tsx
line: 14-19
issue: Fabricated benchmark numbers in user-facing documentation
detail: The page claims "median scroll-frame time at ~7 ms" and "worst-case frames during fast scroll spike to ~14 ms" on a "Chromium synthetic-CPU 4× slowdown" harness. None of these match the recorded spike measurements in `.agents/plans/phase-5-virtualization-install-docs.md` lines 386-392, which are: chromium max 27 ms / median 17 ms; webkit max 60 ms / median 28 ms. The "4× CPU slowdown" qualifier was also invented — the spike harness does not throttle CPU. The plan's Phase G recipe for this page says "the spike's measured worst-case frame time" — meaning the actual numbers should be cited, not approximated.
suggestion: Replace the paragraph with verbatim values from the plan: "Phase 5B's spike measured chromium max 27 ms (median 17 ms), firefox max 38 ms (median 17 ms), and webkit max 60 ms (median 28 ms) at 10,000 commits with default rowHeight=40 — all comfortably inside the 16.6 ms-per-rendered-frame budget on chromium and firefox, with webkit's worst-case frame still under one dropped frame at 60 fps. The harness lives at `tests/e2e/graph-virtualization.spec.ts` with `MAX_FRAME_MS = 100` as the regression bar." Drop the fabricated "synthetic-CPU 4×" claim entirely.
```

---

```
severity: medium
file: apps/docs/components/code-block.tsx, apps/docs/components/live-demo.tsx, apps/docs/app/page.tsx
line: code-block.tsx:17, live-demo.tsx:20, page.tsx:34/40/46
issue: `border` utility used without explicit color — Tailwind v4 default differs from v3
detail: In Tailwind v4 the bare `border` utility resolves to `border-color: currentColor` by default, not the gray-200 of v3. The intent here is the themed `--color-border` token (defined in `globals.css`). Some sites use `border` and some use `border border-border` — inconsistent, and the bare-`border` ones will inherit text color (typically near-black on light, near-white on dark), producing visually-heavy borders against the muted/background fills.
suggestion: Standardize on `border border-border` everywhere a themed border is intended, or define a default border color in `@theme` (`--default-border-color: var(--color-border)`). Apply to: code-block.tsx:17, live-demo.tsx:20, page.tsx:34/40/46.
```

---

```
severity: medium
file: apps/docs/components/docs-shell.tsx
line: 95
issue: `prose prose-neutral dark:prose-invert` classes are no-ops without @tailwindcss/typography
detail: The docs site doesn't have `@tailwindcss/typography` installed (verified via `pnpm list` — only `@tailwindcss/postcss` and `tailwindcss` are present). The `prose` family of classes relies on that plugin; without it Tailwind treats `prose` as an unknown utility and emits nothing. Body content (headings, lists, links, code) on every docs page will render with default browser styling, not the typographic hierarchy these classes imply. Functional but visually weak.
suggestion: Either (a) add `@tailwindcss/typography` to `apps/docs/devDependencies`, register it in `globals.css` via `@plugin "@tailwindcss/typography"`, and keep the `prose` classes; or (b) drop the `prose` classes and write explicit utility-based heading/paragraph styles in `globals.css`. Option (a) matches the plan's intent (10 documentation pages reading like docs) with the smallest patch.
```

---

```
severity: low
file: apps/docs/components/code-block.tsx
line: 13
issue: Promise rejection from clipboard.writeText is unhandled
detail: `navigator.clipboard.writeText(code).then(...)` has no `.catch`. In insecure contexts (HTTP), in iframes without the clipboard-write permission, or if the user denies the permission prompt, this rejects with a `NotAllowedError`. Unhandled rejections produce console noise and the user sees no feedback — the icon never flips to the check.
suggestion: Add `.catch(() => { /* swallow — UI just won't show success state */ })` after the `.then`, or use async/await with try/catch. Optional: surface failure as a brief tooltip ("Copy failed").
```

---

```
severity: low
file: apps/docs/app/playground/page.tsx
line: 23-25
issue: `value as Commit[]` is unsound — playground can crash on shape errors
detail: After `JSON.parse` returns an array, the code casts to `Commit[]` and runs `validate(commits, { allowMissingParents: true })`. But `validate` only checks parent references and HEAD presence — it does not verify each entry has the required `sha`, `parents`, `author.name`, `message`, `timestamp` shape. Pasting `[{ "foo": "bar" }]` into the playground will pass validate, then `<GitGraph>` will throw at layout time (e.g. accessing `.length` on `undefined` parents), which escapes the parse-result error UI and lands as an unhandled React error.
suggestion: Wrap the `<GitGraph commits={parsed.commits} />` render in an error boundary (small client component using `componentDidCatch` or React 19's `errorBoundary` pattern) that displays the error message in the same red panel as the parse error. Alternatively add a minimal shape check to the parse step (Array, each element has string `sha`, array `parents`, object `author`, string `message`, number-or-string `timestamp`).
```

---

```
severity: low
file: apps/docs/components/docs-shell.tsx
line: 36-42
issue: Dead spacer span in RECIPE_SUBNAV icon field
detail: The `RECIPE_SUBNAV` items each carry `icon: <span className="ml-2" />` but the render at line 84-94 never reads the `icon` field for sub-nav links — it only renders `sub.label`. The unused span is harmless but signals an unfinished refactor (probably copied from the parent NAV shape).
suggestion: Drop the `icon` field from `RECIPE_SUBNAV` and tighten its type (`Omit<NavItem, "icon">`).
```

---

```
severity: low
file: apps/docs/app/playground/page.tsx
line: 47-53
issue: <label> not associated with <textarea> (a11y)
detail: The label "Commits (JSON)" is rendered as a sibling, not via `htmlFor`. Screen readers won't announce the label when the textarea is focused.
suggestion: Add `id="playground-json"` to the `<textarea>` and `htmlFor="playground-json"` to the matching `<label>`. Same for the "Render" label/region pair.
```

---

```
severity: low
file: apps/docs/components/live-demo.tsx
line: 4
issue: Per-component CSS import duplicates work and couples module load order
detail: `import "./git-graph/git-graph.css"` is repeated in `live-demo.tsx` and `playground/page.tsx`. Next.js de-dupes the actual emitted CSS, so this is correctness-safe, but it makes the CSS load implicit on whichever doc page mounts first. If a future page renders `<GitGraph>` without going through these wrappers, it'll render unstyled and the cause will be invisible.
suggestion: Move `import "../components/git-graph/git-graph.css";` into `apps/docs/app/layout.tsx` once. Drop the per-component imports.
```

---

```
severity: low
file: scripts/sync-registry.mjs
line: 17-32
issue: Plan-prescribed parallel-write race fix should be recorded in plan corrections
detail: The plan as written prescribed adding pretypecheck/prelint hooks to apps/docs but did not anticipate that `pnpm -r --parallel` runs both workspaces' pre-hooks concurrently, producing an EBUSY race when both write to overlapping destination subtrees. The fix here (accept `--dest` args, scope each workspace's hook to its own dir) is correct and minimal — but per CLAUDE.md "Post-execution corrections" and the plan's own §"Post-execution corrections" pattern, this discovered failure mode + working recipe should be appended to the plan after merge.
suggestion: After PR squash-merge, append a "Phase G sync-registry parallel-write race" subsection to the plan's "Post-execution corrections" describing the failure mode (concurrent rm+copy on shared dirs from `pnpm -r --parallel`) and the fix (per-dest argv flag).
```

---

```
severity: low
file: README.md
line: 35
issue: Plan-prescribed screenshot embed omitted
detail: The plan's Phase G README task explicitly prescribes "Static screenshot: capture /graph on dark mode, save to docs/screenshot.png, embed via ![](docs/screenshot.png)". The current README has no embedded image; users landing on the GitHub repo see only prose, not the visual the project ships. This was deferred during execution because capturing the screenshot needs a running dev server + headless browser, but the deferral wasn't recorded as a follow-up.
suggestion: Either (a) capture the screenshot now via a one-off Playwright script (the e2e suite already has the dependencies), commit `docs/screenshot.png`, and embed it; or (b) record the deferral as a Phase H follow-up task and a "Post-execution corrections" entry on the plan so it doesn't get forgotten.
```

---

```
severity: low
file: apps/docs/app/docs/recipes/github-api/page.tsx, apps/docs/app/docs/recipes/isomorphic-git/page.tsx
line: github-api/page.tsx:30, isomorphic-git/page.tsx:23
issue: Recipe code uses the headline-only convention but doesn't mention it
detail: Both recipes do `c.commit.message.split("\n", 1)[0] ?? ""` to extract the headline. This matches `<GitGraph>`'s "headline only; trailing body lines are ignored" rule (correctly documented on `data-shape/page.tsx`), but the recipes don't say *why* they're slicing the first line. A reader copying the recipe might assume it's required by the API and not realize the trailing body would render fine but be visually truncated by the headline-table cell.
suggestion: One-line comment in each snippet: `// Take the headline only — trailing body lines wouldn't render in the headline table.`
```

---

## Verdict

Phase 5G ships the prescribed surface area (4 reusable components, 14 docs pages, playground, landing rewrite, README rewrite, sync-script update). Type-check, lint, and production build all pass; static export emits 20 routes.

The most urgent fix is the **fabricated performance numbers** (`/docs/performance`) — those need to be replaced with the plan's recorded spike measurements before merge. The **missing Tailwind typography plugin** is the next-most-impactful: without it, every docs page reads visually flat, undercutting the polish the docs site is meant to project. Everything else is small.
