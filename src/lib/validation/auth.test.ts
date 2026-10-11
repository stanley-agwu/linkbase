import { describe, expect, it } from "vitest";
import { z } from "zod";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/validation";

import { credentialsSchema, logInSchema, signUpSchema } from "./auth";

function fieldErrors(schema: z.ZodType, input: unknown) {
  const { error } = schema.safeParse(input);
  return error ? z.flattenError(error).fieldErrors : {};
}

describe("signUpSchema", () => {
  it("accepts an email and a valid password, normalising the email", () => {
    expect(
      signUpSchema.parse({
        email: " Jane@Example.TEST ",
        password: "correct horse",
      }),
    ).toEqual({ email: "jane@example.test", password: "correct horse" });
  });

  it("keeps next when it's sent", () => {
    expect(
      signUpSchema.parse({
        email: "jane@example.test",
        password: "correct horse",
        next: "/settings",
      }).next,
    ).toBe("/settings");
  });

  it("reports an error against each invalid field", () => {
    expect(
      fieldErrors(signUpSchema, { email: "jane", password: "short" }),
    ).toEqual({
      email: ["Enter a valid email address."],
      password: [`Use at least ${PASSWORD_MIN_LENGTH} characters.`],
    });
  });

  it("asks for both fields when the form is empty", () => {
    expect(fieldErrors(signUpSchema, {})).toEqual({
      email: ["Enter your email address."],
      password: ["Enter a password."],
    });
  });

  it("rejects a next path over 2048 characters", () => {
    const errors = fieldErrors(signUpSchema, {
      email: "jane@example.test",
      password: "correct horse",
      next: `/${"a".repeat(2048)}`,
    });

    expect(Object.keys(errors)).toEqual(["next"]);
  });

  it("checks only the shape of next, leaving safety to safeNextPath", () => {
    expect(
      signUpSchema.safeParse({
        email: "jane@example.test",
        password: "correct horse",
        next: "//evil.example",
      }).success,
    ).toBe(true);
  });

  it("drops fields it doesn't know about", () => {
    expect(
      signUpSchema.parse({
        email: "jane@example.test",
        password: "correct horse",
        role: "admin",
      }),
    ).not.toHaveProperty("role");
  });
});

describe("logInSchema", () => {
  it("accepts a password shorter than today's sign-up minimum", () => {
    // Older accounts may predate the current length rule.
    expect(
      logInSchema.safeParse({
        email: "jane@example.test",
        password: "x".repeat(PASSWORD_MIN_LENGTH - 1),
      }).success,
    ).toBe(true);
  });

  it.each([undefined, ""])("asks for the password when it's %j", (password) => {
    expect(
      fieldErrors(logInSchema, { email: "jane@example.test", password }),
    ).toEqual({ password: ["Enter your password."] });
  });

  it("gives the generic sign-in error for an over-long password", () => {
    // Doesn't tell a guesser which lengths are worth trying.
    expect(
      fieldErrors(logInSchema, {
        email: "jane@example.test",
        password: "x".repeat(PASSWORD_MAX_LENGTH + 1),
      }),
    ).toEqual({ password: ["Email or password is incorrect."] });
  });

  it("normalises the email the same way sign-up does", () => {
    expect(
      logInSchema.parse({ email: " JANE@example.test", password: "secret" })
        .email,
    ).toBe("jane@example.test");
  });
});

describe("credentialsSchema", () => {
  it("accepts the log-in fields", () => {
    expect(
      credentialsSchema.parse({
        email: "jane@example.test",
        password: "secret",
      }),
    ).toEqual({ email: "jane@example.test", password: "secret" });
  });

  it("drops next, which authorize has no use for", () => {
    expect(
      credentialsSchema.parse({
        email: "jane@example.test",
        password: "secret",
        next: "/settings",
      }),
    ).not.toHaveProperty("next");
  });

  it("applies the log-in password rule, not the sign-up one", () => {
    expect(
      fieldErrors(credentialsSchema, {
        email: "jane@example.test",
        password: "",
      }),
    ).toEqual({ password: ["Enter your password."] });
  });
});
