import CodeBlock from "../../../../components/code-block";
import DocsShell from "../../../../components/docs-shell";

const SNIPPET = `// MVP does not expose a compound API (e.g. <GitGraph.Row>).
// To pair the lane gutter with your own table content, render
// <GitGraphGutter> next to a sibling table that uses the same row height.

import GitGraphGutter from "@/components/git-graph/git-graph-gutter";
import { computeLayout } from "@/components/git-graph/lib/layout";

const layout = computeLayout(commits);
const ROW_HEIGHT = 40;

return (
  <div style={{ display: "flex" }}>
    <GitGraphGutter layout={layout} rowHeight={ROW_HEIGHT} />
    <table>
      <tbody>
        {layout.rows.map((r) => (
          <tr key={r.commit.sha} style={{ height: ROW_HEIGHT }}>
            <td>{r.commit.sha.slice(0, 7)}</td>
            <td>{r.commit.message}</td>
            <td>{/* your custom column */}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);`;

export default function CustomColumnsRecipe() {
  return (
    <DocsShell>
      <h1>Recipe: custom columns</h1>
      <p>
        The MVP component ships a fixed headline table layout (sha, message, refs, author, time).
        For arbitrary column sets, drop down to the <code>&lt;GitGraphGutter&gt;</code> primitive
        and render your own table next to it.
      </p>
      <CodeBlock code={SNIPPET} />
      <h2>Constraints</h2>
      <ul>
        <li>
          Pass the same <code>rowHeight</code> to the gutter and your <code>&lt;tr&gt;</code>{" "}
          elements — alignment is by pixel, not by row index.
        </li>
        <li>
          You lose virtualization on the custom path; for large logs use the{" "}
          <code>range</code> prop on the gutter to mirror your own windowing.
        </li>
      </ul>
    </DocsShell>
  );
}
