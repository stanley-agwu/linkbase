# Linkbase — Deployment

How code gets from a branch to production: the GitHub Actions pipeline, the Docker image every CI step runs in, the two deploy flows (preview on a pull request, production on a merge to `main`), where environment variables and secrets live, and how production reaches MongoDB Atlas. Read this before touching `.github/`, the `Dockerfile`, `vercel.json`, or any environment variable in Vercel or GitHub.

Scope: building, checking, and shipping. `security.md` owns secrets hygiene in the code (`.env.example`, reading `process.env`, never logging a value) and the response headers; this doc owns where each value is _stored_ per environment and how the pipeline uses it. `database.md` owns the connection helper and the schemas; this doc owns the production cluster around them. `git-conventions.md` owns the branch → PR → squash-merge flow that triggers everything here. Anything undecided is marked **TBD**.

> **Implemented in the repo; the accounts aren't set up yet.** The workflow, `Dockerfile`, `.dockerignore`, `vercel.json`, and Dependabot config exist (§10). The Vercel project, the GitHub environments and secrets, branch protection, and the production Atlas cluster don't — until §11 is done, the deploy jobs fail at their first step with an error naming what's missing. `checks` and `docker` work without any of it.

---

## 1. The pipeline at a glance

```
                 ┌─ checks ─┐
pull request ──► │          ├──► preview ──► vercel deploy --prebuilt ──────────► preview URL on the PR
                 └─ docker ─┘
                 ┌─ checks ─┐
push to main ──► │          ├──► production ──► vercel deploy --prebuilt --prod ──► smoke
                 └─ docker ─┘
```

Four rules shape everything below:

1. **Nothing deploys unless the checks pass on that exact commit.** Both deploy jobs `needs: [checks, docker]`, and `vercel.json` turns off Vercel's own Git deploys (§5.3), so there's no other path to Vercel.
2. **Every CI step runs in one pinned Docker image** — the same image the `Dockerfile` builds from (§2). "Works in Docker locally" and "works in CI" are the same claim.
3. **We build; Vercel serves.** GitHub Actions runs `vercel build` and uploads the output with `vercel deploy --prebuilt`. Vercel never builds our source itself, so the build that passed CI is the build that ships.
4. **App secrets live in Vercel, not GitHub.** GitHub holds only what it needs to talk to Vercel (§6). Runtime values are pulled into the ephemeral CI job at build time and never persisted.

---

## 2. Docker

### 2.1 What it's for

The `Dockerfile` has two targets you build directly, and the CI image is its base:

| Target   | Command                         | What it is                                                                 |
| -------- | ------------------------------- | -------------------------------------------------------------------------- |
| `check`  | `docker build --target check .` | the full CI gate (§3), in the CI image — reproduce a CI failure locally    |
| `runner` | `docker build -t linkbase .`    | the production server: Next.js standalone output, non-root, ~minimal files |

Why a pinned container rather than the runner's own Node:

- **Native modules.** `@node-rs/argon2` installs a prebuilt binary per platform. `npm ci` on a Windows machine installs `argon2-win32-x64-msvc`; Vercel's functions run Linux x64 with glibc. The Debian image installs `argon2-linux-x64-gnu`, the one that runs. An Alpine (musl) image would install a third — **don't switch the base to Alpine.**
- **One Node version** everywhere: the image, `engines` in `package.json`, and Vercel's runtime (§2.2).
- **Byte-for-byte reproduction.** A red `checks` job reruns locally with `docker build --target check .`.

**Vercel doesn't run the image.** On Vercel the app runs through Vercel's verified Next.js adapter (`node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md`), which is what backs `unstable_cache` / `revalidateTag` (`data-fetching.md`) across instances. Vercel's Container Images (Beta) would replace that adapter with a generic container — not worth it here. The `runner` image is the portable deployment: for self-hosting, for running a production build locally, and as a fallback host. CI builds and boots it on every PR (§4.2) so it never rots.

### 2.2 The image

```
node:24.22.0-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5
```

- **Node 24**, matching development. `package.json` has `"engines": { "node": "24.x" }`, which Vercel reads to pick its function runtime.
- **Tag and digest.** The digest is what Docker resolves — a tag can be re-pointed, a digest can't. The exact-version tag is there for humans; Docker ignores it when a digest is present.
- **It appears in four places**: the `Dockerfile` `ARG NODE_IMAGE` and the three `container.image` lines in the workflow. The first step of `checks` fails if they differ, so a half-done bump can't merge.
- **Bumping it** is a `chore` commit on its own: resolve the new tag's index digest (`docker buildx imagetools inspect node:<version>-bookworm-slim`), replace all four, and let `checks` and `docker` prove it. Dependabot doesn't do this (§8.1).

### 2.3 The `Dockerfile`, stage by stage

| Stage     | From      | Does                                                                                                                         |
| --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `deps`    | the image | `npm ci` against the lockfile only, so the layer is cached until `package-lock.json` changes                                 |
| `check`   | `deps`    | format, `next typegen`, lint, typecheck, unit tests, production `npm audit` — the same list as the `checks` job              |
| `builder` | `deps`    | `next build` with `NEXT_OUTPUT=standalone` (read by `next.config.ts`) — no secrets                                           |
| `runner`  | the image | copies only `.next/standalone`, `.next/static`, and `public`; runs `node server.js` as the `node` user, with a `HEALTHCHECK` |

Decisions worth knowing:

- **The build needs no secrets.** `lib/db/connect.ts` reads `MONGODB_URI` on first connect, not at import, and the build never connects. The startup check lives in `register()` in `src/instrumentation.ts`, which runs when the server starts and never during `next build`. So no credential is ever in a layer, and a container started without `MONGODB_URI` refuses to serve (every request 500s, with `MONGODB_URI is not set` in the log). Both verified locally.
- **`output: "standalone"` is opt-in.** `next.config.ts` sets it only when `NEXT_OUTPUT=standalone`, so Vercel builds are unchanged.
- **Code is root-owned; the app runs as `node`.** The server can't modify its own files. Only `.next/cache` (Next's on-disk cache for `unstable_cache`) is writable.
- **`.dockerignore` excludes `.env*`** (except `.env.example`), `.git`, `node_modules`, `.next`, and `.vercel`. Without the `.env*` line, `COPY . .` would bake `.env.local` — real credentials — into a layer.

### 2.4 Running the production image

```bash
docker build -t linkbase .
docker run --rm --init -p 3000:3000 --env-file .env.docker linkbase
```

`.env.docker` (matched by `.gitignore`'s `.env*`, so never committed) needs:

| Variable      | Value                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `MONGODB_URI` | the target environment's URI, database name included (§7)                                       |
| `AUTH_SECRET` | `openssl rand -base64 32` — its own value per environment                                       |
| `AUTH_URL`    | the origin users reach it on, e.g. `http://localhost:3000` — **required outside Vercel** (§6.4) |

- **`--init`** gives the server a proper PID 1 so `docker stop` shuts it down promptly.
- **Self-hosting for real** means a reverse proxy in front (TLS, request limits) and, beyond one instance, a shared cache handler — Next's default cache is per-container disk. See `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md`. Vercel handles both for us; this image is the fallback, not the plan.

Day to day, `npm run dev` stays the local workflow — it's much faster outside a container on Windows and macOS.

---

## 3. Checks — the gate before any deploy

Every pull request and every push to `main` runs `checks` and `docker` in parallel. Both deploy jobs need both.

**`checks`** (in the CI image):

| Step | Command                                   | Fails when                                                                                   |
| ---- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1    | image consistency                         | the `Dockerfile` and workflow pin different images (§2.2)                                    |
| 2    | `npm ci`                                  | `package-lock.json` is out of step with `package.json` — CI never runs `npm install`         |
| 3    | `npm run format:check`                    | a file isn't Prettier-formatted                                                              |
| 4    | `npx next typegen`                        | — generates the `LayoutProps` / `PageProps` route types (`CLAUDE.md`); they aren't committed |
| 5    | `npm run lint`                            | an ESLint rule fails; lint is type-aware, so it needs step 4                                 |
| 6    | `npm run typecheck`                       | `tsc --noEmit` finds a type error                                                            |
| 7    | `npm test`                                | a Vitest unit test fails (`testing.md` §2)                                                   |
| 8    | `npm audit --omit=dev --audit-level=high` | a production dependency has a high or critical advisory                                      |

**`docker`** (on the runner): builds the `runner` target, asserts it runs as `node`, boots it with a placeholder database, and requires `/`, `/login`, `/signup`, `/templates`, and `/api/auth/session` to return 200, signed-out `/dashboard` to return 307, and no error lines in the server log.

Points specific to this app:

- **`next typegen` before lint and typecheck.** On a fresh checkout the route-type globals don't exist, and `tsc` fails on every `LayoutProps` without them.
- **The audit covers production dependencies only.** Today `npm audit` (everything) reports five high advisories, all inside `eslint-config-next`'s dev-only tooling, whose suggested "fix" is a downgrade to Next 14. They never reach the server bundle. Production dependencies report zero.
- **The deploy job's `vercel build` is the last check.** There's no separate build in `checks` to throw away; if `next build` fails under `vercel build`, nothing deploys.
- **No secrets needed.** Unit tests never import `@/lib/db` (`testing.md` §2.2), and `docker` uses a placeholder URI and a throwaway `AUTH_SECRET`. That's what lets both run on fork PRs.
- **QA isn't in CI.** End-to-end QA is the `run-qa-suite` skill against `localhost:3000` and the test database (`testing.md` §3), run before a PR is opened. Running it against the preview URL: **TBD**, §12.
- **Prettier and Windows line endings.** With `core.autocrlf=true`, a Windows working tree has CRLF files and a local `npm run format:check` reports nearly every file. CI checks out LF and is the source of truth; locally, `npx prettier --check --end-of-line auto .` shows the real issues. A `.gitattributes` with `eol=lf` would fix this for good: **TBD**, §12.

`checks` and `docker` are **required status checks** on `main` (§8.4).

---

## 4. The workflow — `.github/workflows/ci-cd.yml`

One file, five jobs. Keeping them together means the `needs:` edges into the deploy jobs can't be lost by editing a second file.

| Job          | Runs on                | Needs              | Container | Secrets        |
| ------------ | ---------------------- | ------------------ | --------- | -------------- |
| `checks`     | every PR, push to main | —                  | CI image  | none           |
| `docker`     | every PR, push to main | —                  | none      | none           |
| `preview`    | same-repo PRs          | `checks`, `docker` | CI image  | `VERCEL_TOKEN` |
| `production` | push to `main`         | `checks`, `docker` | CI image  | `VERCEL_TOKEN` |
| `smoke`      | after `production`     | `production`       | none      | none           |

### 4.1 Shared settings

- **`permissions: contents: read`** at the top; deploy jobs add `deployments: write` for the environment link on the PR.
- **`concurrency`**: one run per PR, and a new push cancels the old one. On `main`, runs are never cancelled once started.
- **`defaults.run.shell: bash`** — `bash -eo pipefail`, so a failure inside a pipe fails the step.
- **Pins**: every action by full commit SHA (`actions/checkout` v7.0.1, `actions/cache` v6.1.0), the image by digest, the Vercel CLI by version (`vercel@64.5.0`). A new release changes nothing until a commit says so.
- **Caching**: `~/.npm` keyed on the lockfile, plus `.next/cache` in the deploy jobs (Next's incremental build cache, per `ci-build-caching.md`). Never `.vercel/` — that holds pulled secrets (§6.2).

### 4.2 `docker`

Runs on the runner itself, since it needs the Docker daemon. It builds `--target runner`, then starts the container with `--init`, a placeholder `MONGODB_URI`, a random `AUTH_SECRET`, and `AUTH_URL=http://127.0.0.1:3000`, and probes it (§3). It fails on any `"level":"error"` or `[auth][error]` log line. Pages can return 200 while Auth.js is failing underneath, so the status codes alone aren't enough. The server log is printed whether the job passes or fails.

### 4.3 Deploy jobs

Both start by checking that `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are set, then install `git` (so the Vercel CLI attaches the commit to the deployment), check out, and install the pinned CLI. Then:

```bash
# preview
vercel pull --yes --environment=preview --git-branch="$HEAD_REF" --token="$VERCEL_TOKEN"
vercel build --token="$VERCEL_TOKEN"
vercel deploy --prebuilt --token="$VERCEL_TOKEN"

# production
vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
vercel build --prod --token="$VERCEL_TOKEN"
vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"
```

`vercel build` runs `vercel.json`'s `installCommand` (`npm ci`) and `buildCommand` (`npm run build`), so the deploy jobs don't install twice. The deployment URL goes to the job summary, and for previews to the PR.

---

## 5. The two deploy flows

### 5.1 Preview — every pull request

**Trigger:** a pull request into `main` is opened, or a commit is pushed to its branch.

1. `checks` and `docker` run on the PR's merge commit.
2. `preview` pulls the **Preview** variables for that branch, builds with them, and uploads the prebuilt output.
3. The deployment URL becomes the `preview` environment's URL, which GitHub shows on the PR as **View deployment**.
4. Every push produces a new preview; `concurrency` cancels the run for the superseded commit.

A preview is the change running on real Vercel infrastructure, with its own URL and its own database (§7.2), and nothing shared with production. A reviewer can click through it without risk.

What it must not be:

- **Connected to production data.** Preview's `MONGODB_URI` points at `linkbase-preview`, with a user that can't see the production database (§7.3).
- **Public.** Vercel Deployment Protection (Vercel Authentication, Standard Protection) is on, so only Vercel team members can open a preview. A preview is unreviewed code on a real URL.
- **Built for forks or Dependabot.** Neither gets Actions secrets, so the job's `if:` skips them: they get `checks` and `docker`, not a preview (§8.2).

### 5.2 Production — merge to `main`

**Trigger:** a PR is squash-merged, which pushes one commit to `main` (`git-conventions.md`).

1. `checks` and `docker` run again on the squash commit. If `main` moved, that commit can differ from what the PR tested, and it's the commit that ships.
2. `production` pulls the **Production** variables, runs `vercel build --prod` and `vercel deploy --prebuilt --prod`. Vercel moves the production domain to the new deployment only once it's ready, so there's no half-deployed window.
3. `smoke` hits `PRODUCTION_URL`: `/`, `/login`, `/signup`, and `/templates` must return 200 (with retries), and signed-out `/dashboard` must return a 307 to `/login` (the `proxy.ts` default-deny, `auth.md`). A red `smoke` means roll back (§9).

The `production` job has its own `concurrency: production` with `cancel-in-progress: false`, so production deploys run one at a time and are never killed halfway.

**Why rebuild instead of promoting the preview:** a preview was built with Preview variables. We rebuild with `--prod` so the production build sees production values. That's a second build of the same commit, which is safe because the image, lockfile, and CLI are all pinned.

### 5.3 `vercel.json`

```json
{
  "framework": "nextjs",
  "installCommand": "npm ci",
  "buildCommand": "npm run build",
  "git": { "deploymentEnabled": false },
  "regions": ["arn1"]
}
```

- **`git.deploymentEnabled: false`.** Connecting the repo to Vercel would otherwise deploy every push itself, skipping our checks. CI is the only path.
- **`installCommand: npm ci`** makes Vercel's install lockfile-exact, like CI's.
- **`regions: ["arn1"]`** is Stockholm, next to the Atlas cluster in AWS `eu-north-1` (§7.4). If production Atlas lands elsewhere, change this to match.

---

## 6. Environment variables and secrets

### 6.1 Where each value lives

| Variable                                               | Local dev (`.env.local`) | QA (`.env.test`)        | Vercel — Preview                      | Vercel — Production             | GitHub                      |
| ------------------------------------------------------ | ------------------------ | ----------------------- | ------------------------------------- | ------------------------------- | --------------------------- |
| `MONGODB_URI`                                          | dev cluster, `/linkbase` | —                       | non-prod cluster, `/linkbase-preview` | production cluster, `/linkbase` | **never**                   |
| `MONGODB_URI_TEST`                                     | —                        | `/linkbase-test`        | **never**                             | **never**                       | **never**                   |
| `AUTH_SECRET`                                          | local random value       | local random value      | its own value                         | its own value, Sensitive        | **never**                   |
| `AUTH_URL`                                             | `http://localhost:3000`  | `http://localhost:3000` | unset — inferred (§6.4)               | unset — inferred (§6.4)         | **never**                   |
| `VERCEL_TOKEN`                                         | —                        | —                       | —                                     | —                               | secret on both environments |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `PRODUCTION_URL` | —                        | —                       | —                                     | —                               | repository variables        |

The pattern: **runtime values live in exactly one place per environment** — `.env.local` / `.env.test` locally, Vercel for deployed environments, `.env.docker` for a self-hosted container. GitHub holds only what CI needs to reach Vercel.

### 6.2 Vercel

- **Scope each variable to one environment.** Preview and Production get separate values for `MONGODB_URI` and `AUTH_SECRET`. Nothing goes in "All Environments" unless it's identical and non-secret.
- **Sensitive is the default, and builds don't see it.** Vercel creates Preview and Production variables as Sensitive: unreadable after saving, and available at runtime and inside Vercel's own build container — but **not** to `vercel pull`, so our CI build gets them empty. That's fine because the build reads no secrets (§2.3). Keep it that way: a module that reads a secret at import time breaks every deploy. The first preview run failed for exactly this reason, before `connect.ts` moved its check into `register()`.
- **A change takes effect on the next deploy.** Each deployment snapshots its variables when it's built. Rotating a secret means changing it in Vercel, then re-running the latest `production` workflow run. A rollback (§9) restores the old deployment **with its old variables**.
- **`vercel pull` writes values to `.vercel/.env.<environment>.local`** in the CI workspace. The directory is gitignored, never cached or uploaded as an artifact, and never printed. Don't add a debug step that `cat`s it.
- **`NEXT_PUBLIC_` is unused.** If that changes: those values are inlined at build time and public (`security.md` §1.3), and because CI builds can't read Sensitive values, a `NEXT_PUBLIC_` variable must be created non-Sensitive or it'll be built in empty.

### 6.3 GitHub

- **`VERCEL_TOKEN` is the only secret.** The workflow reads it as `secrets.VERCEL_TOKEN`, which resolves either a repository secret or an environment secret. An environment secret on `preview` and `production` is stronger: only jobs that declare one of those environments can read it, and `production` only accepts `main`. A repository secret is readable by any job on any same-repo branch. Fork PRs never get either.
- **Create it for CI only.** Scope it to the Vercel team that owns the project, give it an expiry, and name it for its purpose (`github-actions-linkbase`). Rotate it on expiry and whenever someone with access leaves.
- **A Vercel token isn't scoped per environment.** The preview job's token could deploy to production. That's why secrets never reach fork PRs (§8.2), and why only maintainers can push branches here.
- **`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` can be repository variables or repository secrets.** The workflow reads the variable first and falls back to the secret. They identify the project without granting access, so variables are enough. They also stay readable in logs, which helps debugging.
- **`PRODUCTION_URL` must be a repository variable, not a secret.** It's the environment link on GitHub and the `smoke` target. A secret would be masked as `***` in both places, and `smoke` (which declares no environment) can't see environment-level values.
- **The `production` environment only accepts `main`** (deployment branch policy). A workflow edited on a feature branch to target `production` still can't get its token. Required reviewers on `production`: **TBD**, §12.

### 6.4 Auth.js

- **`AUTH_SECRET` is required everywhere, with a different value per environment**, so a session cookie minted on a preview is useless against production.
- **On Vercel, `AUTH_URL` stays unset.** Auth.js v5 infers the host from the request and trusts Vercel's forwarded host automatically (it detects the `VERCEL` variable). Setting `AUTH_URL` on Preview would break sign-in on every preview.
- **Off Vercel, `AUTH_URL` is required.** Without it Auth.js rejects every session request with `UntrustedHost`, while the pages themselves still render with a 200. Verified against the standalone build. The `docker` job sets it, and `.env.example` says so.
- **When the Google provider lands** (`security.md` §1.2): OAuth callbacks can't follow per-PR preview URLs, so Auth.js's redirect proxy (`AUTH_REDIRECT_PROXY_URL`) needs a stable deployment. That requires the preview and the stable deployment to share an `AUTH_SECRET`, which conflicts with the first bullet. **TBD**, §12.

### 6.5 Adding a variable

1. Add it to `.env.example` in the same commit that reads it (`security.md` §1.2).
2. Add it in Vercel to **Preview** and **Production** separately, before merging the PR that reads it.
3. If the Docker image needs it, add it to §2.4. If the `docker` job's boot needs it, add a placeholder there.
4. Add it to §6.1.
5. Never add an app secret to GitHub to "make CI work". If `checks` needs one, the code reading it is in the wrong place.

---

## 7. MongoDB Atlas in production

### 7.1 The cluster

- **Production gets its own Atlas project and cluster**, separate from the one `linkbase` (dev) and `linkbase-test` (QA) share. Separate projects mean separate access lists, users, and alerts, so a mistake in the dev project can't reach production.
- **Backups on.** Pick a tier with scheduled snapshots, and restore one into a scratch cluster before relying on them.
- **The database name is always in the URI** (`…mongodb.net/linkbase?…`). With no name, the driver silently uses `test`. That's exactly how dev data ended up in `test` until 2026-10-18. `connect.ts` sets no `dbName`, so the URI is the only place it's chosen.

### 7.2 One database per environment

| Environment | Cluster                | Database           | Who connects           |
| ----------- | ---------------------- | ------------------ | ---------------------- |
| Production  | production project     | `linkbase`         | Vercel Production      |
| Preview     | non-production project | `linkbase-preview` | Vercel Preview         |
| Development | non-production project | `linkbase`         | `npm run dev`          |
| QA          | non-production project | `linkbase-test`    | `run-qa-suite` (local) |

Preview data is disposable and shared by all open PRs. Production data is never copied into it: real users' emails and password hashes don't belong in front of unreviewed code.

### 7.3 Users and credentials

- **One database user per environment**, with `readWrite` on **that environment's database only**. Not `readWriteAnyDatabase`, not `atlasAdmin`.
- **Admin work uses a separate, human-held user**, never one whose credentials are in Vercel.
- **Long, random, generated passwords.** URL-encode them if they contain reserved characters, and remember `.env*` files expand `$` (`security.md` §1.3).
- **TLS is on by default** with `mongodb+srv://`. Never add `tls=false`.
- **Rotating:** create the new credential, update `MONGODB_URI` in Vercel, redeploy, confirm, then delete the old one. Never delete first.

### 7.4 Network access, region, connections

- **Vercel functions have no fixed outbound IPs by default**, so Atlas's access list can't name them. Either allow `0.0.0.0/0` and rely on credentials, TLS, and least-privilege users (common, and acceptable with §7.3 in place), or buy Vercel Static IPs (Pro, paid per project) and allowlist those. **TBD**, §12. The production list never includes a developer's home IP "temporarily".
- **Region.** The existing cluster is AWS `eu-north-1` (Stockholm), and `vercel.json` pins functions to `arn1`, also Stockholm. Every render and Server Action is a round trip to Atlas, so keep the two together. If the production cluster is created elsewhere, change `regions` with it.
- **Connection reuse.** `connect.ts` caches the connection on `globalThis` with `maxPoolSize: 10` (`database.md` §2), so warm instances reuse it. `attachDatabasePool` from `@vercel/functions` releases idle connections before a Fluid compute instance suspends. Adopting it is a new dependency, so it's **TBD**, §12. Watch Atlas's connection count after the first production deploys.

### 7.5 Indexes in production

Mongoose builds the indexes a schema declares when a model is first used (`autoIndex`), and **never drops one a schema stops declaring**. Both behaviours bit us in development: a stale `profiles.handle_1` unique index outlived the `handle` field and broke onboarding with `E11000 … { handle: null }`.

- **Index changes are a deliberate step, not a side effect of a deploy.** An index build on a large collection under live traffic is expensive, and an unexpected unique index can fail every write. The plan is `autoIndex` off in production plus a reviewed script that runs `createIndexes()` before the deploy that needs it. **TBD**, §12.
- **Removing a field or index from a schema means dropping it in Atlas too**, noted in the PR. `syncIndexes()` drops _everything_ the schema doesn't declare, so read `diffIndexes()` output before running it against production.
- **Schema changes must stay backward-compatible across one deploy.** During a rollout and after a rollback (§9), old code runs against new data. Add fields as optional first, and remove them only once no deployed version reads them.

---

## 8. Pipeline security

### 8.1 Supply chain

- **Actions are pinned to full commit SHAs** with the version in a comment. A tag can be moved to malicious code; a SHA can't.
- **The base image is pinned by digest** and the Vercel CLI by exact version (§2.2, §4.1).
- **`npm ci` everywhere**: in `checks`, in the `Dockerfile`, and as Vercel's `installCommand`.
- **Dependabot** (`.github/dependabot.yml`) opens weekly PRs for npm (minor and patch grouped) and for GitHub Actions (SHA pins included). Its commits use the `chore(deps)` prefix (`git-conventions.md`). Its PRs run `checks` and `docker` but get no preview (§5.1). The Docker base image is bumped by hand (§2.2).
- **`npm audit --omit=dev --audit-level=high`** runs in `checks` (§3).

### 8.2 Untrusted input

- **Fork and Dependabot PRs never get Actions secrets.** The `preview` job's `if:` skips them. The workflow uses `pull_request`, never `pull_request_target`: that event runs with the base repo's secrets, and checking out a PR's code under it hands them to whoever opened the PR. **This repo is public**, so this matters.
- **Event data never goes straight into a `run:` script.** Branch names are attacker-controlled, and `${{ github.head_ref }}` inside `run:` is a shell injection. The preview job passes it through `env:` as `HEAD_REF` and quotes it.
- **`persist-credentials: false`** on every checkout, so `GITHUB_TOKEN` isn't left in `.git/config` for later steps or `npm` lifecycle scripts to read.

### 8.3 Least privilege

- Workflow default `contents: read`; deploy jobs add only `deployments: write`.
- `VERCEL_TOKEN` is an environment secret, and `production` only accepts `main` (§6.3).
- Atlas users are per-environment, `readWrite` on one database (§7.3).
- The container runs as `node`, with the code root-owned (§2.3).

### 8.4 Repository settings

- **Branch protection on `main`:** PR required with one approving review (agent-written changes included, `git-conventions.md`); `checks` and `docker` required and up to date; force pushes and deletion blocked.
- **Squash merge only**, with head branches deleted on merge.
- **Secret scanning with push protection**, so a committed key is rejected at push time (`security.md` §1.4).

---

## 9. Rollback and incidents

**Roll back first, debug second.** Vercel keeps previous production deployments, and switching back is instant with no rebuild:

```bash
vercel rollback <previous-deployment-url-or-id>   # restore the last good deployment
vercel rollback status
vercel promote <deployment-url>                    # undo the rollback once a fix is out
```

The same is one click on the project's Deployments page.

- **A rollback restores the old build and its old variables** (§6.2). If the incident was a bad variable, fix it in Vercel and redeploy instead.
- **A rollback doesn't undo data.** That's why §7.5 requires backward-compatible schema changes, and why restoring a backup is a separate, deliberate decision.
- **While rolled back, new production deploys don't take the domain** until a deployment is promoted again. Merge the fix, let the pipeline build it, then `vercel promote` it.
- **Fix forward through the normal flow:** a `fix/` branch, PR, checks, preview, merge. Never a local `vercel deploy --prod`.
- **Logs:** `vercel logs --environment production --level error`, plus the `request.failed` JSON lines from `lib/logger` (`errors-and-validation.md`). The digest on a user's error page matches the `digest` field in those lines.

---

## 10. Files

| File                          | Holds                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `.github/workflows/ci-cd.yml` | the pipeline (§4)                                                               |
| `.github/dependabot.yml`      | weekly npm and GitHub Actions update PRs (§8.1)                                 |
| `Dockerfile`                  | `deps` → `check` / `builder` → `runner` (§2.3)                                  |
| `.dockerignore`               | keeps `.env*`, `.git`, and build output out of the context (§2.3)               |
| `vercel.json`                 | Git deploys off, `npm ci`, `arn1` (§5.3)                                        |
| `next.config.ts`              | `output: "standalone"` when `NEXT_OUTPUT=standalone`, for the image only (§2.3) |
| `package.json`                | `"engines": { "node": "24.x" }` (§2.2)                                          |
| `.env.example`                | notes that `AUTH_URL` is required outside Vercel (§6.4)                         |

---

## 11. First-time setup

These steps are outside the repo, and none of them can be done from CI. Do them once, in order. Until they're done, `preview` and `production` fail at their first step, naming the missing value.

### 11.1 MongoDB Atlas

1. Create a production Atlas project and cluster in AWS `eu-north-1`, or change `vercel.json` `regions` to match wherever it goes. Turn on backups.
2. In it, create database user `linkbase-prod-app` with `readWrite@linkbase` and a generated password.
3. In the non-production project, create `linkbase-preview-app` with `readWrite@linkbase-preview`.
4. Set network access (§7.4).

### 11.2 Vercel

```bash
vercel login
vercel link                   # creates the project; writes .vercel/project.json (gitignored)
cat .vercel/project.json      # orgId → VERCEL_ORG_ID, projectId → VERCEL_PROJECT_ID
```

Then, in the project's settings:

1. **Environment Variables:**
   - Preview: `MONGODB_URI` (the `linkbase-preview` URI) and `AUTH_SECRET` (`openssl rand -base64 32`).
   - Production: `MONGODB_URI` (the `linkbase` URI on the production cluster) and its own `AUTH_SECRET`. Leave both **Sensitive** (the default).
   - Don't set `AUTH_URL`.
2. **Deployment Protection:** Vercel Authentication on, Standard Protection.
3. **Node.js version: 24.x** (it should follow `engines`; confirm it does).
4. **Domains:** add the production domain. Its `https://` origin is `PRODUCTION_URL`.
5. **Account Settings → Tokens:** create `github-actions-linkbase`, scoped to the project's team, with an expiry.

### 11.3 GitHub

```bash
gh variable set VERCEL_ORG_ID --body "<orgId>"
gh variable set VERCEL_PROJECT_ID --body "<projectId>"
gh variable set PRODUCTION_URL --body "https://<production domain>"

gh api -X PUT repos/stanley-agwu/linkbase/environments/preview
gh api -X PUT repos/stanley-agwu/linkbase/environments/production \
  -F "deployment_branch_policy[protected_branches]=false" \
  -F "deployment_branch_policy[custom_branch_policies]=true"
gh api -X POST repos/stanley-agwu/linkbase/environments/production/deployment-branch-policies \
  -f name=main -f type=branch

gh secret set VERCEL_TOKEN --env preview      # paste the token when prompted
gh secret set VERCEL_TOKEN --env production

gh repo edit --enable-squash-merge --enable-merge-commit=false \
  --enable-rebase-merge=false --delete-branch-on-merge
```

Then, in **Settings → Branches**, protect `main` per §8.4 with `checks` and `docker` as required checks. They're selectable once the workflow has run at least once. Finally, in **Settings → Code security**, turn on secret scanning and push protection.

### 11.4 Verify

1. Open a PR. `checks` and `docker` go green, `preview` posts a URL, and the preview signs up and logs in against `linkbase-preview`.
2. Merge it. `production` deploys and `smoke` goes green.
3. Practise one rollback (§9) before you need it.

---

## 12. Not decided yet

| Item                                                              | Status                                                            |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| Atlas network access: `0.0.0.0/0` vs. Vercel Static IPs           | **TBD** — §7.4                                                    |
| Production index management (`autoIndex` off + a reviewed script) | **TBD** — §7.5                                                    |
| `attachDatabasePool` for Fluid compute                            | **TBD** — §7.4, needs `@vercel/functions`                         |
| Required reviewers on the `production` GitHub environment         | **TBD** — §6.3; adds a manual gate after merge                    |
| Running Playwright QA against the preview URL                     | **TBD** — §3; needs a Deployment Protection bypass for automation |
| OAuth preview support vs. per-environment `AUTH_SECRET`           | **TBD** — §6.4, when the Google provider lands                    |
| `.gitattributes` with `eol=lf`, so local `format:check` is clean  | **TBD** — §3                                                      |
| Vercel's `x-forwarded-for` handling for the rate limiter's IP     | **To confirm** before launch — `security.md` §3                   |
| Production domain and its DNS                                     | **TBD** — §11.2                                                   |
