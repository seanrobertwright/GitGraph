import CodeBlock from "../../../../components/code-block";
import DocsShell from "../../../../components/docs-shell";

const MINIMAL = `import GitGraph from "@/components/git-graph/git-graph";

<GitGraph
  commits={commits}
  renderDetail={(c) =>
    c ? (
      <>
        <h3 className="font-semibold mb-2">{c.message}</h3>
        <pre className="text-xs">{c.sha}</pre>
      </>
    ) : null
  }
/>`;

const DECOUPLED = `"use client";
import { useState } from "react";
import GitGraph from "@/components/git-graph/git-graph";

export default function DecoupledExample({ commits }) {
  const [sha, setSha] = useState<string | undefined>();
  const [open, setOpen] = useState(false);

  return (
    <>
      <GitGraph
        commits={commits}
        selectedSha={sha}
        onSelectChange={setSha}
        detailOpen={open}
        // Ignore GitGraph's default click-to-open signal —
        // only our button below opens the drawer.
        onDetailOpenChange={() => {}}
        renderDetail={(c) => (c ? <pre>{c.sha}</pre> : null)}
      />
      <button onClick={() => setOpen(true)}>Show detail</button>
    </>
  );
}`;

export default function DetailDrawerRecipe() {
  return (
    <DocsShell>
      <h1>Recipe: commit detail drawer</h1>
      <p>
        Pass a <code>renderDetail</code> render-prop to <code>&lt;GitGraph&gt;</code> and a
        right-side drawer mounts alongside the graph. The drawer chrome (focus trap, ESC,
        scroll-lock, theme tokens) comes from shadcn&apos;s <code>sheet</code>, which
        installs transitively when you <code>add</code> <code>git-graph</code>.
      </p>
      <h2>Minimal — uncontrolled</h2>
      <p>
        With no other props, the drawer auto-opens on row click and closes on ESC or
        backdrop-click. The render-prop receives the currently selected commit.
      </p>
      <CodeBlock code={MINIMAL} />
      <h2>Decoupled controlled</h2>
      <p>
        Selection and drawer-open are independent states. Pass <code>detailOpen</code> and
        ignore <code>onDetailOpenChange</code>&apos;s click-to-open signal to keep the
        drawer closed regardless of selection — useful when you want a separate affordance
        (a button, a keyboard shortcut) to open the drawer.
      </p>
      <CodeBlock code={DECOUPLED} />
    </DocsShell>
  );
}
