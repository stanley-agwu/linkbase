import type { AnalyticsRange, ClickBucket } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

type RangeShape = {
  /** Days per bucket. */
  days: number;
  /** Buckets in the range, ending with the one that contains today. */
  count: number;
  /** Every `tickEvery`-th bucket, counting from the first, gets a label. */
  tickEvery: number;
};

const SHAPES: Record<AnalyticsRange, RangeShape> = {
  "7d": { days: 1, count: 7, tickEvery: 1 },
  "30d": { days: 1, count: 30, tickEvery: 7 },
  "90d": { days: 7, count: 13, tickEvery: 3 },
};

const WEEKDAY = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  timeZone: "UTC",
});
const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** The UTC calendar day a moment falls on, as YYYY-MM-DD. */
export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function bucketStarts(range: AnalyticsRange, now: Date): number[] {
  const { days, count } = SHAPES[range];
  // The last bucket ends at the end of today, so it always holds today.
  const end = startOfUtcDay(now) + DAY_MS;
  return Array.from(
    { length: count },
    (_, index) => end - (count - index) * days * DAY_MS,
  );
}

/** The first instant the range covers: midnight UTC on its first day. */
export function rangeStart(range: AnalyticsRange, now: Date): Date {
  return new Date(bucketStarts(range, now)[0] ?? startOfUtcDay(now));
}

/**
 * Sums per-day click counts (keyed by `utcDayKey`) into the range's buckets:
 * one per day for 7 and 30 days, one per week for 90. Days with no entry
 * count as zero, so every bucket is present.
 */
export function bucketDailyCounts(
  range: AnalyticsRange,
  now: Date,
  daily: Readonly<Record<string, number>>,
): ClickBucket[] {
  const { days, tickEvery } = SHAPES[range];

  return bucketStarts(range, now).map((start, index) => {
    let count = 0;
    for (let day = 0; day < days; day += 1) {
      count += daily[utcDayKey(new Date(start + day * DAY_MS))] ?? 0;
    }

    const date = new Date(start);
    const dayMonth = DAY_MONTH.format(date);
    let label = "";
    if (index % tickEvery === 0) {
      label = range === "7d" ? WEEKDAY.format(date) : dayMonth;
    }
    const fullLabel =
      days === 1
        ? `${WEEKDAY.format(date)} ${dayMonth}`
        : `Week of ${dayMonth}`;

    return { start: utcDayKey(date), label, fullLabel, count };
  });
}

/** The busiest bucket (the earliest on a tie), or null if all are zero. */
export function peakBucket(buckets: ClickBucket[]): ClickBucket | null {
  let peak: ClickBucket | null = null;
  for (const bucket of buckets) {
    if (bucket.count > (peak?.count ?? 0)) peak = bucket;
  }
  return peak;
}
