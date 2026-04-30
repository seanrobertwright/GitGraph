import type { LayoutEdge } from "../types";

export type BezierOpts = {
  laneWidth: number;
  rowHeight: number;
};

export const DEFAULT_BEZIER_OPTS: BezierOpts = {
  laneWidth: 16,
  rowHeight: 40,
};

// Convert a layout edge into an SVG `path` `d` attribute string.
//   - `straight` (same-lane primary): vertical line `M x y1 L x y2`.
//   - `fork`/`merge` (cross-column): cubic bezier with vertical tangents
//     at both endpoints, control points at the y-midpoint above each end.
// Path components are space-separated single-token forms; numbers render
// via `Number.prototype.toString` for minimal lossless representation
// (no trailing zeros, no `toFixed` truncation). Determinism follows from
// pure arithmetic on finite inputs.
export function edgePath(edge: LayoutEdge, opts: BezierOpts = DEFAULT_BEZIER_OPTS): string {
  const x1 = centerX(edge.fromLane, opts.laneWidth);
  const y1 = centerY(edge.fromRow, opts.rowHeight);
  const x2 = centerX(edge.toLane, opts.laneWidth);
  const y2 = centerY(edge.toRow, opts.rowHeight);

  // Invariant (enforced by `computeLayout`): `straight` ⇒ fromLane === toLane.
  // If this is ever violated, the L command below will render a diagonal —
  // visually wrong but determinable. Layout-side classification is the single
  // source of truth; do not weaken this branch to `fromLane === toLane`.
  if (edge.kind === "straight") {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  const dy = y2 - y1;
  const cy1 = y1 + dy / 2;
  const cy2 = y2 - dy / 2;
  return `M ${x1} ${y1} C ${x1} ${cy1} ${x2} ${cy2} ${x2} ${y2}`;
}

export function centerX(lane: number, laneWidth: number): number {
  return laneWidth * lane + laneWidth / 2;
}

export function centerY(row: number, rowHeight: number): number {
  return rowHeight * row + rowHeight / 2;
}
