# Linkbase — Errors and Validation

How input is validated, how failures travel back to the user, and what gets logged. Read this before writing a Server Action, a form, or an `error.tsx`.

Scope: the validation boundary, the action result type, thrown errors and error boundaries, logging, and what may reach the client. `auth.md` owns identity checks (which run _before_ validation), `database.md` owns queries and Mongoose's own validators, `routing.md` owns where `error.tsx` files go, `coding-standards.md` §7 owns the mechanics of `throw` / `catch`. Anything undecided is marked **TBD**.

> **Nothing here is installed yet.** `zod` is not in `package.json`, and `src/lib/validation`, `src/lib/logger.ts`, and `src/instrumentation.ts` don't exist. Add Zod with `npm install zod` (v4 — see §2.4 for why that matters) before writing the first schema.

---

## 1. Two kinds of failure

Every failure is one of two things, and the kind decides the mechanism:

| Kind           | Examples                                                                     | Mechanism                                                        | Reaches the user as                    |
| -------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------- |
| **Expected**   | invalid field, handle taken, link not found (or not yours), forged / junk id | **returned** — an `ActionResult` (§4)                            | an inline message next to the field    |
| **Unexpected** | database unreachable, missing env var, broken invariant, a bug               | **thrown** — caught by the nearest `error.tsx` (§5), logged (§6) | fixed copy plus an opaque reference id |

The rules that follow from that:

- **Validation errors are never thrown.** Not as a `ZodError`, not wrapped, not "just this once". A thrown validation error lands in an error boundary, which replaces the whole segment with "Something went wrong" — the user loses the form and never learns which field was wrong.
- **Unexpected errors are never returned.** Converting a database failure into `{ formError: "Something went wrong" }` hides it from the error boundary _and_ from `onRequestError`, so it's never logged. If you can't do anything useful about it, let it throw.
- **Neither kind ever carries a raw error message to the client** (§7).

Not authenticated in a Server Action is the one auth case that throws (`auth.md` §5) — there's no form state that makes sense for it.

---

## 2. Validation with Zod

### 2.1 The rule

**All input is validated with Zod at the Server Action boundary, before anything touches the database.** `FormData` values are untrusted strings, and an action's TypeScript parameter types are erased at runtime — anyone can POST anything to an action (`auth.md` §5). The schema is what turns "unknown" into a typed value; nothing in `lib/db` ever receives input that hasn't been through one.

Validation is not authorisation. Zod proves `linkId` is a well-formed id; it says nothing about whose link it is. Ownership stays in the query filter (`database.md` §5).

The same rule applies at the other entry points, with a different failure response:

| Entry point                                       | On invalid input                                    |
| ------------------------------------------------- | --------------------------------------------------- |
| Server Action                                     | return an `ActionResult` with field errors (§4)     |
| Route Handler (webhook, OAuth callback)           | `400` with a generic JSON body — no Zod issues      |
| Page `params` / `searchParams` (`/user/[handle]`) | `notFound()` — a malformed handle is a missing page |

### 2.2 Where schemas live

Shared schemas live in **`src/lib/validation`**, one file per domain concept, kebab-case:

```
src/lib/validation/
  index.ts          # re-exports — import from "@/lib/validation"
  result.ts         # ActionResult and its helpers (§4)
  fields.ts         # reusable field schemas: handleSchema, urlSchema, objectIdSchema
  profile.ts        # updateProfileSchema, claimHandleSchema
  link.ts           # createLinkSchema, updateLinkSchema, reorderLinksSchema
  auth.ts           # signUpSchema, signInSchema
```

- **`lib/validation` is client-safe.** No `"server-only"`, and no imports from `lib/db` or `lib/auth`. That lets a Client Component import the same schema for instant feedback (§4.4) without dragging server code into the bundle. It imports only `zod` and `lib/types`.
- **A schema used by exactly one action may sit next to it** (`app/(dashboard)/editor/_actions.ts`), following `architecture.md`'s co-location rule. Promote it to `lib/validation` the moment a second caller — another action, or the form itself — needs it.
- **Field schemas are defined once.** `handleSchema` is the single definition of a valid handle; the signup action, the claim-handle action, the availability check, and the `/user/[handle]` page all import it. Two regexes for the same field will drift.

### 2.3 Writing schemas

```ts
// src/lib/validation/fields.ts
import { z } from "zod";

export const handleSchema = z
  .string({ error: "Choose a handle" })
  .trim()
  .toLowerCase()
  .min(2, "At least 2 characters")
  .max(30, "30 characters or fewer")
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Letters, numbers, and hyphens only");

export const urlSchema = z
  .url({
    protocol: /^https?$/,
    error: "Enter a full link, starting with https://",
  })
  .max(2048, "That link is too long");

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Not found");
```

```ts
// src/lib/validation/link.ts
import { z } from "zod";

import { objectIdSchema, urlSchema } from "./fields";

export const updateLinkSchema = z.object({
  linkId: objectIdSchema,
  title: z
    .string({ error: "Enter a title" })
    .trim()
    .min(1, "Enter a title")
    .max(80, "80 characters or fewer"),
  url: urlSchema,
});

export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
```

Conventions:

- **Naming:** `<verb><Noun>Schema` for an action's input, matching the action's verb-first name (`updateLink` → `updateLinkSchema`). Field schemas are `<field>Schema`. The inferred type is `<Verb><Noun>Input` via `z.infer` — never a hand-written interface that duplicates the schema.
- **Every user-facing check has a custom message**, written as UI copy. Zod's defaults ("Invalid input: expected string, received undefined") aren't secret, but they aren't copy either. Messages are the only part of a `ZodError` that reaches the client.
- **Normalise in the schema** — `.trim()`, `.toLowerCase()` — so the action receives the canonical value and the database stores it. Put normalisers before the length checks they affect.
- **Restrict URL protocols.** `z.url()` alone accepts `javascript:` and `data:` URLs, and a profile link is rendered as an `href` on a public page. `protocol: /^https?$/` is not optional on any schema that ends up in an `href`.
- **Validate ids as ObjectIds.** A junk id that reaches Mongoose throws a `CastError`, which would surface as a 500 via `error.tsx`. Validated up front, it's an ordinary "Not found" result. Keep that message identical to the real not-found case, per `auth.md` §5.
- **Leave unknown keys stripped** (Zod's default). Don't use `z.strictObject` on form schemas: `FormData` can carry framework fields alongside yours, and stripping already guarantees nothing unlisted reaches the query.
- **Bound everything.** Every string gets a `max`, every array a `max` length. The 1MB action body limit (`auth.md` §5) is a transport cap, not a field rule.
- **Mongoose validators stay** (`database.md` §4) as the backstop, and their limits must match the Zod schema. Zod is what produces user-facing messages. A Mongoose `ValidationError` after a passing Zod parse means the two have drifted — a bug, so it throws (`database.md` §6).

### 2.4 Zod 4, not the Next docs' Zod 3

Next's own forms guide (`node_modules/next/dist/docs/01-app/02-guides/forms.md`) uses Zod 3 APIs. Write Zod 4:

| Zod 3 (in the Next docs)                                   | Zod 4 (write this)                                       |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| `error.flatten().fieldErrors`                              | `z.flattenError(error).fieldErrors`                      |
| `invalid_type_error` / `required_error` / `message` params | `{ error: "…" }`                                         |
| `z.string().url()`                                         | `z.url({ protocol: … })`                                 |
| `z.string().email()`                                       | `z.email()`                                              |
| `z.coerce.boolean()` for a checkbox                        | `z.stringbool()` — `z.coerce.boolean("false")` is `true` |

---

## 3. The action boundary

Every action runs the same four steps in the same order:

1. **Identity** — `const userId = await requireUserId()` (`auth.md` §5).
2. **Validate** — `schema.safeParse(...)`. On failure, return the result immediately.
3. **Query** — pass `parsed.data` and the session `userId` to `lib/db`. Map an expected outcome (`null`, `"taken"`) to a result.
4. **Refresh and return** — `refresh()` / `revalidatePath`, then a success result.

```ts
// src/app/(dashboard)/editor/_actions.ts
"use server";

import { refresh } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { updateLink as updateLinkRow } from "@/lib/db";
import {
  type ActionResult,
  formError,
  type UpdateLinkInput,
  updateLinkSchema,
  validationError,
} from "@/lib/validation";

export async function updateLink(
  _previous: ActionResult<UpdateLinkInput>,
  formData: FormData,
): Promise<ActionResult<UpdateLinkInput>> {
  const userId = await requireUserId(); // 1. identity — throws if signed out

  const parsed = updateLinkSchema.safeParse(Object.fromEntries(formData)); // 2. validate
  if (!parsed.success) return validationError(parsed.error, formData);

  const link = await updateLinkRow(userId, parsed.data); // 3. ownership in the filter
  if (!link) return formError("Not found", formData);

  refresh(); // 4. refresh, then report success
  return { status: "success", data: null };
}
```

Notes:

- **`safeParse`, never `parse`.** `parse` throws a `ZodError`, which is a validation error thrown — exactly what §1 rules out.
- **No `try`/`catch` around the query.** A connection failure is unexpected: it throws, `error.tsx` renders, `onRequestError` logs it. Wrapping it would only hide it.
- **`Object.fromEntries(formData)` is right for flat forms.** It keeps only the last value of a repeated key, so a multi-value field (checkbox group, multi-select) reads `formData.getAll("name")` explicitly into the object you parse.
- **Actions called with arguments instead of `FormData`** (`reorderLinks(ids)` from a drag handler) validate their arguments the same way. The parameter type is a compile-time fiction for a request that arrives over the wire.
- **Expected database outcomes are return values from `lib/db`**, not errors the action catches. A duplicate-key error on `handle` is caught _inside_ the query function and returned as `"taken"`, so no action ever needs to know what `code === 11000` means:

```ts
const outcome = await claimHandle(userId, parsed.data.handle);
if (outcome === "taken")
  return fieldError("handle", "That handle is taken", formData);
```

---

## 4. The result type

### 4.1 `ActionResult`

```ts
// src/lib/validation/result.ts
import { z } from "zod";

type FieldName<TInput> = Extract<keyof TInput, string>;

export type FieldErrors<TInput> = Partial<Record<FieldName<TInput>, string[]>>;

export type ActionResult<TInput, TData = null> =
  | { status: "idle" }
  | { status: "success"; data: TData }
  | {
      status: "error";
      fieldErrors: FieldErrors<TInput>;
      formError?: string;
      values: Partial<Record<FieldName<TInput>, string>>;
    };

export const idle = { status: "idle" } as const;
```

- **Discriminated on `status`.** The form switches on it; TypeScript narrows to `fieldErrors` only in the error branch. `"idle"` is the `useActionState` initial state, so the form never handles `undefined`.
- **`fieldErrors` is keyed by the schema's own field names**, so `fieldErrors.titel` is a type error.
- **`formError`** is for failures that belong to no field — "Not found", "Could not save. Try again." It's always a literal we wrote, never derived from an `Error`.
- **`values` echoes the submitted text back.** React 19 resets an uncontrolled `<form action>` after the action finishes, whatever it returned, so without this a validation error wipes what the user typed. Inputs read `defaultValue={values.title}`.
- **`data`** carries anything the UI needs after success (a new id, the normalised handle). It must be serialisable and shaped for the UI — never a Mongoose document (`database.md` §6).

### 4.2 Helpers

```ts
// src/lib/validation/result.ts (continued)
const NEVER_ECHO = new Set(["password", "confirmPassword"]);

function echo<TInput>(
  formData: FormData,
): Partial<Record<FieldName<TInput>, string>> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !NEVER_ECHO.has(key)) values[key] = value;
  }
  return values as Partial<Record<FieldName<TInput>, string>>;
}

export function validationError<TInput>(
  error: z.ZodError<TInput>,
  formData: FormData,
): ActionResult<TInput, never> {
  const { formErrors, fieldErrors } = z.flattenError(error);
  return {
    status: "error",
    fieldErrors,
    formError: formErrors[0],
    values: echo<TInput>(formData),
  };
}

export function fieldError<TInput>(
  field: FieldName<TInput>,
  message: string,
  formData: FormData,
): ActionResult<TInput, never> {
  const fieldErrors: FieldErrors<TInput> = {};
  fieldErrors[field] = [message];
  return { status: "error", fieldErrors, values: echo<TInput>(formData) };
}

export function formError<TInput>(
  message: string,
  formData: FormData,
): ActionResult<TInput, never> {
  return {
    status: "error",
    fieldErrors: {},
    formError: message,
    values: echo<TInput>(formData),
  };
}
```

Passwords are never echoed back — they'd round-trip through the RSC payload for nothing. The `as` in `echo` is confined to the one place that builds the record from `FormData` (`coding-standards.md` §2).

### 4.3 Rendering inline

```tsx
// src/components/editor/link-form.tsx
"use client";

import { useActionState } from "react";

import { updateLink } from "@/app/(dashboard)/editor/_actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { idle } from "@/lib/validation";

type LinkFormProps = {
  link: { id: string; title: string; url: string };
};

export function LinkForm({ link }: LinkFormProps) {
  const [state, formAction, pending] = useActionState(updateLink, idle);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : {};
  const formMessage =
    state.status === "error"
      ? (state.formError ?? errors.linkId?.[0])
      : undefined;

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="linkId" value={link.id} />
      <TextField
        label="Title"
        name="title"
        defaultValue={values.title ?? link.title}
        error={errors.title?.[0]}
      />
      <TextField
        label="URL"
        name="url"
        defaultValue={values.url ?? link.url}
        error={errors.url?.[0]}
      />
      {formMessage && <p role="alert">{formMessage}</p>}
      <Button type="submit" disabled={pending}>
        Save
      </Button>
    </form>
  );
}
```

- **Show the first message per field.** Zod may report several; one at a time is the readable version.
- **Accessibility is the field component's job** (`ui.md` §4.3): when `error` is set, `TextField` renders the message below the input, sets `aria-invalid`, and points `aria-describedby` at the message. The form-level message uses `role="alert"` so it's announced. The `error` prop is specified in `ui.md` §1.4.
- **A field error with no visible field** — a hidden `linkId` that failed `objectIdSchema` — would render nowhere, so the form falls back to it in the form-level slot, as `formMessage` does above.
- `noValidate` turns off the browser's own bubbles so the server's messages are the only ones shown; drop it if you'd rather keep native `required` / `type="url"` hints as a first pass.

### 4.4 Client-side validation is a courtesy

A Client Component may run the same schema on blur or change for instant feedback — that's why `lib/validation` is client-safe. It changes nothing on the server: the action validates again, every time, because the action is reachable without the form. Never skip server validation because "the form already checked".

---

## 5. Unexpected errors

### 5.1 Throw, and let the boundary catch it

Anything you can't turn into a meaningful message for the user is thrown, as a real `Error` (`coding-standards.md` §7). It propagates to the nearest `error.tsx` — for an action, the boundary around the component that called it; for a render, the boundary around the segment (`routing.md` §5 has the nesting rules).

- **Write the message for whoever reads the logs**, not for the user — they never see it in production. Include the ids that locate the problem: ``throw new Error(`Profile ${profileId} has no owner`)``. Ids yes; emails, tokens, and passwords no — the message still ends up in the log.
- **Wrap with `cause` when you add context** — `throw new Error("Could not publish profile", { cause: error })` — so the original stack survives.
- **Catch only to add context or to recover.** A catch that converts an unexpected error into a result, or logs and rethrows unchanged, is wrong (§1, `coding-standards.md` §7). Put `unstable_rethrow(error)` first in any catch that could wrap a `redirect()` / `notFound()`.

### 5.2 `error.tsx`

```tsx
// src/app/(dashboard)/error.tsx
"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function DashboardError({ error, retry }: DashboardErrorProps) {
  useEffect(() => {
    console.error(error); // browser console only; the server already logged it (§6)
  }, [error]);

  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <p>We couldn&apos;t load this page. Try again in a moment.</p>
      {error.digest && <p>Reference: {error.digest}</p>}
      <button type="button" onClick={() => retry()}>
        Try again
      </button>
    </div>
  );
}
```

- **Fixed copy only. Never render `error.message`.** In production a server error's message has already been replaced by a generic string — but in development it's the real message, and an error thrown in client code is never sanitised. Rendering it is a habit that leaks the first time either happens.
- **Show the digest.** It's an opaque hash, safe to display, and it's the key that matches a user's report to the server log line from §6.
- **`retry`, not `reset`** — `retry` re-fetches the segment; `reset` can't recover a server error (`routing.md` §5).
- The copy and the styled version are **TBD** in `ui.md` — this is the structure, not the design.

---

## 6. Logging

Unexpected errors are logged **on the server**, once, with enough context to find and reproduce the failure.

### 6.1 One sink: `onRequestError`

Every error that escapes a Server Component render, a Server Action, a Route Handler, or the proxy passes through `onRequestError` in `src/instrumentation.ts`. That's where it gets logged — not in each action, and not in `error.tsx`.

```ts
// src/instrumentation.ts
import type { Instrumentation } from "next";

import { logError } from "@/lib/logger";

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  logError("request.failed", error, {
    digest: getDigest(error),
    method: request.method,
    path: request.path.split("?")[0], // query strings can carry tokens
    routePath: context.routePath, // e.g. /(dashboard)/editor
    routeType: context.routeType, // render | route | action | proxy
  });
};

function getDigest(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "digest" in error
    ? String(error.digest)
    : undefined;
}
```

- **The digest ties the two halves together.** The user sees `Reference: 3f9a…` in `error.tsx`; the log line carries the same digest alongside the full message and stack.
- **`request.headers` is not logged.** It contains the session cookie.
- `onRequestError` only sees **server** errors. Errors thrown in the browser reach `error.tsx` and its `console.error` and nothing else — client-side error reporting is **TBD**.

### 6.2 `logError`

```ts
// src/lib/logger.ts
import "server-only";

type LogContext = Record<string, string | number | boolean | null | undefined>;

export function logError(
  event: string,
  error: unknown,
  context: LogContext = {},
): void {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      ...context,
      error: serialise(error),
    }),
  );
}

function serialise(error: unknown): unknown {
  if (error === undefined) return undefined;
  if (!(error instanceof Error)) return { value: String(error) };
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: serialise(error.cause),
  };
}
```

- **All server logging goes through this function**, so replacing `console` with a real logger or a reporting service is a one-file change. Which one is **TBD**.
- **`LogContext` takes primitives only, on purpose.** You can't pass `formData`, a Mongoose document, or `request.headers` without picking out the fields you mean — which is the moment to notice you're about to log a password or a cookie.
- **Event names** are dotted and stable — `request.failed`, `link.recordClick.failed` — so they can be searched and alerted on.

### 6.3 What goes in a log line

| Include                                               | Never include                                     |
| ----------------------------------------------------- | ------------------------------------------------- |
| the error's name, message, stack, and `cause` chain   | passwords, even hashed                            |
| the digest                                            | session tokens, cookies, `request.headers`        |
| route, method, path without query string, `routeType` | full `FormData` or request bodies                 |
| `userId` and the ids of the rows involved             | emails and other personal data — log the `userId` |
| the action or query name                              | environment variables, connection strings         |

### 6.4 When you do log at a catch site

Only when you catch an unexpected error **and handle it** rather than rethrowing — so it never reaches `onRequestError`. The typical case is a best-effort side effect whose failure shouldn't fail the request:

```ts
try {
  await recordClick(linkId);
} catch (error) {
  logError("link.recordClick.failed", error, { linkId });
  // the redirect to the link still happens — the click count is best-effort
}
```

If you rethrow, don't log — `onRequestError` will, and you'll get the error twice. **Validation failures are not logged at all**: they're expected, and logging them is noise.

---

## 7. Never expose raw errors

The client may see three things about a failure: a message **we wrote** (from a schema or a `formError` literal), fixed `error.tsx` copy, and a digest. Nothing else. The ways that rule gets broken:

| Leak path                                                                                                   | Guard                                                                               |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `formError: error.message` in an action result                                                              | `formError` is always a literal (§4.1)                                              |
| a Server Component catches an error and passes `error.message` down as a prop                               | don't — let it throw, or render fixed copy                                          |
| `error.tsx` renders `error.message`                                                                         | fixed copy plus digest (§5.2)                                                       |
| a Route Handler returns `error.message` or `String(error)` — Next does **not** sanitise responses you build | `NextResponse.json({ error: "Internal error" }, { status: 500 })`, after `logError` |
| a Route Handler returns Zod issues on a `400`                                                               | generic body; the issues are for logs, not for whoever is probing the endpoint      |
| a raw Mongoose `ValidationError` or duplicate-key message mapped into form state                            | Zod produces user-facing messages; `lib/db` returns outcomes, not errors (§3)       |
| testing only in `next dev`, where real messages and stacks are shown                                        | check error UX with `npm run build && npm start` before calling it done             |

---

## 8. Open conflict: the handle rule

`database.md` §4 and `ui.md` §1.3 still disagree on what a valid handle is:

| Source                               | Characters             | Length |
| ------------------------------------ | ---------------------- | ------ |
| `database.md` §4 (Mongoose)          | `^[a-z0-9][a-z0-9-]*$` | 2–30   |
| `ui.md` §1.3 (ClaimInput, on change) | `[a-z0-9._]`           | ≤ 24   |

**TBD** — pick one. `handleSchema`, the Mongoose `match` / `minlength` / `maxlength`, and the `ClaimInput` sanitiser must all agree, and the sanitiser should be derived from `handleSchema` rather than written separately. §2.3 uses the database version as a placeholder.

---

## 9. Checklist for a new action or form

1. `requireUserId()` first, then `schema.safeParse` — both before any `lib/db` call?
2. The schema lives in `lib/validation` (or next to its only caller), with a custom message on every user-facing check?
3. Every string and array bounded; URLs restricted to `http`/`https`; ids validated as ObjectIds?
4. Returns an `ActionResult` on every path except a throw — no `parse`, no thrown `ZodError`?
5. Expected database outcomes (`null`, `"taken"`) mapped to results, and nothing else caught?
6. No `error.message`, `String(error)`, or Zod issue list in anything sent to the client?
7. The form echoes `values` back, never echoes passwords, and wires field errors through the field component?
8. Any catch that handles an error without rethrowing logs it through `logError` — with ids, without personal data?
9. The segment has an `error.tsx` (or deliberately bubbles to the parent's) showing fixed copy and the digest?

---

## 10. Not decided yet

| Item                                                                 | Status                                                           |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Logging backend: stay on structured `console`, or a logger / service | **TBD** — `lib/logger.ts` is the seam either way                 |
| Client-side error reporting (errors `onRequestError` can't see)      | **TBD**                                                          |
| The canonical handle pattern and length                              | **TBD** — §8                                                     |
| Reserved-handle list                                                 | **TBD** — `database.md` §4; it belongs in `handleSchema`         |
| Password and email rules                                             | **TBD** — `ui.md` §2.3; they'll live in `lib/validation/auth.ts` |
| `error.tsx` copy and design                                          | **TBD** — `ui.md`                                                |
| Whether `onRequestError` also alerts, and on which events            | **TBD**                                                          |
