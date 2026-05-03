"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from "react";
import {
  useVirtualizer,
  useWindowVirtualizer,
  type VirtualItem,
} from "@tanstack/react-virtual";
import GitGraphGutter from "./git-graph-gutter";
import { computeLayout } from "./lib/layout";
import { GitGraphInputError, type GitGraphInputErrorKind } from "./lib/errors";
import { relativeTime, shortSha } from "./lib/format";
import { WORKING_TREE_SHA, synthesizeWorkingTreeCommit } from "./lib/working-tree";
import type { Commit, LayoutResult, Ref } from "./types";

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
  scrollContainerRef?: RefObject<HTMLElement | null>;
};

const DEFAULTS = {
  laneWidth: 16,
  rowHeight: 40,
  nodeRadius: 5,
  strokeWidth: 1.5,
  overscan: 8,
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

function rootClassNameFor(props: GitGraphProps): string {
  return ["git-graph", props.className].filter(Boolean).join(" ");
}

type GitGraphState = {
  layout: LayoutResult;
  laneWidth: number;
  rowHeight: number;
  nodeRadius: number;
  strokeWidth: number;
  selectedSha: string | undefined;
  setSelected: (next: string | undefined) => void;
  instanceId: string;
  rowId: (idx: number) => string;
  selectedRow: LayoutResult["rows"][number] | undefined;
  rootClassName: string;
  gutterWidth: number;
  onCommitClick: ((commit: Commit) => void) | undefined;
  onCommitHover: ((commit: Commit | null) => void) | undefined;
  justAppended: Set<string>;
};

type LayoutOrError =
  | { ok: true; layout: LayoutResult }
  | { ok: false; kind: GitGraphInputErrorKind };

function useLayoutOrError(props: GitGraphProps): LayoutOrError {
  const { commits, showWorkingTreeRow, head } = props;
  return useMemo<LayoutOrError>(() => {
    try {
      const workingCommits = showWorkingTreeRow
        ? [synthesizeWorkingTreeCommit(head, Date.now()), ...commits]
        : commits;
      return { ok: true, layout: computeLayout(workingCommits) };
    } catch (e) {
      if (e instanceof GitGraphInputError) return { ok: false, kind: e.kind };
      throw e;
    }
  }, [commits, showWorkingTreeRow, head]);
}

function useGitGraphState(props: GitGraphProps, layout: LayoutResult): GitGraphState {
  const laneWidth = props.laneWidth ?? DEFAULTS.laneWidth;
  const rowHeight = props.rowHeight ?? DEFAULTS.rowHeight;
  const nodeRadius = props.nodeRadius ?? DEFAULTS.nodeRadius;
  const strokeWidth = props.strokeWidth ?? DEFAULTS.strokeWidth;

  const [internalSelected, setInternalSelected] = useState<string | undefined>(
    props.selectedSha ?? props.defaultSelectedSha,
  );
  const isControlledRef = useRef<boolean>(props.selectedSha !== undefined);
  // Guard the dev-warn so a repeated render after a mode switch doesn't spam
  // the console. Mutating a ref during render is React-sanctioned for caching;
  // strict-mode's double-render of this body sets the ref true on the first
  // pass, suppressing the second. (Findings #1 and #2 of phase-5d review.)
  const hasWarnedModeSwitchRef = useRef(false);
  if (process.env.NODE_ENV !== "production") {
    const currentlyControlled = props.selectedSha !== undefined;
    if (currentlyControlled !== isControlledRef.current && !hasWarnedModeSwitchRef.current) {
      console.warn(
        "GitGraph: switching between controlled and uncontrolled `selectedSha` is not supported. " +
          "Component will continue using the mode it was first rendered with.",
      );
      hasWarnedModeSwitchRef.current = true;
    }
  }
  const isControlled = isControlledRef.current;
  const selectedSha = isControlled ? props.selectedSha : internalSelected;

  function setSelected(next: string | undefined) {
    if (!isControlled) setInternalSelected(next);
    props.onSelectChange?.(next);
  }

  const instanceId = useId();
  const rowId = (idx: number) => `${instanceId}-row-${idx}`;

  const selectedRow = selectedSha
    ? layout.rows.find((r) => r.commit.sha === selectedSha)
    : undefined;

  const rootClassName = rootClassNameFor(props);
  const gutterWidth = layout.laneCount * laneWidth;

  const prevShasRef = useRef<Set<string> | null>(null);
  const justAppended = useMemo<Set<string>>(() => {
    const currShas = new Set(layout.rows.map((r) => r.commit.sha));
    const prev = prevShasRef.current;
    prevShasRef.current = currShas;
    if (prev === null) return new Set();
    const added = new Set<string>();
    for (const s of currShas) if (!prev.has(s)) added.add(s);
    return added;
  }, [layout.rows]);

  return {
    layout,
    laneWidth,
    rowHeight,
    nodeRadius,
    strokeWidth,
    selectedSha,
    setSelected,
    instanceId,
    rowId,
    selectedRow,
    rootClassName,
    gutterWidth,
    onCommitClick: props.onCommitClick,
    onCommitHover: props.onCommitHover,
    justAppended,
  };
}

type GitGraphBodyProps = {
  state: GitGraphState;
  virtualItems: VirtualItem[];
  totalSize: number;
  scrollToIndex: (idx: number) => void;
};

function GitGraphBody({ state, virtualItems, totalSize, scrollToIndex }: GitGraphBodyProps) {
  const {
    layout,
    laneWidth,
    rowHeight,
    nodeRadius,
    strokeWidth,
    selectedSha,
    setSelected,
    rowId,
    selectedRow,
    rootClassName,
    gutterWidth,
    onCommitClick,
    onCommitHover,
    justAppended,
  } = state;

  // Keep the selected row mounted so `aria-activedescendant` always points at
  // a live element. Triggers only when the selected row's rowIndex changes;
  // scrollToIndex with align:"auto" is a no-op when already in view, so a
  // click on a visible row doesn't cause an unwanted scroll-jump.
  const scrollToIndexRef = useRef(scrollToIndex);
  scrollToIndexRef.current = scrollToIndex;
  const selectedRowIndex = selectedRow?.rowIndex;
  useEffect(() => {
    if (selectedRowIndex !== undefined) {
      scrollToIndexRef.current(selectedRowIndex);
    }
  }, [selectedRowIndex]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (layout.rows.length === 0) return;
    const currentIdx = selectedRow ? selectedRow.rowIndex : -1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, layout.rows.length - 1);
      const row = layout.rows[next];
      if (row) {
        setSelected(row.commit.sha);
        scrollToIndex(next);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = currentIdx < 0 ? 0 : Math.max(currentIdx - 1, 0);
      const row = layout.rows[next];
      if (row) {
        setSelected(row.commit.sha);
        scrollToIndex(next);
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (selectedRow) onCommitClick?.(selectedRow.commit);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setSelected(undefined);
    }
  }

  const containerStyle: CSSProperties = {
    position: "relative",
    height: totalSize,
  };

  const first = virtualItems[0];
  const last = virtualItems.at(-1);

  return (
    <div
      data-testid="git-graph"
      role="listbox"
      tabIndex={0}
      className={rootClassName}
      style={containerStyle}
      onKeyDown={onKeyDown}
      onMouseLeave={() => onCommitHover?.(null)}
      {...(selectedRow ? { "aria-activedescendant": rowId(selectedRow.rowIndex) } : {})}
    >
      {first && last && (
        <div
          style={{
            position: "absolute",
            top: first.start,
            left: 0,
            width: gutterWidth,
          }}
        >
          <GitGraphGutter
            layout={layout}
            laneWidth={laneWidth}
            rowHeight={rowHeight}
            nodeRadius={nodeRadius}
            strokeWidth={strokeWidth}
            range={{ fromRow: first.index, toRow: last.index }}
          />
        </div>
      )}
      {virtualItems.map((vi) => {
        // count is set to layout.rows.length, so vi.index is always in range.
        // The non-null assertion satisfies noUncheckedIndexedAccess without a
        // dead-branch guard.
        const row = layout.rows[vi.index]!;
        const isSelected = selectedSha === row.commit.sha;
        const isWorkingTree = row.commit.sha === WORKING_TREE_SHA;
        const refs = row.commit.refs ?? [];
        const rowStyle: CSSProperties = {
          position: "absolute",
          top: vi.start,
          left: gutterWidth,
          width: `calc(100% - ${gutterWidth}px)`,
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
            {...(justAppended.has(row.commit.sha) ? { "data-just-appended": "true" } : {})}
            className="git-graph-row"
            style={rowStyle}
            onClick={() => {
              setSelected(row.commit.sha);
              onCommitClick?.(row.commit);
            }}
            onMouseEnter={() => onCommitHover?.(row.commit)}
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
  );
}

function GitGraphInElement(
  props: GitGraphProps & {
    scrollContainerRef: RefObject<HTMLElement | null>;
    layout: LayoutResult;
  },
) {
  const state = useGitGraphState(props, props.layout);
  // The parent owns the scroll-container ref. On our first render its
  // .current is still null because the parent's <div ref={...}> commits
  // its ref attachment after our render returns. Capturing the element
  // into state via a post-mount effect triggers a second render where
  // useVirtualizer can observe the element and produce virtual items.
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setScrollEl(props.scrollContainerRef.current);
  }, [props.scrollContainerRef]);
  const virtualizer = useVirtualizer({
    count: state.layout.rows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => state.rowHeight,
    overscan: DEFAULTS.overscan,
  });
  return (
    <GitGraphBody
      state={state}
      virtualItems={virtualizer.getVirtualItems()}
      totalSize={virtualizer.getTotalSize()}
      scrollToIndex={(idx) => virtualizer.scrollToIndex(idx, { align: "auto" })}
    />
  );
}

function GitGraphInWindow(props: GitGraphProps & { layout: LayoutResult }) {
  const state = useGitGraphState(props, props.layout);
  const virtualizer = useWindowVirtualizer({
    count: state.layout.rows.length,
    estimateSize: () => state.rowHeight,
    overscan: DEFAULTS.overscan,
  });
  return (
    <GitGraphBody
      state={state}
      virtualItems={virtualizer.getVirtualItems()}
      totalSize={virtualizer.getTotalSize()}
      scrollToIndex={(idx) => virtualizer.scrollToIndex(idx, { align: "auto" })}
    />
  );
}

export default function GitGraph(props: GitGraphProps) {
  // Hooks must run unconditionally — useLayoutOrError is called every render,
  // including when commits is empty (computeLayout([]) returns an empty layout).
  const layoutResult = useLayoutOrError(props);
  // Dedupe the dev-mode console.error per error kind so re-renders with the
  // same bad input don't spam (and strict-mode's double-render emits once).
  const reportedKindRef = useRef<GitGraphInputErrorKind | null>(null);

  if (props.commits.length === 0 && !props.showWorkingTreeRow) {
    return (
      <div
        data-testid="git-graph"
        data-empty="true"
        role="listbox"
        aria-label="Empty git history"
        className={rootClassNameFor(props)}
      />
    );
  }

  if (!layoutResult.ok) {
    if (
      process.env.NODE_ENV !== "production" &&
      reportedKindRef.current !== layoutResult.kind
    ) {
      console.error(
        `GitGraph: input rejected (${layoutResult.kind}) — see lib/errors.ts for the kind union.`,
      );
      reportedKindRef.current = layoutResult.kind;
    }
    return (
      <div
        data-testid="git-graph-error"
        data-error-kind={layoutResult.kind}
        role="alert"
        className={rootClassNameFor(props)}
      >
        GitGraph: invalid commit graph ({layoutResult.kind})
      </div>
    );
  }

  if (props.scrollContainerRef) {
    return (
      <GitGraphInElement
        {...props}
        scrollContainerRef={props.scrollContainerRef}
        layout={layoutResult.layout}
      />
    );
  }
  return <GitGraphInWindow {...props} layout={layoutResult.layout} />;
}
