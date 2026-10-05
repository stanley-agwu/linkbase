# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # dev server on http://localhost:3000
npm run build    # production build (also the only full type-check gate)
npm start        # serve the production build
npm run lint     # eslint (flat config, no path arg needed)
npx tsc --noEmit # type-check without building
```

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

## Doc Convention

Whenever a new file is created in `/docs`, add it to the Project Docs section below with one line on what it covers and when to read it.

### Project Docs

- `docs/architecture.md` — the code structure: the Server-Components-by-default rendering model and when to opt into `"use client"`, the `src/` directory layout (`app` for routing, `components/ui` for primitives, `components/[feature]` for feature components, `lib/{db,auth,types}` for shared code), import direction, Server Action rules, and the naming conventions (kebab-case files, PascalCase components, verb-first actions). Read it before adding a file, a route, or a data-access path.
- `docs/database.md` — the data layer: MongoDB via Mongoose, the single cached connection helper in `lib/db` (and why it's cached on `globalThis`), model layout under `lib/db/models`, the schema conventions (`strict`, `strictQuery`, `timestamps`, indexes on `userId` and `handle`), the rule that every query is scoped to the signed-in user's id, the public-profile exception, and serialising documents across the server/client boundary. Read it before writing a query, adding a field, or touching an action that writes.
- `docs/design-system.md` — the design foundations: colour tokens (cream/ink/ember/iris + semantic aliases), typography scales, spacing, radius, borders, shadows, motion, the profile-template palette, and a ready-to-paste Tailwind v4 `@theme` block. Read it before writing any styling, adding a token, or setting up `globals.css`/fonts.
- `docs/ui.md` — the component and layout spec: every component's props, variants, sizes and states (Button, ClaimInput, TextField, Toggle, Chip, NavBar, cards, profile and editor pieces), the page layouts (marketing, signup, editor, public profile), content conventions, and accessibility notes. Read it before building or changing a component or page layout.
