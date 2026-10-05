# Linkbase — Data Fetching

How data gets from MongoDB onto the screen: where reads happen, how they're scoped, what's cached and how the cache is cleared, and how Client Components get data. Read this before writing a page, a query, or anything that renders data.

Scope: reads and caching. `database.md` owns the query layer itself (connection, models, scoping, serialisation), `auth.md` owns where the user id comes from, `errors-and-validation.md` owns what happens when a read fails, `architecture.md` §1 owns the Server/Client Component split. Anything undecided is marked **TBD**.

> **Caching model.** This project is on Next 16's _previous_ caching model — `cacheComponents` is off (`architecture.md` §1). In that model, database reads are cached with `unstable_cache` and invalidated by tag. Next 16 marks `unstable_cache` as replaced by the `"use cache"` directive, but `"use cache"` only works with Cache Components on, and turning that on is a project-wide decision. §7 covers the migration.

---

## 1. The rule

**Reads happen in Server Components, by calling `lib/db` directly.**

```tsx
// src/app/(dashboard)/editor/page.tsx
import { LinkList } from "@/components/editor/link-list";
import { requireUserId } from "@/lib/auth";
import { listLinks } from "@/lib/db";

export default async function EditorPage() {
  const userId = await requireUserId();
  const links = await listLinks(userId);

  return <LinkList links={links} />;
}
```

That's the whole pattern: get the scope (a user id or a handle), call a query function, render the result or pass it down as props.

What's ruled out:

| Not this                                      | Why                                                                                                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetch("/api/links")` from a Server Component | An HTTP round trip to our own process, for data we could read in-process. It needs an absolute URL, has to forward the session cookie by hand, loses the query's return type, and fails at build time when there's no server to call. |
| A Route Handler in front of our own database  | A public endpoint we'd have to authenticate and validate, for no caller that needs it. `app/api` is reserved for webhooks and OAuth callbacks (`routing.md` §6).                                                                      |
| `useEffect` + `fetch` in a Client Component   | A client-side waterfall after hydration, a loading spinner where there could have been HTML, and the same API route problem as above.                                                                                                 |
| Importing `lib/db` into a Client Component    | A build error, by design — `lib/db` imports `"server-only"` (`database.md` §2).                                                                                                                                                       |

---

## 2. Scoping

Every read is scoped to exactly one of two things, and which one is decided by who's asking:

| Data                                      | Scope                   | Comes from                                                             | Query                                             |
| ----------------------------------------- | ----------------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| Private — the editor, settings, analytics | the signed-in user's id | `requireUserId()` (`auth.md` §2) — never params, props, or form fields | `listLinks(userId)`, `getProfileByUserId(userId)` |
| Public — `/user/[handle]`                 | the handle in the URL   | `params`, validated with `handleSchema` first                          | `getPublicPage(handle)`                           |

### 2.1 Private reads

The user id comes from the session, inside the Server Component that does the read. It's the first argument to the query, and it goes in the query **filter** — so a read can only ever return the caller's own rows (`database.md` §5).

```tsx
const userId = await requireUserId(); // redirects to /login when signed out
const [profile, links] = await Promise.all([
  getProfileByUserId(userId),
  listLinks(userId),
]);
```

- **Don't pass `userId` down for a child to read with.** A child Server Component that needs data calls `requireUserId()` itself. `verifySession` is wrapped in React `cache()`, so that costs nothing extra per render.
- **`requireUserId()` in the page, even though the proxy already checked.** The proxy is not the security boundary (`auth.md` §3).

### 2.2 Public reads

`/user/[handle]` is read by visitors with no session, so the scope is the handle — and that read is the **only** unscoped query in the app (`database.md` §5). It filters on `published: true`, links on `visible: true`, and projects only the fields the page renders.

```tsx
// src/app/user/[handle]/page.tsx
import { notFound } from "next/navigation";

import { PublicProfile } from "@/components/profile/public-profile";
import { getPublicPage } from "@/lib/db";
import { handleSchema } from "@/lib/validation";

export default async function UserPage({
  params,
}: PageProps<"/user/[handle]">) {
  const parsed = handleSchema.safeParse((await params).handle);
  if (!parsed.success) notFound();

  const page = await getPublicPage(parsed.data);
  if (!page) notFound();

  return <PublicProfile page={page} />;
}
```

- **Validate the handle before the query**, with the same `handleSchema` the signup form uses (`errors-and-validation.md` §2.1). A malformed handle is a 404, not a query. It's also normalised to lowercase there, which matters for the cache tag (§3.3).
- **Unpublished and nonexistent look the same** — both `null`, both `notFound()`. A different response would reveal which handles exist.
- **The public page doesn't read the session.** No `verifySession()`, no "Edit your page" button rendered from the server. Reading cookies makes the route dynamic per request, and keeping it session-free keeps it cacheable and identical for every visitor. Viewer-specific UI, if we ever want it, is a small Client Component.

---

## 3. Caching

### 3.1 What's cached

| Read                                  | Cached across requests?                      | Why                                                                                                                                                                                                                                                                                                                |
| ------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public profile page (`getPublicPage`) | **Yes** — `unstable_cache`, tagged by handle | The hot path: every visitor, no session, identical output for everyone, and it changes only when the owner edits. This is where caching helps.                                                                                                                                                                     |
| Private editor / settings reads       | **No**                                       | Every dashboard request already reads the session, so the route renders per request anyway. The queries are single-user, indexed, and small, and the owner must see their own edits immediately. A cache here adds staleness and the risk of serving one user's rows to another, for a saving we haven't measured. |
| Analytics aggregates                  | **TBD**                                      | The one private read that could get expensive. If it does, cache it per user with a short time-based `revalidate` (§3.5).                                                                                                                                                                                          |
| Anything per request, in one render   | **Deduplicated** with React `cache()`        | `generateMetadata` and the page both reading the same profile cost one query (§4).                                                                                                                                                                                                                                 |

The default is **uncached**. A read gets a cache when there's a reason in this table; add the row when you add the cache.

### 3.2 `unstable_cache` for database reads

The fetch cache doesn't apply to us — Mongoose talks to MongoDB over the driver, not `fetch`. Database reads are cached with `unstable_cache`, inside `lib/db`, so pages call `getPublicPage(handle)` and never know there's a cache:

```ts
// src/lib/db/queries/public-page.ts
import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import type { PublicPage } from "@/lib/types";

import { cacheTags } from "../cache-tags";
import { connectToDatabase } from "../connect";
import { Link } from "../models/link";
import { Profile } from "../models/profile";

async function readPublicPage(handle: string): Promise<PublicPage | null> {
  await connectToDatabase();

  const profile = await Profile.findOne({ handle, published: true })
    .select("handle displayName bio themeId")
    .lean();
  if (!profile) return null;

  const links = await Link.find({ profileId: profile._id, visible: true })
    .sort({ order: 1 })
    .select("title url")
    .lean();

  return toPublicPage(profile, links); // ids → strings, dates → ISO strings
}

export const getPublicPage = cache((handle: string) =>
  unstable_cache(readPublicPage, ["public-page", handle], {
    tags: [cacheTags.publicProfile(handle)],
  })(handle),
);
```

- **The cached function takes its scope as an argument.** Arguments are part of the cache key. A value captured from a closure is not, unless it's also in `keyParts` — so `["public-page", handle]` is spelled out rather than relied on.
- **Nothing request-specific inside the cached function.** `cookies()`, `headers()`, and `requireUserId()` aren't supported inside an `unstable_cache` scope, and a session-dependent result in a shared cache is a cross-user leak. Read those outside and pass the value in.
- **The result is stored as JSON.** On a cache hit, a `Date` comes back as a string and an `ObjectId` as whatever it serialised to. So cached functions return the plain `lib/types` shape, with ids and dates already strings (`database.md` §6), and the type tells the truth on hits and misses alike.
- **Project before you cache.** The cache stores whatever you return, so a field that shouldn't be public is now public _and_ persisted.
- **`null` is cached too.** A visit to an unclaimed handle caches "not found" under that handle's tag. That's fine — and it's why claiming a handle must invalidate it (§3.4).
- **No `revalidate` on the public page.** It changes only when the owner edits, and every edit invalidates the tag, so a timer would only add misses.

### 3.3 Tags

Tag names are built in one place, so the read that sets a tag and the write that clears it can't spell it differently:

```ts
// src/lib/db/cache-tags.ts
export const cacheTags = {
  publicProfile: (handle: string) => `public-profile:${handle}`,
} as const;
```

- **Tags are case-sensitive.** Always build them from the normalised (lowercase, trimmed) handle — the one `handleSchema` returns and the database stores.
- **Tag by what the read is keyed on.** The public read is looked up by handle, and tags have to be known before the query runs, so the tag is the handle — not the profile id, which the page doesn't have yet.
- Add a builder here for every new tag. A tag string written inline anywhere else is a review comment.

### 3.4 Clearing the cache after a mutation

**Every write that changes what a cached read returns clears that read's tag**, in the same `lib/db` function that does the write. Putting the invalidation next to the write means no caller — action or webhook — can do one without the other.

```ts
// src/lib/db/queries/link.ts
import { revalidateTag } from "next/cache";

export async function updateLink(userId: string, input: UpdateLinkInput) {
  await connectToDatabase();
  const link = await Link.findOneAndUpdate(
    { _id: input.linkId, userId },
    { title: input.title, url: input.url },
    { new: true, runValidators: true },
  ).lean();
  if (!link) return null;

  await expirePublicProfile(userId);
  return toLink(link);
}

// the owner's public page, by their current handle
async function expirePublicProfile(userId: string) {
  const profile = await Profile.findOne({ userId }).select("handle").lean();
  if (profile)
    revalidateTag(cacheTags.publicProfile(profile.handle), { expire: 0 });
}
```

**Use `{ expire: 0 }`.** `revalidateTag` takes a second argument in Next 16 (the one-argument form is deprecated), and the recommended `"max"` serves the _stale_ page while it refreshes in the background. For the owner who just saved and clicked "View page", that looks like the save didn't work. `{ expire: 0 }` makes the next request wait for fresh data — the documented choice when the caller needs the data gone now and `updateTag` isn't available. (`updateTag` is the read-your-own-writes API, but its docs only cover tags set by `fetch` or `cacheTag`, not `unstable_cache`.) The cost is one blocking miss per edit, on a cheap query.

Which writes clear which tags:

| Mutation                                          | Clears                                                        |
| ------------------------------------------------- | ------------------------------------------------------------- |
| Create, update, delete, reorder, show/hide a link | `publicProfile(handle)`                                       |
| Update display name, bio, theme, socials          | `publicProfile(handle)`                                       |
| Publish or unpublish                              | `publicProfile(handle)`                                       |
| Change handle                                     | `publicProfile(oldHandle)` **and** `publicProfile(newHandle)` |
| Claim a handle (signup)                           | `publicProfile(handle)` — clears a cached "not found"         |
| Delete account                                    | `publicProfile(handle)`                                       |
| Record a click                                    | **nothing** — the public page doesn't show counts             |

Recording a click must not clear the public page's tag: it's the one unauthenticated write, it happens on every visit, and clearing on it would mean the cache never holds. If the public page ever shows counts, give that part a time-based `revalidate` instead.

**The editor still needs its own refresh.** Private reads aren't cached, but the page the action was called from still shows the old render. The action calls `refresh()` (or `revalidatePath`, or `redirect`) after the write, per `architecture.md` §3. Tag invalidation updates the public page; `refresh()` updates the screen the user is looking at. Most mutations need both.

### 3.5 If a private read is ever cached

Not today (§3.1). If one earns it — analytics is the likely candidate — the rules are stricter than for the public page:

- `userId` is an **argument** to the cached function, so it's in the key. Never a closure.
- `requireUserId()` runs **outside** the cached function; the id is passed in.
- Tag per user — `cacheTags.userAnalytics(userId)` — never a shared tag, so one user's edit doesn't evict everyone.
- Prefer a time-based `revalidate` (say, 300s) for data that changes on clicks, rather than a tag cleared on every click.

### 3.6 The fetch cache

Only for HTTP calls to **external** services — fetching a link's favicon or OG preview, say. Nothing does that yet. `fetch` isn't cached by default in this Next major; opt in per call and tag it like anything else:

```ts
const res = await fetch(url, {
  cache: "force-cache",
  next: { revalidate: 86_400, tags: [tag] },
});
```

Never `fetch` our own routes (§1).

---

## 4. Shaping reads

- **Avoid waterfalls.** Independent reads run together with `Promise.all`. A read that genuinely depends on another (links need the profile id) belongs in one query function, so the page makes one call.
- **Deduplicate with React `cache()`.** A query that more than one component, or `generateMetadata` and the page, reads in the same request is wrapped in `cache()` in `lib/db`. It memoises for one render pass only — it is not a cross-request cache and doesn't replace `unstable_cache`.
- **Stream slow reads.** A read that's slow and not needed for the first paint (analytics in the editor) moves into its own async Server Component behind `<Suspense>`, so the rest of the page isn't held for it. Route-level loading UI is `loading.tsx` (`routing.md` §5).
- **Failures throw.** A read that can't reach the database throws to the nearest `error.tsx` and is logged by `onRequestError` (`errors-and-validation.md` §5–6). Don't catch it to render an empty list — empty and broken must look different. "Nothing matched" is `null`, which the page turns into `notFound()` or an empty state.

---

## 5. Client Components

**Client Components never query the database.** They get data as props from a Server Component parent.

```tsx
// src/app/(dashboard)/editor/page.tsx — Server Component, reads
const links = await listLinks(userId);
return <LinkList links={links} />;
```

```tsx
// src/components/editor/link-list.tsx — Client Component, renders and interacts
"use client";

import type { Link } from "@/lib/types";

type LinkListProps = { links: Link[] };

export function LinkList({ links }: LinkListProps) {
  // reorder, toggles, … — no database access, no fetching
}
```

- **Props must be serialisable** — plain objects with string ids, from `lib/types` (`database.md` §6). Never a Mongoose document.
- **Pass only what the component renders.** Props are in the RSC payload, visible to anyone who opens dev tools. Don't hand a Client Component the whole profile when it needs `handle`.
- **A promise can be a prop.** For a slow read that a Client Component renders, start it in the Server Component without awaiting, pass the promise, and unwrap it with React's `use()` inside `<Suspense>`. The read still happens on the server.
- **After a mutation, the server re-renders and sends new props.** The action calls `refresh()` / `revalidatePath`; the Client Component doesn't refetch. Optimistic UI goes through `useOptimistic`, not a client cache.

### 5.1 The one client-initiated read

Some reads are triggered by typing, not navigation — the handle availability check in `ClaimInput` (`ui.md` §1.3). That's a **Server Action** that returns an answer, not a Route Handler and not a database import:

```ts
"use server";

export async function checkHandleAvailability(
  handle: string,
): Promise<boolean> {
  const parsed = handleSchema.safeParse(handle);
  if (!parsed.success) return false;
  return isHandleAvailable(parsed.data);
}
```

- It returns the **answer** (`true` / `false`), never a document.
- It validates its input like any action — it's reachable by direct POST (`errors-and-validation.md` §2).
- Server Actions run one at a time per client, so debounce the caller; a request per keystroke will queue.
- This is the exception, for input-driven reads only. If you're tempted to use an action to load a page's data, the read belongs in the Server Component instead.

---

## 6. Checklist for a new read

1. Is it in a Server Component (or `generateMetadata`), calling a `lib/db` function?
2. Private: does the user id come from `requireUserId()`, and is it the query's first argument and in its filter?
3. Public: is the handle validated with `handleSchema` first, and does the query filter on `published` / `visible` and project explicitly?
4. Does it return a plain `lib/types` shape, with string ids and dates?
5. Cached? Then: is there a reason in §3.1, the scope is an argument, nothing request-specific is inside, and the tag comes from `cacheTags`?
6. Does every write that changes its result clear its tag, with `{ expire: 0 }`, in the same `lib/db` function?
7. Independent reads in `Promise.all`, repeated reads in `cache()`, slow reads behind `<Suspense>`?
8. Does any Client Component receive only the fields it renders?

---

## 7. Moving to `"use cache"`

When `cacheComponents` is turned on (`architecture.md` §1), the mechanics change and the rules don't:

| Today (`cacheComponents` off)                  | With Cache Components                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `unstable_cache(fn, keyParts, { tags })`       | `"use cache"` at the top of the function, plus `cacheTag(tag)`                                  |
| `revalidate` option                            | `cacheLife(profile)`                                                                            |
| `revalidateTag(tag, { expire: 0 })` in actions | `updateTag(tag)` — the read-your-own-writes API                                                 |
| results stored as JSON                         | RSC-serialised — but keep returning plain shapes anyway                                         |
| private reads uncached                         | still uncached, behind `<Suspense>`; `"use cache: private"` exists if one ever needs a lifetime |

Because every cached read lives in `lib/db` and every tag in `cacheTags`, the migration is contained to `lib/db`. Pages don't change.

---

## 8. Not decided yet

| Item                                                                            | Status                                              |
| ------------------------------------------------------------------------------- | --------------------------------------------------- |
| Turning on `cacheComponents`                                                    | **TBD** — `architecture.md` §1; §7 is the migration |
| Caching analytics aggregates, and with what lifetime                            | **TBD** — §3.5                                      |
| Whether the public page shows click counts (and so needs a time-based lifetime) | **TBD**                                             |
| Prerendering popular profiles with `generateStaticParams`                       | **TBD** — not needed while the tagged cache holds   |
| External fetches (favicons, OG previews) and their lifetime                     | **TBD** — §3.6                                      |
