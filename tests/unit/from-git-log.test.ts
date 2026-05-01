import { describe, expect, it } from "vitest";
import { fromGitLog, GIT_LOG_FORMAT } from "../../registry/git-graph/lib/from-git-log";

describe("fromGitLog", () => {
  it("returns [] for empty input", () => {
    expect(fromGitLog("")).toEqual([]);
  });

  it("parses a single root commit (empty parents)", () => {
    const line = ["abc123", "", "1700000000", "Alice", "a@x.com", "first"].join("\t");
    const result = fromGitLog(line);
    expect(result).toHaveLength(1);
    expect(result[0]!.sha).toBe("abc123");
    expect(result[0]!.parents).toEqual([]);
    expect(result[0]!.author.name).toBe("Alice");
    expect(result[0]!.author.email).toBe("a@x.com");
    expect(result[0]!.message).toBe("first");
  });

  it("parses a two-commit chain", () => {
    const text = [
      ["c2", "c1", "1700000100", "Bob", "b@x.com", "second"].join("\t"),
      ["c1", "", "1700000000", "Bob", "b@x.com", "first"].join("\t"),
    ].join("\n");
    const result = fromGitLog(text);
    expect(result).toHaveLength(2);
    expect(result[0]!.parents).toEqual(["c1"]);
    expect(result[0]!.parents[0]).toBe(result[1]!.sha);
  });

  it("parses a merge commit (two parents)", () => {
    const line = ["m1", "p1 p2", "1700000200", "C", "c@x.com", "merge"].join("\t");
    const result = fromGitLog(line);
    expect(result[0]!.parents).toEqual(["p1", "p2"]);
  });

  it("ignores trailing newline (no extra empty entry)", () => {
    const line = ["abc", "", "1700000000", "X", "x@x.com", "msg"].join("\t");
    expect(fromGitLog(line + "\n")).toHaveLength(1);
  });

  it("throws on malformed line (5 fields)", () => {
    const line = ["abc", "", "1700000000", "X", "x@x.com"].join("\t");
    expect(() => fromGitLog(line)).toThrow(/malformed line 1/);
  });

  it("converts unix-seconds timestamp to unix-ms", () => {
    const line = ["abc", "", "1700000000", "X", "x@x.com", "msg"].join("\t");
    const result = fromGitLog(line);
    expect(result[0]!.timestamp).toBe(1700000000 * 1000);
  });

  it("preserves tab characters in commit subject (subject can contain tabs)", () => {
    const subject = "fix:\tindent issue";
    const line = ["abc", "", "1700000000", "X", "x@x.com", subject].join("\t");
    const result = fromGitLog(line);
    expect(result[0]!.message).toBe(subject);
  });

  it("throws on non-numeric timestamp (would silently produce NaN otherwise)", () => {
    const line = ["abc", "", "not-a-number", "X", "x@x.com", "msg"].join("\t");
    expect(() => fromGitLog(line)).toThrow(/malformed timestamp on line 1/);
  });

  it("strips trailing \\r from CRLF line endings", () => {
    const line = ["abc", "", "1700000000", "X", "x@x.com", "msg"].join("\t");
    const result = fromGitLog(line + "\r\n");
    expect(result).toHaveLength(1);
    expect(result[0]!.message).toBe("msg");
  });

  it("exports GIT_LOG_FORMAT constant", () => {
    expect(GIT_LOG_FORMAT).toBe("%H%x09%P%x09%ct%x09%an%x09%ae%x09%s");
  });
});
