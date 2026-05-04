import CodeBlock from "../../../../components/code-block";
import DocsShell from "../../../../components/docs-shell";

const BASIC = `import GitGraph from "@/components/git-graph/git-graph";

<GitGraph
  commits={commits}
  filter={(c) => c.author.name === "Alice"}
/>`;

const WORKING_TREE_AWARE = `import GitGraph from "@/components/git-graph/git-graph";
import { WORKING_TREE_SHA } from "@/components/git-graph/lib/working-tree";

const keep = (c) => c.message.includes("WIP");

<GitGraph
  commits={commits}
  showWorkingTreeRow
  // Always keep the synthetic working-tree row visible — it's subject
  // to the filter by default.
  filter={(c) => c.sha === WORKING_TREE_SHA || keep(c)}
/>`;

const BRANCH_ANCESTRY = `"use client";
import { useMemo } from "react";
import GitGraph from "@/components/git-graph/git-graph";

// Consumer-supplied: BFS up the parents from a tip sha.
function computeReachable(commits, tipSha) {
  const bySha = new Map(commits.map((c) => [c.sha, c]));
  const reached = new Set();
  const queue = [tipSha];
  while (queue.length) {
    const sha = queue.shift();
    if (reached.has(sha)) continue;
    const c = bySha.get(sha);
    if (!c) continue;
    reached.add(sha);
    for (const p of c.parents) queue.push(p);
  }
  return reached;
}

export default function MainAncestryGraph({ commits, mainTipSha }) {
  const reachable = useMemo(
    () => computeReachable(commits, mainTipSha),
    [commits, mainTipSha],
  );
  return (
    <GitGraph
      commits={commits}
      filter={(c) => reachable.has(c.sha)}
    />
  );
}`;

export default function FilteringRecipe() {
  return (
    <DocsShell>
      <h1>Recipe: filtering commits</h1>
      <p>
        Pass a <code>filter</code> predicate to <code>&lt;GitGraph&gt;</code> and the layout
        engine removes commits for which it returns <code>false</code>. Edges are rewritten
        transitively: if a visible commit had a hidden parent, the edge skips through the
        hidden chain to the nearest visible ancestor. The visible graph stays connected
        wherever the underlying graph is.
      </p>

      <h2>Basic — author filter</h2>
      <p>
        The simplest filter. The predicate runs on every commit; only commits where it
        returns true appear in the layout, and edges between visible commits are rewritten
        through the hidden ones.
      </p>
      <CodeBlock code={BASIC} />

      <h2>Working-tree-aware filter</h2>
      <p>
        When <code>showWorkingTreeRow</code> is true, the synthesized working-tree commit is
        passed to your predicate just like any other commit. Most filters should keep it
        visible by special-casing <code>WORKING_TREE_SHA</code>.
      </p>
      <CodeBlock code={WORKING_TREE_AWARE} />

      <h2>Branch-ancestry filter</h2>
      <p>
        To show only commits reachable from a branch tip, precompute the reachable set with a
        BFS over <code>parents</code>, then check membership in the predicate. Memoize the
        set so the predicate stays cheap on large inputs.
      </p>
      <CodeBlock code={BRANCH_ANCESTRY} />

      <h2>Selection survives filtering</h2>
      <p>
        If a commit is selected and a filter change hides it, the row disappears from the
        listbox but <code>renderDetail</code> (if used) still receives the remembered commit
        looked up from the unfiltered input. Useful when a search-box filter narrows the
        graph while a drawer is open — the drawer&apos;s contents stay put.
      </p>
    </DocsShell>
  );
}
