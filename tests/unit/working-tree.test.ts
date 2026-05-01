import { describe, expect, it } from "vitest";
import { computeLayout } from "../../registry/git-graph/lib/layout";
import {
  WORKING_TREE_SHA,
  synthesizeWorkingTreeCommit,
} from "../../registry/git-graph/lib/working-tree";

describe("synthesizeWorkingTreeCommit", () => {
  it("uses the WORKING_TREE_SHA constant", () => {
    expect(synthesizeWorkingTreeCommit("abc", 1000).sha).toBe(WORKING_TREE_SHA);
  });
  it("parents = [head] when head provided", () => {
    expect(synthesizeWorkingTreeCommit("abc", 1000).parents).toEqual(["abc"]);
  });
  it("parents = [] when head undefined", () => {
    expect(synthesizeWorkingTreeCommit(undefined, 1000).parents).toEqual([]);
  });
  it("threads timestamp through", () => {
    expect(synthesizeWorkingTreeCommit("abc", 1000).timestamp).toBe(1000);
  });
  it("integrates with computeLayout — working-tree row is at rowIndex 0", () => {
    const layout = computeLayout([
      synthesizeWorkingTreeCommit("m1", 1000),
      { sha: "m1", parents: [], author: { name: "A" }, message: "root", timestamp: 0 },
    ]);
    expect(layout.rows.length).toBe(2);
    const wtRow = layout.rows.find((r) => r.commit.sha === WORKING_TREE_SHA);
    expect(wtRow?.rowIndex).toBe(0);
  });
});
