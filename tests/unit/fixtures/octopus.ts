import type { Commit, LayoutResult } from "../../../registry/git-graph/types";
const author = { name: "A" };

export const octopusFixture: Commit[] = [
  { sha: "rt", parents: [],                author, message: "root",    timestamp: 1000 },
  { sha: "a",  parents: ["rt"],            author, message: "a",       timestamp: 2000 },
  { sha: "b",  parents: ["rt"],            author, message: "b",       timestamp: 2100 },
  { sha: "c",  parents: ["rt"],            author, message: "c",       timestamp: 2200 },
  { sha: "o",  parents: ["a", "b", "c"],   author, message: "octopus", timestamp: 3000 },
];

export const octopusExpected: LayoutResult = {
  rows: [
    { commit: octopusFixture[4]!, lane: 0, rowIndex: 0 }, // o
    { commit: octopusFixture[3]!, lane: 2, rowIndex: 1 }, // c
    { commit: octopusFixture[2]!, lane: 1, rowIndex: 2 }, // b
    { commit: octopusFixture[1]!, lane: 0, rowIndex: 3 }, // a
    { commit: octopusFixture[0]!, lane: 0, rowIndex: 4 }, // rt
  ],
  edges: [
    { fromSha: "o", toSha: "a",  fromLane: 0, toLane: 0, fromRow: 0, toRow: 3, kind: "straight" },
    { fromSha: "o", toSha: "b",  fromLane: 0, toLane: 1, fromRow: 0, toRow: 2, kind: "merge"    },
    { fromSha: "o", toSha: "c",  fromLane: 0, toLane: 2, fromRow: 0, toRow: 1, kind: "merge"    },
    { fromSha: "c", toSha: "rt", fromLane: 2, toLane: 0, fromRow: 1, toRow: 4, kind: "fork"     },
    { fromSha: "b", toSha: "rt", fromLane: 1, toLane: 0, fromRow: 2, toRow: 4, kind: "fork"     },
    { fromSha: "a", toSha: "rt", fromLane: 0, toLane: 0, fromRow: 3, toRow: 4, kind: "straight" },
  ],
  laneCount: 3,
};
