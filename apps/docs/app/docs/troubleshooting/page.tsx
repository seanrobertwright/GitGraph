import CodeBlock from "../../../components/code-block";
import DocsShell from "../../../components/docs-shell";

export default function TroubleshootingPage() {
  return (
    <DocsShell>
      <h1>Troubleshooting</h1>

      <h2>&quot;Missing parent&quot; thrown for paginated data</h2>
      <p>
        If your data source is paginated (e.g. GitHub REST), some commits will reference parents
        that haven&apos;t been fetched yet. Pass the option through{" "}
        <code>validate</code>, or rely on the component&apos;s default which calls validate
        internally:
      </p>
      <CodeBlock
        code={`import { validate } from "@/components/git-graph/lib/validate";

validate(commits, { allowMissingParents: true });`}
      />

      <h2>Unsorted commits</h2>
      <p>
        Not a problem — GitGraph topologically sorts on the fly. You can pass commits in any order;
        the rendered order is determined by parent relationships and timestamp ties.
      </p>

      <h2>HEAD sha not found</h2>
      <p>
        Passing a <code>head</code> prop whose sha isn&apos;t in <code>commits</code> throws{" "}
        <code>GitGraphInputError</code> with <code>kind: &quot;head-not-found&quot;</code>. Either
        omit the prop or ensure the HEAD commit is included in the array.
      </p>

      <h2>Tailwind v4 token not picked up</h2>
      <p>
        GitGraph&apos;s CSS uses raw <code>hsl()</code> values, not Tailwind tokens — but if you
        re-theme using Tailwind v4&apos;s <code>@theme</code> variables, ensure your{" "}
        <code>globals.css</code> imports happen <strong>before</strong>{" "}
        <code>git-graph.css</code> so cascade order resolves the way you expect:
      </p>
      <CodeBlock
        code={`/* app/layout.tsx */
import "./globals.css";
import "@/components/git-graph/git-graph.css";`}
      />
    </DocsShell>
  );
}
