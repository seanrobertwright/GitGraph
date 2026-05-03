import CodeBlock from "../../../components/code-block";
import DocsShell from "../../../components/docs-shell";

const VARS_SNIPPET = `:root {
  /* Lane colors — index by (lane mod 8) */
  --graph-branch-1: hsl(220 80% 55%);
  --graph-branch-2: hsl(350 75% 55%);
  --graph-branch-3: hsl(145 60% 45%);
  --graph-branch-4: hsl(35 90% 55%);
  --graph-branch-5: hsl(280 65% 60%);
  --graph-branch-6: hsl(190 75% 50%);
  --graph-branch-7: hsl(60 80% 50%);
  --graph-branch-8: hsl(320 65% 55%);

  /* Geometry — match these to the props you pass to <GitGraph> */
  --graph-node-radius: 5px;
  --graph-stroke-width: 1.5px;
  --graph-lane-width: 16px;
  --graph-row-height: 40px;

  /* Row states */
  --graph-row-hover-bg: hsl(220 14% 96%);
  --graph-row-selected-bg: hsl(220 14% 92%);
  --graph-row-selected-border: hsl(220 80% 55%);
}

.dark {
  --graph-branch-1: hsl(220 90% 70%);
  --graph-row-hover-bg: hsl(220 14% 14%);
  --graph-row-selected-bg: hsl(220 14% 18%);
  /* override only what you want to differ from light */
}`;

const RECOLOR_SNIPPET = `<div style={{ "--graph-branch-1": "hsl(280 80% 60%)" } as React.CSSProperties}>
  <GitGraph commits={commits} />
</div>`;

export default function ThemingPage() {
  return (
    <DocsShell>
      <h1>Theming</h1>
      <p>
        All theming flows through CSS variables defined in <code>git-graph.css</code>. Override any
        of them at <code>:root</code>, in a <code>.dark</code> selector, or scoped to a parent.
      </p>
      <h2>Full variable list</h2>
      <CodeBlock language="css" code={VARS_SNIPPET} />
      <h2>Inline recolor (one-off)</h2>
      <CodeBlock code={RECOLOR_SNIPPET} />
      <h2>Dark mode</h2>
      <p>
        GitGraph doesn&apos;t implement its own dark-mode toggle; it follows whatever scheme your
        app uses. The shipped CSS includes a <code>@media (prefers-color-scheme: dark)</code>{" "}
        block as a fallback, but the recommended pattern is a <code>.dark</code> class selector
        toggled by your theme provider (next-themes, etc.) so the user&apos;s explicit preference
        wins over the OS default.
      </p>
    </DocsShell>
  );
}
