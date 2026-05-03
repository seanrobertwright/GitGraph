import Link from "next/link";
import CodeBlock from "../components/code-block";
import LiveDemo from "../components/live-demo";
import { SAMPLE_COMMITS } from "../components/sample-commits";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <header className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">GitGraph</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A shadcn-installable React component for rendering Git history as an interactive DAG.
          Virtualized to 10k commits, themable through CSS variables, deterministic layout.
        </p>
      </header>

      <section className="mt-10">
        <CodeBlock
          language="bash"
          code="npx shadcn@latest add https://seanrobertwright.github.io/GitGraph/r/git-graph.json"
        />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Live demo
        </h2>
        <LiveDemo commits={SAMPLE_COMMITS} />
      </section>

      <nav className="mt-10 flex flex-wrap justify-center gap-3">
        <Link
          href="/docs/installation"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Installation
        </Link>
        <Link
          href="/docs/quickstart"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Quickstart
        </Link>
        <Link
          href="/playground"
          className="rounded-md border border-border bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Playground →
        </Link>
      </nav>
    </main>
  );
}
