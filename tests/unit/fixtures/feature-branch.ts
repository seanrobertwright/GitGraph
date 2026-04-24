import type { Commit, LayoutResult } from "../../../registry/git-graph/types";
const author = { name: "A" };

export const featureBranchFixture: Commit[] = [
  { sha: "m1", parents: [],           author, message: "root",    timestamp: 1000 },
  { sha: "f1", parents: ["m1"],       author, message: "feat 1",  timestamp: 2000 },
  { sha: "m2", parents: ["m1"],       author, message: "main 2",  timestamp: 2500 },
  { sha: "f2", parents: ["f1"],       author, message: "feat 2",  timestamp: 3000 },
  { sha: "m3", parents: ["m2", "f2"], author, message: "merge",   timestamp: 4000 },
];

export const featureBranchExpected: LayoutResult = {
  rows: [
    { commit: featureBranchFixture[4]!, lane: 0, rowIndex: 0 }, // m3
    { commit: featureBranchFixture[3]!, lane: 1, rowIndex: 1 }, // f2
    { commit: featureBranchFixture[2]!, lane: 0, rowIndex: 2 }, // m2
    { commit: featureBranchFixture[1]!, lane: 1, rowIndex: 3 }, // f1
    { commit: featureBranchFixture[0]!, lane: 0, rowIndex: 4 }, // m1
  ],
  edges: [
    { fromSha: "m3", toSha: "m2", fromLane: 0, toLane: 0, fromRow: 0, toRow: 2, kind: "straight" },
    { fromSha: "m3", toSha: "f2", fromLane: 0, toLane: 1, fromRow: 0, toRow: 1, kind: "merge"    },
    { fromSha: "f2", toSha: "f1", fromLane: 1, toLane: 1, fromRow: 1, toRow: 3, kind: "straight" },
    { fromSha: "m2", toSha: "m1", fromLane: 0, toLane: 0, fromRow: 2, toRow: 4, kind: "straight" },
    { fromSha: "f1", toSha: "m1", fromLane: 1, toLane: 0, fromRow: 3, toRow: 4, kind: "straight" },
  ],
  laneCount: 2,
};
