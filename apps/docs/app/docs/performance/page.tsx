import DocsShell from "../../../components/docs-shell";

export default function PerformancePage() {
  return (
    <DocsShell>
      <h1>Performance</h1>
      <h2>Virtualization</h2>
      <p>
        GitGraph virtualizes rows and lane geometry using{" "}
        <a href="https://tanstack.com/virtual">@tanstack/react-virtual</a>. Only rows in the
        viewport (plus an overscan band of 8) are mounted; lane edges are clipped to the same
        window via the gutter&apos;s <code>range</code> prop. Memory and DOM-node count stay
        roughly constant regardless of commit-set size.
      </p>
      <h2>Measured worst case</h2>
      <p>
        At 10,000 commits with the default <code>rowHeight=40</code>, the Phase 5B spike measured
        per-browser frame times during a 5-second scripted scroll:
      </p>
      <table>
        <thead>
          <tr>
            <th>Browser</th>
            <th>max</th>
            <th>p99</th>
            <th>p95</th>
            <th>median</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>chromium</td>
            <td>27 ms</td>
            <td>25 ms</td>
            <td>22 ms</td>
            <td>17 ms</td>
          </tr>
          <tr>
            <td>firefox</td>
            <td>38 ms</td>
            <td>37 ms</td>
            <td>24 ms</td>
            <td>17 ms</td>
          </tr>
          <tr>
            <td>webkit</td>
            <td>60 ms</td>
            <td>59 ms</td>
            <td>55 ms</td>
            <td>28 ms</td>
          </tr>
        </tbody>
      </table>
      <p>
        Webkit&apos;s 60 ms worst-case is inside one dropped frame at 60 fps and well under the
        production regression bar of <code>MAX_FRAME_MS = 100</code> in{" "}
        <code>tests/e2e/graph-virtualization.spec.ts</code> — that ceiling is sized to catch a
        broken virtualizer (which would produce 200–2000 ms+ frames) without flaking on slow CI.
      </p>
      <h2>Tuning <code>rowHeight</code></h2>
      <p>
        Larger <code>rowHeight</code> renders fewer rows per viewport and reduces frame cost
        roughly linearly. The default of 40 is tuned for a single-line message; bump to 56 if you
        render a two-line message or larger avatars.
      </p>
      <h2>Scenarios that degrade</h2>
      <ul>
        <li>
          Lane count above ~12 produces wide gutters; the SVG is fine but horizontal scroll appears.
        </li>
        <li>
          Refs decorations are not virtualized — a single commit with 100+ refs allocates 100+
          badge DOM nodes. Practical Git histories don&apos;t hit this.
        </li>
        <li>
          The window-scroll variant (passing <code>scrollContainerRef</code> pointing at{" "}
          <code>document.documentElement</code>) is slightly more expensive than the default
          self-scroll layout because it can&apos;t observe a single resize boundary.
        </li>
      </ul>
    </DocsShell>
  );
}
