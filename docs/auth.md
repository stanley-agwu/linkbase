# Linkbase — Auth & Access Control

NextAuth (Auth.js) handles sign-in, sessions, and the security plumbing that goes with them. Read this before adding a route, a Server Action, or anything that reads a user id.

Depends on `database.md` (the `userId` scoping rule is the third layer here) and `architecture.md` (where files go). Undecided items are marked **TBD**.

> Not installed yet: `npm i next-auth`. This doc is the target shape, not current code.

---

## 1. What NextAuth owns

Sign-in flows, session issuing and verification, cookie handling, CSRF tokens, and the OAuth dance. We don't hand-roll any of it — no custom JWT signing, no bespoke cookie writing, no password comparison outside the provider.

| Concern                                                               | Owner                             |
| --------------------------------------------------------------------- | --------------------------------- |
| Credential + OAuth sign-in                                            | NextAuth providers                |
| Session token: issue, verify, rotate                                  | NextAuth                          |
| Session cookie flags (`httpOnly`, `Secure`, `SameSite`, path, expiry) | NextAuth defaults                 |
| CSRF on auth endpoints                                                | NextAuth                          |
| CSRF on Server Actions                                                | Next.js (Origin/Host check)       |
| "Who is this request?" inside the app                                 | `lib/auth`                        |
| "Does this row belong to them?"                                       | `lib/db`, via the `userId` filter |

What we add is thin: a `lib/auth` wrapper so the rest of the app never imports NextAuth directly, and the enforcement rules in §3.

### Files

```
auth.ts                              # NextAuth config — providers, callbacks, session strategy
proxy.ts                             # route-level gate (see §4)
src/app/api/auth/[...nextauth]/route.ts   # NextAuth's handlers
src/lib/auth/
  index.ts                           # verifySession, requireUserId, getCurrentUser
```

`auth.ts` sits at the project root and exports `{ handlers, auth, signIn, signOut }`. The route handler re-exports `handlers`. Everything else in the app goes through `lib/auth`.

### Environment

| Variable                                | Notes                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_SECRET`                           | signs/encrypts the session token. `openssl rand -base64 32`. Required in production; different per environment            |
| `AUTH_URL`                              | canonical origin; needed when the deployment can't infer it                                                               |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | the Google provider (`ui.md` §2.3 step 2 shows "Continue with Google")                                                    |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`    | only for multi-instance self-hosting — must be the same across instances, or encrypted action closures break between them |

All in `.env.local` for development, never committed.

### Session strategy

Providers, per `ui.md` §2.3: email + password, and Google.

A credentials provider constrains this — **it requires the JWT session strategy**; database sessions aren't available for credential sign-ins even with an adapter configured. So: JWT sessions, with the user id in the token, and `userId` on every row (`database.md` §4) as the durable link to data.

Consequence worth knowing: a JWT session can't be revoked server-side before it expires. Sign-out clears the cookie, but a stolen token stays valid until expiry. That argues for a short session lifetime and, if we ever need real revocation, a `sessionVersion` on the user that the `jwt` callback checks. Session lifetime: **TBD**.

If we add the `@auth/mongodb-adapter` (for OAuth account linking or verification tokens), note it takes a raw `MongoClient`, not a Mongoose connection. Don't open a second pool for it — reuse Mongoose's underlying client via `mongoose.connection.getClient()` after `connectToDatabase()`, so the single cached connection in `database.md` §2 stays single. Whether we need the adapter at all: **TBD**.

Password hashing (bcrypt or argon2, and the cost factor): **TBD** — but it happens in the credentials provider's `authorize`, and the hash never leaves the server.

---

## 2. The session helper

`lib/auth/index.ts` is the only thing the app calls. Two functions, two different jobs:

```ts
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** The session, or null. For code that renders differently when signed out. */
export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { userId: session.user.id };
});

/** The user id, or a redirect. For anything that must not run unauthenticated. */
export async function requireUserId(): Promise<string> {
  const session = await verifySession();
  if (!session) redirect("/login");
  return session.userId;
}
```

- **`cache()`** memoises the session for the duration of one render pass, so a page plus three components reading it cost one verification, not four.
- **`"server-only"`** makes a Client Component import a build error. Client Components get session data as props from a Server Component parent — never by importing this.
- **`requireUserId()` returns the id, not a boolean.** A check that returns `true` can be ignored; a function that hands you the id you need for the query can't be. The id used in queries is therefore always the one that was verified.
- **In a Server Action, `redirect()` is the wrong response** to a missing session — there's no page to land on. Actions throw instead (§5).

Don't `await` the session at the top of a layout if only part of the shell needs it — it holds `{children}` behind that work. Push it into the component that renders the user menu and wrap that in `<Suspense>`.

---

## 3. Three layers, and which one is the security boundary

| Layer                            | Enforces                                                                           | Is it the boundary?               |
| -------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------- |
| `proxy.ts`                       | routing — unauthenticated requests to `(dashboard)` routes get bounced to `/login` | **No.** UX and a cheap pre-filter |
| Server Action / Server Component | identity — who is this request, via `lib/auth`                                     | **Yes**                           |
| `lib/db` query                   | ownership — `userId` in every filter                                               | **Yes**, and the last word        |

The proxy is **not** a security boundary, and nothing should rely on it alone. It's one centralised redirect that runs before the request reaches a page; the checks that actually protect data sit next to the data. Both of the lower layers must hold even if the proxy were deleted.

Equally: **a layout is not a gate.** Layouts don't re-render on client-side navigation, and a layout doesn't control whether its child segments render — the router renders them independently, and they appear in the RSC payload regardless of what the layout returns. An auth check in `(dashboard)/layout.tsx` is a convenience, not protection. Check in the page, the component that renders sensitive data, or (best) the data layer that every path goes through.

---

## 4. Route protection

> Next.js 16 renamed Middleware to **Proxy**. The file is `proxy.ts` at the same level as `app` (so `src/proxy.ts` here), and the export must be `proxy` or a default export. Functionality is unchanged.

Everything under `app/(dashboard)/*` requires a session. The public profile is open to everyone.

| Route               | Access                                                           |
| ------------------- | ---------------------------------------------------------------- |
| `/`                 | public — marketing landing                                       |
| `/login`, `/signup` | public; redirect to the dashboard when already signed in         |
| `/user/[handle]`    | **public** — the whole point of the product                      |
| `/api/auth/*`       | public — NextAuth's own endpoints                                |
| `/(dashboard)/*`    | **authenticated** — editor, appearance, analytics                |
| anything new        | authenticated, unless it's deliberately added to the public list |

Default-deny: the proxy's rule is "protected unless listed public", not "public unless listed protected". A new dashboard route is protected the moment it exists, with nobody having to remember to add it.

```ts
// src/proxy.ts
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup"];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/user/") || // public profiles
    pathname.startsWith("/api/auth/") // NextAuth endpoints
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  // Read the session from the cookie only — an optimistic check.
  // No database reads here: the proxy runs on prefetches too.
  const session = await readSessionCookie(request);

  if (!session) {
    const url = new URL("/login", request.nextUrl);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)",
  ],
};
```

Notes on the above:

- **Cookie read only, no database query.** The proxy runs on every matched request _including prefetches_, so a DB round-trip here is a performance problem, and it's redundant — the real check happens at the data layer. (Next 16 runs the proxy on the Node runtime, so a DB call would work; it still shouldn't.)
- The `next` parameter preserves where the user was heading so login can return them there. Validate it on use — only accept same-origin relative paths, or an open redirect walks in.
- The matcher excludes static assets, not routes. Auth logic stays in the function, where it's readable; the matcher is just there to avoid running on `_next/*`.
- `readSessionCookie` is the NextAuth-provided session read (v5 also lets you wrap the whole proxy with its `auth` helper). Pin the exact form against the installed Auth.js version when wiring it up — the v5 surface has moved around, and this is the one line worth verifying rather than copying.

Route group naming: the protected group is `(dashboard)` and the public profile is `/user/[handle]` — these supersede the `(app)` / `[username]` placeholders in `architecture.md`, which has been updated to match.

### The public profile

`/user/[handle]` is rendered with no session, for visitors who have none. Per `database.md` §5 it's the one unscoped read, and it must project only what the page shows: display name, bio, theme, and visible links. Never `userId`, never the email, never an unpublished profile. A field added to the profile schema is not public until it's deliberately added to that projection.

---

## 5. Identity in Server Actions

**Treat every Server Action as a public HTTP endpoint.** It is one: actions are reachable by direct POST, with no form, no page load, and no UI involved. Rendering a form only on an authenticated page gates the button, not the endpoint.

Every action begins by establishing identity on the server, and that id is what reaches the query:

```ts
"use server";

import { refresh } from "next/cache";

import { requireUserId } from "@/lib/auth";
import { updateLinkTitle } from "@/lib/db";
import {
  type ActionResult,
  formError,
  type RenameLinkInput,
  renameLinkSchema,
  validationError,
} from "@/lib/validation";

export async function renameLink(
  _previous: ActionResult<RenameLinkInput>,
  formData: FormData,
): Promise<ActionResult<RenameLinkInput>> {
  const userId = await requireUserId(); // 1. server-side identity

  const parsed = renameLinkSchema.safeParse(Object.fromEntries(formData)); // 2. validate input
  if (!parsed.success) return validationError(parsed.error, formData);

  const { linkId, title } = parsed.data;
  const link = await updateLinkTitle(userId, linkId, title); // 3. ownership in the filter
  if (!link) return formError("Not found", formData); // 4. no such row *for you*

  refresh();
  return { status: "success", data: null };
}
```

Validation, the `ActionResult` type, and its helpers are specified in `errors-and-validation.md` §2–4.

The rules:

- **The user id comes from the session, never from the request.** Not a form field, not a hidden input, not a prop, not an argument. A `userId` parameter that a client can set is the bug this entire document exists to prevent.
- **The client may say _which_ row, never _whose_.** An id plus the user's intended change is legitimate input; ownership is not. Re-read everything else from a trusted source using the session id.
- **Schema validation is not authorisation.** Zod proves the shape is `{ linkId: string }`. It says nothing about who owns that link. Both checks are needed, and they're different checks.
- **Ownership lives in the query filter**, not in an `if` after the fetch — `updateLinkTitle(userId, …)` puts `userId` in the `findOneAndUpdate` filter, so a forged id matches zero documents (`database.md` §5). There's no fetch-then-check window to get wrong.
- **Don't distinguish "doesn't exist" from "isn't yours."** Both are "Not found". A different message confirms the row exists and leaks whether a given id is real.
- **Shape the return value.** Action results are serialised to the client — an `ActionResult` whose `data` is what the UI renders, never a database record or an error message.

Same for Route Handlers (webhooks and OAuth callbacks per `architecture.md` §3): check the session, return `401` when absent and `403` when present but not permitted. Webhooks authenticate by signature instead — **TBD** when we have one.

### What Next.js already does

Framework-level, no configuration needed:

| Protection           | Effect                                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSRF check           | the request's `Origin` is compared against `Host` / `X-Forwarded-Host`; mismatches are rejected. Behind a proxy or CDN domain, set `serverActions.allowedOrigins` |
| Body size limit      | action payloads capped at 1MB by default (`serverActions.bodySizeLimit`)                                                                                          |
| Encrypted action IDs | action references are encrypted at build time, and unused Server Functions are stripped from client bundles, so they have no reachable public endpoint            |
| Closure encryption   | variables captured by an inline action are encrypted before being sent to the client                                                                              |

None of these are authorisation. They close off transport-level attacks; the checks in this section are still entirely on us.

Optional: with `experimental.authInterrupts` enabled in `next.config.ts`, actions and components can throw `unauthorized()` / `forbidden()` from `next/navigation` and Next renders `unauthorized.tsx` / `forbidden.tsx`. It's experimental and currently off — adopting it is a **TBD**, and until then actions return error state and components use `redirect()`.

---

## 6. Checklist for a new route or action

New route:

1. Does it live under `(dashboard)`? Then it's protected by the proxy's default-deny — nothing to add.
2. Is it deliberately public? Add it to `PUBLIC_PATHS` (or the prefix list) and say why in the PR.
3. Does the page or its data layer check identity itself, independent of the proxy?
4. If it renders public data, is the projection explicit?

New action:

1. First line `const userId = await requireUserId()`?
2. Is every id used in a query either from the session or from input that's scoped by `userId`?
3. Is there any `userId` coming from the client? (There must not be.)
4. Input validated with `schema.safeParse`, and an `ActionResult` returned (`errors-and-validation.md` §9)?
5. "Not found" for both missing and not-yours?
6. Does it revalidate or refresh what it changed?

---

## 7. Not decided yet

| Item                                                             | Status                                                      |
| ---------------------------------------------------------------- | ----------------------------------------------------------- |
| Session lifetime and refresh behaviour                           | **TBD**                                                     |
| Password hashing algorithm and cost                              | **TBD**                                                     |
| Email verification flow                                          | **TBD**                                                     |
| Password reset flow                                              | **TBD**                                                     |
| Rate limiting on sign-in, signup, and handle-availability checks | **TBD** — none today; sign-in is brute-forceable without it |
| Whether the MongoDB adapter is needed                            | **TBD** (§1)                                                |
| Server-side session revocation                                   | **TBD** — not possible with JWT sessions as specified       |
| Account deletion / data export                                   | **TBD**                                                     |
| Content Security Policy                                          | **TBD**                                                     |
