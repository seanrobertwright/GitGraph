import type { Commit } from "../../../registry/git-graph/types";

const author = { name: "A", email: "a@example.com" };

export const withRefsFixture: Commit[] = [
  {
    sha: "m3",
    parents: ["m2", "f2"],
    author,
    message: "merge feat",
    timestamp: 4000,
    refs: [
      { name: "main", kind: "branch", isHead: true },
      { name: "origin/main", kind: "remote-branch" },
      { name: "v1.0.0", kind: "tag" },
    ],
  },
  {
    sha: "f2",
    parents: ["f1"],
    author,
    message: "feat 2",
    timestamp: 3000,
    refs: [{ name: "feature/x", kind: "branch" }],
  },
  { sha: "m2", parents: ["m1"], author, message: "main 2", timestamp: 2500 },
  {
    sha: "f1",
    parents: ["m1"],
    author,
    message: "feat 1",
    timestamp: 2000,
    refs: [{ name: "v0.9.0", kind: "tag" }],
  },
  { sha: "m1", parents: [], author, message: "root", timestamp: 1000 },
];
