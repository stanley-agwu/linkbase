import { describe, expect, it } from "vitest";

import { analyticsRangeSchema } from "./analytics";

describe("analyticsRangeSchema", () => {
  it.for(["7d", "30d", "90d"])("accepts the %s range", (range) => {
    expect(analyticsRangeSchema.parse(range)).toBe(range);
  });

  it("falls back to 7 days when ?range= is missing", () => {
    expect(analyticsRangeSchema.parse(undefined)).toBe("7d");
  });

  it.for(["bogus", "", "7D", "365d", "7"])(
    "falls back to 7 days for an unknown range, %j",
    (range) => {
      expect(analyticsRangeSchema.parse(range)).toBe("7d");
    },
  );

  it("falls back to 7 days when ?range= is repeated, which arrives as an array", () => {
    expect(analyticsRangeSchema.parse(["30d", "90d"])).toBe("7d");
  });
});
