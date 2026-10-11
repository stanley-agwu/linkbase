"use server";

import { CredentialsSignin } from "next-auth";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";

import { clientIp, RATE_LIMITED_CODE, signIn, signOut } from "@/auth";
import { consumeRateLimit, createUser } from "@/lib/db";
import { safeNextPath } from "@/lib/safe-redirect";
import {
  type ActionResult,
  fieldError,
  formError,
  type LogInInput,
  logInSchema,
  type SignUpInput,
  signUpSchema,
  validationError,
} from "@/lib/validation";

import { hashPassword } from "./password";

const HOUR_MS = 60 * 60 * 1000;
const TOO_MANY_ATTEMPTS = "Too many attempts. Try again in a few minutes.";
const INCORRECT_CREDENTIALS = "Email or password is incorrect.";

// Sign-up and log-in run before there is a session, so unlike every other
// action they have no requireUserId() step. Identity is what they establish.

export async function signUp(
  _previous: ActionResult<SignUpInput>,
  formData: FormData,
): Promise<ActionResult<SignUpInput>> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  const { email, password, next } = parsed.data;

  // Per IP (security.md §3) — bulk account creation. Before hashing, so a
  // blocked request costs no argon2 work.
  const { allowed } = await consumeRateLimit(
    `signup:ip:${clientIp(await headers())}`,
    5,
    HOUR_MS,
  );
  if (!allowed) return formError(TOO_MANY_ATTEMPTS, formData);

  const outcome = await createUser(email, await hashPassword(password));
  if (outcome === "taken") {
    return fieldError(
      "email",
      "An account with this email already exists.",
      formData,
    );
  }

  // Signs the new account in and redirects by throwing. A failure here is
  // unexpected (the account was just created), so it isn't caught.
  await signIn("credentials", {
    email,
    password,
    redirectTo: safeNextPath(next),
  });
  return { status: "success", data: null };
}

export async function logIn(
  _previous: ActionResult<LogInInput>,
  formData: FormData,
): Promise<ActionResult<LogInInput>> {
  const parsed = logInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  const { email, password, next } = parsed.data;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: safeNextPath(next),
    });
  } catch (error) {
    unstable_rethrow(error); // success is a redirect, thrown
    if (error instanceof CredentialsSignin) {
      return formError(
        error.code === RATE_LIMITED_CODE
          ? TOO_MANY_ATTEMPTS
          : INCORRECT_CREDENTIALS,
        formData,
      );
    }
    throw error;
  }
  return { status: "success", data: null };
}

export async function logOut(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
