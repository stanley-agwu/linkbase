"use server";

import { headers } from "next/headers";

import { clientIp } from "@/auth";
import { consumeRateLimit, recordClick as recordClickRow } from "@/lib/db";
import { logError } from "@/lib/logger";
import { objectIdSchema } from "@/lib/validation";

const MINUTE_MS = 60 * 1000;
const CLICKS_PER_MINUTE = 10;

/**
 * Counts a visitor's click on a public link. The one action with no session
 * step: visitors have none, and the owner comes from the link itself
 * (database.md §5). Best-effort — nothing it does may stop the visitor
 * leaving, so it returns nothing and logs instead of throwing
 * (errors-and-validation.md §6.4).
 */
export async function recordClick(linkId: string): Promise<void> {
  const parsed = objectIdSchema.safeParse(linkId);
  if (!parsed.success) return;

  try {
    // Per IP per link (security.md §3), so one visitor can't inflate a count.
    const { allowed } = await consumeRateLimit(
      `click:${clientIp(await headers())}:${parsed.data}`,
      CLICKS_PER_MINUTE,
      MINUTE_MS,
    );
    if (!allowed) return;

    await recordClickRow(parsed.data);
  } catch (error) {
    logError("link.recordClick.failed", error, { linkId: parsed.data });
  }
}
