import type { Commit, LayoutResult } from "../../../registry/git-graph/types";
const author = { name: "A" };

export const linearFixture: Commit[] = [
  { sha: "a4", parents: ["a3"], author, message: "fourth", timestamp: 4000 },
  { sha: "a3", parents: ["a2"], author, message: "third",  timestamp: 3000 },
  { sha: "a2", parents: ["a1"], author, message: "second", timestamp: 2000 },
  { sha: "a1", parents: [],     author, message: "first",  timestamp: 1000 },
];

export const linearExpected: LayoutResult = {
  rows: [
    { commit: linearFixture[0]!, lane: 0, rowIndex: 0 },
    { commit: linearFixture[1]!, lane: 0, rowIndex: 1 },
    { commit: linearFixture[2]!, lane: 0, rowIndex: 2 },
    { commit: linearFixture[3]!, lane: 0, rowIndex: 3 },
  ],
  edges: [
    { fromSha: "a4", toSha: "a3", fromLane: 0, toLane: 0, fromRow: 0, toRow: 1, kind: "straight" },
    { fromSha: "a3", toSha: "a2", fromLane: 0, toLane: 0, fromRow: 1, toRow: 2, kind: "straight" },
    { fromSha: "a2", toSha: "a1", fromLane: 0, toLane: 0, fromRow: 2, toRow: 3, kind: "straight" },
  ],
  laneCount: 1,
};
