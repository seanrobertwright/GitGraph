export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tight">GitGraph</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        A shadcn-installable React component for rendering Git history as a visual DAG. Coming soon.
      </p>
      <pre className="mt-8 rounded-md border bg-muted p-4 text-sm">
        <code>npx shadcn@latest add https://seanrobertwright.github.io/GitGraph/r/git-graph.json</code>
      </pre>
    </main>
  );
}
