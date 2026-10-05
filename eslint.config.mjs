import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// TypeScript sources. Matches the `files` of eslint-config-next/typescript, so
// the type-aware rules below see the same files its parser is applied to.
const TS_FILES = ["**/*.ts", "**/*.tsx"];

// Next.js file conventions the framework reads by name, which therefore have to
// use a default export. Everything else is a named export.
// See docs/coding-standards.md §5.
const ROUTE_FILES = [
  "src/app/**/{page,layout,template,default}.tsx",
  "src/app/**/{loading,error,global-error,not-found,forbidden,unauthorized}.tsx",
  "src/app/**/{icon,apple-icon,opengraph-image,twitter-image}.tsx",
  "src/app/**/{sitemap,robots,manifest}.ts",
  "next.config.ts",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Type-aware linting. Without this the rules in the next block are inert:
  // they need the type checker, not just the AST.
  {
    files: TS_FILES,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // The enforceable half of docs/coding-standards.md.
  {
    files: TS_FILES,
    rules: {
      // §4 — external packages, then @/ aliases, then relative.
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          pathGroups: [
            { pattern: "@/**", group: "internal", position: "before" },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          // No `alphabetize`: the three groups and the blank lines between them
          // are the standard. Sorting within a group would additionally force
          // `next/*` above `react`, which nobody wants to read.
        },
      ],

      // §6 — async/await, and no promise left unhandled.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",

      // §7 — real Error objects, never strings.
      "@typescript-eslint/only-throw-error": "error",
      "@typescript-eslint/prefer-promise-reject-errors": "error",

      // §2 — no-explicit-any and ban-ts-comment are already errors via
      // eslint-config-next/typescript. Unused code is a warning there; keep it
      // one so work in progress still lints clean.
    },
  },

  // §5 — named exports everywhere under src/, except the route files.
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: { "import/no-default-export": "error" },
  },
  {
    files: ROUTE_FILES,
    rules: { "import/no-default-export": "off" },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
