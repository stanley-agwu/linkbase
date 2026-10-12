import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  BIO_MAX_LENGTH,
  chooseLookSchema,
  DISPLAY_NAME_MAX_LENGTH,
  themeIdSchema,
  updateAppearanceSchema,
  updateProfileSchema,
} from "./profile";

describe("themeIdSchema", () => {
  it.for(["kiln", "tidepool", "halfpipe", "encore", "ledger", "hem", "rep"])(
    "accepts the %s theme",
    (themeId) => {
      expect(themeIdSchema.parse(themeId)).toBe(themeId);
    },
  );

  it.for(["", "Kiln", "default", "../kiln", null, 3])(
    "rejects %j, which isn't a theme",
    (themeId) => {
      const { error } = themeIdSchema.safeParse(themeId);
      expect(error?.issues[0]?.message).toBe("Pick a theme.");
    },
  );
});

describe("updateAppearanceSchema", () => {
  it("accepts a single choice, since Appearance saves one at a time", () => {
    expect(updateAppearanceSchema.parse({ buttonShape: "pill" })).toEqual({
      buttonShape: "pill",
    });
  });

  it("accepts all three choices together", () => {
    expect(
      updateAppearanceSchema.parse({
        themeId: "hem",
        buttonShape: "square",
        font: "mono",
      }),
    ).toEqual({ themeId: "hem", buttonShape: "square", font: "mono" });
  });

  it("accepts an empty update, which saves nothing", () => {
    expect(updateAppearanceSchema.parse({})).toEqual({});
  });

  it("rejects a button shape that isn't offered", () => {
    const { error } = updateAppearanceSchema.safeParse({ buttonShape: "round" });
    expect(error && z.flattenError(error).fieldErrors).toEqual({
      buttonShape: ["Pick a button shape."],
    });
  });

  it("rejects a font that isn't offered, such as a raw CSS font stack", () => {
    const { error } = updateAppearanceSchema.safeParse({
      font: "Comic Sans MS, cursive",
    });
    expect(error && z.flattenError(error).fieldErrors).toEqual({
      font: ["Pick a font."],
    });
  });

  it("drops fields that aren't appearance choices, such as a forged user id", () => {
    // The action takes the user id from the session, never from the client.
    expect(
      updateAppearanceSchema.parse({ themeId: "rep", userId: "someone-else" }),
    ).toEqual({ themeId: "rep" });
  });
});

describe("chooseLookSchema", () => {
  it("parses the theme the look step submits", () => {
    expect(chooseLookSchema.parse({ themeId: "encore" })).toEqual({
      themeId: "encore",
    });
  });

  it("requires a theme", () => {
    const { error } = chooseLookSchema.safeParse({});
    expect(error && z.flattenError(error).fieldErrors).toEqual({
      themeId: ["Pick a theme."],
    });
  });
});

describe("updateProfileSchema", () => {
  it("trims the display name and bio the form sends", () => {
    expect(
      updateProfileSchema.parse({ displayName: "  Ana Q ", bio: " Potter. " }),
    ).toEqual({ displayName: "Ana Q", bio: "Potter." });
  });

  it("accepts empty fields, which clear the saved values", () => {
    expect(updateProfileSchema.parse({ displayName: "  ", bio: "" })).toEqual(
      { displayName: "", bio: "" },
    );
  });

  it("accepts a display name and bio at their maximum lengths", () => {
    const input = {
      displayName: "a".repeat(DISPLAY_NAME_MAX_LENGTH),
      bio: "b".repeat(BIO_MAX_LENGTH),
    };
    expect(updateProfileSchema.parse(input)).toEqual(input);
  });

  it("rejects a display name one character too long", () => {
    const { error } = updateProfileSchema.safeParse({
      displayName: "a".repeat(DISPLAY_NAME_MAX_LENGTH + 1),
      bio: "",
    });
    expect(error && z.flattenError(error).fieldErrors).toEqual({
      displayName: [`Use ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`],
    });
  });

  it("rejects a bio one character too long", () => {
    const { error } = updateProfileSchema.safeParse({
      displayName: "",
      bio: "b".repeat(BIO_MAX_LENGTH + 1),
    });
    expect(error && z.flattenError(error).fieldErrors).toEqual({
      bio: [`Use ${BIO_MAX_LENGTH} characters or fewer.`],
    });
  });

  it("counts length after trimming, so padding doesn't push a bio over", () => {
    expect(
      updateProfileSchema.parse({
        displayName: "",
        bio: `  ${"b".repeat(BIO_MAX_LENGTH)}  `,
      }).bio,
    ).toHaveLength(BIO_MAX_LENGTH);
  });

  it("asks for each field when the form sends neither", () => {
    const { error } = updateProfileSchema.safeParse({});
    expect(error && z.flattenError(error).fieldErrors).toEqual({
      displayName: ["Enter a name."],
      bio: ["Enter a bio."],
    });
  });
});
