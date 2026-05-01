import { describe, expect, it } from "vitest";
import type { Commit } from "../../registry/git-graph/types";
import { validate } from "../../registry/git-graph/lib/validate";
import { GitGraphInputError } from "../../registry/git-graph/lib/errors";

const author = { name: "A" };

describe("validate", () => {
  it("accepts a valid linear chain", () => {
    const commits: Commit[] = [
      { sha: "a3", parents: ["a2"], author, message: "third", timestamp: 3 },
      { sha: "a2", parents: ["a1"], author, message: "second", timestamp: 2 },
      { sha: "a1", parents: [], author, message: "first", timestamp: 1 },
    ];
    expect(() => validate(commits)).not.toThrow();
  });

  it("throws missing-parent when a parent is not in the array", () => {
    const commits: Commit[] = [
      { sha: "a2", parents: ["ghost"], author, message: "second", timestamp: 2 },
      { sha: "a1", parents: [], author, message: "first", timestamp: 1 },
    ];
    let caught: unknown;
    try {
      validate(commits);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(GitGraphInputError);
    if (caught instanceof GitGraphInputError) {
      expect(caught.kind).toBe("missing-parent");
      expect(caught.sha).toBe("a2");
    }
  });

  it("does not throw missing-parent when allowMissingParents=true", () => {
    const commits: Commit[] = [
      { sha: "a2", parents: ["ghost"], author, message: "second", timestamp: 2 },
      { sha: "a1", parents: [], author, message: "first", timestamp: 1 },
    ];
    expect(() => validate(commits, { allowMissingParents: true })).not.toThrow();
  });

  it("throws unknown-head when head is not in commits", () => {
    const commits: Commit[] = [
      { sha: "a1", parents: [], author, message: "first", timestamp: 1 },
    ];
    let caught: unknown;
    try {
      validate(commits, { head: "deadbeef" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(GitGraphInputError);
    if (caught instanceof GitGraphInputError) {
      expect(caught.kind).toBe("unknown-head");
      expect(caught.sha).toBe("deadbeef");
    }
  });

  it("does not validate head when head opt is omitted", () => {
    const commits: Commit[] = [
      { sha: "a1", parents: [], author, message: "first", timestamp: 1 },
    ];
    expect(() => validate(commits)).not.toThrow();
  });
});
