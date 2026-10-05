---
name: create-feature
description: Build a LinkBase feature from its approved plan, following the /docs conventions and live library docs from Context7. Writes the feature code only — no tests, no QA, no commits — then reports what was built in 2–3 lines and hands back. Use whenever the user starts building or implementing a feature whose plan has been approved — e.g. "plan approved, build it", "go ahead and implement", "start on the feature", "let's code this up", "implement the plan" — and right after a plan-feature plan is approved.
---

# Build an approved feature

Runs after `plan-feature` has produced a plan and the user has approved it. This skill writes the feature's code and nothing else.

**Out of scope — never do these here:**

- writing or changing tests (`write-tests` does that)
- running QA, the dev server, or the QA scenarios (`run-qa-suite` does that)
- `git add`, `git commit`, `git push`, or opening a PR

The user triggers those skills explicitly when they're ready. Don't offer to run them, and don't start them yourself.

## 1. Load the approved plan

1. Run `git branch --show-current`, replace any `/` with `-`, and read `plans/<branch>.md`.
2. If there's no plan file, or the user hasn't approved one in this conversation, stop and say so — suggest running `plan-feature` first. Don't build from an unapproved or missing plan.

The plan's **Files** table is the scope. Build what it lists; if something has to change that the plan doesn't cover, stop and ask before going beyond it.

## 2. Read the docs before writing code

1. Read every `docs/` file listed under the plan's **Docs followed**. Always include `docs/architecture.md` and `docs/coding-standards.md`, plus `docs/database.md` if the feature touches data.
2. For every library the code uses (Next.js, Mongoose, NextAuth, Zod, …), pull current docs through Context7 before writing code against it, as `CLAUDE.md` requires. Don't rely on memory for API signatures, config, or version-specific behavior. If Context7 has no entry for a library, or isn't connected, say so before continuing.
3. For Next.js, also read the matching guide under `node_modules/next/dist/docs/`.

## 3. Build

Work through the plan's Files table, following the docs. The rules most often missed:

- Server Components by default; add `"use client"` only where the plan or `architecture.md` calls for it.
- `@/*` imports, kebab-case file names, PascalCase components, verb-first Server Actions.
- Writes go through Server Actions (`data-mutations.md`): session → Zod validate → scope to the user id → write → revalidate.
- Reads go through `lib/db` with the scoping rules in `data-fetching.md` and `database.md`.
- Expected failures return `ActionResult`; unexpected ones throw (`errors-and-validation.md`).
- Use `LayoutProps<path>` / `PageProps<path>` for route props.
- `.env` and `.env.local` are protected by a hook. If the feature needs a new env var, add it to `.env.example` and tell the user what to put in their `.env.local`.

If you find the plan is wrong or can't be followed as written (a conflict with the docs, an API that doesn't work the way the plan assumed), stop and explain rather than quietly building something different.

When the code is written, run `npm run typecheck` and `npm run lint` and fix what they report in the files you wrote. These check that the build compiles; they aren't QA.

## 4. Hand back

Stop and report in 2–3 lines: what was built and the main files created or changed. Mention anything the user has to do themselves (e.g. an env var to set) and anything from the plan that wasn't built. Then end your turn — no tests, no QA, no commit.
