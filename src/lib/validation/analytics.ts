import { z } from "zod";

import type { AnalyticsRange } from "@/lib/types";

export const ANALYTICS_RANGES = [
  "7d",
  "30d",
  "90d",
] as const satisfies readonly AnalyticsRange[];

/**
 * The `?range=` search param. Anything missing or unknown reads as the last
 * 7 days rather than an error: it's a view setting, not user input to fix.
 */
export const analyticsRangeSchema = z.enum(ANALYTICS_RANGES).catch("7d");
