import { describe, expect, test } from "vitest";
import { computeLayout } from "../../registry/git-graph/lib/layout";
import {
  featureBranchExpected,
  featureBranchFixture,
  linearExpected,
  linearFixture,
  longLivedReleaseExpected,
  longLivedReleaseFixture,
  mergeExpected,
  mergeFixture,
  octopusExpected,
  octopusFixture,
  orphanExpected,
  orphanFixture,
} from "./fixtures";
import type { Commit, LayoutResult } from "../../registry/git-graph/types";

const cases: Array<[name: string, input: Commit[], expected: LayoutResult]> = [
  ["linear",              linearFixture,            linearExpected],
  ["feature-branch",      featureBranchFixture,     featureBranchExpected],
  ["merge",               mergeFixture,             mergeExpected],
  ["octopus",             octopusFixture,           octopusExpected],
  ["orphan",              orphanFixture,            orphanExpected],
  ["long-lived-release",  longLivedReleaseFixture,  longLivedReleaseExpected],
];

describe("computeLayout — fixtures", () => {
  for (const [name, input, expected] of cases) {
    test(`${name} matches expected layout`, () => {
      expect(computeLayout(input)).toEqual(expected);
    });
  }
});

describe("computeLayout — invariants", () => {
  test("is deterministic across repeated calls", () => {
    for (const [name, input] of cases) {
      const a = JSON.stringify(computeLayout(input));
      const b = JSON.stringify(computeLayout(input));
      expect(a, `fixture ${name} drifted between runs`).toBe(b);
    }
  });

  test("does not mutate its input", () => {
    for (const [name, input] of cases) {
      const snapshot = structuredClone(input);
      computeLayout(input);
      expect(input, `fixture ${name} was mutated`).toEqual(snapshot);
    }
  });

  test("places every commit exactly once", () => {
    for (const [name, input] of cases) {
      const result = computeLayout(input);
      expect(result.rows, `fixture ${name}`).toHaveLength(input.length);
      const shas = new Set(result.rows.map((r) => r.commit.sha));
      expect(shas.size, `fixture ${name} has duplicate rows`).toBe(input.length);
    }
  });

  test("laneCount equals max row lane + 1", () => {
    for (const [name, input] of cases) {
      const result = computeLayout(input);
      const maxLane = Math.max(-1, ...result.rows.map((r) => r.lane));
      expect(result.laneCount, `fixture ${name}`).toBe(maxLane + 1);
    }
  });
});

describe("computeLayout — malformed input", () => {
  const author = { name: "A" };

  test("throws on duplicate sha", () => {
    const input: Commit[] = [
      { sha: "x", parents: [], author, message: "first",  timestamp: 1 },
      { sha: "x", parents: [], author, message: "second", timestamp: 2 },
    ];
    expect(() => computeLayout(input)).toThrow(/duplicate sha/);
  });

  test("throws on cycle", () => {
    const input: Commit[] = [
      { sha: "a", parents: ["b"], author, message: "a", timestamp: 1 },
      { sha: "b", parents: ["a"], author, message: "b", timestamp: 2 },
    ];
    expect(() => computeLayout(input)).toThrow(/cycle/);
  });

  test("throws on unparseable timestamp string", () => {
    const input: Commit[] = [
      { sha: "a", parents: [], author, message: "a", timestamp: "not a date" },
      { sha: "b", parents: [], author, message: "b", timestamp: 1 },
    ];
    expect(() => computeLayout(input)).toThrow(/unparseable timestamp/);
  });
});
