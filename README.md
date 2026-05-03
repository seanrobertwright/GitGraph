# GitGraph

A shadcn-installable React component for rendering Git commit history as an interactive DAG. Virtualized to 10k commits, themable through CSS variables, deterministic layout.

## 60-second quickstart

Install into any Next.js or Vite project that already has shadcn initialised:

```bash
npx shadcn@latest add https://seanrobertwright.github.io/GitGraph/r/git-graph.json
```

Render:

```tsx
import GitGraph from "@/components/git-graph/git-graph";
import "@/components/git-graph/git-graph.css";
import type { Commit } from "@/components/git-graph/types";

const commits: Commit[] = [
  { sha: "a", parents: [],     author: { name: "you" }, message: "init",  timestamp: 1714166400 },
  { sha: "b", parents: ["a"],  author: { name: "you" }, message: "feat",  timestamp: 1714252800 },
  { sha: "c", parents: ["b"],  author: { name: "you" }, message: "fix",   timestamp: 1714339200 },
];

export default function Page() {
  return <GitGraph commits={commits} onCommitClick={(c) => console.log(c.sha)} />;
}
```

## Highlights

- **Virtualized.** Stays under the 16.6 ms frame budget at 10,000 commits via `@tanstack/react-virtual`. Only the visible window of nodes and edges is mounted.
- **Themable.** All colours and geometry live in CSS variables (`--graph-branch-1..8`, `--graph-row-height`, etc.). Override at `:root`, in a `.dark` selector, or scoped to a parent.
- **Deterministic layout.** Same input always produces the same lane assignment and node positions. Useful for screenshot tests and reproducible bug reports.

## Documentation

Full docs, recipes (git log, GitHub API, isomorphic-git), API reference, and an interactive playground live at:

→ <https://seanrobertwright.github.io/GitGraph/docs/installation>

## Contributing

See `CLAUDE.md` for stack pins, conventions, and CI quirks. Phase plans are in `.agents/plans/`. PRs welcome — note the Tailwind v4 native-binding pinning requirement before bumping any dependencies.
