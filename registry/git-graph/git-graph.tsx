"use client";

import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import GitGraphGutter from "./git-graph-gutter";
import { computeLayout } from "./lib/layout";
import { relativeTime, shortSha } from "./lib/format";
import { WORKING_TREE_SHA, synthesizeWorkingTreeCommit } from "./lib/working-tree";
import type { Commit, Ref } from "./types";

export type GitGraphProps = {
  commits: Commit[];
  head?: string;
  selectedSha?: string;
  defaultSelectedSha?: string;
  onSelectChange?: (sha: string | undefined) => void;
  onCommitClick?: (commit: Commit) => void;
  onCommitHover?: (commit: Commit | null) => void;
  showWorkingTreeRow?: boolean;
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

function refVarName(kind: Ref["kind"]): "branch" | "tag" | "remote" {
  switch (kind) {
    case "branch":
      return "branch";
    case "tag":
      return "tag";
    case "remote-branch":
      return "remote";
  }
}

export default function GitGraph(props: GitGraphProps) {
  const laneWidth = props.laneWidth ?? DEFAULTS.laneWidth;
  const rowHeight = props.rowHeight ?? DEFAULTS.rowHeight;
  const nodeRadius = props.nodeRadius ?? DEFAULTS.nodeRadius;
  const strokeWidth = props.strokeWidth ?? DEFAULTS.strokeWidth;

  const { commits, showWorkingTreeRow, head } = props;

  const layout = useMemo(() => {
    const workingCommits = showWorkingTreeRow
      ? [synthesizeWorkingTreeCommit(head, Date.now()), ...commits]
      : commits;
    return computeLayout(workingCommits);
  }, [commits, showWorkingTreeRow, head]);

  const [internalSelected, setInternalSelected] = useState<string | undefined>(
    props.defaultSelectedSha,
  );
  const isControlled = props.selectedSha !== undefined;
  const selectedSha = isControlled ? props.selectedSha : internalSelected;

  function setSelected(next: string | undefined) {
    setInternalSelected(next);
    props.onSelectChange?.(next);
  }

  const instanceId = useId();
  const rowId = (idx: number) => `${instanceId}-row-${idx}`;

  const selectedRow = selectedSha
    ? layout.rows.find((r) => r.commit.sha === selectedSha)
    : undefined;

  const rootClassName = ["git-graph", props.className].filter(Boolean).join(" ");

  if (commits.length === 0 && !showWorkingTreeRow) {
    return (
      <div
        data-testid="git-graph"
        data-empty="true"
        role="listbox"
        aria-label="Empty git history"
        className={rootClassName}
      />
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (layout.rows.length === 0) return;
    const currentIdx = selectedRow ? selectedRow.rowIndex : -1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, layout.rows.length - 1);
      const row = layout.rows[next];
      if (row) {
        setSelected(row.commit.sha);
        if (typeof document !== "undefined") {
          document.getElementById(rowId(next))?.scrollIntoView({ block: "nearest", behavior: "auto" });
        }
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = currentIdx < 0 ? 0 : Math.max(currentIdx - 1, 0);
      const row = layout.rows[next];
      if (row) {
        setSelected(row.commit.sha);
        if (typeof document !== "undefined") {
          document.getElementById(rowId(next))?.scrollIntoView({ block: "nearest", behavior: "auto" });
        }
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (selectedRow) props.onCommitClick?.(selectedRow.commit);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setSelected(undefined);
    }
  }

  const gutterWidth = layout.laneCount * laneWidth;

  return (
    <div
      data-testid="git-graph"
      role="listbox"
      tabIndex={0}
      className={rootClassName}
      style={{ display: "grid", gridTemplateColumns: `${gutterWidth}px 1fr` }}
      onKeyDown={onKeyDown}
      {...(selectedRow ? { "aria-activedescendant": rowId(selectedRow.rowIndex) } : {})}
    >
      <GitGraphGutter
        layout={layout}
        laneWidth={laneWidth}
        rowHeight={rowHeight}
        nodeRadius={nodeRadius}
        strokeWidth={strokeWidth}
      />
      <div data-testid="git-graph-rows">
        {layout.rows.map((row) => {
          const isSelected = selectedSha === row.commit.sha;
          const isWorkingTree = row.commit.sha === WORKING_TREE_SHA;
          const refs = row.commit.refs ?? [];
          const rowStyle: CSSProperties = {
            height: rowHeight,
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingInline: 12,
            cursor: "pointer",
            borderLeft: `2px solid ${isSelected ? "var(--graph-row-selected-border)" : "transparent"}`,
            background: isSelected ? "var(--graph-row-selected-bg)" : "transparent",
          };
          return (
            <div
              key={row.commit.sha}
              id={rowId(row.rowIndex)}
              role="option"
              aria-selected={isSelected}
              data-testid="git-graph-row"
              data-sha={row.commit.sha}
              data-row-index={row.rowIndex}
              {...(isSelected ? { "data-selected": "true" } : {})}
              {...(isWorkingTree ? { "data-working-tree": "true" } : {})}
              className="git-graph-row"
              style={rowStyle}
              onClick={() => {
                setSelected(row.commit.sha);
                props.onCommitClick?.(row.commit);
              }}
              onMouseEnter={() => props.onCommitHover?.(row.commit)}
              onMouseLeave={() => props.onCommitHover?.(null)}
            >
              <span
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 12,
                  opacity: 0.7,
                  flex: "0 0 auto",
                }}
              >
                {isWorkingTree ? "—" : shortSha(row.commit.sha)}
              </span>
              <span
                style={{
                  flex: "1 1 auto",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontStyle: isWorkingTree ? "italic" : "normal",
                  color: isWorkingTree ? "var(--graph-working-tree-fg)" : "inherit",
                }}
              >
                {row.commit.message}
              </span>
              {refs.length > 0 && (
                <span style={{ flex: "0 0 auto", display: "flex", gap: 4 }}>
                  {refs.map((ref) => {
                    const v = refVarName(ref.kind);
                    const badgeStyle: CSSProperties = {
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      lineHeight: 1.4,
                      background: `var(--graph-ref-${v}-bg)`,
                      color: `var(--graph-ref-${v}-fg)`,
                      ...(ref.isHead
                        ? {
                            outline: "1px solid var(--graph-row-selected-border)",
                            fontWeight: 700,
                          }
                        : {}),
                    };
                    return (
                      <span
                        key={`${ref.kind}-${ref.name}`}
                        data-ref-kind={ref.kind}
                        data-ref-name={ref.name}
                        {...(ref.isHead ? { "data-head": "true" } : {})}
                        style={badgeStyle}
                      >
                        {ref.name}
                      </span>
                    );
                  })}
                </span>
              )}
              <span style={{ flex: "0 0 auto", opacity: 0.8, fontSize: 13 }}>
                {row.commit.author.name}
              </span>
              <span
                style={{
                  flex: "0 0 auto",
                  opacity: 0.6,
                  fontSize: 12,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {isWorkingTree ? "—" : relativeTime(row.commit.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
