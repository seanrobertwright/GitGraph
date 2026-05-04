import DocsShell from "../../../components/docs-shell";
import PropsTable from "../../../components/props-table";

const GITGRAPH_PROPS = [
  { name: "commits", type: "Commit[]", description: "Required. The full commit set to render. Topologically sorted internally." },
  { name: "head", type: "string", description: "Sha of HEAD. The matching row gets a HEAD indicator alongside its refs." },
  { name: "selectedSha", type: "string", description: "Controlled selection. When provided, GitGraph treats the component as controlled and won't update internal state." },
  { name: "defaultSelectedSha", type: "string", description: "Initial selection in uncontrolled mode." },
  { name: "onSelectChange", type: "(sha: string | undefined) => void", description: "Fires when the selection changes (controlled or uncontrolled)." },
  { name: "onCommitClick", type: "(commit: Commit) => void", description: "Fires on row click. Independent of selection." },
  { name: "onCommitHover", type: "(commit: Commit | null) => void", description: "Fires on row mouseenter (with the commit) and mouseleave (with null)." },
  { name: "filter", type: "(commit: Commit) => boolean", description: "Predicate that hides commits for which it returns false. The layout engine rewrites edges to skip filtered commits — if A's parent B is filtered out, A's edge points to B's nearest visible ancestor. Selection state survives a commit being filtered out: the row disappears but the detail drawer (if rendered) keeps the remembered commit." },
  { name: "renderDetail", type: "(commit: Commit | undefined) => ReactNode", description: "When provided, renders an off-canvas right-side drawer alongside the graph. The function receives the currently selected commit (or undefined if no selection) and returns the drawer's interior." },
  { name: "defaultDetailOpen", type: "boolean", default: "false", description: "Initial open state of the detail drawer in uncontrolled mode." },
  { name: "detailOpen", type: "boolean", description: "Controlled open state of the detail drawer. When provided, GitGraph treats the drawer as controlled and won't update internal open state." },
  { name: "onDetailOpenChange", type: "(open: boolean) => void", description: "Fires when the drawer requests an open-state change (controlled or uncontrolled). In controlled mode, return this signal back into detailOpen to commit; ignore to decouple from the default click-to-open behavior." },
  { name: "showWorkingTreeRow", type: "boolean", default: "false", description: "Prepend a synthetic working-tree row above HEAD." },
  { name: "laneWidth", type: "number", default: "16", description: "Pixel width of one lane in the gutter. Must match the --graph-lane-width CSS variable if you override it." },
  { name: "rowHeight", type: "number", default: "40", description: "Pixel height of each row. Must match --graph-row-height." },
  { name: "nodeRadius", type: "number", default: "5", description: "Radius of commit nodes." },
  { name: "strokeWidth", type: "number", default: "1.5", description: "Stroke width of edges." },
  { name: "className", type: "string", description: "Appended to the root <div>'s className." },
  { name: "scrollContainerRef", type: "RefObject<HTMLElement | null>", description: "If provided, GitGraph virtualizes against this scroll container instead of its own. Use for window-scroll layouts." },
];

const GUTTER_PROPS = [
  { name: "layout", type: "LayoutResult", description: "Required. Output of computeLayout(commits)." },
  { name: "laneWidth", type: "number", default: "16", description: "Pixel width of one lane." },
  { name: "rowHeight", type: "number", default: "40", description: "Pixel height of one row." },
  { name: "nodeRadius", type: "number", default: "5", description: "Radius of commit nodes." },
  { name: "strokeWidth", type: "number", default: "1.5", description: "Stroke width of edges." },
  { name: "className", type: "string", description: "Appended to the SVG's className." },
  { name: "range", type: "{ fromRow: number; toRow: number }", description: "Render only nodes/edges touching this row range. Used for virtualization." },
];

export default function ApiPage() {
  return (
    <DocsShell>
      <h1>API reference</h1>
      <h2><code>&lt;GitGraph&gt;</code> props</h2>
      <PropsTable rows={GITGRAPH_PROPS} />
      <h2><code>&lt;GitGraphGutter&gt;</code> props</h2>
      <PropsTable rows={GUTTER_PROPS} />
      <h2>Errors</h2>
      <p>
        Invalid input throws <code>GitGraphInputError</code> (re-exported from{" "}
        <code>types.ts</code>). The <code>kind</code> property discriminates between{" "}
        <code>&quot;empty&quot;</code>, <code>&quot;duplicate-sha&quot;</code>,{" "}
        <code>&quot;missing-parent&quot;</code>, <code>&quot;cycle&quot;</code>, and{" "}
        <code>&quot;head-not-found&quot;</code>. The component renders a typed error UI instead of
        throwing through the React tree.
      </p>
    </DocsShell>
  );
}
