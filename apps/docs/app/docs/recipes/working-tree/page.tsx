import CodeBlock from "../../../../components/code-block";
import DocsShell from "../../../../components/docs-shell";
import LiveDemo from "../../../../components/live-demo";
import { SAMPLE_COMMITS } from "../../../../components/sample-commits";

const SNIPPET = `<GitGraph commits={commits} showWorkingTreeRow />`;

export default function WorkingTreeRecipe() {
  return (
    <DocsShell>
      <h1>Recipe: working-tree row</h1>
      <p>
        Pass <code>showWorkingTreeRow</code> to prepend a synthetic row representing uncommitted
        work. The row participates in lane layout — its lane matches the current HEAD&apos;s lane,
        and a dashed edge connects it to HEAD.
      </p>
      <CodeBlock code={SNIPPET} />
      <LiveDemo commits={SAMPLE_COMMITS} showWorkingTreeRow />
      <h2>Behaviour</h2>
      <ul>
        <li>Renders even when the working tree is clean — there&apos;s no concept of &quot;dirty&quot; in the prop.</li>
        <li>The synthetic row carries no commit data and isn&apos;t selectable.</li>
      </ul>
    </DocsShell>
  );
}
