import CodeBlock from "../../../../components/code-block";
import DocsShell from "../../../../components/docs-shell";

const SNIPPET = `import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import LightningFS from "@isomorphic-git/lightning-fs";
import type { Commit } from "@/components/git-graph/types";

const fs = new LightningFS("repo");
const dir = "/repo";

await git.clone({
  fs, http, dir,
  url: "https://github.com/anthropics/claude-code",
  depth: 200,
});

const log = await git.log({ fs, dir });

const commits: Commit[] = log.map((entry) => ({
  sha: entry.oid,
  parents: entry.commit.parent,
  author: {
    name: entry.commit.author.name,
    email: entry.commit.author.email,
  },
  // Headline only — <GitGraph> renders one line per commit.
  message: entry.commit.message.split("\\n", 1)[0] ?? "",
  timestamp: entry.commit.author.timestamp,
}));`;

export default function IsoRecipe() {
  return (
    <DocsShell>
      <h1>Recipe: isomorphic-git</h1>
      <p>
        Render commits read entirely in-browser by{" "}
        <a href="https://isomorphic-git.org/">isomorphic-git</a>. The shape returned by{" "}
        <code>git.log</code> maps to <code>Commit</code> with a one-pass{" "}
        <code>.map()</code>.
      </p>
      <CodeBlock code={SNIPPET} />
      <h2>Notes</h2>
      <ul>
        <li>
          <code>depth</code> in <code>clone</code> caps history. Pass it through to your call site
          to keep first-render latency bounded.
        </li>
        <li>
          isomorphic-git&apos;s <code>log</code> walks first-parent by default. Pass{" "}
          <code>ref: &quot;HEAD&quot;</code> and iterate refs separately if you need the full DAG.
        </li>
      </ul>
    </DocsShell>
  );
}
