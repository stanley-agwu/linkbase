---
name: run-qa-suite
description: Run LinkBase's end-to-end QA locally. Loads the QA scenarios from plans/<current-branch>.md, points the app at the test database (MONGODB_URI_TEST from .env.test), and drives localhost:3000 with Playwright MCP through happy path, auth boundary, validation, and edge-case scenarios, resetting the test DB between scenarios. Fixes failures in code and re-runs (max 3 attempts per failure), then reports. Use whenever the user asks to run QA, test the app, run the QA suite or scenarios, check that a feature works end to end, or verify a feature in the browser — e.g. "run QA", "QA this", "test the app", "run the QA scenarios", "check it works", "verify sign-up end to end".
---

# Run the QA suite

Drives the running app through the feature's QA scenarios in a real browser, using Playwright MCP, against the test database. Follow `docs/testing.md` §3–6. Where this skill and the doc disagree, the doc wins.

**Out of scope — never do these here:**

- writing unit tests (`write-tests` does that)
- `git add`, `git commit`, `git push`, or opening a PR
- writing committed Playwright files: no `/e2e`, no `playwright.config.ts`, no `*.spec.ts` (`testing.md` §3)

## 1. Load the scenarios

1. Run `git branch --show-current`, replace any `/` with `-`, and read `plans/<branch>.md`.
2. If there's no plan file, or it has no QA scenarios section, stop and say so. Don't invent a suite from scratch.
3. Sort the scenarios into four groups: **happy path**, **auth boundary** (signed-out access, redirects, one user vs another's data), **validation** (each field rule, inline errors), and **edge cases** (rate limits, `next` redirect abuse, duplicates, long or odd input). If the plan leaves a group empty, derive the minimum it needs from the plan's Files table and `testing.md` §3.1. Mark those scenarios as added by you in the report.

## 2. Point the app at the test database

The dev database must never see QA traffic (`testing.md` §5). The guard and reset live in `scripts/test-db.mjs`, next to this file. Run them from the repo root. They never print the connection string, and you mustn't either. Don't read or echo `.env.test` or `.env.local` yourself.

1. **Check**: `node .claude/skills/run-qa-suite/scripts/test-db.mjs check`. It fails unless `.env.test` sets `MONGODB_URI_TEST`, the URI names a database containing `test`, and that database isn't the dev one. On failure, stop and tell the user what to fix in `.env.test`. Env files are hook-protected, so don't edit them.
2. **Port 3000 must be free.** If something is already listening there, stop and ask the user to stop it. A server you didn't start may be on the dev database, and you can't tell which. Don't kill it yourself.
3. **Start the dev server yourself**, in the background, with the test URI in the process environment:

   ```bash
   MONGODB_URI="$(node .claude/skills/run-qa-suite/scripts/test-db.mjs uri)" npm run dev
   ```

   `process.env` wins over `.env.local` in Next's load order, so the app connects to the test DB while still reading `AUTH_SECRET` from `.env.local`. Don't set `NODE_ENV=test`, since that skips `.env.local`.

4. Wait until `http://localhost:3000` responds before starting.

## 3. Run each scenario

Every scenario is independent (`testing.md` §6.2). For each one:

1. **Reset**: `node .claude/skills/run-qa-suite/scripts/test-db.mjs reset`. This empties every collection, rate-limit counters included, and keeps the indexes.
2. **Start signed out**: clear the browser's cookies (`browser_run_code_unsafe` → `await page.context().clearCookies()`), then confirm `/dashboard` redirects to `/login`.
3. **Create the data it needs.** A log-in scenario signs up its own account first. Use unique `@example.test` emails (e.g. `qa-login-<timestamp>@example.test`) and obviously fake passwords.
4. **Drive it**: `browser_navigate`, `browser_fill_form`, `browser_click`, `browser_press_key`. Check outcomes with `browser_snapshot` (URL, headings, field errors, `role="alert"` messages), not with screenshots alone.
5. **Check for silent failures** too: `browser_console_messages` for errors, and the dev server output for `request.failed` logs.
6. On failure, take a `browser_take_screenshot` into the session scratchpad, never into the repo.

Error UX that depends on production behaviour (`error.tsx` showing fixed copy and a digest) needs `npm run build && npm start` with the same `MONGODB_URI` override. Run those scenarios last, after stopping the dev server.

## 4. When a scenario fails

1. **Diagnose** from the snapshot, console, and server log. Find the root cause in the code, not just the symptom.
2. **Fix it in the code**, following `/docs` and the rules `create-feature` uses (Context7 for library APIs). Never make a scenario pass by weakening it. That means no editing the expectation, no editing the plan, no disabling rate limits, and no skipping a step.
3. If the scenario itself looks wrong (it contradicts the plan or `/docs`), stop and ask rather than changing it.
4. Run `npm run typecheck` and `npm run lint`, then re-run the failing scenario from step 3.1, reset included.
5. **Cap at 3 attempts on the same failure.** After the third, stop. Report the scenario, what you tried, what you observed, and what's blocking. Leave your attempted fixes in place and list them.

If you changed code, re-run every scenario once at the end, since a fix for one can break another.

## 5. Finish

1. Stop the server you started.
2. **On all green**, report briefly:
   - scenarios run, by group (happy path / auth boundary / validation / edge cases), with any you added marked
   - code fixed along the way: file, what was wrong, the fix
   - anything not covered, and why
3. Then stop. No commit, and no offer to commit.
