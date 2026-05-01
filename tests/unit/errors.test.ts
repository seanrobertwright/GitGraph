import { describe, expect, it } from "vitest";
import { GitGraphInputError } from "../../registry/git-graph/lib/errors";

describe("GitGraphInputError", () => {
  it("constructs with kind and sha; is instance of Error and GitGraphInputError", () => {
    const err = new GitGraphInputError("duplicate-sha", "x", "abc");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(GitGraphInputError);
    expect(err.kind).toBe("duplicate-sha");
    expect(err.sha).toBe("abc");
    expect(err.name).toBe("GitGraphInputError");
    expect(err.message).toBe("x");
  });

  it("leaves sha undefined when not provided", () => {
    const err = new GitGraphInputError("cycle", "cycle detected");
    expect(err.sha).toBeUndefined();
    expect(err.kind).toBe("cycle");
  });

  it("survives instanceof across throw/catch (prototype chain preserved post-transpile)", () => {
    let caught: unknown;
    try {
      throw new GitGraphInputError("unknown-head", "missing", "deadbeef");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(GitGraphInputError);
    if (caught instanceof GitGraphInputError) {
      expect(caught.kind).toBe("unknown-head");
      expect(caught.sha).toBe("deadbeef");
    }
  });
});
