import type { Commit } from "../types";

export const WORKING_TREE_SHA = "__WORKING_TREE__" as const;

export function synthesizeWorkingTreeCommit(
  head: string | undefined,
  now: number = Date.now(),
): Commit {
  return {
    sha: WORKING_TREE_SHA,
    parents: head ? [head] : [],
    author: { name: "Working tree" },
    message: "Uncommitted changes",
    timestamp: now,
  };
}
