import { z } from "zod";

// The single definition of a valid handle (errors-and-validation.md §8):
// lowercase letters, digits, "." and "_", 3–24 characters.
export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 24;
const HANDLE_DISALLOWED = /[^a-z0-9._]/g;

export const handleSchema = z
  .string({ error: "Choose a handle" })
  .trim()
  .toLowerCase()
  .min(HANDLE_MIN_LENGTH, `Use at least ${HANDLE_MIN_LENGTH} characters.`)
  .max(HANDLE_MAX_LENGTH, `Use ${HANDLE_MAX_LENGTH} characters or fewer.`)
  .regex(/^[a-z0-9._]+$/, "Use letters, numbers, dots and underscores only.");

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
