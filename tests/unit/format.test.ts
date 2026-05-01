import { describe, expect, it } from "vitest";
import { relativeTime, shortSha } from "../../registry/git-graph/lib/format";

const NOW = 1_700_000_000_000;

describe("shortSha", () => {
  it("returns first 7 chars", () => {
    expect(shortSha("abcdef1234567890")).toBe("abcdef1");
  });
  it("returns sha as-is when shorter than 7", () => {
    expect(shortSha("abc")).toBe("abc");
  });
});

describe("relativeTime", () => {
  it("just now for delta < 60s", () => {
    expect(relativeTime(NOW - 30_000, NOW)).toBe("just now");
  });
  it("minutes bucket", () => {
    expect(relativeTime(NOW - 5 * 60_000, NOW)).toBe("5m");
  });
  it("hours bucket", () => {
    expect(relativeTime(NOW - 3 * 3_600_000, NOW)).toBe("3h");
  });
  it("days bucket", () => {
    expect(relativeTime(NOW - 2 * 86_400_000, NOW)).toBe("2d");
  });
  it("months bucket", () => {
    expect(relativeTime(NOW - 60 * 86_400_000, NOW)).toBe("2mo");
  });
  it("years bucket", () => {
    expect(relativeTime(NOW - 800 * 86_400_000, NOW)).toBe("2y");
  });
  it("invalid string returns unknown", () => {
    expect(relativeTime("not-a-date", NOW)).toBe("unknown");
  });
  it("accepts ISO strings", () => {
    expect(relativeTime(new Date(NOW - 1000).toISOString(), NOW)).toBe("just now");
  });

  describe("boundaries", () => {
    it("just before 1m boundary stays 'just now'", () => {
      expect(relativeTime(NOW - 59_999, NOW)).toBe("just now");
    });
    it("at 1m boundary flips to 1m", () => {
      expect(relativeTime(NOW - 60_000, NOW)).toBe("1m");
    });
    it("just before 1h boundary is 59m", () => {
      expect(relativeTime(NOW - 3_599_999, NOW)).toBe("59m");
    });
    it("at 1h boundary is 1h", () => {
      expect(relativeTime(NOW - 3_600_000, NOW)).toBe("1h");
    });
    it("at 30d boundary is 1mo (not 30d)", () => {
      expect(relativeTime(NOW - 30 * 86_400_000, NOW)).toBe("1mo");
    });
    it("just before 30d boundary is 29d", () => {
      expect(relativeTime(NOW - (30 * 86_400_000 - 1), NOW)).toBe("29d");
    });
    it("at 365d boundary is 1y", () => {
      expect(relativeTime(NOW - 365 * 86_400_000, NOW)).toBe("1y");
    });
    it("future timestamp clamped to just now", () => {
      expect(relativeTime(NOW + 5_000, NOW)).toBe("just now");
    });
  });
});
