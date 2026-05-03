import CodeBlock from "../../../components/code-block";
import DocsShell from "../../../components/docs-shell";

const COMMIT_SNIPPET = `type Commit = {
  sha: string;                    // unique commit hash (any string; no length requirement)
  parents: string[];              // shas of parent commits, in primary-first order
  author: {
    name: string;
    email?: string;
    avatarUrl?: string;           // rendered as an <img> next to the message
  };
  message: string;                // headline only; trailing body lines are ignored
  timestamp: number | string;     // unix seconds (number) or ISO 8601 (string)
  refs?: Ref[];                   // optional decorations
};

type Ref = {
  name: string;                   // "main", "v1.2.0", "origin/main", etc.
  kind: "branch" | "tag" | "remote-branch";
  isHead?: boolean;               // adds a HEAD pointer next to the badge
};`;

const EXAMPLE = `[
  {
    "sha": "f6a1c20",
    "parents": ["a4b8d11", "c92e3b7"],
    "author": { "name": "Avery", "email": "avery@example.com" },
    "message": "Merge branch 'feature/login' into main",
    "timestamp": 1714512000,
    "refs": [{ "name": "main", "kind": "branch", "isHead": true }]
  }
]`;

export default function DataShapePage() {
  return (
    <DocsShell>
      <h1>Data shape</h1>
      <p>
        GitGraph renders any array of <code>Commit</code> objects whose <code>parents</code> shas
        resolve within the array. The schema is intentionally minimal — most real Git data sources
        (CLI <code>git log</code>, GitHub REST, isomorphic-git) map to it in 5–10 lines.
      </p>
      <h2>Types</h2>
      <CodeBlock code={COMMIT_SNIPPET} language="typescript" />
      <h2>Real-world example</h2>
      <CodeBlock code={EXAMPLE} language="json" />
      <h2>Notes</h2>
      <ul>
        <li>
          Commits do <strong>not</strong> need to be pre-sorted; GitGraph topologically sorts on the
          fly.
        </li>
        <li>
          A commit referencing a parent sha that isn&apos;t in the array throws{" "}
          <code>GitGraphInputError</code> by default. Pass <code>validate(commits, &#123;
          allowMissingParents: true &#125;)</code> if your dataset is paginated.
        </li>
        <li>
          <code>refs</code> is purely decorative — the lane layout is driven by{" "}
          <code>parents[]</code> alone.
        </li>
      </ul>
    </DocsShell>
  );
}
