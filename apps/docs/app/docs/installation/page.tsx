import CodeBlock from "../../../components/code-block";
import DocsShell from "../../../components/docs-shell";

export default function InstallationPage() {
  return (
    <DocsShell>
      <h1>Installation</h1>
      <p>
        GitGraph installs as a shadcn registry component. Run the command below in any Next.js or
        Vite project that already has shadcn initialised (i.e. a <code>components.json</code> with
        the standard aliases <code>components</code>, <code>lib</code>, <code>utils</code>).
      </p>
      <CodeBlock
        language="bash"
        code="npx shadcn@latest add https://seanrobertwright.github.io/GitGraph/r/git-graph.json"
      />
      <h2>Files copied</h2>
      <p>The installer writes the following into your project:</p>
      <ul>
        <li><code>components/git-graph/git-graph.tsx</code> — main component</li>
        <li><code>components/git-graph/git-graph-gutter.tsx</code> — standalone DAG primitive</li>
        <li><code>components/git-graph/git-graph.css</code> — theming surface (CSS variables)</li>
        <li><code>components/git-graph/types.ts</code> — <code>Commit</code> / <code>Ref</code> shapes</li>
        <li><code>components/git-graph/lib/*.ts</code> — layout, bezier, parser, validate, errors</li>
      </ul>
      <h2>Runtime dependency</h2>
      <p>
        The installer adds <code>@tanstack/react-virtual</code> to your dependencies (used for the
        windowed virtualization path). No other runtime peers beyond React 18+.
      </p>
      <h2>Importing the styles</h2>
      <p>
        Import the CSS once at the root of your app (e.g. in <code>app/layout.tsx</code>):
      </p>
      <CodeBlock code={`import "@/components/git-graph/git-graph.css";`} />
    </DocsShell>
  );
}
