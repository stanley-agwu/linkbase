import type { Instrumentation } from "next";

import { logError } from "@/lib/logger";

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
