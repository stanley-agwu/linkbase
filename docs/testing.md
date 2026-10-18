# Linkbase — Testing

How code is tested: what gets a unit test, what gets QA instead, where each lives, and which database it may touch. Read this before writing a test, or before calling a feature done.

Scope: unit tests (Vitest) and end-to-end QA (Playwright MCP). `coding-standards.md` §8 owns the pre-commit checks; this doc owns what a test is and where it runs. Vitest is set up (§2.4), and QA runs through the `run-qa-suite` skill (§3). §7 lists what's missing. Anything undecided is marked **TBD**.

---

## 1. Two kinds of test

| Layer    | Tool                                               | Tests                                                                 | Lives                                     |
| -------- | -------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| **Unit** | Vitest                                             | pure functions and Zod schemas                                        | next to the file it tests, as `*.test.ts` |
| **QA**   | Playwright MCP, driven by the `run-qa-suite` skill | everything else: pages, forms, Server Actions, auth, `proxy.ts`, data | nowhere in the repo — no committed tests  |

The line between them: **if it needs a request, a session, a database, or a browser, it's QA.** If it's a function from input to output, it's a unit test.

Nothing is mocked to move code from the QA column to the unit column. A unit test that mocks `lib/db`, `auth()`, or `headers()` to call a Server Action tests the mock, not the action (§4).

---

## 2. Unit tests — Vitest

### 2.1 What gets one

Code that is pure: same input, same output, no I/O, no framework runtime. Today that's:

- **Zod schemas** in `lib/validation` — `handleSchema`, `emailSchema`, `passwordSchema`, `signUpSchema`, `logInSchema`, `credentialsSchema`. Test both directions: valid input parses, and each rule rejects what it should with the message the form shows.
- **Pure helpers** — `sanitizeHandle` (`lib/validation/fields.ts`), the `ActionResult` builders (`lib/validation/result.ts`), `safeNextPath` (`lib/safe-redirect.ts`). `safeNextPath` is a security boundary (`auth.md`), so its tests should cover the hostile cases: absolute URLs, protocol-relative `//evil.com`, backslashes, and encoded variants.

### 2.2 What doesn't

- **Anything that imports `server-only`** — `lib/db`, `lib/auth`, `lib/logger`. `server-only` throws when it's imported outside a Server Component build, so those modules can't load in Vitest. That's intentional: they're QA's job.
- **Anything that imports `@/lib/db`**, even indirectly — it imports `server-only` (above) and needs a real database (`database.md` §2).
- **Components and pages.** No React Testing Library. A component is checked by QA in a real browser.

If a pure function is tangled up with a server-only module, extract the pure part into its own file and test that. Don't add a mock.

### 2.3 Where and how

- **Colocated**: `src/lib/safe-redirect.ts` → `src/lib/safe-redirect.test.ts`. No `__tests__/` folders and no top-level `tests/` folder.
- **`.test.ts` only**: `.spec.ts` is reserved by convention for Playwright, and there are none (§3).
- **Name the behaviour, not the function**: `it("rejects protocol-relative URLs")`, not `it("safeNextPath works")`.
- Imports follow `coding-standards.md` like any other file: the three-group order, and `@/*` over relative traversal (except the file under test, which may be `./`).

### 2.4 Running

```bash
npm test                                     # all unit tests, once
npm run test:watch                           # watch mode
npm test -- src/lib/safe-redirect.test.ts    # a single file
npm test -- -t "rejects protocol-relative"   # tests whose name matches
```

Config is `vitest.config.mts` at the root. It only picks up `src/**/*.test.ts` and runs in the `node` environment, with no DOM and no React plugin, because components are QA's job (§2.2). It maps `@/` to `src/` by hand, mirroring the tsconfig `paths`. If you add a path alias to `tsconfig.json`, add it there too.

---

## 3. End-to-end QA — Playwright MCP

QA drives a real browser against the running app through the Playwright MCP server. The `run-qa-suite` skill runs it: it reads the QA scenarios at the end of the feature's plan in `plans/<branch>.md`, carries out each one, and reports pass/fail with evidence.

**There are no committed end-to-end tests.** Specifically, none of these exist and none should be added:

- no `/e2e` folder
- no `playwright.config.ts`
- no `*.spec.ts` files
- no `@playwright/test` dependency

The scenarios live in the plan as plain-language steps and expectations, and the skill is what executes them. That gives a single source of truth per feature: the plan that was approved.

### 3.1 What QA covers

- **Every Server Action**, through the form or control that calls it (§4).
- **Auth and access control**: sign-up, log-in, log-out, the `next` redirect, and the default-deny in `proxy.ts` (signed-out access to `/dashboard` redirects to `/login`).
- **Data scoping**: one user can't see or change another user's data (`database.md`, `auth.md` §5). This needs two accounts in the same scenario.
- **Error UX**: inline `ActionResult` errors next to fields, and `error.tsx` showing fixed copy plus a digest. Check that one against `npm run build && npm start`, not `next dev`, since dev shows real messages (`errors-and-validation.md`).
- **Rate limits**: that they trip, and what the user sees when they do.

---

## 4. Server Actions are tested through QA, not mocked

A Server Action is session → Zod validate → scoped query → write → revalidate (`data-mutations.md`). Every one of those steps depends on the framework or the database. A unit test would have to mock the session, `headers()`, the query layer, and `revalidateTag`. At that point it shows the action calls the mocks in order, not that sign-up works.

So:

- **No unit tests for Server Actions**, and no mocks of `auth()`, `headers()`, `cookies()`, `lib/db`, or Mongoose to make one possible.
- **The action's pure parts are unit-tested where they live**: its Zod schema in `lib/validation` (§2.1). That covers most of the input rules without touching the action.
- **The action itself is tested by QA**: fill the real form, submit, and check both the UI and the resulting state.

---

## 5. The test database

**QA runs against a separate test database, never the dev or prod database.**

- The connection string is `MONGODB_URI_TEST`, kept in `.env.test`.
- `.env.test` holds a credential, so it is **never committed**. The existing `.env*` rule in `.gitignore` already ignores it (only `.env.example` is negated back in). Don't add a negation for it.
- **Use a different database name** from dev, e.g. `linkbase_test`. Ideally use a different Atlas database user too, scoped to that database only, so a misconfigured run can't reach dev data even by accident.
- **The test database is disposable.** QA may create and delete anything in it. Nothing in it is worth keeping.
- **The `run-qa-suite` skill checks before it starts** that the app it's driving is connected to the test database, and stops if it isn't. QA that silently writes test users into the dev database is the failure this rule exists to prevent.

**How the app picks it up:** `lib/db/connect.ts` reads `MONGODB_URI` only, so `run-qa-suite` starts the dev server itself with `MONGODB_URI` set in the process environment from `MONGODB_URI_TEST`. `process.env` wins over `.env.local` in Next's load order, so no app code knows about the test DB. The skill refuses to drive a server it didn't start. Its guard (`.claude/skills/run-qa-suite/scripts/test-db.mjs check`) also refuses a test URI that has no database name, a name without `test`, or the same database as dev.

Unit tests never touch any database (§2.2), so they need no `.env.test`.

---

## 6. Every test is independent

**No shared state between tests and no dependence on order.** Any test, run alone or in any order, gets the same result.

### 6.1 Unit tests

- No module-level mutable state shared across `it` blocks. Build inputs inside each test, or in a `beforeEach` that recreates them.
- No test relies on another having run first.
- Pure functions make this easy. If a test needs cleanup, it probably isn't testing a pure function (§2.2).

### 6.2 QA scenarios

- **Each scenario creates the data it needs.** A log-in scenario signs up its own account first. It doesn't reuse the account from the sign-up scenario.
- **Unique identifiers per scenario**: emails and handles carry a unique suffix (e.g. `qa-login-<timestamp>@example.test`), so two scenarios, or two runs, never collide on a unique index.
- **Reset rate-limit counters before each scenario.** All QA traffic comes from one IP, and the limits are real: sign-up allows 5 per IP per hour (`lib/auth/actions.ts`), and log-in allows 5 per email and 20 per IP per 15 minutes (`src/auth.ts`). Without a reset, scenario six fails because of scenarios one to five. `run-qa-suite` empties every collection in the **test** database before each scenario (`test-db.mjs reset`). It deletes documents but keeps the indexes, since Mongoose only builds them at server start. Don't raise or disable the limits for QA, since the rate-limit scenario (§3.1) needs them real.
- **No scenario reads state another left behind**, including the browser session. Start each one signed out, with fresh cookies.
- **Use reserved domains for test emails**: `example.test` or `example.com`, never a real address.

---

## 7. Not set up yet

| Item                                                            | Status                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------- |
| Playwright MCP server committed as project config (`.mcp.json`) | **TBD**: currently configured per machine                       |
| `MONGODB_URI_TEST` placeholder in `.env.example`                | **TBD**: add it with placeholder values only (`security.md` §1) |
| Unit tests in CI                                                | **TBD**: no `.github/workflows` yet (`git-conventions.md` §6)   |
