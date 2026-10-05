# Linkbase — Routing

The URL map, the route groups behind it, and which file conventions each segment owns. Read this before adding a route or an API endpoint.

`auth.md` owns access control and the proxy implementation — this doc says _which_ routes are protected, that one says _how_ and why the proxy isn't the security boundary. `architecture.md` owns where non-route code goes, `ui.md` what each page renders. Undecided items are marked **TBD**.

> **"Middleware" is `proxy.ts` here.** Next.js 16 deprecated and renamed the `middleware` file convention to `proxy`. Same functionality, same place in the request lifecycle, different filename and export name. The spec this doc was written from said "middleware"; the file to create is `src/proxy.ts`. See §4.

> Nothing in this doc is in the repo yet — `src/app` currently holds only the scaffolded root `layout.tsx` and `page.tsx`.

---

## 1. The route map

| URL              | File                              | Access            | Renders (`ui.md`) |
| ---------------- | --------------------------------- | ----------------- | ----------------- |
| `/`              | `(marketing)/page.tsx`            | **public**        | §2.2 landing      |
| `/login`         | `(auth)/login/page.tsx`           | **public**        | §2.3              |
| `/signup`        | `(auth)/signup/page.tsx`          | **public**        | §2.3 onboarding   |
| `/dashboard`     | `(dashboard)/dashboard/page.tsx`  | **authenticated** | §2.4              |
| `/add-links`     | `(dashboard)/add-links/page.tsx`  | **authenticated** | §2.4 Links tab    |
| `/user/[handle]` | `user/[handle]/page.tsx`          | **public**        | §2.5 profile      |
| `/api/auth/*`    | `api/auth/[...nextauth]/route.ts` | public            | — (NextAuth)      |

Unauthenticated requests to a protected route are redirected to `/login` with the original path preserved in `?next=`, so sign-in can return the user there (`auth.md` §4 — validate that param on use, or you've built an open redirect).

Anything not in this table is **authenticated by default**. Adding a public route means deliberately adding it to the proxy's public list and saying why in the PR.

---

## 2. Route groups

Three groups, none of which appear in the URL — a folder in parentheses is omitted from the path. `(dashboard)/dashboard/page.tsx` serving `/dashboard` is not a typo: the group is an organisational wrapper, the segment inside it is the URL.

| Group         | Holds                      | Exists because                                                                |
| ------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `(marketing)` | the landing page           | keeps the public shell (NavBar, Footer) off the app and auth pages            |
| `(auth)`      | `/login`, `/signup`        | a centred, chrome-free shell, and one place to bounce already-signed-in users |
| `(dashboard)` | `/dashboard`, `/add-links` | one authenticated shell, and the unit the proxy protects wholesale            |

Three things that follow from groups not affecting the URL:

- **The proxy needs no change when a group is added or renamed.** It matches on pathnames, and `(auth)` is invisible to it. `/login` and `/signup` are already in `auth.md`'s `PUBLIC_PATHS`; moving them into a group doesn't touch that list.
- **Only one group may own `/`.** `(marketing)/page.tsx` is the landing page; adding a `page.tsx` directly in another group at the same level resolves to the same path and is a build error.
- **Moving a route between groups changes its layout, not its URL.** That's the point, and it's also the trap: moving a page out of `(dashboard)` silently removes its shell _and_ its protection.

We keep the **single root layout** at `app/layout.tsx` (fonts, `<html>`, `<body>`). Per-group root layouts are possible — you'd delete the root one and give each group its own `<html>`/`<body>` — but that forfeits the shared font setup and gains nothing here. Group layouts nest inside the root layout instead.

---

## 3. The tree

```
src/
  proxy.ts                        # route gate — see §4
  app/
    layout.tsx                    # root: fonts, <html>, <body>
    globals.css
    not-found.tsx                 # app-wide 404
    global-error.tsx              # root-layout failures only — see §5

    (marketing)/
      page.tsx                    # /

    (auth)/
      layout.tsx                  # centred, no app chrome
      login/
        page.tsx                  # /login
      signup/
        page.tsx                  # /signup

    (dashboard)/
      layout.tsx                  # top bar + sidebar shell
      loading.tsx
      error.tsx
      dashboard/
        page.tsx                  # /dashboard
      add-links/
        page.tsx                  # /add-links

    user/
      [handle]/
        page.tsx                  # /user/[handle]
        loading.tsx
        error.tsx
        not-found.tsx             # unknown or unpublished handle

    api/
      auth/
        [...nextauth]/
          route.ts                # NextAuth handlers — see §6
```

`user/` is deliberately **not** in a group: it's a public route with no shared shell, and a bare segment makes that obvious at a glance.

Route-private folders (`_components`, `_actions`) are opted out of routing and may sit inside any segment — see `architecture.md` §2 for when a component earns promotion out of one.

---

## 4. Protection

`src/proxy.ts` sits at the same level as `app` and exports a function named `proxy`. Its rule is **default-deny**: public paths are listed, everything else requires a session, so a new dashboard route is protected the moment it exists without anyone remembering to add it. The implementation, the matcher, and the `?next=` handling are in `auth.md` §4 — don't write a second copy of that logic.

What belongs in this doc is the shape of the thing:

- **The proxy is not a security boundary.** It's a centralised redirect and a cheap pre-filter. The checks that actually protect data are the identity check in the page or action and the `userId` filter in the query (`auth.md` §3). Both must hold if the proxy were deleted.
- **`(dashboard)/layout.tsx` is not a gate either.** Layouts don't re-render on client-side navigation and don't control whether child segments render — the router renders them independently and they appear in the RSC payload regardless. An auth check there is convenience, not protection (`auth.md` §3).
- **Cookie reads only, no database queries.** The proxy runs on every matched request including prefetches.
- Proxy runs on the **Node.js runtime** and the `runtime` route-segment config is unavailable there — setting it throws. So a proxy-level session check still shouldn't hit the database, for the reason above rather than for runtime limits.
- `(auth)` routes do the inverse check: already signed in → redirect to `/dashboard`.

---

## 5. Per-route `layout` / `loading` / `error`

They render in a fixed hierarchy, outermost first, recursively through nested segments:

```
layout → template → error → loading → not-found → page (or a nested layout)
```

So a segment's `error.tsx` wraps its `loading.tsx` and its `page.tsx`, but **not** the `layout.tsx` in that same segment. An error thrown in a layout is caught by the _parent_ segment's boundary; an error in the root layout is caught only by `app/global-error.tsx`.

"Where needed" means what it says — don't scaffold empty files:

| File            | Add it when                                                             | Skip it when                                     |
| --------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| `layout.tsx`    | the segment has chrome shared by two or more pages, or a distinct shell | a single page can render its own container       |
| `loading.tsx`   | the segment awaits request-time data and would otherwise show nothing   | the page is static, or already uses `<Suspense>` |
| `error.tsx`     | a failure there should be contained and recoverable in place            | bubbling to the parent boundary is the better UX |
| `not-found.tsx` | the segment has its own "doesn't exist" case, like an unknown handle    | the app-wide 404 says enough                     |

`loading.tsx` is sugar for a Suspense boundary around the segment. For finer control — streaming a shell while one slow panel resolves — use `<Suspense>` directly in the page instead (`architecture.md` §1). Don't do both for the same data.

### `error.tsx` specifics

**Error boundaries must be Client Components.** Every `error.tsx` starts with `"use client"`, which also means no `metadata` export from it.

```tsx
"use client"; // Error boundaries must be Client Components

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section>
      <h2>Something went wrong</h2>
      <button onClick={() => retry()}>Try again</button>
    </section>
  );
}
```

- The recovery prop is **`retry`**, not `reset` — `retry()` re-fetches and re-renders the boundary's children, which is what recovers a failed Server Component. `reset` exists but only clears error state without re-fetching, so it can't recover a server error. (`retry` became stable in 16.3.)
- **In production, an error from a Server Component reaches the client as a generic message plus `error.digest`**, deliberately, to avoid leaking server detail. Only the digest is useful — `onRequestError` logs it server-side, and the boundary shows it as a reference. Never render the message text, in any environment (`errors-and-validation.md` §5.2 and §6).
- `error.tsx` is one of the few files that takes a **default export** (`coding-standards.md` §5); the lint rule is configured to allow it.
- `global-error.tsx` must render its own `<html>` and `<body>` and does **not** get `globals.css`, so it's unstyled unless you inline what it needs.

---

## 6. Route Handlers are for webhooks and third-party callbacks only

`app/api/*/route.ts` is reserved. Everything the app itself does goes through Server Actions.

| Belongs in `app/api`                      | Does **not**                                |
| ----------------------------------------- | ------------------------------------------- |
| OAuth callbacks (NextAuth's own handlers) | our own form submissions                    |
| Inbound webhooks from a third party       | creating, reordering, or deleting links     |
| Anything an external system must POST to  | claiming a handle, publishing a profile     |
| Verification pings a provider requires    | any read a Server Component can do directly |

The reason is not style. A Route Handler is a public HTTP endpoint we have to authenticate, validate, CSRF-protect, and shape a response for by hand. A Server Action gets the framework's Origin/Host CSRF check, encrypted action ids, and a typed call from the component that uses it — and it still needs its own identity check, because it's reachable by direct POST too (`auth.md` §5). Putting an API route in front of our own database is strictly more work and strictly more surface.

Conventions when a handler is genuinely warranted:

- **Named exports** — `export async function POST(request: Request)`. Not a default export.
- **Authenticate by signature, not session.** A webhook has no cookie. Verify the provider's signature against a raw body before trusting anything; the signing secret belongs in the environment table in `auth.md` §1. Our first webhook's scheme: **TBD**.
- Return `401` when unauthenticated, `403` when authenticated but not permitted, and a bare `200` with no body detail to a caller that failed verification.
- Keep them thin: verify, then hand off to a `lib/db` query. No business logic in the handler.
- `/api/auth/*` is NextAuth's and is public by necessity (`auth.md` §4). Don't add our own routes under it.

Webhooks are also not a place for `revalidatePath` to be forgotten — an inbound change that affects a cached page must revalidate it explicitly.

---

## 7. Conflicts to settle

This route map was specified after `ui.md`, `architecture.md`, and `auth.md`, and it contradicts all three in small ways. Flagging rather than silently resolving:

| Conflict                                                                                                                                                                                                                                     | Resolution                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui.md` §2.4 designs the dashboard as **one page with three sidebar tabs** (Links · Appearance · Analytics) plus a live preview pane. This map makes `/add-links` a **separate route**, which splits the add-link form away from that shell. | **TBD** — either `/add-links` is a route and `ui.md` §2.4's tab layout changes, or "add links" is the Links tab and this route disappears. Pick one before building either. |
| `architecture.md` §2's tree shows `(dashboard)/editor/page.tsx`                                                                                                                                                                              | superseded by `/dashboard` + `/add-links`; that tree needs updating                                                                                                         |
| `auth.md` §4 describes `(dashboard)/*` as "editor, appearance, analytics"                                                                                                                                                                    | superseded by this table; the access rule itself is unchanged                                                                                                               |
| Are Appearance and Analytics routes (`/appearance`, `/analytics`) or tabs?                                                                                                                                                                   | **TBD** — same decision as the first row                                                                                                                                    |

---

## 8. Not decided yet

| Item                                                                | Status                                                     |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| Whether `/add-links`, Appearance, and Analytics are routes or tabs  | **TBD** (§7) — blocks the `(dashboard)` layout             |
| Post-signup destination, and whether onboarding is a route per step | **TBD** — `ui.md` §2.3 has 4 steps with no URLs assigned   |
| `/templates` page (`ui.md` §2.2 mentions a standalone gallery)      | **TBD** — not in the map above                             |
| Whether the landing page needs `(marketing)/layout.tsx`             | **TBD** — only if a second marketing page lands            |
| First webhook provider and its signature scheme                     | **TBD** (§6)                                               |
| `/user/[handle]` metadata and OG image generation                   | **TBD** — `opengraph-image.tsx` would live in that segment |
| Reserved-handle list, so `/user/admin` and friends can't be claimed | **TBD** — a routing concern as much as a data one          |
