---
name: write-tests
description: Write the unit tests for a LinkBase feature following docs/testing.md. Writes tests only — doesn't run them, doesn't run QA, doesn't commit — then reports what was added in 2–3 lines and hands back. Use whenever the user asks to write, add, or create tests for a feature or area of the code — e.g. "write tests for auth", "add tests for this feature", "add unit tests", "test the validation schemas", "now write the tests" — including right after create-feature has built a feature.
---

# Write tests for a feature

This skill writes a feature's unit tests and nothing else.

**Out of scope — never do these here:**

- running the tests
- running QA, the dev server, or the QA scenarios (`run-qa-suite` does that)
- `git add`, `git commit`, `git push`, or opening a PR

The user triggers those explicitly when they're ready. Don't offer to run them, and don't start them yourself.

## 1. Read testing.md first

Read `docs/testing.md` in full before anything else. It defines what gets a unit test, where the file lives, how it's written, and what's left to QA. Follow it. Where this skill and the doc disagree, the doc wins.

## 2. Find the feature

1. Run `git branch --show-current`, replace any `/` with `-`, and read `plans/<branch>.md` if it exists. Its **Files** table is the feature's scope.
2. With no plan, use the area the user named, or the files changed against `main`.
3. If the scope is still unclear, ask which feature to cover.

## 3. Write the tests

Write unit tests for the feature's code in the places and style `testing.md` defines. Test what the doc says gets a unit test, and leave what it assigns to QA alone. If a test file already exists for a source file, extend it rather than starting a second one.

Before writing against Vitest or Zod APIs, pull current docs through Context7 as `CLAUDE.md` requires. If Context7 has no entry or isn't connected, say so.

## 4. Hand back

Stop and report in 2–3 lines: which test files were added or extended and what they cover, plus anything in scope left to QA. Then end your turn. Don't run the tests, don't run QA, don't commit.
