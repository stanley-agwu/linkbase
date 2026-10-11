import { describe, expect, it } from "vitest";

import {
  HANDLE_MAX_LENGTH,
  handleSchema,
  RESERVED_HANDLES,
} from "@/lib/validation";

import { usernameCandidates } from "./username-suggestions";

describe("usernameCandidates", () => {
  it("proposes word affixes first, then numbered fallbacks", () => {
    expect(usernameCandidates("mara")).toEqual([
      "marastudio",
      "themara",
      "marahq",
      "mara_official",
      "itsmara",
      "mara-me",
      "mara1",
      "mara2",
      "mara3",
      "mara4",
      "mara5",
      "mara6",
      "mara7",
      "mara8",
      "mara9",
    ]);
  });

  it("leads with the three a person would most likely pick", () => {
    expect(usernameCandidates("mara").slice(0, 3)).toEqual([
      "marastudio",
      "themara",
      "marahq",
    ]);
  });

  it.each(["abc", "mara", "mara_studio", "mara-studio", "a".repeat(30)])(
    "only proposes usernames handleSchema accepts, given %j",
    (username) => {
      for (const candidate of usernameCandidates(username)) {
        expect(handleSchema.safeParse(candidate).success).toBe(true);
      }
    },
  );

  it.each(["admin", "mara"])(
    "never proposes a reserved username, given %j",
    (username) => {
      for (const candidate of usernameCandidates(username)) {
        expect(RESERVED_HANDLES.has(candidate)).toBe(false);
      }
    },
  );

  it("never proposes the taken username itself", () => {
    expect(usernameCandidates("mara")).not.toContain("mara");
  });

  it("never proposes the same username twice", () => {
    const candidates = usernameCandidates("mara");

    expect(new Set(candidates).size).toBe(candidates.length);
  });

  it(`shortens a ${HANDLE_MAX_LENGTH}-character name to make room`, () => {
    const longest = "a".repeat(HANDLE_MAX_LENGTH);
    const candidates = usernameCandidates(longest);

    expect(candidates).toHaveLength(15);
    expect(candidates[0]).toBe(`${"a".repeat(HANDLE_MAX_LENGTH - 6)}studio`);
    expect(candidates[1]).toBe(`the${"a".repeat(HANDLE_MAX_LENGTH - 3)}`);
    for (const candidate of candidates) {
      expect(candidate.length).toBeLessThanOrEqual(HANDLE_MAX_LENGTH);
    }
  });

  it("keeps hyphens and underscores already in the name", () => {
    expect(usernameCandidates("mara-studio_x")[0]).toBe("mara-studio_xstudio");
  });
});
