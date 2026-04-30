import { describe, expect, test } from "vitest";
import { DEFAULT_BEZIER_OPTS, edgePath } from "../../registry/git-graph/lib/bezier";
import type { LayoutEdge } from "../../registry/git-graph/types";

// Hand-traced against DEFAULT_BEZIER_OPTS (laneWidth=16, rowHeight=40):
//   centerX(L) = 16*L + 8       → L=0:8,  L=1:24, L=2:40
//   centerY(R) = 40*R + 20      → R=0:20, R=1:60, R=2:100, R=3:140, R=4:180

describe("edgePath — straight (same-lane primary)", () => {
  test("vertical line on lane 0 from row 0 to row 1", () => {
    const edge: LayoutEdge = {
      fromSha: "a", toSha: "b",
      fromLane: 0, toLane: 0,
      fromRow: 0, toRow: 1,
      kind: "straight",
    };
    expect(edgePath(edge)).toBe("M 8 20 L 8 60");
  });
});

describe("edgePath — fork (cross-lane primary, branch tip rejoining ancestor)", () => {
  test("S-curve from lane 1 row 3 to lane 0 row 4", () => {
    const edge: LayoutEdge = {
      fromSha: "f1", toSha: "m1",
      fromLane: 1, toLane: 0,
      fromRow: 3, toRow: 4,
      kind: "fork",
    };
    // y1=140, y2=180, dy=40, cy1=160, cy2=160
    expect(edgePath(edge)).toBe("M 24 140 C 24 160 8 160 8 180");
  });
});

describe("edgePath — merge (secondary-parent)", () => {
  test("S-curve from lane 0 row 0 to lane 1 row 1", () => {
    const edge: LayoutEdge = {
      fromSha: "m3", toSha: "f2",
      fromLane: 0, toLane: 1,
      fromRow: 0, toRow: 1,
      kind: "merge",
    };
    // y1=20, y2=60, dy=40, cy1=40, cy2=40
    expect(edgePath(edge)).toBe("M 8 20 C 8 40 24 40 24 60");
  });
});

describe("edgePath — invariants", () => {
  test("is deterministic across repeated calls", () => {
    const edge: LayoutEdge = {
      fromSha: "a", toSha: "b",
      fromLane: 2, toLane: 0,
      fromRow: 1, toRow: 5,
      kind: "fork",
    };
    expect(edgePath(edge)).toBe(edgePath(edge));
  });

  test("respects custom opts", () => {
    const edge: LayoutEdge = {
      fromSha: "a", toSha: "b",
      fromLane: 0, toLane: 0,
      fromRow: 0, toRow: 1,
      kind: "straight",
    };
    expect(edgePath(edge, { laneWidth: 20, rowHeight: 30 })).toBe("M 10 15 L 10 45");
  });

  test("DEFAULT_BEZIER_OPTS holds the documented values", () => {
    expect(DEFAULT_BEZIER_OPTS).toEqual({ laneWidth: 16, rowHeight: 40 });
  });
});
