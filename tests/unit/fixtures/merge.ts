import type { Commit, LayoutResult } from "../../../registry/git-graph/types";
const author = { name: "A" };

export const mergeFixture: Commit[] = [
  { sha: "m1", parents: [],           author, message: "root",  timestamp: 1000 },
  { sha: "m2", parents: ["m1"],       author, message: "m2",    timestamp: 2000 },
  { sha: "f1", parents: ["m1"],       author, message: "f1",    timestamp: 2500 },
  { sha: "m3", parents: ["m2", "f1"], author, message: "merge", timestamp: 3000 },
];

export const mergeExpected: LayoutResult = {
  rows: [
    { commit: mergeFixture[3]!, lane: 0, rowIndex: 0 }, // m3
    { commit: mergeFixture[2]!, lane: 1, rowIndex: 1 }, // f1
    { commit: mergeFixture[1]!, lane: 0, rowIndex: 2 }, // m2
    { commit: mergeFixture[0]!, lane: 0, rowIndex: 3 }, // m1
  ],
  edges: [
    { fromSha: "m3", toSha: "m2", fromLane: 0, toLane: 0, fromRow: 0, toRow: 2, kind: "straight" },
    { fromSha: "m3", toSha: "f1", fromLane: 0, toLane: 1, fromRow: 0, toRow: 1, kind: "merge"    },
    { fromSha: "f1", toSha: "m1", fromLane: 1, toLane: 0, fromRow: 1, toRow: 3, kind: "fork"     },
    { fromSha: "m2", toSha: "m1", fromLane: 0, toLane: 0, fromRow: 2, toRow: 3, kind: "straight" },
  ],
  laneCount: 2,
};
