import { describe, expect, it } from "vitest";

import { DEFAULT_AFTER_AUTH, safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("defaults to the dashboard", () => {
    expect(DEFAULT_AFTER_AUTH).toBe("/dashboard");
  });

  it.each([null, undefined, ""])(
    "falls back to the dashboard when next is %j",
    (value) => {
      expect(safeNextPath(value)).toBe(DEFAULT_AFTER_AUTH);
    },
  );

  it.each([
    "/dashboard",
    "/settings",
    "/user/jane",
    "/user/jane?tab=links#top",
    "/",
  ])("follows the same-origin path %j", (value) => {
    expect(safeNextPath(value)).toBe(value);
  });

  it.each([
    "https://evil.example",
    "http://evil.example/dashboard",
    "javascript:alert(1)",
    "data:text/html,hi",
    "evil.example",
    "dashboard",
  ])("rejects %j, which isn't a root-relative path", (value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_AFTER_AUTH);
  });

  it.each(["//evil.example", "//evil.example/dashboard", "///evil.example"])(
    "rejects the protocol-relative URL %j",
    (value) => {
      expect(safeNextPath(value)).toBe(DEFAULT_AFTER_AUTH);
    },
  );

  it.each(["/\\evil.example", "/\\/evil.example", "\\\\evil.example"])(
    "rejects the backslash variant %j, which browsers treat as protocol-relative",
    (value) => {
      expect(safeNextPath(value)).toBe(DEFAULT_AFTER_AUTH);
    },
  );

  it.each([
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r/evil.example",
    "/\u0000/evil.example",
    "/dashboard\u007f",
  ])("rejects %j, whose control characters browsers strip into //", (value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_AFTER_AUTH);
  });

  it("keeps percent-encoded slashes as a path on this origin", () => {
    // Browsers don't decode %2F in a Location path, so this stays local.
    expect(safeNextPath("/%2F%2Fevil.example")).toBe("/%2F%2Fevil.example");
  });

  it("rejects an encoded path that doesn't start with a slash", () => {
    expect(safeNextPath("%2F%2Fevil.example")).toBe(DEFAULT_AFTER_AUTH);
  });
});
