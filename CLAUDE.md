# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # dev server on http://localhost:3000
npm run build        # production build — the full gate (types + lint)
npm start            # serve the production build
npm run lint         # eslint (flat config, no path arg needed)
npm run lint:fix     # eslint --fix (autofixes import order)
npm run typecheck    # tsc --noEmit
npm run format       # prettier --write .
npm run format:check # prettier --check . — for CI
```

ESLint is **type-aware** here (`projectService` in `eslint.config.mjs`), so lint needs a valid tsconfig and is slower than a syntax-only lint. It still isn't a substitute for `npm run typecheck` — it only type-checks what its rules ask about.

There is no test runner configured yet. If you add one, document the single-test invocation here.

## State of the repo

LinkBase is a freshly scaffolded `create-next-app` project — only `src/app/{layout,page}.tsx` and `globals.css` exist. There is no feature code, no `src/components`, `src/lib`, API routes, or data layer yet. Expect to create those directories rather than find them, and keep `@/*` (→ `./src/*`) imports rather than relative traversal.

## Stack specifics that affect how you write code

- **Next.js 16 App Router** with React 19. `AGENTS.md` applies: this Next major has breaking changes from older training data, so read the relevant guide under `node_modules/next/dist/docs/` (`01-app/` for App Router, `03-architecture/`) before writing routing, caching, data-fetching, or `next.config.ts` code.
- **Generated route types are globals.** `layout.tsx` types its props as `LayoutProps<"/">` — these come from `.next/types` and are not imported. Use `LayoutProps<path>` / `PageProps<path>` for new layouts and pages instead of hand-written prop interfaces; they only resolve after `next dev` or `next build` has generated types.
- **Tailwind CSS v4, config-free.** There is no `tailwind.config.*`. Tailwind is pulled in via `@import "tailwindcss"` in `src/app/globals.css`, and theme tokens are declared there in an `@theme inline` block wired to CSS custom properties. Extend the design system by editing `globals.css`, not by adding a JS config.
- **Dark mode is `prefers-color-scheme` only** — it redefines `--background`/`--foreground` on `:root`. There is no `dark:` class strategy or theme toggle; adding one means changing that mechanism in `globals.css`.
- **Fonts** are Geist / Geist Mono loaded through `next/font/google` in the root layout and exposed as `--font-geist-sans` / `--font-geist-mono`. Note `globals.css` currently hardcodes `body { font-family: Arial... }`, overriding the `--font-sans` token — fix that there if typography looks wrong.
- TypeScript is `strict`, `noEmit`, bundler module resolution.

## Live Docs (Context7)

Before writing code that uses Next.js, Mongoose, NextAuth, Zod, or any other library, pull the current docs for it through Context7 first. Do not rely on training data for API signatures, config options, or version-specific behavior — check them against the docs Context7 returns for the version this repo has installed.

If Context7 has no entry for a library, say so before proceeding, so it's clear the code that follows isn't backed by live docs.

## Doc Convention

Whenever a new file is created in `/docs`, add it to the Project Docs section below with one line on what it covers and when to read it.

### Project Docs

- `docs/architecture.md` — the code structure: the Server-Components-by-default rendering model and when to opt into `"use client"`, the `src/` directory layout (`app` for routing, `components/ui` for primitives, `components/[feature]` for feature components, `lib/{db,auth,types}` for shared code), import direction, Server Action rules, and the naming conventions (kebab-case files, PascalCase components, verb-first actions). Read it before adding a file, a route, or a data-access path.
- `docs/auth.md` — auth and access control: what NextAuth owns (sign-in, sessions, cookies, CSRF), the `lib/auth` session helpers, the three enforcement layers and which are actually security boundaries, route protection in `proxy.ts` (default-deny for `app/(dashboard)/*`, public `/user/[handle]`), and the identity rules for every Server Action. Read it before adding a route, an action, or anything that reads a user id.
- `docs/coding-standards.md` — how code is written and checked: what `strict` does and doesn't cover, the no-`any` / `@ts-expect-error`-with-a-reason rules, the Prettier setup, the three-group import order, components as function declarations with named props types, the default-export exception list for Next route files (kept as `ROUTE_FILES` in `eslint.config.mjs`), async/await over `.then` chains, and real `Error` objects (plus `unstable_rethrow` around `redirect()`). Says for each rule whether it's a lint gate or a review convention. Read it before writing a file.
- `docs/data-fetching.md` — how reads work: Server Components call `lib/db` directly (never `fetch` to our own API routes), private reads scoped by `requireUserId()` and public reads by a validated handle, what's cached (the public profile page, via `unstable_cache` tagged per handle — private reads aren't) and why, the `cacheTags` registry, which mutations clear which tags with `revalidateTag(tag, { expire: 0 })`, Client Components getting data only as props, the Server Action exception for input-driven reads like handle availability, and the migration path to `"use cache"`. Read it before writing a page, a query, or anything that caches.
- `docs/data-mutations.md` — how writes work: Server Actions only (never API routes), where actions live and how they're named, the five steps every action runs (session → Zod validate → scope to the user id in the query filter → write → revalidate), the `ActionResult` returned for expected failures versus throwing for unexpected ones, which revalidation call to use and the split between tag invalidation in `lib/db` and the view refresh in the action, calling actions with and without a form, destructive writes, and webhooks as the one Route Handler exception. Read it before writing anything that changes data.
- `docs/database.md` — the data layer: MongoDB via Mongoose, the single cached connection helper in `lib/db` (and why it's cached on `globalThis`), model layout under `lib/db/models`, the schema conventions (`strict`, `strictQuery`, `timestamps`, indexes on `userId` and `handle`), the rule that every query is scoped to the signed-in user's id, the public-profile exception, and serialising documents across the server/client boundary. Read it before writing a query, adding a field, or touching an action that writes.
- `docs/design-system.md` — the design foundations: colour tokens (cream/ink/ember/iris + semantic aliases), typography scales, spacing, radius, borders, shadows, motion, the profile-template palette, and a ready-to-paste Tailwind v4 `@theme` block. Read it before writing any styling, adding a token, or setting up `globals.css`/fonts.
- `docs/errors-and-validation.md` — validation and failure handling: Zod 4 at the Server Action boundary (identity → `safeParse` → query), shared schemas in `lib/validation` (client-safe, one definition per field), the `ActionResult` type returned for expected failures and rendered inline next to fields, unexpected errors thrown to the nearest `error.tsx` (fixed copy + digest), logging through `onRequestError` and `lib/logger`, and every path by which a raw error message could leak to the client. §8 is the still-open handle-rule conflict between `database.md` and `ui.md`. Read it before writing a Server Action, a form, or an `error.tsx`.
- `docs/git-conventions.md` — how work is branched, committed, reviewed, and merged: `<type>/<description>` branch names, Conventional Commits with an imperative subject and the six allowed types, one logical change per commit with each commit building, the branch → PR → squash-merge flow, the required human review (agent-written changes included), and why `main` is never committed to directly. Read it before your first commit on a new piece of work.
- `docs/routing.md` — the URL map and the file conventions behind it: which routes are public (`/`, `/user/[handle]`) vs authenticated, the three route groups (`(marketing)`, `(auth)`, `(dashboard)`) and why groups don't affect URLs, default-deny protection in `proxy.ts` (the file Next 16 renamed from `middleware`), when a segment earns its own `layout`/`loading`/`error`/`not-found`, the `error.tsx` rules (`"use client"`, `retry` not `reset`, digest-only messages in production), and why `app/api` is reserved for webhooks and OAuth callbacks while everything else is a Server Action. Read it before adding a route or an endpoint. §7 lists route-shape conflicts with `ui.md`/`architecture.md` that are still open.
- `docs/security.md` — the protections around auth: secrets in environment variables with `.env.local` ignored and `.env.example` as the committed template (and the `.gitignore` negation that makes that possible), static security headers in `next.config.ts` versus nonce-based CSP in `proxy.ts`, which endpoints need rate limiting and why sign-in needs two counters, and user-generated content — React's escaping, `http`/`https`-only link URLs, and `rel="noopener noreferrer"` on outbound links. Read it before adding an env var, touching headers, or rendering anything a user typed.
- `docs/ui.md` — the component and layout spec: every component's props, variants, sizes and states (Button, ClaimInput, TextField, Toggle, Chip, NavBar, cards, profile and editor pieces), the page layouts (marketing, signup, editor, public profile), content conventions, and accessibility notes. Read it before building or changing a component or page layout.
