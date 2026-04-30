import type { CSSProperties } from "react";
import type { LayoutEdge, LayoutResult } from "./types";
import { centerX, centerY, edgePath } from "./lib/bezier";

export type GitGraphGutterProps = {
  layout: LayoutResult;
  laneWidth?: number;
  rowHeight?: number;
  nodeRadius?: number;
  strokeWidth?: number;
  className?: string;
};

const DEFAULTS = {
  laneWidth: 16,
  rowHeight: 40,
  nodeRadius: 5,
  strokeWidth: 1.5,
} as const;

export default function GitGraphGutter(props: GitGraphGutterProps) {
  const laneWidth = props.laneWidth ?? DEFAULTS.laneWidth;
  const rowHeight = props.rowHeight ?? DEFAULTS.rowHeight;
  const nodeRadius = props.nodeRadius ?? DEFAULTS.nodeRadius;
  const strokeWidth = props.strokeWidth ?? DEFAULTS.strokeWidth;
  const { layout } = props;

  if (layout.rows.length === 0) {
    return <svg width={0} height={0} className={props.className} />;
  }

  for (const row of layout.rows) {
    if (row.lane < 0) {
      throw new Error(`GitGraphGutter: row has negative lane (${row.lane})`);
    }
  }

  const width = layout.laneCount * laneWidth;
  const height = layout.rows.length * rowHeight;

  const safeEdges: LayoutEdge[] = [];
  for (const e of layout.edges) {
    if (e.fromLane < 0 || e.toLane < 0) {
      throw new Error(
        `GitGraphGutter: edge ${e.fromSha}->${e.toSha} has negative lane`,
      );
    }
    if (e.fromRow >= layout.rows.length || e.toRow >= layout.rows.length) {
      if (process.env.NODE_ENV !== "production") {
        throw new Error(
          `GitGraphGutter: edge ${e.fromSha}->${e.toSha} references row out of range`,
        );
      }
      continue;
    }
    safeEdges.push(e);
  }

  return (
    <svg
      width={width}
      height={height}
      className={props.className}
      data-testid="git-graph-gutter"
      viewBox={`0 0 ${width} ${height}`}
    >
      <g data-role="edges">
        {safeEdges.map((edge) => {
          const colorLane = edge.kind === "merge" ? edge.toLane : edge.fromLane;
          const stroke: CSSProperties = {
            stroke: `var(--graph-branch-${(colorLane % 8) + 1})`,
            strokeWidth,
            fill: "none",
          };
          return (
            <path
              key={`${edge.fromSha}-${edge.toSha}-${edge.kind}`}
              d={edgePath(edge, { laneWidth, rowHeight })}
              style={stroke}
              data-edge-kind={edge.kind}
            />
          );
        })}
      </g>
      <g data-role="nodes">
        {layout.rows.map((row) => {
          const cx = centerX(row.lane, laneWidth);
          const cy = centerY(row.rowIndex, rowHeight);
          const isMerge = row.commit.parents.length >= 2;
          const fill = `var(--graph-branch-${(row.lane % 8) + 1})`;
          const style: CSSProperties = isMerge
            ? { stroke: fill, strokeWidth, fill: "var(--color-background, white)" }
            : { fill };
          return (
            <circle
              key={row.commit.sha}
              cx={cx}
              cy={cy}
              r={nodeRadius}
              style={style}
              data-sha={row.commit.sha}
              data-row-index={row.rowIndex}
              data-lane={row.lane}
            />
          );
        })}
      </g>
    </svg>
  );
}
