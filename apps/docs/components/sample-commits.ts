import type { Commit } from "./git-graph/types";

export const SAMPLE_COMMITS: Commit[] = [
  {
    sha: "f6a1c20",
    parents: ["a4b8d11", "c92e3b7"],
    author: { name: "Avery", email: "avery@example.com" },
    message: "Merge branch 'feature/login' into main",
    timestamp: 1714512000,
    refs: [
      { name: "main", kind: "branch", isHead: true },
      { name: "origin/main", kind: "remote-branch" },
    ],
  },
  {
    sha: "c92e3b7",
    parents: ["a4b8d11"],
    author: { name: "Jordan", email: "jordan@example.com" },
    message: "feat(auth): add password reset flow",
    timestamp: 1714425600,
    refs: [{ name: "feature/login", kind: "branch" }],
  },
  {
    sha: "a4b8d11",
    parents: ["7e21f08"],
    author: { name: "Avery", email: "avery@example.com" },
    message: "chore: bump deps",
    timestamp: 1714339200,
  },
  {
    sha: "7e21f08",
    parents: ["3c0d955"],
    author: { name: "Sam", email: "sam@example.com" },
    message: "fix(api): handle null response in /commits",
    timestamp: 1714252800,
    refs: [{ name: "v1.2.0", kind: "tag" }],
  },
  {
    sha: "3c0d955",
    parents: [],
    author: { name: "Sam", email: "sam@example.com" },
    message: "Initial commit",
    timestamp: 1714166400,
  },
];

export const SAMPLE_COMMITS_JSON = JSON.stringify(SAMPLE_COMMITS, null, 2);
