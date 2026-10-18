# Linkbase

**One link. Everything you are.**

Linkbase is a link-in-bio page builder. Put your videos, shop, newsletter and socials on one page, then share a single link in every bio.

**Live:** https://linkbase-lemon.vercel.app

## Features

- **Your own page** at `/user/<username>`, cached and fast to load.
- **Links dashboard**: add, edit inline, reorder and delete links, with a live phone preview as you work.
- **Appearance**: seven templates (Kiln, Tidepool, Halfpipe, Encore, Ledger, Hem, Rep), plus button shape and font.
- **Analytics**: clicks per day or week over 7, 30 or 90 days, and clicks per link.
- **Template gallery** at `/templates`, filterable by category.
- **Accounts**: email and password sign-up, then onboarding to pick a username and a look.

## Tech stack

| Area       | Choice                                                                |
| ---------- | --------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Server Components, Server Actions), React 19  |
| Language   | TypeScript (`strict`)                                                 |
| Styling    | Tailwind CSS v4, config-free, tokens in `src/app/globals.css`         |
| Data       | MongoDB Atlas via Mongoose 9                                          |
| Auth       | Auth.js (NextAuth v5) credentials, passwords hashed with Argon2       |
| Validation | Zod 4                                                                 |
| Testing    | Vitest for unit tests, Playwright MCP for end-to-end QA               |
| Deployment | GitHub Actions → Vercel, with a Docker image for a reproducible build |

## Getting started

### Prerequisites

- Node.js 24
- A MongoDB database. A free MongoDB Atlas cluster works.

### Setup

```bash
git clone https://github.com/stanley-agwu/linkbase.git
cd linkbase
npm ci
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable      | Required       | Value                                                                                  |
| ------------- | -------------- | -------------------------------------------------------------------------------------- |
| `MONGODB_URI` | yes            | Your connection string, **including a database name** (e.g. `…mongodb.net/linkbase?…`) |
| `AUTH_SECRET` | yes            | A random secret: `openssl rand -base64 32`                                             |
| `AUTH_URL`    | outside Vercel | The app's origin, e.g. `http://localhost:3000` when running the Docker image           |

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command              | What it does                    |
| -------------------- | ------------------------------- |
| `npm run dev`        | Development server on port 3000 |
| `npm run build`      | Production build                |
| `npm start`          | Serve the production build      |
| `npm run lint`       | ESLint (type-aware)             |
| `npm run typecheck`  | `tsc --noEmit`                  |
| `npm run format`     | Format with Prettier            |
| `npm test`           | Run the Vitest unit tests once  |
| `npm run test:watch` | Vitest in watch mode            |

Run `npx next typegen` once on a fresh clone before `lint` or `typecheck`; it generates the route types those need. `dev` and `build` generate them too.

## Project structure

```
src/
  app/
    (marketing)/     landing page and /templates
    (auth)/          /login, /signup
    (onboarding)/    username, then pick a look
    (dashboard)/     /dashboard, /dashboard/appearance, /dashboard/analytics
    user/[handle]/   public profile pages
    not-found.tsx    app-wide 404
  components/        ui primitives, plus marketing, profile and auth components
  lib/               db (Mongoose models and queries), auth, validation, analytics
  proxy.ts           route protection: every route is private unless listed public
docs/                the project's conventions; start here before changing code
```

## Testing

- **Unit tests** (Vitest) cover pure functions and Zod schemas. They sit next to the code as `*.test.ts`.
- **End-to-end QA** runs in a real browser through Playwright MCP, against a separate test database. There are no committed end-to-end specs.

See [`docs/testing.md`](docs/testing.md).

## Deployment

Every pull request runs format, lint, typecheck, unit tests, a dependency audit and a Docker build with a smoke test. A preview deploys to Vercel when they pass. Merging to `main` deploys to production and then smoke-tests the live site.

Run the production image locally:

```bash
docker build -t linkbase .
docker run --rm -p 3000:3000 --env-file .env.local -e AUTH_URL=http://localhost:3000 linkbase
```

Pipeline details, secrets and first-time setup are in [`docs/deployment.md`](docs/deployment.md).

## Documentation

The `docs/` folder records how this codebase is built. Read the relevant doc before changing that area:

| Doc                                                         | Covers                                                   |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| [`architecture.md`](docs/architecture.md)                   | Code layout, Server vs Client Components, naming         |
| [`routing.md`](docs/routing.md)                             | URL map, route groups, protected routes                  |
| [`auth.md`](docs/auth.md)                                   | Sessions, route protection, identity in Server Actions   |
| [`database.md`](docs/database.md)                           | Mongoose models, schema conventions, user-scoped queries |
| [`data-fetching.md`](docs/data-fetching.md)                 | Reads and caching                                        |
| [`data-mutations.md`](docs/data-mutations.md)               | Writes through Server Actions                            |
| [`errors-and-validation.md`](docs/errors-and-validation.md) | Zod validation and error handling                        |
| [`security.md`](docs/security.md)                           | Secrets, headers, rate limiting, user content            |
| [`design-system.md`](docs/design-system.md)                 | Colour, type and spacing tokens                          |
| [`ui.md`](docs/ui.md)                                       | Components and page layouts                              |
| [`coding-standards.md`](docs/coding-standards.md)           | TypeScript, formatting, import order                     |
| [`testing.md`](docs/testing.md)                             | Unit tests and QA                                        |
| [`deployment.md`](docs/deployment.md)                       | CI/CD, Docker, Vercel, MongoDB Atlas                     |
| [`git-conventions.md`](docs/git-conventions.md)             | Branches, Conventional Commits, pull requests            |

## Contributing

Branch from `main` as `<type>/<description>` (for example `feat/link-scheduling`). Write Conventional Commits and open a pull request. See [`docs/git-conventions.md`](docs/git-conventions.md).
