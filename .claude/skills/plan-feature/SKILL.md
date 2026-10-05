---
name: plan-feature
description: Plan a new LinkBase feature before any code is written. Enters Plan Mode, drafts a short technical plan (files to create or change, grounded in the /docs conventions, ending with QA scenarios), waits for explicit approval, then saves the plan to ./plans/<current-branch>.md. Use whenever the user starts planning, scoping, designing, or kicking off a new feature, page, route, action, or model — e.g. "let's build X", "I want to add Y", "how should we implement Z", "plan the signup flow", "scope out link analytics" — even if they don't say "plan".
---

# Plan a feature

Runs at the start of every new feature. **No code is written until the user explicitly approves the plan.**

## 1. Enter Plan Mode

Call `EnterPlanMode` before doing anything else. While in Plan Mode, only read and research — no edits, no file writes, no commands that change state.

## 2. Read the docs that govern the feature

Always read:

- `docs/architecture.md` — directory layout, Server vs Client Components, import direction, naming.
- `docs/database.md` — models, schema conventions, user-id scoping.
- `docs/coding-standards.md` — rules every new file must follow.

Then read every feature-area doc the feature touches:

| The feature involves… | Read |
|---|---|
| a new page, route, layout, or endpoint | `docs/routing.md` |
| sign-in, sessions, protected routes, anything reading a user id | `docs/auth.md` |
| reading data, caching, cache tags | `docs/data-fetching.md` |
| creating, updating, or deleting data | `docs/data-mutations.md` |
| forms, input validation, error states, `error.tsx` | `docs/errors-and-validation.md` |
| env vars, headers, rate limiting, rendering user-typed content | `docs/security.md` |
| components or page layout | `docs/ui.md` and `docs/design-system.md` |

If a doc lists an open conflict that affects this feature (e.g. `errors-and-validation.md` §8, `routing.md` §7), raise it in the plan rather than silently picking a side.

For any library API the plan relies on (Next.js, Mongoose, NextAuth, Zod, …), check current docs through Context7 per `CLAUDE.md`, and read the matching guide under `node_modules/next/dist/docs/` for Next.js specifics.

Look at the existing code too, so the plan extends what's there instead of duplicating it.

## 3. Write the plan

Keep it short — a reviewer should read it in a couple of minutes. Use this shape:

```markdown
# <Feature name>

## Goal
One or two sentences: what the user can do when this ships.

## Docs followed
- `docs/<file>.md` — the convention from it this plan relies on (one line each)

## Files
| Path | New / Changed | Purpose |
|---|---|---|
| `src/...` | New | ... |

## Approach
A few bullets on the non-obvious decisions: data shape, which Server Actions, what's cached and which tags are revalidated, where auth is enforced. Note any doc conflict or open question here.

## QA Scenarios
1. **Happy path** — <what the user does> → <what should happen>
2. **Auth boundary** — <what the user does> → <what should happen>
3. **Validation** — <what the user does> → <what should happen>
4. **Edge case** — <what the user does> → <what should happen>
```

QA Scenarios: 3–6 concrete scenarios, one line each, covering at least the happy path, an auth boundary (signed out, or touching another user's data), a validation failure, and an edge case. Name real inputs and real outcomes ("submits handle `ab` → inline error 'at least 3 characters', nothing saved"), not generic ones ("invalid input is rejected").

## 4. Get approval

Present the plan with `ExitPlanMode`. Then stop and wait. Only an explicit approval from the user ("approved", "go ahead", "looks good, build it") counts. If they ask for changes, revise and present again. Don't start implementing on silence or ambiguity.

## 5. Save the approved plan

Once approved, before handing off to implementation:

1. Run `git branch --show-current` to get the branch name.
2. If it prints `main` (or nothing, on a detached HEAD), don't write there: per `docs/git-conventions.md` work never happens on `main`. Propose a `<type>/<description>` branch name, create it once the user agrees, and use that.
3. Write the approved plan, exactly as approved, to `./plans/<branch>.md` — the `plans/` directory at the repo root, one flat file per branch, no subdirectories. Replace any `/` in the branch name with `-`, so `feat/link-analytics` becomes `plans/feat-link-analytics.md`.
4. Tell the user where the plan was saved, then build it with the `create-feature` skill.
