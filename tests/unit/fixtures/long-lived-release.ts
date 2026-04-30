import type { Commit, LayoutResult } from "../../../registry/git-graph/types";
const author = { name: "A" };

export const longLivedReleaseFixture: Commit[] = [
  { sha: "m1", parents: [],           author, message: "root",       timestamp: 1000 },
  { sha: "r1", parents: ["m1"],       author, message: "rel branch", timestamp: 1500 },
  { sha: "m2", parents: ["m1"],       author, message: "main 2",     timestamp: 2000 },
  { sha: "r2", parents: ["r1"],       author, message: "rel 2",      timestamp: 2500 },
  { sha: "m3", parents: ["m2"],       author, message: "main 3",     timestamp: 3000 },
  { sha: "r3", parents: ["r2"],       author, message: "rel 3",      timestamp: 3500 },
  { sha: "m4", parents: ["m3", "r2"], author, message: "hotfix",     timestamp: 4000 },
  { sha: "r4", parents: ["r3"],       author, message: "rel tip",    timestamp: 4500 },
  { sha: "m5", parents: ["m4"],       author, message: "main tip",   timestamp: 5000 },
];

// Topo order (ts desc tiebreak): m5, r4, m4, r3, m3, r2, m2, r1, m1.
// At row 4/5 the ready set is [m3(3000), r2(2500)]; ts desc picks m3 first,
// so m3 lands at row 4 and r2 lands at row 5. Lane assignments are unchanged.
export const longLivedReleaseExpected: LayoutResult = {
  rows: [
    { commit: longLivedReleaseFixture[8]!, lane: 0, rowIndex: 0 }, // m5
    { commit: longLivedReleaseFixture[7]!, lane: 1, rowIndex: 1 }, // r4
    { commit: longLivedReleaseFixture[6]!, lane: 0, rowIndex: 2 }, // m4
    { commit: longLivedReleaseFixture[5]!, lane: 1, rowIndex: 3 }, // r3
    { commit: longLivedReleaseFixture[4]!, lane: 0, rowIndex: 4 }, // m3
    { commit: longLivedReleaseFixture[3]!, lane: 1, rowIndex: 5 }, // r2
    { commit: longLivedReleaseFixture[2]!, lane: 0, rowIndex: 6 }, // m2
    { commit: longLivedReleaseFixture[1]!, lane: 1, rowIndex: 7 }, // r1
    { commit: longLivedReleaseFixture[0]!, lane: 0, rowIndex: 8 }, // m1
  ],
  edges: [
    { fromSha: "m5", toSha: "m4", fromLane: 0, toLane: 0, fromRow: 0, toRow: 2, kind: "straight" },
    { fromSha: "r4", toSha: "r3", fromLane: 1, toLane: 1, fromRow: 1, toRow: 3, kind: "straight" },
    { fromSha: "m4", toSha: "m3", fromLane: 0, toLane: 0, fromRow: 2, toRow: 4, kind: "straight" },
    { fromSha: "m4", toSha: "r2", fromLane: 0, toLane: 1, fromRow: 2, toRow: 5, kind: "merge"    },
    { fromSha: "r3", toSha: "r2", fromLane: 1, toLane: 1, fromRow: 3, toRow: 5, kind: "straight" },
    { fromSha: "m3", toSha: "m2", fromLane: 0, toLane: 0, fromRow: 4, toRow: 6, kind: "straight" },
    { fromSha: "r2", toSha: "r1", fromLane: 1, toLane: 1, fromRow: 5, toRow: 7, kind: "straight" },
    { fromSha: "m2", toSha: "m1", fromLane: 0, toLane: 0, fromRow: 6, toRow: 8, kind: "straight" },
    { fromSha: "r1", toSha: "m1", fromLane: 1, toLane: 0, fromRow: 7, toRow: 8, kind: "fork"     },
  ],
  laneCount: 2,
};
