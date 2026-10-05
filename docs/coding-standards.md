# Linkbase — Coding Standards

How code in this repo is written, formatted, and checked. Read this before writing a file; it's the "how", where `architecture.md` is the "where".

Scope: TypeScript, formatting, imports, component shape, async, and errors. Where a rule is machine-enforced this doc says which rule enforces it, so you can tell a convention from a gate. Styling tokens live in `design-system.md`, component APIs in `ui.md`, data rules in `database.md`, identity rules in `auth.md`. Anything undecided is marked **TBD**.

Everything in this doc is installed and wired up. Where a rule is a gate, the rule name is given — run it rather than take this doc's word for it.

---

## 1. The toolchain

| Concern          | Owner                                                             | Command             |
| ---------------- | ----------------------------------------------------------------- | ------------------- |
| Types            | TypeScript 5, `strict: true` (`tsconfig.json`)                    | `npm run typecheck` |
| Formatting       | Prettier (`.prettierrc.json`)                                     | `npm run format`    |
| Correctness lint | ESLint 9 flat config + `eslint-config-next` (`eslint.config.mjs`) | `npm run lint`      |
| Everything       | the production build                                              | `npm run build`     |

```bash
npm run lint         # eslint, flat config, no path arg
npm run lint:fix     # the same, autofixing what it can (import order included)
npm run typecheck    # tsc --noEmit
npm run format       # prettier --write .
npm run format:check # prettier --check . — for CI
npm run build        # the full gate: types + lint + build
```

**Lint and typecheck are separate gates.** ESLint is type-aware here (§6 and §7 need it), but it type-checks only what its rules ask about — a type error elsewhere in the file won't fail lint. Run both; `npm run build` runs both for you.

Two things ESLint is deliberately not: a formatter (that's Prettier, §3) and a test runner (there isn't one — **TBD**).

---

## 2. TypeScript

New code is `.ts` / `.tsx`. `allowJs` is on for scaffolding leftovers only — don't add `.js` files under `src/`.

### What `strict` gives us

Worth knowing precisely, because the gaps are where bugs live:

| Flag (included in `strict`)                  | Effect you'll feel                                     |
| -------------------------------------------- | ------------------------------------------------------ |
| `strictNullChecks`                           | `null` / `undefined` must be handled, not assumed away |
| `noImplicitAny`                              | an un-annotated parameter is an error                  |
| `strictFunctionTypes`, `strictBindCallApply` | callback and `.call` signatures actually checked       |
| `strictPropertyInitialization`               | class fields must be assigned                          |
| `useUnknownInCatchVariables`                 | `catch (error)` is `unknown`, not `any` — see §7       |

Not enabled, so don't assume them: `noUncheckedIndexedAccess` (so `array[0]` is typed as present even when the array is empty — guard it yourself), `exactOptionalPropertyTypes`, `noImplicitReturns`, `noUnusedLocals`. Adopting any of these: **TBD**.

### No `any`

Enforced: `@typescript-eslint/no-explicit-any` is an **error** in the installed config.

`any` doesn't fail loudly, it disables checking for everything downstream of it — including the `userId` filters that `auth.md` depends on. Use instead:

| Situation                                                  | Reach for                                         |
| ---------------------------------------------------------- | ------------------------------------------------- |
| Value from outside the app (JSON, webhook, `localStorage`) | `unknown`, then narrow                            |
| "Any shape of object"                                      | `Record<string, unknown>`                         |
| Caller decides the type                                    | a generic parameter                               |
| You genuinely don't know yet                               | write the type you want and make the code meet it |

```ts
// No. Everything after this is unchecked.
const payload: any = await request.json();
return payload.user.id;

// Yes. The cast is confined to one validated boundary.
const payload: unknown = await request.json();
if (!isWebhookPayload(payload)) throw new Error("Malformed webhook payload");
return payload.user.id;
```

Watch the implicit routes in: `JSON.parse` returns `any`, and so does anything from an untyped dependency. Lint can't see those (it isn't type-aware), so validate at the boundary and keep `any` from spreading inward. `as` casts are not banned, but a cast is an assertion you're right with no check that you are — prefer narrowing, and keep casts next to the boundary that justifies them.

### No `@ts-ignore`

Enforced: `@typescript-eslint/ban-ts-comment` is an **error**, and its defaults ban `@ts-ignore` and `@ts-nocheck` outright while allowing `@ts-expect-error` _with a description_.

So the rule in this repo is narrower than "comment your ignores":

```ts
// No — banned by the linter, and silently does nothing if the error goes away.
// @ts-ignore
widget.attach(root);

// Yes.
// @ts-expect-error `@acme/widget` ships no types for `attach` (upstream #412).
// Remove when 3.0 lands — this line will start erroring once the types arrive.
widget.attach(root);
```

`@ts-expect-error` is required over `@ts-ignore` because it self-cleans: when the underlying error disappears, the suppression itself becomes an error and gets deleted. `@ts-ignore` rots silently.

The description must say **what** is wrong, **why** it can't be fixed here, and **when** it can go. The linter only requires 3 characters; review requires a sentence. Same bar for `eslint-disable-next-line` — always name the specific rule, never bare, and always with a reason.

### Types

- `type` for unions, aliases, and object shapes; `interface` only when something needs to be extended or declaration-merged.
- Type-only imports use the inline modifier: `import { NextResponse, type NextRequest } from "next/server"`.
- Shared types live in `lib/types` (`architecture.md` §2). A type used by one file stays in that file.
- Prefer `satisfies` over a type annotation when you want the literal's narrow type _and_ a shape check.
- Don't re-declare a type that can be derived — `Pick`, `Omit`, `ReturnType`, and `Awaited` over a hand-copied duplicate that drifts.

---

## 3. Formatting — Prettier

**Prettier owns formatting; ESLint owns correctness.** They don't overlap here: the Next config ships no stylistic rules, so no `eslint-config-prettier` is needed and no formatting argument is ever a lint failure. Never hand-format to fight the formatter, and never add a stylistic ESLint rule.

`.prettierrc.json` — defaults, with the two choices worth stating:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 80,
  "tabWidth": 2
}
```

Double quotes and semicolons, matching the `create-next-app` output already in `src/app/`. `printWidth` stays at 80: it's what makes Prettier break long JSX prop lists one-per-line, which is how the components in `ui.md` stay readable.

`.prettierignore`:

```
.next
node_modules
out
build
package-lock.json
```

And in `package.json`:

```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

Formatting is not a review topic. If a diff has formatting noise in it, run `npm run format`. Editor-level format-on-save is recommended; a pre-commit hook is **TBD**.

---

## 4. Import order

Three groups, in this order, separated by one blank line:

1. **External packages** — `react`, `next/*`, anything from `node_modules`, plus Node builtins (`node:crypto`).
2. **Internal aliases** — `@/lib/*`, `@/components/*`, `@/app/*`.
3. **Relative** — `./`, `../`.

```tsx
import { Suspense } from "react";
import Link from "next/link";

import { requireUserId } from "@/lib/auth";
import { getLinksForUser } from "@/lib/db";
import { Button } from "@/components/ui/button";

import { LinkRow } from "./link-row";
```

Rules that go with it:

- **Use `@/*`, not relative traversal.** `@/components/ui/button`, never `../../components/ui/button`. Relative imports are only for siblings in the same folder, which is why group 3 is usually one or two lines.
- **Within a group, order is up to you.** Alphabetical sorting is deliberately not enforced — it would force `next/*` above `react`. Group order and the blank lines are the standard; what happens inside a group is taste.
- `"use client"` / `"use server"` go on line 1, **above** the imports (`architecture.md` §1).
- Side-effect imports (`import "server-only"`) go first, before group 1 — see the examples in `auth.md` §2 and `database.md` §2.
- The import direction rule still applies and matters more than the ordering: `app` → `components` → `lib`, feature → `ui`, never the reverse.

### Enforcing it

Enforced: **`import/order`** is an error in `eslint.config.mjs`, with `@/**` as a `pathGroup` placed before relative imports and `newlines-between: "always"`. `eslint-plugin-import` comes with `eslint-config-next`, so this needed no new dependency.

It's autofixable — `npm run lint:fix` sorts the groups and inserts the blank lines for you, so this is never a thing to fix by hand.

One exception you'll meet: **side-effect imports are ignored by the rule.** `import "./globals.css"` in `app/layout.tsx` sits directly under the `next/font` import with no blank line and is not an error, because reordering an unassigned import can change behaviour. The rule leaves them where they are; so should you.

---

## 5. Components

### Function declarations, typed props

```tsx
// components/ui/button.tsx
type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  children,
}: ButtonProps) {
  return <button className={cx(variant, size)}>{children}</button>;
}
```

- **`function`, not `const` + arrow.** Declarations hoist, they show up in stack traces by name, and they keep the component's name in one place instead of two.
- **A named props type per component**, declared above it as `<Name>Props`. Inline object types are acceptable for a one-prop component; anything with variants gets a named type so `ui.md` has something to point at.
- **No `React.FC`.** It adds nothing under TS 5 and gets in the way of generics.
- **Union literals over `string`** for variants, sizes, and states. The valid set from `ui.md` belongs in the type, where a typo is a build failure.
- Props extending a DOM element use `React.ComponentProps<"button">`, not a hand-written list.
- One component per file, named after the file: `claim-input.tsx` exports `ClaimInput` (`architecture.md` §4).

Server Component by default. `"use client"` only for the reasons in `architecture.md` §1, on line 1, on the smallest file that needs it.

### Named exports, except route files

Named exports everywhere, so the import name matches the declaration and renaming is mechanical. The exceptions are the Next.js file conventions that **require** a default export:

| File                                                                                                 | Export                                           |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `page.tsx`, `layout.tsx`, `template.tsx`, `default.tsx`                                              | default                                          |
| `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, `forbidden.tsx`, `unauthorized.tsx` | default                                          |
| `sitemap.ts`, `robots.ts`, `manifest.ts`, `opengraph-image.tsx`, `icon.tsx`                          | default                                          |
| `next.config.ts`                                                                                     | default                                          |
| `route.ts`                                                                                           | **named** — `GET`, `POST`, … (not default)       |
| `proxy.ts`                                                                                           | named `proxy` (default also works; prefer named) |
| everything else                                                                                      | **named**                                        |

Note `route.ts` and `proxy.ts` are not exceptions — they take named exports too. The default-export list is "the framework reads this file by convention", nothing more. A component in `components/` never has a default export, even if it's only used once.

Route files type their props with the generated globals, not hand-written interfaces:

```tsx
// app/user/[handle]/page.tsx
export default async function ProfilePage({
  params,
}: PageProps<"/user/[handle]">) {
  const { handle } = await params; // params is a Promise in this Next major
  // …
}
```

`PageProps` / `LayoutProps` come from `.next/types` and are **not imported** — they only resolve after `next dev` or `next build` has generated them (`CLAUDE.md`). A red squiggle on a fresh clone means "run the dev server", not "write an interface".

### Enforcing it

Enforced: **`import/no-default-export`** is an error across `src/**`, switched back off for exactly the route-file patterns in the table above (the `ROUTE_FILES` list in `eslint.config.mjs`). A default export anywhere else fails lint with "Prefer named exports".

**Adding a new Next file convention means adding it to `ROUTE_FILES`.** If a future Next version introduces another conventional file — or we start using one already in the table's gaps — the lint error is the reminder. Add the pattern, don't add an inline `eslint-disable`.

---

## 6. Async

**`async` / `await` only. No `.then()` / `.catch()` chains.** One control flow, one place errors surface, and a stack trace that survives.

```ts
// No.
function loadProfile(handle: string) {
  return fetch(url)
    .then((res) => res.json())
    .then((data) => data.profile);
}

// Yes.
async function loadProfile(handle: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
  const data = await res.json();
  return data.profile;
}
```

- **Sequential `await`s must be sequential for a reason.** If two reads don't depend on each other, `Promise.all` them — two awaits in a row is two round-trips the user waits through.
  ```ts
  const [profile, links] = await Promise.all([
    getProfile(userId),
    getLinks(userId),
  ]);
  ```
- **`await` inside a loop** is the same bug in a different shape. Map to promises and `Promise.all`, unless you're deliberately rate-limiting.
- **`Promise.allSettled`** when one failure shouldn't take down the rest; check each result's `status` before reading `value`.
- **No floating promises.** Enforced by **`@typescript-eslint/no-floating-promises`**. Every promise is awaited, returned, or — if fire-and-forget is genuinely intended — prefixed with `void` and a comment saying why. `void` is what the rule accepts, and the comment is what review accepts.
- **No `async` function passed where a void callback is expected.** Enforced by **`@typescript-eslint/no-misused-promises`**. `useEffect(async () => …)` is a bug: the effect returns a promise instead of a cleanup function. Declare the async function inside and call it.
- **No `await` on a non-promise.** Enforced by **`@typescript-eslint/await-thenable`** — it catches the await that was added on a hunch and the one left behind when a function stopped being async.
- **No `new Promise(async (resolve) => …)`.** A throw inside that executor is unreachable by the outer `await`.
- `.catch()` as a _statement_ on a deliberately detached promise is the one acceptable use; it is still not a chain.

In Server Components, read data by awaiting it directly where it's rendered (`architecture.md` §1) — no `useEffect` fetching, no client data layer. `params` and `searchParams` are Promises in this Next major; `await` them.

---

## 7. Errors

**Throw `Error` objects. Never throw a string.**

```ts
throw "profile not found"; // No.
throw new Error("Profile not found"); // Yes.
```

A thrown string has no stack and no `name`, and it breaks every `instanceof Error` check downstream — including the ones in error boundaries, in logging, and in `onRequestError`. The same applies to rejecting with a string or a plain object.

Enforced, both halves: **`@typescript-eslint/only-throw-error`** for `throw`, and **`@typescript-eslint/prefer-promise-reject-errors`** for `Promise.reject`. Both need type information, which is why `eslint.config.mjs` turns on `projectService`.

### Catching

`catch (error)` is typed `unknown` (via `useUnknownInCatchVariables` in `strict`), so narrow before you touch it:

```ts
// lib/db — the one expected database error, turned into an outcome
try {
  await Profile.create({ userId, handle });
  return "claimed";
} catch (error) {
  if (isDuplicateKeyError(error)) return "taken";
  throw error; // anything else is unexpected — let it reach error.tsx
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}
```

- **Catch the specific error you can handle, rethrow the rest.** An unexpected error turned into a return value never reaches `error.tsx` or `onRequestError`, so it's never logged (`errors-and-validation.md` §1).
- Narrow with `instanceof Error`, or structurally as above. A `toError(value: unknown): Error` helper in `lib/` is fine once two call sites want it; don't cast with `as Error`.
- **Preserve the cause** when wrapping: `throw new Error("Could not load profile", { cause: error })`. (`cause` type-checks here because `lib` includes `esnext`, despite `target: "ES2017"`.)
- **Don't catch what you can't handle.** A `try`/`catch` that logs and rethrows unchanged is noise; one that swallows the error is a bug that shows up later as empty UI.
- **Subclass only when something branches on the type.** If no caller does `instanceof NotFoundError`, a plain `Error` with a good message is better.
- Never put a raw database error, a connection string, or anything from `auth.md`'s environment table into a message that can reach the client. `errors-and-validation.md` §7 lists every path by which one can.
- A catch that handles an error without rethrowing logs it through `logError` from `lib/logger` (`errors-and-validation.md` §6.4). A catch that rethrows doesn't log — `onRequestError` does.

### Don't swallow the framework's control flow

`redirect()`, `permanentRedirect()`, and `notFound()` work **by throwing** an internal Next.js error. A `try`/`catch` wrapped around them catches that error and silently cancels the redirect. Either don't wrap them, or call `unstable_rethrow(error)` from `next/navigation` as the **first line** of the catch block, before any logging or cleanup.

### Throw vs. return

Per `errors-and-validation.md` §1 and the Next error-handling guidance: **expected failures are return values, exceptional ones are throws.**

| Case                                                    | Response                                                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Validation failed, handle taken, row not found          | return an `ActionResult` — `validationError(…)`, `fieldError(…)`, `formError(…)` — rendered via `useActionState` |
| Not authenticated in a Server Action                    | throw (there's no page to redirect to)                                                                           |
| Database unreachable, invariant broken, missing env var | throw — let the error boundary take it                                                                           |
| Not authenticated in a Server Component                 | `redirect("/login")` via `requireUserId()`                                                                       |

Error UI is `error.tsx`, which in this Next major receives `{ error: Error & { digest?: string }, retry: () => void }` — `retry`, not `reset`. It renders fixed copy and the digest, never `error.message` (`errors-and-validation.md` §5.2). For a boundary that isn't a whole route segment, `catchError` from `next/error` wraps any subtree and handles `redirect()` / `notFound()` correctly on its own.

---

## 8. Before you commit

`npm run build` covers items 1–3 by itself. The rest is what the linter can't see.

1. `npm run format` — no formatting noise in the diff.
2. `npm run lint` — clean, no new `eslint-disable`.
3. `npm run typecheck` — clean. Lint passing is not this (§1).
4. Any `@ts-expect-error` carries what/why/when. (`any` and `@ts-ignore` can't get past the linter.)
5. `@/*` rather than `../..` — the group order itself is autofixed, the alias choice isn't.
6. Components are `function` declarations with named props types.
7. No `.then` chains, and independent awaits are `Promise.all`d. Neither is linted; floating promises are.
8. Every catch narrows `unknown`, and nothing wraps a `redirect()` without `unstable_rethrow`. Neither is linted.

---

## 9. Not decided yet

| Item                                                                      | Status                                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Stricter compiler flags (`noUncheckedIndexedAccess` first)                | **TBD** (§2)                                                                          |
| The rest of `recommendedTypeChecked` (`no-unsafe-assignment` and friends) | **TBD** — `projectService` is on, so it's a one-line opt-in once there's code to lint |
| Pre-commit hook / CI lint+typecheck job                                   | **TBD** — the scripts exist, nothing runs them automatically                          |
| Test runner, and the conventions that come with it                        | **TBD** — none configured (`CLAUDE.md`)                                               |
| Logging backend behind `lib/logger.ts`                                    | **TBD** — the seam is decided (`errors-and-validation.md` §6), the backend isn't      |
| Whether Prettier should keep formatting `docs/*.md`                       | **TBD** — it does today; `*.md` in `.prettierignore` would stop it (§3)               |
