import "server-only";

type LogContext = Record<string, string | number | boolean | null | undefined>;

/**
 * The one server log sink (errors-and-validation.md §6). Context takes
 * primitives only, so a password, a cookie or a whole FormData can't be passed
 * in without picking fields out by hand.
 */
export function logError(
  event: string,
  error: unknown,
  context: LogContext = {},
): void {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      ...context,
      error: serialise(error),
    }),
  );
}

function serialise(error: unknown): unknown {
  if (error === undefined) return undefined;
  if (!(error instanceof Error)) return { value: String(error) };
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: serialise(error.cause),
  };
}
