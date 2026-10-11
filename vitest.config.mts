import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests only: pure functions and Zod schemas, colocated as *.test.ts.
// No React plugin or DOM environment; components are QA's job. See docs/testing.md.
export default defineConfig({
  resolve: {
    // Mirrors tsconfig `paths`. fileURLToPath, not URL.pathname, so it resolves on Windows.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
