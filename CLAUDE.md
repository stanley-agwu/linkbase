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
