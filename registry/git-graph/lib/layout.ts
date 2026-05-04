import type { Commit, EdgeKind, LayoutEdge, LayoutResult, LayoutRow } from "../types";
import { GitGraphInputError } from "./errors";

// Throws on duplicate shas or cycles in the commit graph. Unknown parents
// (referenced in `parents[]` but not present in `commits`) are silently
// ignored — the windowed-log case, where a consumer passes only the last N
// commits of a long history. This applies uniformly to primary and secondary
// parents: a merge-edge to an in-window parent is still emitted even when
// the primary parent is out-of-window.
//
// Filter mode: when `options.filter` is provided, commits for which the
// predicate returns false are removed from the layout. Their visible
// descendants' parent references are rewritten to the nearest-visible-ancestor
// reached by walking through filtered ancestors. Out-of-window parents
// continue to be silently ignored.
export function computeLayout(
  commits: Commit[],
  options?: { filter?: (commit: Commit) => boolean },
): LayoutResult {
  const fullBySha = new Map<string, Commit>();
  for (const c of commits) {
    if (fullBySha.has(c.sha)) {
      throw new GitGraphInputError(
        "duplicate-sha",
        `computeLayout: duplicate sha in input: ${c.sha}`,
        c.sha,
      );
    }
    fullBySha.set(c.sha, c);
  }

  // Cycle check runs against the unfiltered input — input integrity is
  // independent of the consumer's view.
  const sortedFull = topoSort(commits, fullBySha);
  if (sortedFull.length !== commits.length) {
    throw new GitGraphInputError(
      "cycle",
      "computeLayout: cycle detected in commit graph",
    );
  }

  // Apply filter pre-pass (if provided) before topo sort + lane assignment.
  // The filter rewrites visible commits' parent arrays to skip over filtered
  // ancestors, then we rebuild bySha keyed only on the visible set.
  let workingCommits = commits;
  let bySha = fullBySha;
  if (options?.filter) {
    workingCommits = applyFilter(commits, fullBySha, options.filter);
    bySha = new Map<string, Commit>();
    for (const c of workingCommits) bySha.set(c.sha, c);
  }

  // Re-toposort over the filtered + rewritten set. Cheap (≤ original size);
  // necessary because lane assignment iterates in topo order and applyFilter
  // returns commits in original input order.
  const sorted = topoSort(workingCommits, bySha);

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
    let kind: EdgeKind = e.kind;
    if (kind === "straight" && e.fromLane !== target.lane) {
      kind = "fork";
    }
    return {
      fromSha: e.fromSha,
      toSha: e.toSha,
      fromLane: e.fromLane,
      toLane: target.lane,
      fromRow: e.fromRow,
      toRow: target.rowIndex,
      kind,
    };
  });

  let maxLane = -1;
  for (const row of rows) {
    if (row.lane > maxLane) maxLane = row.lane;
  }
  const laneCount = maxLane + 1;

  return { rows, edges, laneCount };
}

// Build a new commit list containing only commits for which `filter` returns
// true, with parent arrays rewritten to point at the nearest-visible-ancestor
// reached by walking through filtered ancestors. Order within each rewritten
// parents[] preserves the BFS order from the original primary→secondary chain
// so primary-parent semantics are preserved when the original primary survives.
function applyFilter(
  commits: Commit[],
  bySha: Map<string, Commit>,
  filter: (commit: Commit) => boolean,
): Commit[] {
  const visible = new Set<string>();
  for (const c of commits) if (filter(c)) visible.add(c.sha);

  function resolveParents(parentShas: readonly string[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const queue: string[] = [...parentShas];
    while (queue.length > 0) {
      const sha = queue.shift()!;
      if (seen.has(sha)) continue;
      seen.add(sha);
      if (!bySha.has(sha)) continue; // out-of-window — drop, as today
      if (visible.has(sha)) {
        if (!out.includes(sha)) out.push(sha);
        continue;
      }
      const grandparents = bySha.get(sha)!.parents;
      for (const gp of grandparents) queue.push(gp);
    }
    return out;
  }

  const rewritten: Commit[] = [];
  for (const c of commits) {
    if (!visible.has(c.sha)) continue;
    rewritten.push({ ...c, parents: resolveParents(c.parents) });
  }
  return rewritten;
}

function claimFreeLane(lanes: (string | null)[]): number {
  for (let i = 0; i < lanes.length; i++) {
    if (lanes[i] === null) return i;
  }
  lanes.push(null);
  return lanes.length - 1;
}

function toTimestampNumber(t: number | string): number {
  if (typeof t === "number") return t;
  const n = Date.parse(t);
  if (Number.isNaN(n)) {
    throw new GitGraphInputError(
      "unparseable-timestamp",
      `computeLayout: unparseable timestamp string: ${t}`,
    );
  }
  return n;
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

  const heap = new MinHeap<Commit>((a, b) => {
    const ta = toTimestampNumber(a.timestamp);
    const tb = toTimestampNumber(b.timestamp);
    if (ta !== tb) return tb - ta; // desc: newer first
    if (a.sha < b.sha) return -1;
    if (a.sha > b.sha) return 1;
    return 0;
  });

  for (const c of commits) {
    if (remainingChildren.get(c.sha) === 0) heap.push(c);
  }

  const result: Commit[] = [];
  while (heap.size > 0) {
    const next = heap.pop()!;
    result.push(next);
    for (const p of next.parents) {
      const current = remainingChildren.get(p);
      if (current === undefined) continue;
      const updated = current - 1;
      remainingChildren.set(p, updated);
      if (updated === 0) {
        const parentCommit = bySha.get(p);
        if (parentCommit) heap.push(parentCommit);
      }
    }
  }

  return result;
}

// Binary min-heap. Keeps topo-ready set ordered by comparator without
// re-sorting the full list on every pop (O(log n) per push/pop instead of
// O(n log n) per iteration).
class MinHeap<T> {
  private readonly data: T[] = [];
  constructor(private readonly compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.data.length;
  }

  push(value: T): void {
    this.data.push(value);
    this.siftUp(this.data.length - 1);
  }

  pop(): T | undefined {
    const n = this.data.length;
    if (n === 0) return undefined;
    const top = this.data[0]!;
    const last = this.data.pop()!;
    if (n > 1) {
      this.data[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.data[i]!, this.data[parent]!) >= 0) return;
      [this.data[i], this.data[parent]] = [this.data[parent]!, this.data[i]!];
      i = parent;
    }
  }

  private siftDown(i: number): void {
    const n = this.data.length;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let best = i;
      if (l < n && this.compare(this.data[l]!, this.data[best]!) < 0) best = l;
      if (r < n && this.compare(this.data[r]!, this.data[best]!) < 0) best = r;
      if (best === i) return;
      [this.data[i], this.data[best]] = [this.data[best]!, this.data[i]!];
      i = best;
    }
  }
}
