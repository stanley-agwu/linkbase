import "server-only";

import { connectToDatabase } from "../connect";
import { RateLimit } from "../models/rate-limit";

/**
 * Counts one hit against `key` in a fixed window and reports whether it's
 * within `limit`. One atomic upsert, so concurrent requests can't both slip
 * under the limit, and counters live in MongoDB so every instance shares them
 * (security.md §3).
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean }> {
  await connectToDatabase();

  const now = new Date();
  // A missing expiresAt (fresh upsert) sorts below any date, so `$lt` also
  // covers the first hit. An expired window that the TTL monitor hasn't
  // reaped yet starts over here rather than staying blocked.
  const windowExpired = { $lt: ["$expiresAt", now] };

  const counter = await RateLimit.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          count: {
            $cond: [windowExpired, 1, { $add: ["$count", 1] }],
          },
          expiresAt: {
            $cond: [
              windowExpired,
              new Date(now.getTime() + windowMs),
              "$expiresAt",
            ],
          },
        },
      },
    ],
    { upsert: true, returnDocument: "after", updatePipeline: true },
  ).lean();

  return { allowed: (counter?.count ?? 1) <= limit };
}
