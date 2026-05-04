import { describe, expect, test } from "vitest";
import { computeLayout } from "../../registry/git-graph/lib/layout";
import {
  featureBranchFixture,
  linearFixture,
  mergeFixture,
  octopusFixture,
  orphanFixture,
  longLivedReleaseFixture,
} from "./fixtures";
import type { Commit } from "../../registry/git-graph/types";

const fixtures: Array<[name: string, input: Commit[]]> = [
  ["linear", linearFixture],
  ["feature-branch", featureBranchFixture],
  ["merge", mergeFixture],
  ["octopus", octopusFixture],
  ["orphan", orphanFixture],
  ["long-lived-release", longLivedReleaseFixture],
];

describe("computeLayout — filter signature", () => {
  test("undefined options is identical to no options arg", () => {
    for (const [name, input] of fixtures) {
      expect(
        computeLayout(input),
        `fixture ${name} drifted with explicit-undefined options`,
      ).toEqual(computeLayout(input, undefined));
    }
  });

  test("filter that returns true for everything matches the unfiltered output", () => {
    for (const [name, input] of fixtures) {
      expect(
        computeLayout(input, { filter: () => true }),
        `fixture ${name} drifted under always-true filter`,
      ).toEqual(computeLayout(input));
    }
  });

  test("filter that returns false for everything yields empty layout", () => {
    for (const [name, input] of fixtures) {
      expect(
        computeLayout(input, { filter: () => false }),
        `fixture ${name} did not collapse to empty under always-false filter`,
      ).toEqual({ rows: [], edges: [], laneCount: 0 });
    }
  });
});

describe("computeLayout — filter property invariants", () => {
  const predicates: Array<[name: string, fn: (c: Commit) => boolean]> = [
    [
      "keep-by-sha-hash-parity",
      (c) => {
        let sum = 0;
        for (let i = 0; i < c.sha.length; i++) sum += c.sha.charCodeAt(i);
        return sum % 2 === 0;
      },
    ],
    ["keep-by-author-name-A", (c) => c.author.name === "A"],
    ["keep-by-message-length-even", (c) => c.message.length % 2 === 0],
  ];

  for (const [fixtureName, input] of fixtures) {
    for (const [predName, pred] of predicates) {
      test(`${fixtureName} × ${predName} satisfies invariants`, () => {
        const result = computeLayout(input, { filter: pred });
        const visibleShas = new Set(input.filter(pred).map((c) => c.sha));

        expect(result.rows.length, "row count matches predicate-true count").toBe(
          visibleShas.size,
        );

        for (const row of result.rows) {
          expect(
            visibleShas.has(row.commit.sha),
            `row ${row.commit.sha} should be visible`,
          ).toBe(true);
          expect(pred(row.commit), `row ${row.commit.sha} predicate sanity`).toBe(true);
        }

        for (const edge of result.edges) {
          expect(
            visibleShas.has(edge.fromSha),
            `edge.fromSha ${edge.fromSha} must be visible`,
          ).toBe(true);
          expect(
            visibleShas.has(edge.toSha),
            `edge.toSha ${edge.toSha} must be visible`,
          ).toBe(true);
        }

        const maxLane = Math.max(-1, ...result.rows.map((r) => r.lane));
        expect(result.laneCount).toBe(maxLane + 1);
      });
    }
  }

  test("is deterministic across repeated calls under filter", () => {
    for (const [name, input] of fixtures) {
      const filter = (c: Commit) => c.sha.length > 1;
      const a = JSON.stringify(computeLayout(input, { filter }));
      const b = JSON.stringify(computeLayout(input, { filter }));
      expect(a, `fixture ${name} drifted between filtered runs`).toBe(b);
    }
  });

  test("does not mutate its input under filter", () => {
    for (const [name, input] of fixtures) {
      const snapshot = structuredClone(input);
      computeLayout(input, { filter: (c) => c.parents.length < 2 });
      expect(input, `fixture ${name} mutated under filter`).toEqual(snapshot);
    }
  });
});

describe("computeLayout — explicit skip-over cases on featureBranchFixture", () => {
  test("filter excludes f1 → f2 rewrites parent through to m1", () => {
    const result = computeLayout(featureBranchFixture, {
      filter: (c) => c.sha !== "f1",
    });
    expect(result.rows).toHaveLength(4);
    expect(result.edges).toHaveLength(4);
    expect(result.laneCount).toBe(2);
    expect(
      result.edges.some((e) => e.fromSha === "f2" && e.toSha === "m1"),
    ).toBe(true);
  });

  test("filter excludes m2 → m3 rewrites primary parent through to m1", () => {
    const result = computeLayout(featureBranchFixture, {
      filter: (c) => c.sha !== "m2",
    });
    expect(
      result.edges.some((e) => e.fromSha === "m3" && e.toSha === "m1"),
      "expected m3→m1 skip-over edge",
    ).toBe(true);
  });

  test("filter excludes f1 and f2 → m3 acquires merge edge to m1 through filtered chain", () => {
    const result = computeLayout(featureBranchFixture, {
      filter: (c) => !["f1", "f2"].includes(c.sha),
    });
    expect(result.rows.map((r) => r.commit.sha).sort()).toEqual(["m1", "m2", "m3"]);
    expect(
      result.edges.some((e) => e.fromSha === "m3" && e.toSha === "m1"),
      "expected m3→m1 edge through doubly-filtered chain",
    ).toBe(true);
    expect(
      result.edges.some((e) => e.fromSha === "m3" && e.toSha === "m2"),
      "expected m3→m2 primary edge",
    ).toBe(true);
  });

  test("filter keeps only m1 → root-only layout", () => {
    const result = computeLayout(featureBranchFixture, {
      filter: (c) => c.sha === "m1",
    });
    expect(result.rows).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
    expect(result.laneCount).toBe(1);
  });
});

describe("computeLayout — predicate receives original commit objects", () => {
  test("filter is called with the same Commit references from the input array", () => {
    const seen = new Set<Commit>();
    const result = computeLayout(featureBranchFixture, {
      filter: (c) => {
        seen.add(c);
        // Object.is verification: the predicate must receive the original
        // commit reference, not a copy.
        const original = featureBranchFixture.find((x) => x.sha === c.sha);
        expect(Object.is(c, original)).toBe(true);
        return true;
      },
    });
    expect(seen.size).toBe(featureBranchFixture.length);
    expect(result.rows.length).toBe(featureBranchFixture.length);
  });
});
