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

// Edge classification.
//   - `straight`: primary-parent edge whose child and parent share a lane.
//   - `fork`:     primary-parent edge whose child and parent are on different
//                 lanes (a branch tip rejoining its ancestor's lane).
//   - `merge`:    secondary-parent edge (parents[i>0]) — always rendered as
//                 a curve regardless of lane geometry.
export type EdgeKind = "straight" | "fork" | "merge";

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
