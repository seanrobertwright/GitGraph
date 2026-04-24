import type { Commit, LayoutResult } from "../../../registry/git-graph/types";
const author = { name: "A" };

export const orphanFixture: Commit[] = [
  { sha: "a1", parents: [],     author, message: "a root", timestamp: 1000 },
  { sha: "b1", parents: [],     author, message: "b root", timestamp: 1500 },
  { sha: "a2", parents: ["a1"], author, message: "a tip",  timestamp: 2000 },
  { sha: "b2", parents: ["b1"], author, message: "b tip",  timestamp: 2500 },
];

export const orphanExpected: LayoutResult = {
  rows: [
    { commit: orphanFixture[3]!, lane: 0, rowIndex: 0 }, // b2
    { commit: orphanFixture[2]!, lane: 1, rowIndex: 1 }, // a2
    { commit: orphanFixture[1]!, lane: 0, rowIndex: 2 }, // b1
    { commit: orphanFixture[0]!, lane: 1, rowIndex: 3 }, // a1
  ],
  edges: [
    { fromSha: "b2", toSha: "b1", fromLane: 0, toLane: 0, fromRow: 0, toRow: 2, kind: "straight" },
    { fromSha: "a2", toSha: "a1", fromLane: 1, toLane: 1, fromRow: 1, toRow: 3, kind: "straight" },
  ],
  laneCount: 2,
};
