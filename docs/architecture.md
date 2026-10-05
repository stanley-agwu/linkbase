# Linkbase — Architecture

How the app is laid out and the rules for where code goes. Read this before adding a file, a route, or a data-access path. Styling decisions live in `design-system.md`; component props and page layouts live in `ui.md`; the data layer is detailed in `database.md` and access control in `auth.md`.

Anything the project hasn't decided yet is marked **TBD** — don't invent it, ask.

---

## 1. Rendering model

**Server Components are the default.** Pages, layouts, and anything that reads data render on the server. Client Components are an opt-in, used only where the browser is actually required.

Reach for a Client Component (`"use client"` at the top of the file, above imports) only when the component needs:

- state or event handlers (`useState`, `onClick`, `onChange`)
- effects / lifecycle (`useEffect`)
- browser-only APIs (`window`, `localStorage`, `navigator.clipboard`)
- a custom hook that depends on any of the above

Everything else stays on the server: data reads, secrets, and markup that never changes after paint.

### Boundary rules

- **Push the boundary down.** Make the interactive leaf the Client Component, not the page that contains it. A profile page is a Server Component that renders `<ShareBar />` (client) and `<LinkRow />` (client), not a client page wrapping static markup.
- **Server → client data flows as props**, and props must be serialisable. Never pass a database row with methods on it, a DB client, or a class instance across the boundary — map it to a plain object first.
- **Client Components can't import server-only modules.** `lib/db` and `lib/auth` are server-only; importing them from a `"use client"` file is a build error, not a runtime one. Pass the data in, or call a Server Action.
- `"use client"` is **transitive** — every module imported by a Client Component joins the client bundle. Keep the directive on small files.
- Route props come from the generated globals `PageProps<"/path">` and `LayoutProps<"/path">` (see `CLAUDE.md`). `params` and `searchParams` are Promises in this Next major — `await` them.

### Data fetching

Read data directly in the Server Component that renders it, through `lib/db`. No client-side fetching layer, no `useEffect` fetches, no API route in front of our own database. Scoping, caching, tags, and invalidation are specified in `data-fetching.md`.

Wrap slow, request-time reads in `<Suspense>` with a fallback so the shell streams. Keep the data read next to where it's used — co-locating the read with the component is cheaper than lifting it and threading props.

Caching: `cacheComponents` is **not** enabled in `next.config.ts` yet. If we turn it on, cached work is marked with `"use cache"` plus an explicit `cacheLife(...)` profile, and uncached request-time work goes behind `<Suspense>`. Until then don't sprinkle `"use cache"` — it changes rendering semantics project-wide and is a deliberate decision, not a per-file one. Database reads are cached with `unstable_cache` in the meantime (`data-fetching.md` §3).

---

## 2. Directory layout

Application code lives under `src/`. `src/app` is for routing and nothing else: route files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`), metadata files, and the route group folders that organise them. Shared code lives in `src/lib` and `src/components`.

```
src/
  app/
    (marketing)/            # route group — landing, not in the URL
      page.tsx
    (dashboard)/            # authenticated shell — protected by default, see auth.md
      editor/
        page.tsx
    user/
      [handle]/             # public profile — open to everyone
        page.tsx
    layout.tsx              # root layout: fonts, <html>, <body>
    globals.css
  components/
    ui/                     # primitives — no feature knowledge
      button.tsx
      claim-input.tsx
      text-field.tsx
      toggle.tsx
      chip.tsx
    marketing/              # feature components
      feature-card.tsx
      cta-panel.tsx
    profile/
      profile-link.tsx
      portrait.tsx
    editor/
      link-row.tsx
      share-bar.tsx
  lib/
    db/                     # database client + queries
      index.ts
    auth/                   # session + authorisation helpers
      index.ts
    types/                  # shared types
      index.ts
    validation/             # Zod schemas + ActionResult — client-safe
      index.ts
    logger.ts               # logError — server-only
  instrumentation.ts        # onRequestError — the server error log sink
```

### `components/ui` — primitives

Generic, reusable, no feature knowledge: no imports from `lib/db`, no awareness of what a "link" or a "profile" is. Props in, markup out. `ui.md`'s `actions/`, `forms/`, `navigation/`, and `brand/` groups all land here.

A primitive is a Server Component unless it owns interaction state. `Button` is server-renderable; `Toggle` and `ClaimInput` are client.

### `components/[feature]` — feature components

Components that know about a domain concept, grouped by feature (`marketing`, `profile`, `editor`). `ui.md`'s `marketing/`, `profile/`, and `editor/` groups map 1:1.

Feature components compose primitives. They may read data (when server) and may call Server Actions. Import direction is one-way: **feature → ui**, never the reverse, and never feature → another feature. If two features need the same piece, it's a primitive — move it to `ui`.

A component used by exactly one route may be co-located in that route segment under a private folder (`app/editor/_components/`), which is opted out of routing. Promote it to `components/[feature]` the moment a second route needs it.

### `lib` — shared non-UI code

Each concern gets its own folder:

| Folder           | Holds                                                             | Notes                                                                                     |
| ---------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `lib/db`         | the database client and the queries that use it                   | server-only; one shared client instance, never instantiated per request                   |
| `lib/auth`       | session reads, the current-user helper, authorisation checks      | server-only; the single source of truth for "who is this request"                         |
| `lib/types`      | types shared across features                                      | types only — no runtime code, no values                                                   |
| `lib/validation` | Zod schemas for every action's input, and the `ActionResult` type | client-safe — imports nothing from `lib/db` or `lib/auth` (`errors-and-validation.md` §2) |

Anything else shared and non-UI (formatters, constants) goes in a named file at `lib/`'s root, e.g. `lib/format-url.ts` or `lib/logger.ts`. Don't create a `lib/utils.ts` dumping ground.

Import direction: `app` → `components` → `lib`. `lib` imports nothing from `components` or `app`.

Database vendor and client library: **TBD**. Auth provider: **TBD**. Whatever is chosen, the rest of the app only ever sees `lib/db` and `lib/auth` — nothing else imports the vendor SDK directly, so swapping it stays a one-folder change.

---

## 3. Server Actions

Mutations are Server Actions, not route handlers. A feature's actions live in a dedicated module with `"use server"` at the top of the file — `lib/db/actions.ts` for shared ones, or `app/editor/_actions.ts` when they belong to one route.

Rules:

- **Verb-first names**: `createProfile`, `updateLinkOrder`, `deleteLink`, `claimUsername`, `publishProfile`. Not `profileCreate`, not `handleSubmit`, not `linkAction`.
- **Every action re-checks auth.** Actions are reachable by direct POST, not only through our UI. Start every one with the `lib/auth` session check and verify the caller owns the row it's touching — the client being hidden is not authorisation.
- **Validate input.** `FormData` values are untrusted strings. `safeParse` them with a Zod schema from `lib/validation` before they reach `lib/db`.
- **Return an `ActionResult`** for expected failures (invalid field, not found, handle taken) — never throw them. Throw only for genuinely exceptional cases, and let `error.tsx` catch them. Both are specified in `errors-and-validation.md`.
- **Refresh the UI explicitly** after a mutation — `revalidatePath` / `revalidateTag` for cached data, `refresh()` from `next/cache` for the current route, `redirect` when the user should move on. A mutation that leaves stale UI on screen is a bug.
- Actions may be passed to Client Components as props, which is how a client leaf mutates without importing server-only modules.

Route handlers (`app/.../route.ts`) are for things that genuinely need an HTTP endpoint — webhooks, OAuth callbacks, OG image generation. Not for our own forms.

---

## 4. Naming

| Thing                | Convention                  | Example                                                      |
| -------------------- | --------------------------- | ------------------------------------------------------------ |
| Files and folders    | kebab-case                  | `claim-input.tsx`, `lib/format-url.ts`, `components/editor/` |
| Components           | PascalCase                  | `ClaimInput`, `ProfileLink`, `ShareBar`                      |
| Server Actions       | verb-first camelCase        | `createProfile`, `deleteLink`                                |
| Functions, variables | camelCase                   | `getCurrentUser`, `linkCount`                                |
| Types and interfaces | PascalCase                  | `Profile`, `LinkRecord`                                      |
| Constants            | SCREAMING_SNAKE_CASE        | `MAX_LINKS`                                                  |
| Route folders        | Next conventions, lowercase | `[username]`, `(marketing)`, `_components`                   |

So the file name and the export differ by case, deliberately: `components/ui/claim-input.tsx` exports `ClaimInput`.

Other conventions:

- **Named exports** for components, so the import name matches the declaration. `page.tsx` and `layout.tsx` are the exception — Next requires a default export.
- One component per file, named after the file.
- Imports use the `@/*` alias (`@/components/ui/button`), not relative traversal. Relative imports only within the same folder.
- A file that is a Client Component says so on line 1.

---

## 5. Where does this go?

| You're adding…                            | Put it in                                  |
| ----------------------------------------- | ------------------------------------------ |
| A page or route                           | `app/<segment>/page.tsx`                   |
| A generic, reusable visual element        | `components/ui/<name>.tsx`                 |
| Something that knows about profiles/links | `components/<feature>/<name>.tsx`          |
| Something only one route uses             | `app/<segment>/_components/<name>.tsx`     |
| A read query                              | `lib/db` (or the feature's `queries.ts`)   |
| A write                                   | a Server Action, verb-first, auth-checked  |
| A type two features share                 | `lib/types`                                |
| A session or permission check             | `lib/auth`                                 |
| A webhook or OAuth callback               | `app/<segment>/route.ts`                   |
| A design token                            | `app/globals.css` (see `design-system.md`) |
