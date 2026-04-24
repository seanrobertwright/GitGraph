import type { Commit, EdgeKind, LayoutEdge, LayoutResult, LayoutRow } from "../types";

// Duplicate shas: last occurrence wins in the sha→commit map. Topological
// ordering treats duplicates as the same node, so output may be surprising —
// callers should dedupe their input.
export function computeLayout(commits: Commit[]): LayoutResult {
  const bySha = new Map<string, Commit>();
  for (const c of commits) bySha.set(c.sha, c);

  const sorted = topoSort(commits, bySha);

  const lanes: (string | null)[] = [];
  const rows: LayoutRow[] = [];
  const partialEdges: Array<{
    fromSha: string;
    toSha: string;
    fromLane: number;
    fromRow: number;
    kind: EdgeKind;
  }> = [];

  for (let rowIndex = 0; rowIndex < sorted.length; rowIndex++) {
    const commit = sorted[rowIndex]!;

    let targetLane = -1;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] === commit.sha) {
        if (targetLane === -1) targetLane = i;
        lanes[i] = null;
      }
    }
    if (targetLane === -1) {
      targetLane = claimFreeLane(lanes);
    }

    rows.push({ commit, lane: targetLane, rowIndex });

    const parents = commit.parents;
    if (parents.length > 0) {
      const primary = parents[0]!;
      if (bySha.has(primary)) {
        lanes[targetLane] = primary;
        partialEdges.push({
          fromSha: commit.sha,
          toSha: primary,
          fromLane: targetLane,
          fromRow: rowIndex,
          kind: "straight",
        });
      }
      for (let i = 1; i < parents.length; i++) {
        const secondary = parents[i]!;
        if (!bySha.has(secondary)) continue;
        const reservedLane = claimFreeLane(lanes);
        lanes[reservedLane] = secondary;
        partialEdges.push({
          fromSha: commit.sha,
          toSha: secondary,
          fromLane: targetLane,
          fromRow: rowIndex,
          kind: "merge",
        });
      }
    }
  }

  const rowBySha = new Map<string, LayoutRow>();
  for (const row of rows) rowBySha.set(row.commit.sha, row);

  const edges: LayoutEdge[] = partialEdges.map((e) => {
    const target = rowBySha.get(e.toSha)!;
    return {
      fromSha: e.fromSha,
      toSha: e.toSha,
      fromLane: e.fromLane,
      toLane: target.lane,
      fromRow: e.fromRow,
      toRow: target.rowIndex,
      kind: e.kind,
    };
  });

  let maxLane = -1;
  for (const row of rows) {
    if (row.lane > maxLane) maxLane = row.lane;
  }
  const laneCount = maxLane + 1;

  return { rows, edges, laneCount };
}

function claimFreeLane(lanes: (string | null)[]): number {
  for (let i = 0; i < lanes.length; i++) {
    if (lanes[i] === null) return i;
  }
  lanes.push(null);
  return lanes.length - 1;
}

function toTimestampNumber(t: number | string): number {
  return typeof t === "number" ? t : Date.parse(t);
}

function topoSort(commits: Commit[], bySha: Map<string, Commit>): Commit[] {
  const remainingChildren = new Map<string, number>();
  for (const c of commits) remainingChildren.set(c.sha, 0);
  for (const c of commits) {
    for (const p of c.parents) {
      const current = remainingChildren.get(p);
      if (current !== undefined) remainingChildren.set(p, current + 1);
    }
  }

  const ready: Commit[] = [];
  for (const c of commits) {
    if (remainingChildren.get(c.sha) === 0) ready.push(c);
  }

  const result: Commit[] = [];
  const compare = (a: Commit, b: Commit): number => {
    const ta = toTimestampNumber(a.timestamp);
    const tb = toTimestampNumber(b.timestamp);
    if (ta !== tb) return tb - ta;
    if (a.sha < b.sha) return -1;
    if (a.sha > b.sha) return 1;
    return 0;
  };

  while (ready.length > 0) {
    ready.sort(compare);
    const next = ready.shift()!;
    result.push(next);
    for (const p of next.parents) {
      const current = remainingChildren.get(p);
      if (current === undefined) continue;
      const updated = current - 1;
      remainingChildren.set(p, updated);
      if (updated === 0) {
        const parentCommit = bySha.get(p);
        if (parentCommit) ready.push(parentCommit);
      }
    }
  }

  return result;
}
