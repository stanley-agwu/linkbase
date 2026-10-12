import "server-only";
import { Types } from "mongoose";

import {
  bucketDailyCounts,
  peakBucket,
  rangeStart,
  utcDayKey,
} from "@/lib/analytics/buckets";
import type { AnalyticsRange, ClickAnalytics } from "@/lib/types";

import { connectToDatabase } from "../connect";
import { Click } from "../models/click";
import { Link } from "../models/link";

import { listLinks } from "./link";

/**
 * Records one click on a visible link: the event, and the link's running
 * count. The one unauthenticated write (database.md §5) — scoped to the link
 * id, with the owner taken from the link, never from the caller. Doesn't
 * clear the public page's cache: the page shows no counts
 * (data-fetching.md §3.4). Returns false when no visible link has that id.
 */
export async function recordClick(linkId: string): Promise<boolean> {
  await connectToDatabase();

  const link = await Link.findOneAndUpdate(
    { _id: linkId, visible: true },
    { $inc: { clickCount: 1 } },
  )
    .select("userId")
    .lean();
  if (!link) return false;

  await Click.create({ userId: link.userId, linkId: link._id });
  return true;
}

/**
 * The signed-in user's clicks in `range`: per-bucket counts for the chart and
 * per-link totals. Days are UTC. Not cached: it's a private read that should
 * show a click as soon as it lands (data-fetching.md §3.1).
 */
export async function getClickAnalytics(
  userId: string,
  range: AnalyticsRange,
): Promise<ClickAnalytics> {
  await connectToDatabase();

  const now = new Date();
  // Aggregation pipelines aren't cast by Mongoose, so the id is converted
  // here. Served by the { userId, createdAt } index.
  const match = {
    $match: {
      userId: new Types.ObjectId(userId),
      createdAt: { $gte: rangeStart(range, now) },
    },
  };

  const [days, perLink, links] = await Promise.all([
    Click.aggregate<{ _id: Date; count: number }>([
      match,
      {
        $group: {
          _id: { $dateTrunc: { date: "$createdAt", unit: "day" } },
          count: { $sum: 1 },
        },
      },
    ]),
    Click.aggregate<{ _id: Types.ObjectId; count: number }>([
      match,
      { $group: { _id: "$linkId", count: { $sum: 1 } } },
    ]),
    listLinks(userId),
  ]);

  const daily: Record<string, number> = {};
  for (const day of days) daily[utcDayKey(day._id)] = day.count;
  const buckets = bucketDailyCounts(range, now, daily);

  const byLink = new Map(
    perLink.map((entry) => [entry._id.toString(), entry.count]),
  );

  return {
    range,
    total: buckets.reduce((sum, bucket) => sum + bucket.count, 0),
    buckets,
    peak: peakBucket(buckets),
    links: links
      .map((link) => ({
        id: link.id,
        title: link.title,
        visible: link.visible,
        count: byLink.get(link.id) ?? 0,
      }))
      // Stable, so equal counts keep the dashboard's order.
      .toSorted((a, b) => b.count - a.count),
  };
}
