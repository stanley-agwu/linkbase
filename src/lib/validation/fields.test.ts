import { describe, expect, it } from "vitest";
import type { z } from "zod";

import {
  EMAIL_MAX_LENGTH,
  emailSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordSchema,
} from "./fields";

function messages(schema: z.ZodType, input: unknown): string[] {
  return (
    schema.safeParse(input).error?.issues.map((issue) => issue.message) ?? []
  );
}

describe("emailSchema", () => {
  it("accepts a valid address", () => {
    expect(emailSchema.parse("jane@example.test")).toBe("jane@example.test");
  });

  it("trims and lowercases before storing", () => {
    expect(emailSchema.parse("  Jane@Example.TEST ")).toBe("jane@example.test");
  });

  it("asks for an email when none is sent", () => {
    expect(messages(emailSchema, undefined)).toEqual([
      "Enter your email address.",
    ]);
  });

  it.each(["", "   ", "jane", "jane@", "@example.test", "jane example.test"])(
    "rejects the malformed address %j",
    (value) => {
      expect(messages(emailSchema, value)).toEqual([
        "Enter a valid email address.",
      ]);
    },
  );

  it(`accepts an address of exactly ${EMAIL_MAX_LENGTH} characters`, () => {
    const local = "a".repeat(64);
    const domain = `${"b".repeat(EMAIL_MAX_LENGTH - 64 - 1 - 5)}.test`;
    const address = `${local}@${domain}`;

    expect(address).toHaveLength(EMAIL_MAX_LENGTH);
    expect(messages(emailSchema, address)).not.toContain(
      "That email is too long.",
    );
  });

  it(`rejects an address over ${EMAIL_MAX_LENGTH} characters`, () => {
    const address = `${"a".repeat(EMAIL_MAX_LENGTH - "@example.test".length + 1)}@example.test`;

    expect(address).toHaveLength(EMAIL_MAX_LENGTH + 1);
    expect(messages(emailSchema, address)).toContain("That email is too long.");
  });

  it("checks the length after trimming", () => {
    const address = `${"a".repeat(EMAIL_MAX_LENGTH - "@example.test".length)}@example.test`;

    expect(messages(emailSchema, `  ${address}  `)).not.toContain(
      "That email is too long.",
    );
  });
});

describe("passwordSchema", () => {
  it("asks for a password when none is sent", () => {
    expect(messages(passwordSchema, undefined)).toEqual(["Enter a password."]);
  });

  it(`rejects a password under ${PASSWORD_MIN_LENGTH} characters`, () => {
    expect(
      messages(passwordSchema, "x".repeat(PASSWORD_MIN_LENGTH - 1)),
    ).toEqual([`Use at least ${PASSWORD_MIN_LENGTH} characters.`]);
  });

  it.each([PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH])(
    "accepts a password of exactly %i characters",
    (length) => {
      expect(passwordSchema.safeParse("x".repeat(length)).success).toBe(true);
    },
  );

  it(`rejects a password over ${PASSWORD_MAX_LENGTH} characters`, () => {
    expect(
      messages(passwordSchema, "x".repeat(PASSWORD_MAX_LENGTH + 1)),
    ).toEqual([`Use ${PASSWORD_MAX_LENGTH} characters or fewer.`]);
  });

  it("keeps the password exactly as typed, spaces included", () => {
    expect(passwordSchema.parse("  pass word  ")).toBe("  pass word  ");
  });
});
