export type Ref = {
  name: string;
  kind: "branch" | "tag" | "remote-branch";
  isHead?: boolean;
};

export type Commit = {
  sha: string;
  parents: string[];
  author: { name: string; email?: string; avatarUrl?: string };
  message: string;
  timestamp: number | string;
  refs?: Ref[];
};

// Phase 2: `straight` = primary-parent edge (parents[0]),
//          `merge`    = secondary-parent edge (parents[i>0]).
// Phase 3 will add `fork` when bezier rendering needs to distinguish a
// cross-lane primary-parent edge (branch tip rejoining ancestor lane) from
// a same-lane one. For Phase 2, geometry is read off fromLane/toLane.
export type EdgeKind = "straight" | "merge";

export type LayoutRow = {
  commit: Commit;
  lane: number;
  rowIndex: number;
};

export type LayoutEdge = {
  fromSha: string;
  toSha: string;
  fromLane: number;
  toLane: number;
  fromRow: number;
  toRow: number;
  kind: EdgeKind;
};

export type LayoutResult = {
  rows: LayoutRow[];
  edges: LayoutEdge[];
  laneCount: number;
};
