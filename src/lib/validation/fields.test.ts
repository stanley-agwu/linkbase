import { describe, expect, it } from "vitest";
import type { z } from "zod";

import {
  EMAIL_MAX_LENGTH,
  emailSchema,
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  handleSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordSchema,
  RESERVED_HANDLES,
  sanitizeHandle,
} from "./fields";

const ALLOWED_ONLY = "Use letters, numbers, hyphens and underscores only.";
const RESERVED = "That username isn’t available.";

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

describe("handleSchema", () => {
  it.each(["mara", "mara_studio", "mara-studio", "m4ra", "abc", "a_-1"])(
    "accepts %j",
    (value) => {
      expect(handleSchema.parse(value)).toBe(value);
    },
  );

  it("trims and lowercases before checking", () => {
    expect(handleSchema.parse("  Mara_Studio ")).toBe("mara_studio");
  });

  it("asks for a username when none is sent", () => {
    expect(messages(handleSchema, undefined)).toEqual(["Choose a username."]);
  });

  it(`rejects a username under ${HANDLE_MIN_LENGTH} characters`, () => {
    expect(messages(handleSchema, "ab")).toEqual([
      `Use at least ${HANDLE_MIN_LENGTH} characters.`,
    ]);
  });

  it.each([HANDLE_MIN_LENGTH, HANDLE_MAX_LENGTH])(
    "accepts a username of exactly %i characters",
    (length) => {
      expect(handleSchema.safeParse("a".repeat(length)).success).toBe(true);
    },
  );

  it(`rejects a username over ${HANDLE_MAX_LENGTH} characters`, () => {
    expect(messages(handleSchema, "a".repeat(HANDLE_MAX_LENGTH + 1))).toEqual([
      `Use ${HANDLE_MAX_LENGTH} characters or fewer.`,
    ]);
  });

  it("checks the length after trimming", () => {
    expect(
      handleSchema.safeParse(`  ${"a".repeat(HANDLE_MAX_LENGTH)}  `).success,
    ).toBe(true);
  });

  it.each([
    "my.name", // dots were allowed by the old rule; no longer
    "my name",
    "my/name",
    "my@name",
    "café",
    "name!",
  ])("rejects %j, which has a character outside the rule", (value) => {
    expect(messages(handleSchema, value)).toEqual([ALLOWED_ONLY]);
  });

  it("rejects a blank username", () => {
    expect(messages(handleSchema, "   ")).toContain(
      `Use at least ${HANDLE_MIN_LENGTH} characters.`,
    );
  });
});

describe("reserved usernames", () => {
  it("reserves admin", () => {
    expect(RESERVED_HANDLES.has("admin")).toBe(true);
  });

  it("refuses admin with the not-available message", () => {
    expect(messages(handleSchema, "admin")).toEqual([RESERVED]);
  });

  it.each(["ADMIN", "Admin", "  admin  ", "\tAdMiN\n"])(
    "refuses %j, which normalises to admin",
    (value) => {
      expect(messages(handleSchema, value)).toEqual([RESERVED]);
    },
  );

  it.each(["admin1", "admin_", "the-admin", "admins", "badminton", "sysadmin"])(
    "allows %j, since only an exact match is reserved",
    (value) => {
      expect(handleSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each([...RESERVED_HANDLES])(
    "refuses every reserved name, including %j",
    (reserved) => {
      expect(handleSchema.safeParse(reserved).success).toBe(false);
    },
  );

  it("leaves reserved names to the schema, not the as-you-type sanitiser", () => {
    // The field still lets you type "admin"; the check says it isn't available.
    expect(sanitizeHandle("Admin")).toBe("admin");
    expect(handleSchema.safeParse(sanitizeHandle("Admin")).success).toBe(false);
  });
});

describe("sanitizeHandle", () => {
  it("lowercases as you type", () => {
    expect(sanitizeHandle("MaraStudio")).toBe("marastudio");
  });

  it("keeps hyphens and underscores", () => {
    expect(sanitizeHandle("mara-studio_2")).toBe("mara-studio_2");
  });

  it.each([
    ["my.name", "myname"],
    ["My Name!", "myname"],
    ["café", "caf"],
    ["@mara/", "mara"],
  ])("strips disallowed characters from %j", (input, expected) => {
    expect(sanitizeHandle(input)).toBe(expected);
  });

  it(`caps the value at ${HANDLE_MAX_LENGTH} characters`, () => {
    expect(sanitizeHandle("a".repeat(HANDLE_MAX_LENGTH + 10))).toHaveLength(
      HANDLE_MAX_LENGTH,
    );
  });

  it("caps after stripping, so dropped characters don't count", () => {
    const input = `${".".repeat(10)}${"a".repeat(HANDLE_MAX_LENGTH)}`;

    expect(sanitizeHandle(input)).toBe("a".repeat(HANDLE_MAX_LENGTH));
  });

  it.each(["Mara.Studio", "  hello world  ", "ABC-def_123!!", "x".repeat(50)])(
    "produces only values handleSchema accepts, given %j",
    (input) => {
      expect(handleSchema.safeParse(sanitizeHandle(input)).success).toBe(true);
    },
  );
});
