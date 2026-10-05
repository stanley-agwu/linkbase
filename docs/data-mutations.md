# Linkbase — Data Mutations

How writes happen: Server Actions only, what every action does in what order, and how the UI is brought up to date afterwards. Read this before writing anything that changes data.

Scope: the write path. `data-fetching.md` is the mirror image of this doc and owns reads and the cache. `errors-and-validation.md` owns the Zod schemas and the `ActionResult` type an action returns; `auth.md` §5 owns the identity rules; `database.md` owns the query functions actions call. `architecture.md` §3 is the one-paragraph summary this doc expands. Anything undecided is marked **TBD**.

---

## 1. Server Actions, not API routes

**Every write goes through a Server Action.** No `app/api` route in front of our own database, and no `fetch("/api/...")` from a form.

An action is a function the framework exposes as a POST endpoint, called by name and type-checked from the component that uses it. A Route Handler is a public URL we would have to authenticate, CSRF-protect, parse, validate, and shape a response for by hand — strictly more work and strictly more surface, for the same write (`routing.md` §6).

`app/api` is reserved for things that genuinely need a URL: inbound webhooks and OAuth callbacks. Those write too, and §8 covers them.

### What the framework gives every action

| Protection                                  | What it does                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| CSRF check                                  | `Origin` compared against `Host` / `X-Forwarded-Host`; mismatches rejected      |
| Encrypted action ids, dead-code elimination | action references are encrypted at build; unused ones are stripped from bundles |
| Closure encryption                          | variables an inline action captures are encrypted before reaching the client    |
| 1MB body limit                              | `serverActions.bodySizeLimit` raises it                                         |

**None of this is authorisation**, and none of it validates anything. An action is reachable by direct POST with any payload, whether or not our UI ever renders the form (`auth.md` §5). The checks in §3 are entirely on us.

Self-hosting note: closure encryption needs `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to be stable across instances, or action references stop decrypting after a deploy. It only matters off Vercel, and the deployment target is **TBD**.

---

## 2. Where actions live

| Scope                        | File                                 |
| ---------------------------- | ------------------------------------ |
| Used by one route            | `app/(dashboard)/editor/_actions.ts` |
| Shared by two or more routes | `lib/db/actions.ts`                  |

`"use server"` goes at the top of the **file**, not on individual functions, so there's one place to look to know a module is a set of endpoints. Don't put the directive in `lib/db/queries` — those are plain functions, and marking them would expose every query as a POST endpoint (`database.md` §3).

- **Verb-first names**: `createLink`, `updateLink`, `deleteLink`, `reorderLinks`, `claimHandle`, `publishProfile`. Not `linkAction`, not `handleSubmit`, not `save`.
- **One action per user-visible operation.** Reordering is `reorderLinks`, not `updateLink` called in a loop by the client — the loop would be three round trips and three partial states.
- **Inline actions** (defined inside a Server Component) are fine for a trivial single-purpose form, but anything with validation belongs in an `_actions.ts` file where it can be read and reused.
- Actions can be passed to Client Components as props, which is how a client leaf mutates without importing server-only modules.

---

## 3. The five steps

Every action does the same five things, in this order:

```ts
// src/app/(dashboard)/editor/_actions.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { createLink as createLinkRow } from "@/lib/db";
import {
  type ActionResult,
  type CreateLinkInput,
  createLinkSchema,
  validationError,
} from "@/lib/validation";

export async function createLink(
  _previous: ActionResult<CreateLinkInput>,
  formData: FormData,
): Promise<ActionResult<CreateLinkInput>> {
  const userId = await requireUserId(); // 1. session

  const parsed = createLinkSchema.safeParse(Object.fromEntries(formData)); // 2. validate
  if (!parsed.success) return validationError(parsed.error, formData);

  const link = await createLinkRow(userId, parsed.data); // 3. scope + 4. write

  revalidatePath("/editor"); // 5. refresh affected views
  return { status: "success", data: link };
}
```

### 1. Session first

`const userId = await requireUserId()` is the first line of every action, before validation and before any query. It throws when there's no session — an action has no page to redirect to (`auth.md` §5).

First line, not "somewhere before the write": a validation branch that returns before the session check would tell an unauthenticated caller whether their payload was well-formed.

### 2. Validate with the matching schema

`schema.safeParse(...)` against the action's schema from `lib/validation`, named after the action (`createLink` → `createLinkSchema`). On failure, return immediately. `safeParse`, never `parse` — `parse` throws, and a thrown validation error replaces the form with an error page (`errors-and-validation.md` §1–2).

Nothing unvalidated reaches `lib/db`. That includes actions called with arguments rather than `FormData`: the parameter types are erased at runtime, so `reorderLinks(ids: string[])` validates `ids` like any other input.

### 3. Scope the query to the signed-in user

The id from step 1 is the query's first argument, and `lib/db` puts it in the **filter** — never in a post-fetch `if` (`database.md` §5):

```ts
Link.findOneAndUpdate({ _id: input.linkId, userId }, { ... });
```

A forged `linkId` then matches zero documents and the query returns `null`, which the action maps to `"Not found"`. There's no fetch-then-check window, and no path where the check is skipped but the write still lands.

**The client says which row, never whose.** A `userId` that arrives in `FormData`, as an argument, or as a hidden input is the bug this whole step exists to prevent. Keep it out of the schema entirely, so there's nothing to accidentally read.

### 4. Write

The write is one call into `lib/db`. Business rules live in the action; the query function does the write and nothing else.

- **Expected outcomes come back as values**, not exceptions: `null` for "no such row for you", `"taken"` for a duplicate handle. The query catches the duplicate-key error itself, so no action knows what `code === 11000` means (`database.md` §6).
- **Anything else throws** and reaches `error.tsx`, logged by `onRequestError`. No `try`/`catch` around the write (`errors-and-validation.md` §1).
- **Writes spanning two collections need a transaction** — creating a user plus profile, deleting a link plus its clicks. Transactions require a replica set (`database.md` §6); whether dev runs one is **TBD**.

### 5. Revalidate

See §5. Briefly: the action refreshes the view it was called from; `lib/db` clears the cache tags for the data it changed.

---

## 4. The return value

Actions **return** expected failures and **throw** unexpected ones. The type is `ActionResult`, specified in `errors-and-validation.md` §4:

| Outcome                                     | Return                                                   |
| ------------------------------------------- | -------------------------------------------------------- |
| Invalid input                               | `validationError(parsed.error, formData)`                |
| One field is the problem (handle taken)     | `fieldError("handle", "That handle is taken", formData)` |
| No field in particular (row not found)      | `formError("Not found", formData)`                       |
| Success                                     | `{ status: "success", data }`                            |
| No session, database down, broken invariant | throw                                                    |

- **Return `data` the UI needs, not the row.** Serialisable, shaped for rendering, no Mongoose documents (`database.md` §6).
- **Never put an error message in a result.** `formError` takes a literal we wrote (`errors-and-validation.md` §7).
- **"Not found" for both missing and not-yours.** A different message confirms the row exists.
- An action with nothing to report still returns `{ status: "success", data: null }` rather than `undefined`, so `useActionState` has a state to render.

---

## 5. Refreshing what changed

A write leaves two things stale: **cached data** anywhere in the app, and **the rendered page** the user is looking at. They're cleared by different calls, in different places.

### 5.1 The split

| Stale thing                          | Cleared by                                                 | Where                                                        |
| ------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------ |
| Cached public profile page           | `revalidateTag(cacheTags.publicProfile(h), { expire: 0 })` | inside the `lib/db` write function (`data-fetching.md` §3.4) |
| The route the action was called from | `revalidatePath(...)` / `refresh()`                        | the action, after the write                                  |
| Where the user should go next        | `redirect(...)`                                            | the action, last                                             |

Tag invalidation sits with the write so no caller can do one without the other. The view refresh sits in the action, because only the action knows which screen the user is on.

### 5.2 Which call

| Call                                         | Use it when                                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `revalidatePath("/editor")`                  | the route has cached data to drop, or you want one call that covers both cache and re-render        |
| `revalidatePath("/user/[handle]", "layout")` | a dynamic path — the `type` argument is **required** when the path has a dynamic segment            |
| `refresh()`                                  | the route has no cached data and only needs re-rendering — the precise call for our dashboard reads |
| `revalidateTag(tag, { expire: 0 })`          | cached data, keyed by something other than a path. Ours lives in `lib/db` (§5.1)                    |
| `redirect("/editor")`                        | the user should move on — **after** the revalidation calls                                          |

All of `revalidatePath`, `refresh`, and `updateTag` re-render the current route and ship the new RSC payload in the action's own response, so the change is on screen in one round trip. `revalidateTag` with a stale-while-revalidate profile deliberately skips that — which is why ours passes `{ expire: 0 }`.

`revalidatePath` is the default here. For the dashboard specifically, private reads aren't cached (`data-fetching.md` §3.1), so there's no cache entry for it to invalidate and `refresh()` is the more precise call; `revalidatePath("/editor")` is correct too, just broader. Either is fine — leaving the UI stale is not.

**Put revalidation before `redirect()`.** `redirect` works by throwing, so nothing after it runs.

```ts
await publishProfileRow(userId); // clears the public-profile tag internally
revalidatePath("/editor"); // the dashboard the user is on
redirect("/editor?published=1"); // last — throws
```

Don't wrap `redirect()` in a `try`/`catch` without `unstable_rethrow(error)` first, or the redirect is silently swallowed (`coding-standards.md` §7).

### 5.3 Don't over-revalidate

`revalidatePath` on a layout invalidates that layout, every nested layout, and every page beneath it. `revalidatePath("/", "layout")` after editing one link throws away the whole app's cached work. Name the narrowest path that actually changed.

---

## 6. Calling an action

### 6.1 From a form

The normal case: `<form action={formAction}>` with `useActionState`, which gives the result to render inline and a `pending` flag for the button. The full form example is in `errors-and-validation.md` §4.3.

Forms calling actions work before hydration, so a submit isn't lost on a slow connection. Keep the action's first argument as the previous state to preserve that.

### 6.2 Without a form

A toggle, a delete button, or a drag-to-reorder calls the action from an event handler inside a `startTransition`, so `pending` still works and the error surfaces:

```tsx
"use client";

const [pending, startTransition] = useTransition();

function onToggle(visible: boolean) {
  startTransition(async () => {
    const result = await setLinkVisibility(link.id, visible);
    if (result.status === "error")
      setMessage(result.formError ?? "Could not save");
  });
}
```

- **Check the result.** An action called this way returns its `ActionResult` to the caller — ignoring it means a failed write looks successful until the next page load.
- **Actions dispatch one at a time per client.** Three quick toggles queue; they don't race. Debounce anything that fires per keystroke.
- **Optimistic UI is `useOptimistic`**, reconciled by the re-render the action triggers. Don't keep a parallel client-side copy of server data.

### 6.3 Reads are not mutations

An action that only reads is still a POST endpoint that serialises behind every other action. Page data is read in Server Components (`data-fetching.md` §1). The one exception is an input-driven read like handle availability (`data-fetching.md` §5.1).

---

## 7. Destructive writes

- **Deletes are scoped like any write** — `deleteOne({ _id, userId })`, never `findByIdAndDelete`.
- **Confirm in the UI, not in the action.** The action does what it's asked; the confirm step is the component's job. Delete-confirm UX is **TBD** (`ui.md` §1.21).
- **Deleting a parent cleans up its children** in the same query function — deleting a link removes its clicks — so the action makes one call. That's a transaction case (§3.4).
- **Cascades on account deletion** (profile, links, clicks, session): **TBD** (`auth.md` §7).
- **Repeated submits.** Actions aren't idempotent by default: a double-submitted create makes two rows. Forms disable the button while `pending`, which covers the common case. Anything where a duplicate is costly needs a real idempotency key — **TBD**, nothing needs one yet.

---

## 8. Webhooks are the exception

Inbound webhooks and OAuth callbacks are Route Handlers (`routing.md` §6), and they write. They don't get a session, so the identity rules differ, but everything else holds:

1. **Authenticate by signature**, not by session — verify before reading the body. Provider and secret handling: **TBD** (`auth.md` §5).
2. **Validate the payload with Zod.** An external payload is as untrusted as a form, and returns `400` with a generic body on failure (`errors-and-validation.md` §2.1).
3. **Write through the same `lib/db` functions** actions use, so the tag invalidation comes along.
4. **Revalidate explicitly.** `revalidateTag` works in a Route Handler; `refresh()` and `updateTag` do not — they're Server-Action-only. An inbound change that affects a cached page and forgets its revalidation is a stale page nobody notices (`routing.md` §6).

---

## 9. Checklist for a new action

1. In an `_actions.ts` (or `lib/db/actions.ts`) with `"use server"` at the top of the file, named verb-first?
2. `requireUserId()` on the first line?
3. `schema.safeParse` next, with the matching schema — `safeParse`, not `parse`?
4. Is every id in the query either from the session or scoped by `userId` in the filter? Is there any `userId` from the client? (There must not be.)
5. One `lib/db` call for the write, no `try`/`catch` around it?
6. Expected outcomes returned as an `ActionResult`; "Not found" for both missing and not-yours?
7. Does the write's `lib/db` function clear the cache tags for what it changed?
8. Does the action revalidate the view it was called from — and is that before any `redirect()`?
9. Is the revalidated path the narrowest one that changed?
10. If it's called without a form, does the caller check the returned result?

---

## 10. Not decided yet

| Item                                                      | Status                                     |
| --------------------------------------------------------- | ------------------------------------------ |
| Transactions in development (needs a replica set)         | **TBD** — `database.md` §6                 |
| Rate limiting on actions (signup, sign-in, handle checks) | **TBD** — none today (`auth.md` §7)        |
| Idempotency keys for repeated submits                     | **TBD** — §7                               |
| Account deletion cascade                                  | **TBD** — `auth.md` §7                     |
| Webhook signature verification                            | **TBD** — §8                               |
| Delete-confirm / undo UX                                  | **TBD** — `ui.md` §1.21                    |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` handling             | **TBD** — depends on the deployment target |
