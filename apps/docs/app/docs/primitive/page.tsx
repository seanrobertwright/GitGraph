import CodeBlock from "../../../components/code-block";
import DocsShell from "../../../components/docs-shell";

const SNIPPET = `import GitGraphGutter from "@/components/git-graph/git-graph-gutter";
import { computeLayout } from "@/components/git-graph/lib/layout";

const layout = computeLayout(commits);

return (
  <GitGraphGutter
    layout={layout}
    rowHeight={40}
    laneWidth={16}
    nodeRadius={5}
    strokeWidth={1.5}
  />
);`;

const RANGE_SNIPPET = `<GitGraphGutter
  layout={layout}
  rowHeight={40}
  range={{ fromRow: 100, toRow: 150 }}
/>`;

export default function PrimitivePage() {
  return (
    <DocsShell>
      <h1>Primitive: <code>&lt;GitGraphGutter&gt;</code></h1>
      <p>
        Renders just the lane SVG (nodes + edges) — no table, no headlines, no virtualization. Use
        it when you want the DAG visual but want to drive the row layout yourself.
      </p>
      <h2>Basic use</h2>
      <CodeBlock code={SNIPPET} />
      <h2>Windowed rendering</h2>
      <p>
        Pass a <code>range</code> to render only edges and nodes touching{" "}
        <code>[fromRow, toRow]</code>. This is how the headline component virtualizes.
      </p>
      <CodeBlock code={RANGE_SNIPPET} />
      <h2>Why a separate primitive?</h2>
      <p>
        Some consumers want column layouts the headline table doesn&apos;t support (custom widths,
        extra columns, sticky headers). Splitting the gutter out keeps the lane geometry usable
        without inheriting the table&apos;s layout opinions.
      </p>
    </DocsShell>
  );
}
