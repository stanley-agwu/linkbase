export const DEFAULT_AFTER_AUTH = "/dashboard";

/**
 * Returns `value` only if it's a same-origin relative path, else the
 * dashboard. `?next=` is attacker-controlled, so following it unchecked is an
 * open redirect (auth.md §4). Rejects `//evil.com` and `/\evil.com` (both
 * protocol-relative in browsers), absolute URLs, and anything with control
 * characters.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/")) return DEFAULT_AFTER_AUTH;
  if (value.startsWith("//") || value.startsWith("/\\")) {
    return DEFAULT_AFTER_AUTH;
  }
  // Browsers strip tabs and newlines from URLs, so "/\t/evil.com" would
  // become "//evil.com".
  if (/[\u0000-\u001f\u007f]/.test(value)) return DEFAULT_AFTER_AUTH;
  return value;
}
