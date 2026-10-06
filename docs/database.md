# Linkbase — Data Layer

MongoDB via Mongoose. Mongoose owns the schema, validation, and the connection pool; the app only ever talks to it through `lib/db`. Read this before writing a query, adding a field, or touching a Server Action that writes.

Structure and import rules come from `architecture.md` — this doc is the `lib/db` half of it in detail. Anything undecided is marked **TBD**.

> Mongoose is **not installed yet**: `npm i mongoose`. Nothing in this doc is in the repo — it's the target shape.

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

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not set");
}

// Survives HMR in dev and module re-evaluation between invocations in prod.
const globalForMongoose = globalThis as typeof globalThis & {
  _mongoose?: { conn: Mongoose | null; promise: Promise<Mongoose> | null };
};

const cached = (globalForMongoose._mongoose ??= { conn: null, promise: null });

export async function connectToDatabase(): Promise<Mongoose> {
  if (cached.conn) return cached.conn;

  cached.promise ??= mongoose.connect(MONGODB_URI, {
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

Re-evaluating a model file calls `mongoose.model()` again and throws `OverwriteModelError`. Every model is registered through the existing-model check:

```ts
export const Link = (mongoose.models.Link ??
  mongoose.model<LinkDoc>("Link", linkSchema)) as Model<LinkDoc>;
```

### Environment

| Variable      | Notes                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `MONGODB_URI` | full connection string including the database name. Local dev value in `.env.local`, never committed |

Hosting target and whether dev runs against a local `mongod` or a shared Atlas cluster: **TBD**.

---

## 3. Layout

```
src/lib/db/
  index.ts          # public surface — the only thing features import
  connect.ts        # the cached connection helper
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

| Convention          | Why                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `strict: true`      | an unknown key is dropped rather than silently persisted, so a typo in an action can't invent a field                             |
| `strictQuery: true` | an unknown key in a _filter_ throws instead of being ignored — a dropped filter clause is how a query silently stops being scoped |
| `timestamps: true`  | `createdAt` / `updatedAt` on everything; no hand-maintained date fields                                                           |
| `index` on `userId` | every query filters on it (§5), so every collection that has it indexes it                                                        |
| `index` on `handle` | unique, and the public profile route looks up by it on every request                                                              |
| `versionKey: false` | we don't use optimistic concurrency; `__v` only leaks into serialised output                                                      |

`strict: true` is Mongoose's default — it's set explicitly anyway, so the guarantee is visible in the file and survives a future default change. `strictQuery` is **not** the default in Mongoose 8 and has to be set.

### Models

Field lists follow the UI in `ui.md` (§1.21, §2.4, §2.5). Types for the app live in `lib/types`; the document interfaces live beside their schema.

**`user.ts`** — the account. `email` (required, lowercase, unique), auth provider fields (**TBD**, depends on the auth decision in `architecture.md`). A user's `_id` is the `userId` every other collection is scoped by.

**`profile.ts`** — one per user: `userId` (unique — one profile per account), `handle`, `displayName`, `bio`, `theme`, `socials`, `published`.

```ts
import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ProfileDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  handle: string;
  displayName: string;
  bio?: string;
  themeId: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<ProfileDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    handle: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
      match: /^[a-z0-9._]+$/,
    },
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    bio: { type: String, trim: true, maxlength: 160 },
    themeId: { type: String, required: true, default: "default" },
    published: { type: Boolean, required: true, default: false },
  },
  { strict: true, strictQuery: true, timestamps: true, versionKey: false },
);

export const Profile = (mongoose.models.Profile ??
  mongoose.model<ProfileDoc>("Profile", profileSchema)) as Model<ProfileDoc>;
```

`handle` is stored lowercase (`lowercase: true`) and matched against a lowercase-only pattern, so uniqueness is genuinely case-insensitive without a collation index. The reserved-handle list (`app`, `api`, `login`, `admin`, …) is enforced in `handleSchema` (`lib/validation`): **TBD** — needs a list before it can be written. The pattern and length match `handleSchema` in `lib/validation/fields.ts` (lowercase letters, digits, `.` and `_`, 3–24 characters — `errors-and-validation.md` §8); change them together.

**`link.ts`** — the rows in the editor: `userId`, `profileId`, `title`, `url`, `visible`, `order`, `clickCount`. Indexes: `userId`, plus compound `{ userId: 1, order: 1 }` for the ordered list read, and `{ profileId: 1, visible: 1, order: 1 }` for the public page.

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
    { new: true, runValidators: true },
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
- **`strictQuery: true` protects the scope.** With it off, a mistyped `{ userid }` is dropped from the filter and the query silently returns everyone's rows. With it on, it throws.

### The public-profile exception

Public profile pages are read by handle, by visitors with no session, through `getPublicPage` in `queries/public-page.ts`:

```ts
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

  return toPublicPage(profile, links);
}
```

The exported `getPublicPage` wraps this in `unstable_cache` and React `cache()`; the full version is in `data-fetching.md` §3.2. The handle arrives already validated and lowercased by `handleSchema`, so the query doesn't normalise it again.

This is the **only** unscoped read, and it's constrained in three ways: it's read-only, it filters on `published: true`, and it projects only the fields the public page renders — never `userId`, never the owner's email, never an unpublished profile. The link read is scoped by `profileId` and `visible: true`. Because the result is cached and shared by every visitor, a field that slips past the projection is both public and persisted. Any new unscoped query needs the same treatment, a reason, and its own place in `public-page.ts`.

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

Transactions: needed for anything spanning two collections (deleting a link and its clicks, creating a user plus profile at signup). They require a replica set — Atlas has one, a bare local `mongod` does not. Whether dev runs a replica set: **TBD**.

---

## 7. Checklist for a new query

1. Does it take `userId` as its first parameter? (Unless it's the public-profile read.)
2. Is `userId` in the **filter**, not checked after the fetch?
3. Is `userId` from the session, not from the caller's input?
4. `await connectToDatabase()` first?
5. `.lean()`, and ids mapped to strings before returning?
6. Is there an index covering the fields it filters and sorts on?
7. If it's a write — validators on, and the duplicate-key case handled?
