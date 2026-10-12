import "server-only";
import { headers } from "next/headers";

/**
 * The absolute address of a public profile, built from the request's own
 * host so it's right in every environment. Only ever shown to the page's
 * owner (the Share bar), never rendered on a cached page.
 */
export async function getPublicProfileUrl(username: string): Promise<string> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}/user/${username}`;
}
