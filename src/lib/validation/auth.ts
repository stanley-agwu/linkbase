import { z } from "zod";

import { emailSchema, PASSWORD_MAX_LENGTH, passwordSchema } from "./fields";

// Where to go after auth. Shape only — lib/safe-redirect decides whether the
// path is safe to follow.
const nextSchema = z.string().max(2048).optional();

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  next: nextSchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;

// Signing in checks presence only. Applying today's length rule here would
// lock out an account whose password predates a rule change, and would tell
// a guesser which lengths are worth trying.
export const logInSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Enter your password." })
    .min(1, "Enter your password.")
    .max(PASSWORD_MAX_LENGTH, "Email or password is incorrect."),
  next: nextSchema,
});

export type LogInInput = z.infer<typeof logInSchema>;

/** What `authorize` accepts — the log-in fields without `next`. */
export const credentialsSchema = logInSchema.omit({ next: true });
