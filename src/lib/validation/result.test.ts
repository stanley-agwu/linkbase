import { describe, expect, it } from "vitest";

import { type SignUpInput, signUpSchema } from "@/lib/validation";

import { fieldError, formError, idle, validationError } from "./result";

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

function signUpError(input: Record<string, string>) {
  const result = signUpSchema.safeParse(input);
  if (result.success)
    throw new Error("Expected the sign-up input to be invalid");
  return result.error;
}

describe("idle", () => {
  it("is the initial idle state", () => {
    expect(idle).toEqual({ status: "idle" });
  });
});

describe("validationError", () => {
  it("maps each Zod issue onto its field", () => {
    const input = { email: "jane", password: "short" };

    expect(validationError(signUpError(input), formData(input))).toMatchObject({
      status: "error",
      fieldErrors: {
        email: ["Enter a valid email address."],
        password: ["Use at least 8 characters."],
      },
      formError: undefined,
    });
  });

  it("echoes the submitted values so the form can refill them", () => {
    const input = { email: "jane", password: "short", next: "/settings" };

    const result = validationError(signUpError(input), formData(input));

    expect(result.status === "error" && result.values).toEqual({
      email: "jane",
      next: "/settings",
    });
  });
});

describe("fieldError", () => {
  it("puts one message against one field", () => {
    const result = fieldError<SignUpInput>(
      "email",
      "That email is already registered.",
      formData({ email: "jane@example.test", password: "correct horse" }),
    );

    expect(result).toEqual({
      status: "error",
      fieldErrors: { email: ["That email is already registered."] },
      values: { email: "jane@example.test" },
    });
  });
});

describe("formError", () => {
  it("returns a form-level message with no field errors", () => {
    const result = formError<SignUpInput>(
      "Too many attempts. Try again later.",
      formData({ email: "jane@example.test", password: "correct horse" }),
    );

    expect(result).toEqual({
      status: "error",
      fieldErrors: {},
      formError: "Too many attempts. Try again later.",
      values: { email: "jane@example.test" },
    });
  });
});

describe("echoed values", () => {
  it("never echo the password or its confirmation", () => {
    const result = formError<SignUpInput>(
      "Something went wrong.",
      formData({
        email: "jane@example.test",
        password: "correct horse",
        confirmPassword: "correct horse",
      }),
    );

    expect(result.status === "error" && result.values).toEqual({
      email: "jane@example.test",
    });
  });

  it("skip file uploads, keeping only strings", () => {
    const data = formData({ email: "jane@example.test" });
    data.append("avatar", new Blob(["not an image"]), "avatar.png");

    const result = formError<SignUpInput>("Something went wrong.", data);

    expect(result.status === "error" && result.values).toEqual({
      email: "jane@example.test",
    });
  });
});
