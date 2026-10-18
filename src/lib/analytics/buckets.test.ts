import { describe, expect, it } from "vitest";

import type { ClickBucket } from "@/lib/types";

import {
  bucketDailyCounts,
  peakBucket,
  rangeStart,
  utcDayKey,
} from "./buckets";

// A Wednesday afternoon, UTC.
const WEDNESDAY = new Date("2026-10-14T15:30:00Z");

function bucket(start: string, count: number): ClickBucket {
  return { start, label: "", fullLabel: start, count };
}

describe("utcDayKey", () => {
  it("names the UTC calendar day", () => {
    expect(utcDayKey(WEDNESDAY)).toBe("2026-10-14");
  });

  it("uses the UTC day, not the local one, for a late-evening click", () => {
    // 23:30 in New York is already the next day in UTC.
    expect(utcDayKey(new Date("2026-10-14T23:30:00-04:00"))).toBe("2026-10-15");
  });
});

describe("rangeStart", () => {
  it("starts 7 days at midnight UTC six days before today", () => {
    expect(rangeStart("7d", WEDNESDAY).toISOString()).toBe(
      "2026-10-08T00:00:00.000Z",
    );
  });

  it("starts 30 days at midnight UTC 29 days before today", () => {
    expect(rangeStart("30d", WEDNESDAY).toISOString()).toBe(
      "2026-09-15T00:00:00.000Z",
    );
  });

  it("starts 90 days at the first of 13 whole weeks ending today", () => {
    expect(rangeStart("90d", WEDNESDAY).toISOString()).toBe(
      "2026-07-16T00:00:00.000Z",
    );
  });
});

describe("bucketDailyCounts", () => {
  describe("7 days", () => {
    it("has one bucket per day, ending today", () => {
      const buckets = bucketDailyCounts("7d", WEDNESDAY, {});
      expect(buckets.map((b) => b.start)).toEqual([
        "2026-10-08",
        "2026-10-09",
        "2026-10-10",
        "2026-10-11",
        "2026-10-12",
        "2026-10-13",
        "2026-10-14",
      ]);
    });

    it("labels every day with its weekday", () => {
      const buckets = bucketDailyCounts("7d", WEDNESDAY, {});
      expect(buckets.map((b) => b.label)).toEqual([
        "Thu",
        "Fri",
        "Sat",
        "Sun",
        "Mon",
        "Tue",
        "Wed",
      ]);
      expect(buckets[0]?.fullLabel).toBe("Thu 8 Oct");
    });

    it("puts each day's count in its bucket and zero-fills the rest", () => {
      const buckets = bucketDailyCounts("7d", WEDNESDAY, {
        "2026-10-08": 3,
        "2026-10-14": 5,
      });
      expect(buckets.map((b) => b.count)).toEqual([3, 0, 0, 0, 0, 0, 5]);
    });

    it("ignores days outside the range", () => {
      const buckets = bucketDailyCounts("7d", WEDNESDAY, {
        "2026-10-07": 9,
        "2026-10-15": 9,
      });
      expect(buckets.every((b) => b.count === 0)).toBe(true);
    });
  });

  describe("30 days", () => {
    // Mid-March, so every label falls in February or March.
    const MARCH = new Date("2026-03-20T09:00:00Z");

    it("has 30 daily buckets from 19 Feb to today", () => {
      const buckets = bucketDailyCounts("30d", MARCH, {});
      expect(buckets).toHaveLength(30);
      expect(buckets[0]?.start).toBe("2026-02-19");
      expect(buckets.at(-1)?.start).toBe("2026-03-20");
    });

    it("labels every seventh day, starting with the first", () => {
      const labels = bucketDailyCounts("30d", MARCH, {}).map((b) => b.label);
      expect(labels.filter(Boolean)).toEqual([
        "19 Feb",
        "26 Feb",
        "5 Mar",
        "12 Mar",
        "19 Mar",
      ]);
      expect(labels[1]).toBe("");
    });
  });

  describe("90 days", () => {
    it("has 13 weekly buckets, the last ending today", () => {
      const buckets = bucketDailyCounts("90d", WEDNESDAY, {});
      expect(buckets).toHaveLength(13);
      expect(buckets[0]?.start).toBe("2026-07-16");
      expect(buckets.at(-1)?.start).toBe("2026-10-08");
      expect(buckets[0]?.fullLabel).toBe("Week of 16 Jul");
    });

    it("sums the seven days of each week, and nothing outside it", () => {
      const buckets = bucketDailyCounts("90d", WEDNESDAY, {
        "2026-07-15": 100, // the day before the range
        "2026-07-16": 1, // first day of week 1
        "2026-07-22": 2, // last day of week 1
        "2026-07-23": 4, // first day of week 2
        "2026-10-14": 8, // today, in the last week
      });
      expect(buckets[0]?.count).toBe(3);
      expect(buckets[1]?.count).toBe(4);
      expect(buckets.at(-1)?.count).toBe(8);
      expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(15);
    });

    it("labels every third week", () => {
      const labels = bucketDailyCounts("90d", WEDNESDAY, {}).map(
        (b) => b.label,
      );
      expect(labels.filter(Boolean)).toHaveLength(5);
      expect(labels[0]).toBe("16 Jul");
      expect(labels[1]).toBe("");
      expect(labels[3]).not.toBe("");
    });
  });

  it("covers exactly the days rangeStart reports, for every range", () => {
    for (const range of ["7d", "30d", "90d"] as const) {
      expect(bucketDailyCounts(range, WEDNESDAY, {})[0]?.start).toBe(
        utcDayKey(rangeStart(range, WEDNESDAY)),
      );
    }
  });
});

describe("peakBucket", () => {
  it("returns the busiest bucket", () => {
    const peak = peakBucket([
      bucket("2026-10-12", 2),
      bucket("2026-10-13", 9),
      bucket("2026-10-14", 4),
    ]);
    expect(peak?.start).toBe("2026-10-13");
  });

  it("returns the earliest bucket on a tie", () => {
    const peak = peakBucket([bucket("2026-10-12", 5), bucket("2026-10-13", 5)]);
    expect(peak?.start).toBe("2026-10-12");
  });

  it("returns null when the range has no clicks", () => {
    expect(
      peakBucket([bucket("2026-10-12", 0), bucket("2026-10-13", 0)]),
    ).toBeNull();
  });

  it("returns null for no buckets", () => {
    expect(peakBucket([])).toBeNull();
  });
});
