# Linkbase — Security

Secrets, response headers, rate limiting, and the handling of user-generated content. Read this before adding an environment variable, touching `next.config.ts`, or rendering anything a user typed.

Scope: the measures that protect the app and its visitors. `auth.md` owns identity and access control — who a request is, and which routes and rows they may touch — and is the larger half of security in this app; this doc covers everything around it. `errors-and-validation.md` owns input validation and what may leak through an error message, `data-mutations.md` the write path. Anything undecided is marked **TBD**.

> **Partly implemented.** Done: §1.1's `.gitignore` negation and `.env.example` (with `MONGODB_URI`), and `ProfileLink` (preview-only so far). Not yet: `next.config.ts` has no `headers()` (§2.1 is the next thing to do), no CSP, no rate limiter, and no real profile links.

---

## 1. Secrets

### 1.1 Where they live

**Secrets live in environment variables. Never in code, never in the repo.** Not in `next.config.ts`, not in a `constants.ts`, not in a comment, not in a test fixture, and not in a doc — including this one.

| File                   | Committed? | Holds                                                                  |
| ---------------------- | ---------- | ---------------------------------------------------------------------- |
| `.env.local`           | **No**     | real development values — the file you actually edit                   |
| `.env.example`         | **Yes**    | every variable name the app needs, with empty or obviously fake values |
| Production environment | n/a        | set in the host's dashboard, never in a file                           |

`.gitignore` ignores `.env*`, which covers `.env.local` — **and would also cover `.env.example`**, so it carries a negation for the template:

```gitignore
# env files (can opt-in for committing if needed)
.env*
!.env.example
```

Verify it with `git check-ignore .env.example` (no output means it's committable) rather than assuming. Don't add `-v` for this check: with `-v` it prints the matching `!.env.example` rule even though the file isn't ignored.

### 1.2 `.env.example`

The template is the list of variables a new contributor must fill in, and it's the only place that list exists. Every variable the app reads appears here with a safe placeholder, and it's updated in the **same commit** that starts reading a new one.

```bash
# MongoDB Atlas connection string, including the database name (database.md §2)
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/linkbase?retryWrites=true&w=majority

# Signs and encrypts the session token — generate with: openssl rand -base64 32
AUTH_SECRET=

# Canonical origin; only needed when the deployment can't infer it
AUTH_URL=http://localhost:3000

# Google provider (ui.md §2.3 step 2)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

- **Placeholders must be obviously fake or empty.** A real-looking value gets copied into production by someone in a hurry.
- A localhost URL is not a secret and is a useful default. A key, a token, or a password is left empty.
- The authoritative notes on each auth variable are in `auth.md` §1; `MONGODB_URI` is in `database.md` §2. Don't duplicate the explanations here — just the names and placeholders.

### 1.3 Reading them

- **Server-side only.** `process.env.X` is read in `lib/db`, `lib/auth`, Server Components, and Server Actions. All three of those `lib` modules import `"server-only"`, so a client import is a build error (`architecture.md` §1).
- **`NEXT_PUBLIC_` makes a value public, permanently.** The prefix inlines the value into the browser bundle at build time. It is for things that are genuinely public — a site URL, an analytics id. A secret with this prefix is published to every visitor, and rotating it means a rebuild. Nothing in this app needs the prefix today.
- **Fail loudly at startup, not at the first request.** A missing required variable throws immediately:

  ```ts
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");
  ```

  That message is safe — it names the variable, never its value.

- **Never log or return a secret.** Not in an error message, not in a log line, not in an action result (`errors-and-validation.md` §6.3 and §7). The environment is on the "never include" side of that table.
- **`.env*` files are expanded by Next**, so `$VAR` inside one references another variable. A literal `$` in a password has to be escaped.

### 1.4 If a secret is committed

Rotate it first, then clean the history — in that order. Anything pushed must be treated as public from the moment it was pushed, because removing a commit doesn't unpublish it. Rotation is `AUTH_SECRET` regenerated (which signs every session out), database credentials changed, OAuth client secrets reissued. Whether we add a push-time secret scanner: **TBD**.

---

## 2. Security headers

### 2.1 Where they're set

Static headers go in **`next.config.ts`** — the file is TypeScript here, not `next.config.js`. They apply to every response, including static assets, and need no per-route wiring:

```ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
```

| Header                      | Value                                          | Why                                                                                                               |
| --------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `X-Frame-Options`           | `DENY`                                         | no framing of our pages, so a click on an invisible overlay can't be a click in our editor                        |
| `X-Content-Type-Options`    | `nosniff`                                      | the browser respects our `Content-Type` instead of guessing one that's executable                                 |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`              | an outbound click sends our origin, never the full path. A private handle shouldn't appear in someone else's logs |
| `Permissions-Policy`        | camera, microphone, geolocation off            | nothing here needs them; denying is free                                                                          |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS only, for two years. Only once every subdomain is HTTPS — it's hard to undo                                 |

`X-Frame-Options` is superseded by CSP's `frame-ancestors`, but it's one line and still read by older browsers, so both are set. Where they disagree, `frame-ancestors` wins in browsers that support it — keep the two in step (`DENY` ↔ `'none'`).

### 2.2 Content Security Policy

CSP is the one header that can't be a static string, because a strict policy needs a fresh nonce per request. It's set in **`proxy.ts`**, which already runs on every request for route protection (`auth.md` §4):

```ts
const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
const isDev = process.env.NODE_ENV === "development";

const csp = `
  default-src 'self';
  script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'nonce-${nonce}';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;
```

The nonce goes on the request headers (as `x-nonce`) and the policy on both request and response, per the Next CSP guide. Points specific to this app:

- **`'unsafe-eval'` in development only.** React uses `eval` in dev to rebuild server stack traces; production needs neither `unsafe-eval` nor `unsafe-inline`.
- **A nonce forces dynamic rendering** on every route the proxy covers, which defeats the cached public profile page (`data-fetching.md` §3). That tension is real and unresolved: either exclude `/user/*` from the nonce and give it a static policy, or accept uncached public pages. **TBD**, and it needs deciding before either CSP or the cache ships.
- **Our own styling needs a plan.** Tailwind v4 compiles to a stylesheet, which `'self'` covers, but the profile themes set colours per profile (`ui.md` §1.18). If those land as inline `style` attributes, `style-src` needs `'unsafe-inline'` — which weakens the policy. Prefer CSS custom properties set on one nonce'd `<style>` element, or a data attribute plus a static class.
- **`img-src` will need widening** for user avatars, and `SocialIcons` already loads from `cdn.simpleicons.org` (`ui.md` §1.19) — that host must be listed in `img-src` or the icons silently disappear.
- **Report before you enforce.** Ship as `Content-Security-Policy-Report-Only` first and read the violations; a strict policy that breaks sign-in is worse than no policy. Where reports go: **TBD**.
- The proxy's matcher should skip `_next/static`, `_next/image`, and prefetches, so the header isn't computed for assets that don't need it.

Testing: headers don't appear in `next dev` the same way they do in a real response. Check with `curl -I` against `npm run build && npm start` before calling this done.

---

## 3. Rate limiting

Nothing is rate limited today. Every item here is **TBD** as to implementation, but the targets and the reasons are not:

| Endpoint                                    | Why it needs a limit                                                                                                    | Suggested shape            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Sign-in                                     | credential stuffing and password brute force. Without a limit, an attacker gets unlimited guesses against every account | per IP **and** per email   |
| Sign-up                                     | bulk account creation, handle squatting                                                                                 | per IP                     |
| Handle availability check                   | fires per keystroke by design (`data-fetching.md` §5.1), so it's the cheapest endpoint to hammer and enumerates handles | per session, plus debounce |
| Link creation                               | spam link farms on public profiles, and unbounded rows per account                                                      | per user, plus a hard cap  |
| Click recording                             | the one unauthenticated write (`database.md` §5) — trivially inflated to fake analytics                                 | per IP per link            |
| Password reset / email send, once it exists | mail-bombing someone else's address                                                                                     | per IP and per address     |

Rules that hold whatever we implement:

- **Limit on the server, inside the action.** A disabled button is not a limit; actions are reachable by direct POST (`data-mutations.md` §1).
- **Sign-in needs two counters.** Per-IP alone lets a botnet spread guesses across addresses; per-account alone lets one IP walk the whole user list. Count both, and make the per-account counter the strict one.
- **Don't leak the limiter's state.** "Too many attempts for this account" confirms the account exists. The message is the same whether or not it does.
- **A rate-limit rejection is an expected failure** — a `formError`, not a thrown error (`errors-and-validation.md` §1).
- **Cap totals as well as rates.** A per-minute limit on link creation still allows a hundred thousand links over a week. Links per profile needs a maximum: **TBD**.
- **Counters need shared storage.** In-memory state doesn't survive a restart and isn't shared between instances, so it's not a limit in production. Where it lives (MongoDB with a TTL index, or something like Upstash): **TBD** — and a MongoDB-backed counter must not be read from `proxy.ts`, which can't touch the database (`database.md` §1).
- Bot filtering on click recording (as opposed to rate limiting) is separately **TBD** (`database.md` §5).

---

## 4. User-generated content

Everything on a public profile is user-typed: display name, bio, link titles, link URLs, social handles. All of it is hostile until proven otherwise.

### 4.1 Rendering text

**React escapes text by default.** `{link.title}` is safe no matter what it contains — that's the main defence, and it's free.

What breaks it:

- **`dangerouslySetInnerHTML`.** Not used anywhere in this app, and it needs a review and a sanitiser (and an entry in this doc) before it is. If bios ever support formatting, the answer is a Markdown renderer with HTML disabled, not raw HTML.
- **User text in a `<style>`, a `style` attribute, or a URL.** Those aren't HTML-escaped contexts, so React's escaping doesn't apply. Theme colours come from our own fixed palette (`design-system.md`), never from user input.
- **User text in an attribute that executes.** `href` is the one that matters — see below.

### 4.2 Link URLs

A URL is the one piece of user content rendered into an executable position, so it's validated on the way in **and** constrained on the way out:

- **`http` and `https` only**, enforced by `urlSchema` at the action boundary: `z.url({ protocol: /^https?$/ })`. Plain `z.url()` accepts `javascript:` and `data:`, and a `javascript:` URL in an `href` is stored XSS on a page we serve (`errors-and-validation.md` §2.3).
- **Validate again on render if the data predates the rule.** Anything stored before the schema existed wasn't checked by it. A link whose protocol isn't `http`/`https` is not rendered.
- **Never put a user URL anywhere but `href`.** Not in a `fetch` from the server (that's SSRF — a URL the user controls, requested by our server, possibly against an internal address), not in an `img src`, not in a redirect target. Link preview and favicon fetching are **TBD** for exactly this reason (`data-fetching.md` §3.6); when they land they need an allowlist and a block on private address ranges.
- **The displayed text isn't the destination.** A title reading "google.com" can point anywhere. That's inherent to the product, but it means the public page must not imply verification.

### 4.3 Outbound links

**Every link to a user-supplied destination opens with `rel="noopener noreferrer"`:**

```tsx
<a href={link.url} target="_blank" rel="noopener noreferrer">
  {link.title}
</a>
```

- **`noopener`** stops the opened page from reaching back through `window.opener` and navigating ours — tabnabbing, where our tab is replaced with a fake sign-in page while the visitor is looking at the other one. Modern browsers imply this for `target="_blank"`, but we state it: the behaviour isn't universal, and it's one attribute.
- **`noreferrer`** stops the handle being sent in the `Referer` header. §2.1's `Referrer-Policy` already trims it to the origin; this removes it entirely for outbound clicks, which is the right default for links on someone else's profile.
- **`target="_blank"` is the product decision** (keep the profile open), not a security one. The `rel` is required either way — `noreferrer` matters for same-tab navigation too.
- This applies to `ProfileLink` (`ui.md` §1.18) and `SocialIcons` (§1.19). Neither spec currently mentions `rel` — fixing that is part of building them.
- Our **own** internal links use `next/link` and need no `rel`.

### 4.4 Serving user content

- **Project explicitly on the public read.** The public page gets `handle`, `displayName`, `bio`, `themeId`, and each link's `title` and `url` — never `userId`, never an email, never an unpublished profile (`database.md` §5). The result is cached and shared by every visitor, so a leaked field is public and persisted (`data-fetching.md` §3.2).
- **Props are public.** Anything passed to a Client Component is in the RSC payload and readable in dev tools. Pass the fields the component renders, nothing more (`data-fetching.md` §5).
- **Handles are a namespace.** Reserved words (`api`, `login`, `admin`, `app`) must not be claimable, or a profile shadows a route or impersonates the product. The list is **TBD** and belongs in `handleSchema` (`database.md` §4).
- **Profile pages are user content on our origin**, which is why CSP matters more here than on the marketing pages: a payload that does get through runs with our origin's privileges.
- Abuse reporting and takedown for phishing links: **TBD**. A links-in-bio product will be used for phishing eventually.

---

## 5. Checklist

Adding an environment variable:

1. In `.env.example` with a fake or empty placeholder, in the same commit that reads it?
2. Read server-side only, with no `NEXT_PUBLIC_` prefix unless the value is genuinely public?
3. Throws at startup if it's required and missing?
4. Absent from logs, error messages, and action results?

Rendering user content:

5. Rendered as text (no `dangerouslySetInnerHTML`), and not interpolated into a `style` or a URL?
6. If it's a URL: validated `http`/`https` on input, and only ever in an `href`?
7. If it leaves our origin: `rel="noopener noreferrer"`?
8. Does the query project only the fields the page shows?

Changing headers or limits:

9. Static headers in `next.config.ts`, CSP in `proxy.ts`, and `X-Frame-Options` still agreeing with `frame-ancestors`?
10. Verified against `npm run build && npm start` with `curl -I`, not just `next dev`?
11. Does every endpoint in §3's table still have a limit, including any new one?

---

## 6. Not decided yet

| Item                                                              | Status                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------- |
| CSP: nonce-based (dynamic) vs. static, and the cached public page | **TBD** — §2.2, blocks both CSP and the public-page cache     |
| CSP violation reporting destination                               | **TBD** — §2.2                                                |
| How profile theme colours are applied without `'unsafe-inline'`   | **TBD** — §2.2                                                |
| Rate limiter: storage and library                                 | **TBD** — §3                                                  |
| Maximum links per profile                                         | **TBD** — §3                                                  |
| Bot filtering on click recording                                  | **TBD** — `database.md` §5                                    |
| Reserved-handle list                                              | **TBD** — `database.md` §4                                    |
| Link preview / favicon fetching, and its SSRF allowlist           | **TBD** — §4.2                                                |
| Abuse reporting and takedown                                      | **TBD** — §4.4                                                |
| Secret scanning on push                                           | **TBD** — §1.4                                                |
| Dependency audit in CI (`npm audit`, Dependabot)                  | **TBD** — nothing runs today (`coding-standards.md` §9)       |
| `experimental.taint` for extra server-data protection             | **TBD** — the `"server-only"` boundary is the primary defence |
