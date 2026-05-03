import CodeBlock from "../../../components/code-block";
import DocsShell from "../../../components/docs-shell";
import LiveDemo from "../../../components/live-demo";
import { SAMPLE_COMMITS } from "../../../components/sample-commits";

const SNIPPET = `import GitGraph from "@/components/git-graph/git-graph";
import "@/components/git-graph/git-graph.css";
import type { Commit } from "@/components/git-graph/types";

const commits: Commit[] = [
  { sha: "a", parents: [], author: { name: "you" }, message: "init", timestamp: 1714166400 },
  { sha: "b", parents: ["a"], author: { name: "you" }, message: "feat", timestamp: 1714252800 },
  // ...
];

export default function Page() {
  return <GitGraph commits={commits} onCommitClick={(c) => console.log(c.sha)} />;
}`;

export default function QuickstartPage() {
  return (
    <DocsShell>
      <h1>Quickstart</h1>
      <p>
        Pass an array of <code>Commit</code> objects to <code>&lt;GitGraph&gt;</code>. The component
        renders a virtualized table with a DAG gutter, headline metadata, and ref badges.
      </p>
      <CodeBlock code={SNIPPET} />
      <h2>Live</h2>
      <LiveDemo commits={SAMPLE_COMMITS} />
      <h2>Common props</h2>
      <ul>
        <li><code>commits</code> — required <code>Commit[]</code></li>
        <li><code>head</code> — sha of HEAD; the corresponding row gets a HEAD indicator</li>
        <li><code>onCommitClick</code> — fires on row click</li>
        <li><code>onCommitHover</code> — fires on row hover (and with <code>null</code> on leave)</li>
        <li><code>showWorkingTreeRow</code> — adds a synthetic top row representing uncommitted work</li>
      </ul>
    </DocsShell>
  );
}
