import { describe, expect, it } from "vitest";
import { z } from "zod";

import { HANDLE_MIN_LENGTH } from "@/lib/validation";

import { chooseUsernameSchema } from "./onboarding";

function fieldErrors(input: unknown) {
  const { error } = chooseUsernameSchema.safeParse(input);
  return error ? z.flattenError(error).fieldErrors : {};
}

describe("chooseUsernameSchema", () => {
  it("normalises the username the form sends", () => {
    expect(chooseUsernameSchema.parse({ username: " Mara_Studio " })).toEqual({
      username: "mara_studio",
    });
  });

  it("asks for a username when the field is missing", () => {
    expect(fieldErrors({})).toEqual({ username: ["Choose a username."] });
  });

  it("puts rule failures against the username field", () => {
    expect(fieldErrors({ username: "ab" })).toEqual({
      username: [`Use at least ${HANDLE_MIN_LENGTH} characters.`],
    });
  });

  it("puts the reserved-name error against the username field", () => {
    expect(fieldErrors({ username: "Admin" })).toEqual({
      username: ["That username isn’t available."],
    });
  });

  it("drops fields the form doesn't send, such as a forged user id", () => {
    // The action takes the user id from the session, never from the form.
    expect(
      chooseUsernameSchema.parse({
        username: "mara",
        userId: "someone-else",
      }),
    ).toEqual({ username: "mara" });
  });
});
