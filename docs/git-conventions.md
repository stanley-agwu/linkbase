# Linkbase — Git Conventions

How work is branched, committed, reviewed, and merged. Read this before your first commit on a new piece of work.

Scope: branch names, commit messages, and the pull request flow. `coding-standards.md` §8 owns what must pass before you commit; this doc owns what the commit and the branch look like. Nothing here is machine-enforced today — §6 lists what could be. Anything undecided is marked **TBD**.

> **The existing history predates this doc.** All eight commits so far use plain imperative subjects (`Add architecture and database docs`) rather than Conventional Commits. That history stays as it is — rewriting pushed commits costs more than the inconsistency does. The convention starts with the next commit.

---

## 1. Branches

**Every change happens on its own branch. Nothing is committed straight to `main`.**

```
<type>/<short-description>
```

- **`type`** is the same set as commit types (§2): `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- **`short-description`** is two to four words, lowercase, hyphen-separated, naming the thing being changed — not the ticket, not your initials, not the date.

| Good                      | Avoid                                    |
| ------------------------- | ---------------------------------------- |
| `feat/add-links`          | `feature/links` — wrong type word        |
| `fix/session-redirect`    | `fix/bug` — says nothing                 |
| `docs/data-fetching`      | `docs/update` — says nothing             |
| `refactor/db-queries`     | `stanley/wip` — not a type, not a scope  |
| `chore/claude-code-setup` | `patch-1` — GitHub's default, never kept |

- **One branch, one concern.** If the branch name needs an "and", it's two branches. A branch that renames a folder _and_ adds a feature can't be reviewed, and can't be reverted cleanly.
- **Branch from an up-to-date `main`**: `git switch main && git pull && git switch -c feat/add-links`.
- **Delete the branch after merge.** GitHub offers this on the merge screen; take it.
- **Long-lived branches are the thing to avoid.** A branch open for two weeks is a conflict waiting to happen. Split the work and merge the first part.

---

## 2. Commits

**Conventional Commits**, with a short imperative subject:

```
<type>(<optional scope>): <subject>

<optional body — why, not what>

<optional trailers>
```

### 2.1 Types

| Type       | For                                                                          |
| ---------- | ---------------------------------------------------------------------------- |
| `feat`     | a user-visible capability that wasn't there before                           |
| `fix`      | a defect in shipped behaviour                                                |
| `docs`     | documentation only — anything under `docs/`, `CLAUDE.md`, `README`           |
| `refactor` | changes structure, not behaviour. If behaviour changed, it's `feat` or `fix` |
| `test`     | tests only (no runner configured yet — `CLAUDE.md`)                          |
| `chore`    | tooling, dependencies, config, CI — the scaffolding around the app           |

Nothing outside this set. If a change doesn't obviously fit one, it's probably two commits.

### 2.2 Subject

- **Imperative mood** — "add", not "added" or "adds". The test: the subject completes the sentence "this commit will \_\_\_".
- **No capital letter, no trailing period**, after the `type:` prefix.
- **Under ~70 characters**, so it isn't truncated in a log or on GitHub.
- **Name the change, not the file.** `fix: redirect to login when the session expires` beats `fix: update proxy.ts`.

```
feat(editor): add drag-to-reorder for links
fix(auth): preserve the next param through sign-in
docs: add errors and validation doc
refactor(db): move the public profile read into its own query
chore: add Prettier and type-aware lint rules
```

### 2.3 Scope

Optional, and worth adding once a change is clearly confined to one area. Use the names the codebase already uses: `auth`, `db`, `editor`, `profile`, `marketing`, `ui`, `validation`, `proxy`. Leave it off for anything that spans several.

### 2.4 Body and trailers

- The body explains **why**, wrapped at 72 characters. The diff already shows what changed; it can't show what you ruled out. A one-line change with a surprising reason needs a body more than a large mechanical one does.
- A breaking change gets a `!` before the colon — `feat(auth)!: require a verified email` — and a `BREAKING CHANGE:` trailer explaining the migration. Pre-launch there's nothing to break, so this should be rare.
- Reference issues in the body or a trailer (`Closes #12`), not in the subject.
- Co-authorship trailers (including `Co-Authored-By:` for commits written with Claude Code) go last, after a blank line.

### 2.5 What makes a commit

- **One logical change per commit.** A commit that both fixes a bug and reformats a file is two commits; the reformatting hides the fix.
- **Each commit builds.** `npm run build` passes at every commit on the branch, so `git bisect` and a per-commit revert both work. The full pre-commit list is `coding-standards.md` §8.
- **Separate mechanical churn from real changes.** A Prettier reformat or a rename across 400 lines goes in its own `chore` or `refactor` commit, with the reason in the body, so the next person reading the diff isn't hunting for the two real lines.
- **Commit messages aren't a changelog of your afternoon.** `wip`, `fix typo`, `address review` get squashed before merge (§3.3).

---

## 3. Pull requests

**Every branch merges through a PR. No direct pushes to `main`, including by whoever opened the PR.**

### 3.1 Opening one

1. `git push -u origin feat/add-links`
2. Open the PR against `main`. (`gh` isn't installed on this machine, so that's the web UI — or `npm i -g gh`/`winget install GitHub.cli` if you'd rather have `gh pr create`.)
3. **Title**: the same format as a commit subject, since it becomes the squash commit's subject (§3.3).
4. **Body**: what changed and why, how it was verified, and anything the reviewer should look at first. Link the issue. Screenshots for UI work — `ui.md` is a spec, and a PR that claims to implement it should show the result.
5. **Draft PRs are welcome** for work in progress. Mark it ready when you want eyes on it.

A PR template in `.github/pull_request_template.md` would make the body consistent: **TBD**, and there's no `.github/` directory yet.

### 3.2 Review is required

**A human reviews every PR before it merges.** That's the point of the flow — not the branch, not the commit format. The author doesn't approve their own work, and an automated check passing is not a review.

- The reviewer is looking for what tooling can't see: whether the approach is right, whether the identity and scoping rules in `auth.md` §5 hold, whether the docs still match the code.
- **Changes written by an agent get the same review, read line by line.** They are not pre-approved by having been generated, and a plausible-looking diff is exactly the kind that slips through.
- Address feedback with new commits on the branch (easier to re-review), then squash at merge.
- Whether `main` enforces this with a branch protection rule is **TBD** — it can't be checked from here, and without it the convention is honour-based. Setting it (require a PR, require one approval, require status checks once CI exists) is the single highest-value item in §6.

### 3.3 Merging

**Squash and merge** is the default. One commit on `main` per PR, with the PR title as its subject — so `main`'s history is a readable list of changes, and `git revert` on a single commit undoes the whole feature.

- **Check the squash subject before confirming.** GitHub pre-fills it from the PR title when there's more than one commit, and from the single commit otherwise. It must still be a valid Conventional Commit.
- **Rebase and merge** instead when the individual commits are each meaningful and each build — a deliberate multi-step refactor, for example. Don't rebase-merge a branch full of "wip" commits.
- **Never a merge commit.** `main` stays linear, which is what makes `git log --oneline` on it useful.
- **Update the branch before merging** if `main` has moved: rebase onto it (`git pull --rebase origin main`) rather than merging `main` in, so the branch stays a clean series of commits on top of `main`.
- **Only force-push your own unmerged branch**, and only after a rebase. Never force-push `main`.

---

## 4. `main`

- **`main` is always deployable** and always green. It's the branch every other branch starts from.
- **Never commit to it directly**, and never force-push it.
- A revert is a normal `fix` PR (`git revert <sha>`), not a history rewrite.
- Release tagging and versioning: **TBD** — nothing is released yet.

---

## 5. Checklist before opening a PR

1. On a `<type>/<description>` branch, not `main`?
2. Rebased on current `main`, with conflicts resolved?
3. Does every commit follow §2 — valid type, imperative subject, one logical change?
4. Does `npm run build` pass? (types + lint — `coding-standards.md` §8)
5. Is `npm run format` clean, so the diff is free of formatting noise?
6. Mechanical churn separated from real changes?
7. Docs updated alongside the code — including a `docs/` index entry in `CLAUDE.md` if you added a file?
8. PR title valid as a Conventional Commit subject, and the body says what and why?
9. Requested a reviewer?

---

## 6. Not decided yet

| Item                                                                | Status                                                                |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Branch protection on `main` (require PR, require one approval)      | **TBD** — not verifiable from here; §3.2. The highest-value item here |
| CI running `npm run build` and `format:check` on every PR           | **TBD** — no `.github/workflows`; `coding-standards.md` §9            |
| `commitlint` + a `commit-msg` hook to enforce §2 mechanically       | **TBD** — the convention is a review convention until then            |
| Pre-commit hook for `format` / `lint`                               | **TBD** — `coding-standards.md` §9                                    |
| PR template and `CODEOWNERS`                                        | **TBD** — §3.1                                                        |
| Whether `docs/`-only PRs may skip a full review                     | **TBD** — they don't today                                            |
| Release tagging, versioning, changelog generation from commit types | **TBD** — §4                                                          |
