"use server";

import { redirect } from "next/navigation";

import { updateSession } from "@/auth";
import { requireUserId } from "@/lib/auth";
import {
  consumeRateLimit,
  filterAvailableUsernames,
  isUsernameAvailable,
  setUsername,
} from "@/lib/db";
import { usernameCandidates } from "@/lib/username-suggestions";
import {
  type ActionResult,
  type ChooseUsernameInput,
  chooseUsernameSchema,
  fieldError,
  handleSchema,
  themeIdSchema,
  validationError,
} from "@/lib/validation";

const MINUTE_MS = 60 * 1000;
const LOOK_PATH = "/onboarding/look";
const SUGGESTION_COUNT = 3;

/**
 * Saves the username, then refreshes the session cookie so the proxy stops
 * holding the user at onboarding, and moves on to picking a look. A template
 * chosen before signup rides along. "already-set" takes the same path: it's
 * the user whose cookie predates a username chosen elsewhere.
 *
 * `setUsername` clears the handle's cached public page itself
 * (data-fetching.md §3.4).
 */
export async function chooseUsername(
  _previous: ActionResult<ChooseUsernameInput>,
  formData: FormData,
): Promise<ActionResult<ChooseUsernameInput>> {
  const userId = await requireUserId();

  const parsed = chooseUsernameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const outcome = await setUsername(userId, parsed.data.username);
  if (outcome === "taken") {
    return fieldError("username", "That username is taken.", formData);
  }

  // Re-reads the username from the database in auth.ts's jwt callback.
  await updateSession({});

  const template = themeIdSchema.safeParse(formData.get("template"));
  redirect(
    template.success ? `${LOOK_PATH}?template=${template.data}` : LOOK_PATH,
  );
}

/**
 * For a session whose cookie predates a username chosen elsewhere: refresh
 * the cookie from the database and move on. Nothing is written.
 */
export async function continueToDashboard(): Promise<void> {
  await requireUserId();
  await updateSession({});
  redirect("/dashboard");
}

export type UsernameAvailability =
  | { status: "available" }
  /** Up to three free alternatives; may be empty if every candidate is taken. */
  | { status: "taken"; suggestions: string[] }
  | { status: "invalid" | "rate-limited"; message: string };

/**
 * The as-you-type check behind the onboarding field. A hint for the message
 * only: `setUsername`'s unique index is what decides (database.md §4).
 */
export async function checkUsernameAvailability(
  username: string,
): Promise<UsernameAvailability> {
  const userId = await requireUserId();

  const parsed = handleSchema.safeParse(username);
  if (!parsed.success) {
    return {
      status: "invalid",
      message: parsed.error.issues[0]?.message ?? "Try a different username.",
    };
  }

  // Per account (security.md §3): stops one session enumerating usernames.
  const { allowed } = await consumeRateLimit(
    `username-check:${userId}`,
    30,
    MINUTE_MS,
  );
  if (!allowed) {
    return {
      status: "rate-limited",
      message: "Too many checks. Try again in a moment.",
    };
  }

  if (await isUsernameAvailable(parsed.data)) return { status: "available" };

  // Counted as part of the same check: one rate-limit hit, one extra query.
  const free = await filterAvailableUsernames(usernameCandidates(parsed.data));
  return { status: "taken", suggestions: free.slice(0, SUGGESTION_COUNT) };
}
