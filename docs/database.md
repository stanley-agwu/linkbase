# Linkbase — Data Layer

MongoDB via Mongoose. Mongoose owns the schema, validation, and the connection pool; the app only ever talks to it through `lib/db`. Read this before writing a query, adding a field, or touching a Server Action that writes.

Structure and import rules come from `architecture.md` — this doc is the `lib/db` half of it in detail. Anything undecided is marked **TBD**.

> **Mongoose 9** is installed. In the repo: `lib/db/connect.ts`, `lib/db/index.ts`, the `User`, `Profile`, `Link`, `Click` and `RateLimit` models, `cache-tags.ts`, and `queries/user.ts`, `queries/link.ts`, `queries/profile.ts`, `queries/public-page.ts` + `queries/rate-limit.ts`.

---

## 1. Why Mongoose owns this

One library, three jobs, so none of them get reimplemented elsewhere:

| Job                | Where it lives                                                                                     | Not                                          |
| ------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Schema             | `lib/db/models/*.ts`                                                                               | ad-hoc object shapes at call sites           |
| Validation         | the schema (`required`, `enum`, `match`, `maxlength`, custom validators) — the backstop behind Zod | hand-rolled checks sprinkled through actions |
| Connection pooling | the driver, via one cached connection                                                              | a client per request, or a pool per module   |

Mongoose validation is the last line, not the first. User input is validated with Zod at the Server Action boundary before it reaches a query, and those schemas produce every user-facing message (`errors-and-validation.md` §2). The Mongoose validators guard the data against code paths that skipped that boundary, so their limits must match the Zod schema for the same field.

Server Actions and Server Components call query functions. They never construct a client, never open a connection, and never build raw driver queries.

Mongoose is **Node-runtime only**. Don't import `lib/db` — or anything that imports it — from `proxy.ts`, from a route segment pinned to the Edge runtime, or from a Client Component. Session checks that must run at the edge have to work off the token alone, without a database read.

---

## 2. The cached connection

Serverless and dev-mode HMR both re-evaluate modules, and a fresh `mongoose.connect()` per invocation exhausts the server's connection limit. So: **one connection, cached on `globalThis`, reused everywhere, in development and in production.**

`lib/db/connect.ts`:

```ts
import "server-only";
import mongoose, { type Mongoose } from "mongoose";

// Read on first connect, not at import, so `next build` needs no secret
// (deployment.md §6.2). A missing variable still fails at server startup:
// instrumentation.ts checks it in register().
function readMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  return uri;
}

// Survives HMR in dev and module re-evaluation between invocations in prod.
const globalForMongoose = globalThis as typeof globalThis & {
  _mongoose?: { conn: Mongoose | null; promise: Promise<Mongoose> | null };
};

const cached = (globalForMongoose._mongoose ??= { conn: null, promise: null });

export async function connectToDatabase(): Promise<Mongoose> {
  if (cached.conn) return cached.conn;

  cached.promise ??= mongoose.connect(readMongoUri(), {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5_000,
    bufferCommands: false,
  });

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null; // let the next call retry instead of awaiting a rejected promise
    throw error;
  }

  return cached.conn;
}
```

Why each piece:

- **`cached.promise`, not just `cached.conn`** — concurrent requests during a cold start would otherwise each start their own connect. They all await the same promise instead.
- **Clearing `promise` on failure** — a cached rejected promise would make every later call fail forever.
- **`bufferCommands: false`** — fail fast on a query issued before the connection is up, rather than queue it invisibly until a timeout.
- **`"server-only"`** — turns an accidental client-side import into a build error with a clear message.
- **`??=`** — the cache is created once per process; reassigning would defeat it.

Every query function starts with `await connectToDatabase()`. It's a no-op after the first call, so there's no cost to being unconditional — and no path where a query runs unconnected.

### Model registration

Every model is registered through `defineModel` (`models/define-model.ts`):

```ts
export const Link = defineModel<LinkDoc>("Link", linkSchema);
```

Re-evaluating a model file calls `mongoose.model()` again, which throws `OverwriteModelError` if the name is already registered. Mongoose's registry also outlives a hot reload. So the common `mongoose.models.Link ?? mongoose.model(...)` guard avoids the error by reusing the model compiled when the dev server started. A field added to the schema since then is "not in schema" (a `StrictModeError` under `strictQuery: "throw"`), and its index is never built. In development, `defineModel` deletes the old registration and compiles the current schema; in production, where a model file runs once, it reuses the existing one.

### Environment

| Variable      | Notes                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `MONGODB_URI` | full connection string including the database name. Local dev value in `.env.local`, never committed |

Development runs against a **MongoDB Atlas** cluster (database `linkbase`); copy `.env.example` to `.env.local` and paste the cluster's connection string. Production hosting target: **TBD**.

---

## 3. Layout

```
src/lib/db/
  index.ts          # public surface — the only thing features import
  connect.ts        # the cached connection helper
  models/define-model.ts  # model registration that survives hot reload
  cache-tags.ts     # cacheTags — every cache tag name, built in one place
  models/
    user.ts
    profile.ts
    link.ts
    click.ts
  queries/
    profile.ts      # getProfileByUserId, claimHandle, updateProfile, …
    link.ts         # listLinks, updateLink, countClicks, …
    public-page.ts  # getPublicPage — the unscoped, cached public-profile read
```

`lib/db/index.ts` re-exports the query functions, the models, and the document types. Features import from `@/lib/db` — not from `@/lib/db/connect`, `@/lib/db/cache-tags`, or a model file directly, so the connection helper and the tag names stay implementation details.

- **`cache-tags.ts`** is the only place a cache tag string is written. The cached read that sets a tag and every write that clears it both build it from `cacheTags`, so they can't drift apart. It isn't re-exported — nothing outside `lib/db` sets or clears tags (`data-fetching.md` §3.3).
- **`queries/public-page.ts`** holds the one read that isn't scoped to a user id (§5), kept in its own file so it's easy to audit. It returns the profile and its visible links in one call, projected and cached with `unstable_cache` under the handle's tag (`data-fetching.md` §3.2).

Queries and mutations both live in `lib/db/queries` as plain async functions. A mutation that changes what a cached read returns clears that read's tag itself, right after the write, so no caller can do one without the other (`data-fetching.md` §3.4). Server Actions (`"use server"`) sit a layer above, in the feature, and call them — see `architecture.md` §3. Keeping the `"use server"` directive out of `lib/db` means nothing here is accidentally exposed as a POST endpoint.

---

## 4. Schema conventions

Every schema, without exception:

| Convention             | Why                                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `strict: true`         | an unknown key is dropped rather than silently persisted, so a typo in an action can't invent a field                             |
| `strictQuery: "throw"` | an unknown key in a _filter_ throws instead of being dropped — a dropped filter clause is how a query silently stops being scoped |
| `timestamps: true`     | `createdAt` / `updatedAt` on everything; no hand-maintained date fields                                                           |
| `index` on `userId`    | every query filters on it (§5), so every collection that has it indexes it                                                        |
| `index` on `handle`    | unique, and the public profile route looks up by it on every request                                                              |
| `versionKey: false`    | we don't use optimistic concurrency; `__v` only leaks into serialised output                                                      |

`strict: true` is Mongoose's default — it's set explicitly anyway, so the guarantee is visible in the file and survives a future default change. `strictQuery` defaults to `false` in Mongoose 9 and has to be set — and it must be `"throw"`, not `true`. With `true`, Mongoose **deletes** an unknown key from the filter (`lib/cast.js`), so `find({ userid })` runs as `find({})`; only `"throw"` raises a `StrictModeError`.

### Models

Field lists follow the UI in `ui.md` (§1.21, §2.4, §2.5). Types for the app live in `lib/types`; the document interfaces live beside their schema.

**`user.ts`** — the account: `email` (required, lowercase, trimmed, unique, ≤ 254), `passwordHash` (argon2id, `select: false` — only `findUserForSignIn` asks for it), `name` (optional, ≤ 60), `username`, `emailVerifiedAt` (`null` until the verification flow exists). A user's `_id` is the `userId` every other collection is scoped by.

`username` is the handle, and the user's public URL (`/user/[handle]`). Signup asks for email and password only; the username is chosen once, during onboarding (`setUsername`, which only matches while none is set), and is absent until then. Its index is `unique` **and** `sparse`, so accounts that haven't chosen one don't collide on a missing value, and it's the index the public page looks users up by. Stored lowercase against a lowercase-only pattern, so uniqueness is case-insensitive without a collation index. Pattern and length come from `handleSchema` in `lib/validation/fields.ts` (lowercase letters, digits, `-` and `_`, 3–30 characters — `errors-and-validation.md` §8); change them together. Reserved usernames live in `RESERVED_HANDLES` beside `handleSchema`, matched exactly after trimming and lowercasing (so `admin1` stays available). It holds `admin` today; add a name there and every path that validates a username refuses it.

`findUserForSignIn(email)` is the one user read keyed by something other than a session id — it runs _before_ a session exists, from the credentials provider only.

**`rate-limit.ts`** — fixed-window counters for `security.md` §3: `key` (unique), `count`, `expiresAt` with a TTL index. `consumeRateLimit` is a single atomic pipeline upsert that also resets a window the TTL monitor hasn't reaped yet.

**`profile.ts`** — at most one per user: `userId` (unique), optional `displayName` (≤ 60) and `bio` (≤ 160), and the Appearance choices `themeId` (one of `THEME_IDS`, default `"kiln"`), `buttonShape` and `font` (each default `"template"`). The enums and limits come from `lib/validation/profile.ts`. No handle: the public URL is the owner's `User.username`, so the public read finds the user by username, then the profile by `userId`.

There's no `published` flag: a page is live once its owner has a username. The profile is created by the first save (an `updateOne` upsert in `queries/profile.ts`), so a user may have none; every read goes through `toProfileSettings`, which fills in the defaults. Socials: **TBD**.

**`link.ts`** — the rows on the dashboard: `userId`, `title` (1–100), `url` (`http`/`https`, ≤ 2048), `visible`, `order`, `clickCount`. No `profileId`: a profile is one per user, so links hang off the owner's `userId`, and a link can exist before its owner has a profile. Indexes: `userId`, plus compound `{ userId: 1, order: 1 }` for the ordered list read, and `{ userId: 1, visible: 1, order: 1 }` for the public page. At most 100 links per user (`MAX_LINKS_PER_USER`, `security.md` §3).

**`click.ts`** — analytics events: `userId`, `linkId`, `createdAt`. Index `{ userId: 1, createdAt: -1 }` for the "last 7 days" reads. Whether clicks stay as raw events, get rolled up daily, or use a TTL index: **TBD** — depends on expected volume.

### Index rules

- Declare indexes in the schema, next to the field.
- `autoIndex` is on by default and fine in development; in production index builds belong in a migration or a deliberate `syncIndexes()` step, not in request-path code. Production `autoIndex` setting: **TBD**.
- A unique index enforces uniqueness; validation does not. `handle` availability must therefore be handled at _both_ ends — check for the nice error message, and catch the duplicate-key error (`code === 11000`) for the race where two signups claim the same handle between the check and the insert. The check alone is not uniqueness. The catch lives in the query function, which returns `"taken"` rather than throwing, so actions never see a Mongo error code.

---

## 5. Every query is scoped to the signed-in user

**The rule:** every read and every write for user-owned data takes `userId` as its first parameter and puts it in the filter. Not "most" — every one. A user can only ever touch their own rows.

```ts
export async function listLinks(userId: string) {
  await connectToDatabase();
  return Link.find({ userId }).sort({ order: 1 }).lean();
}

export async function updateLinkTitle(
  userId: string,
  linkId: string,
  title: string,
) {
  await connectToDatabase();
  // userId is in the filter, so a mismatched owner matches nothing and returns null
  return Link.findOneAndUpdate(
    { _id: linkId, userId },
    { title },
    { returnDocument: "after", runValidators: true }, // `new: true` is deprecated in Mongoose 9
  ).lean();
}
```

What this buys: ownership is enforced by the filter, so a forged id simply matches zero documents. There is no window between "fetch" and "check" to get wrong, and no code path where the check is forgotten but the write still lands.

The rules that keep it true:

- **`userId` comes from the session**, read through `lib/auth` inside the Server Action. It is never a form field, a prop, a query-string value, or a client argument. A client-supplied `userId` is an authorisation bug by construction.
- **Never `findById` for user-owned data.** `findById(linkId)` is the mistake this section exists to prevent. Use `findOne({ _id: linkId, userId })`.
- **Same for writes and deletes** — `findOneAndUpdate`, `updateOne`, `deleteOne`, `deleteMany` all carry `userId` in the filter.
- **A bulk write scopes every operation**, not just the outer call. Reordering links means each `updateOne` filter contains `userId`.
- **Return `null`, don't throw**, when nothing matched. The caller decides whether that's a 404 or a no-op; a distinct "exists but isn't yours" error would confirm the row exists.
- **`strictQuery: "throw"` protects the scope.** With it off — or set to `true` — a mistyped `{ userid }` is dropped from the filter and the query silently returns everyone's rows. With `"throw"`, it throws.

### The public-profile exception

Public profile pages are read by handle, by visitors with no session, through `getPublicPage` in `queries/public-page.ts`:

```ts
async function readPublicPage(handle: string): Promise<PublicPage | null> {
  await connectToDatabase();

  const owner = await User.findOne({ username: handle })
    .select("_id username")
    .lean();
  if (!owner?.username) return null;

  // No profile yet is fine: toProfileSettings supplies the defaults.
  const [profile, links] = await Promise.all([
    Profile.findOne({ userId: owner._id }).select(PROFILE_FIELDS).lean(),
    Link.find({ userId: owner._id, visible: true })
      .select("title url")
      .sort({ order: 1 })
      .lean(),
  ]);

  return { username: owner.username, ...toProfileSettings(profile), links: … };
}
```

The exported `getPublicPage` wraps this in `unstable_cache` and React `cache()`; the full version is in `data-fetching.md` §3.2. The handle arrives already validated and lowercased by `handleSchema`, so the query doesn't normalise it again.

This is the **only** unscoped read, and it's constrained in three ways: it's read-only, it only finds users who have chosen a username, and it projects only the fields the public page renders — never `userId`, never the owner's email. The link read is scoped by the owner’s `userId` and `visible: true`. Because the result is cached and shared by every visitor, a field that slips past the projection is both public and persisted. Any new unscoped query needs the same treatment, a reason, and its own place in `public-page.ts`.

Recording a click is the one unauthenticated **write** (`$inc` on `clickCount`, insert into `click`). It's scoped to the link id, takes no caller-supplied `userId`, and writes nothing else. Rate limiting / bot filtering: **TBD**.

---

## 6. Reading and returning data

**Documents don't cross the server/client boundary.** A Mongoose document carries methods and an `ObjectId`, neither of which serialises. Per `architecture.md` §1, props must be plain objects.

- Use `.lean()` on every read whose result leaves the query layer. It returns plain objects and is measurably faster.
- `ObjectId` still isn't serialisable after `.lean()`. Map ids to strings at the query-layer boundary and return the app-level type from `lib/types`, so features never see an `ObjectId`.
- `Date` is fine to pass to a Client Component, but format on the server where you can — it avoids a locale mismatch at hydration.
- Project explicitly (`.select()`) on reads that feed a public page. Default-everything is how a private field ends up in the RSC payload.

Where to put the mapping: a `toProfile(doc)` / `toLink(doc)` function per model in its query module. One place per shape, so a new field is exposed deliberately.

### Error handling

| Case                             | Handling                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Validation failure               | Mongoose `ValidationError` — input already passed Zod, so the two schemas have drifted. A bug: let it throw, and fix the schema |
| Duplicate key (`code === 11000`) | expected for `handle` and `email`; caught in the query and returned as an outcome (`"taken"`) the action maps to a field error  |
| Nothing matched                  | `null` — the caller decides                                                                                                     |
| `CastError` on a malformed id    | shouldn't happen — ids are validated as ObjectIds first. If it does, it throws                                                  |
| Connection failure               | let it throw to the nearest `error.tsx`                                                                                         |

Nothing from a Mongoose error — message, path, or code — goes into an action result (`errors-and-validation.md` §7).

Transactions: needed for anything spanning two collections (deleting a link and its clicks, creating a user plus profile at signup). They require a replica set — Atlas has one, a bare local `mongod` does not. Development runs on Atlas (§2), so transactions work in dev too.

---

## 7. Checklist for a new query

1. Does it take `userId` as its first parameter? (Unless it's the public-profile read.)
2. Is `userId` in the **filter**, not checked after the fetch?
3. Is `userId` from the session, not from the caller's input?
4. `await connectToDatabase()` first?
5. `.lean()`, and ids mapped to strings before returning?
6. Is there an index covering the fields it filters and sorts on?
7. If it's a write — validators on, and the duplicate-key case handled?
