import type { Instrumentation } from "next";

import { logError } from "@/lib/logger";

/**
 * Runs once when a server instance starts, never during `next build` — so a
 * missing variable fails at startup (security.md §1.3) while the build stays
 * secret-free (deployment.md §6.2).
 */
export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }
}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  logError("request.failed", error, {
    digest: getDigest(error),
    method: request.method,
    path: request.path.split("?")[0], // query strings can carry tokens
    routePath: context.routePath,
    routeType: context.routeType,
  });
};

function getDigest(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "digest" in error
    ? String(error.digest)
    : undefined;
}
