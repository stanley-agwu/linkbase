import { z } from "zod";

// The single definition of a valid handle — the username a user picks during
// onboarding, which is also their /user/[handle] URL (errors-and-validation.md
// §8): lowercase letters, digits, "-" and "_", 3–30 characters.
export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;
export const HANDLE_PATTERN = /^[a-z0-9_-]+$/;
const HANDLE_DISALLOWED = /[^a-z0-9_-]/g;

/**
 * Usernames nobody can pick, matched exactly (after trimming and lowercasing),
 * so `admin1` or `badminton` stay available. Checked here, so the availability
 * check, the onboarding action, and the landing-page claim all refuse them.
 */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set(["admin"]);

export const handleSchema = z
  .string({ error: "Choose a username." })
  .trim()
  .toLowerCase()
  .min(HANDLE_MIN_LENGTH, `Use at least ${HANDLE_MIN_LENGTH} characters.`)
  .max(HANDLE_MAX_LENGTH, `Use ${HANDLE_MAX_LENGTH} characters or fewer.`)
  .regex(HANDLE_PATTERN, "Use letters, numbers, hyphens and underscores only.")
  .refine((handle) => !RESERVED_HANDLES.has(handle), {
    error: "That username isn’t available.",
  });

/**
 * Applied on every keystroke in a handle field. Derived from the same rule as
 * `handleSchema`, so what the field allows is exactly what the schema accepts
 * (apart from the minimum length, which only the schema can check).
 */
export function sanitizeHandle(input: string): string {
  return input
    .toLowerCase()
    .replace(HANDLE_DISALLOWED, "")
    .slice(0, HANDLE_MAX_LENGTH);
}

// RFC 5321 caps a forward path at 256 octets, which leaves 254 for the address.
export const EMAIL_MAX_LENGTH = 254;
export const NAME_MAX_LENGTH = 60;
export const PASSWORD_MIN_LENGTH = 8;
// argon2 hashes any length, but an unbounded input is a cheap way to burn CPU.
export const PASSWORD_MAX_LENGTH = 128;

// Normalised before the format check, so " Jane@Example.com " is accepted and
// stored as "jane@example.com".
export const emailSchema = z
  .string({ error: "Enter your email address." })
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, "That email is too long.")
  .pipe(z.email({ error: "Enter a valid email address." }));

export const LINK_TITLE_MAX_LENGTH = 100;
// The practical ceiling browsers and crawlers handle.
export const LINK_URL_MAX_LENGTH = 2048;

/**
 * A link destination. `http`/`https` only, with a real domain: a link is
 * rendered as an `href` on a public page, and `z.url()` alone would accept
 * `javascript:` (security.md §4).
 */
export const urlSchema = z
  .string({ error: "Enter a link." })
  .trim()
  .max(LINK_URL_MAX_LENGTH, "That link is too long.")
  .pipe(z.httpUrl({ error: "Enter a full link, starting with https://" }));

// A junk id would otherwise reach Mongoose as a CastError. "Not found" is the
// same message a missing or someone else's row gets (auth.md §5).
export const objectIdSchema = z
  .string({ error: "Not found" })
  .regex(/^[a-f0-9]{24}$/i, "Not found");

/** For choosing a password. Signing in only checks presence (see auth.ts). */
export const passwordSchema = z
  .string({ error: "Enter a password." })
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`);
