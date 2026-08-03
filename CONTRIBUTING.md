# Contributing to Fuurin no Class

Thanks for taking the time to contribute. This document covers the workflow, conventions, and code style that keep the codebase stable and the review process predictable.

By participating in this project you agree to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Table of contents

- [Ground rules](#ground-rules)
- [Branch naming](#branch-naming)
- [Commit convention](#commit-convention)
- [Pull request](#pull-request)
- [Code style](#code-style)
- [Folder rules](#folder-rules)
- [Pre-commit checklist](#pre-commit-checklist)

## Ground rules

- All work happens through a Pull Request. Direct pushes to `main` are not allowed.
- Keep changes focused. One concern per PR; split larger work into reviewable units.
- The architecture (`UI → Feature → Repository → ApiClient → Transport → Backend`) is **locked** at v1.0.0. New features that would change this flow require an RFC first.
- Run the full verification suite before opening a PR (see [Pre-commit checklist](#pre-commit-checklist)).
- Do not introduce new top-level dependencies without justification in the PR description.

## Branch naming

Use the form `<type>/<short-topic>` with lowercase and hyphens.

| Prefix      | Use for                                              |
| ----------- | ---------------------------------------------------- |
| `feat/`     | New feature work                                     |
| `fix/`      | Bug fixes                                            |
| `chore/`    | Tooling, dependencies, refactors with no behavior change |
| `docs/`     | Documentation only                                    |
| `test/`     | Adding or fixing automated tests                      |
| `hotfix/`   | Urgent fixes that need to ship out-of-band            |

Examples:

- `feat/album-cover-picker`
- `fix/upload-retry-after-timeout`
- `chore/refresh-lucide-react`

## Commit convention

Use [Conventional Commits](https://www.conventionalcommits.org/) — short, imperative, and consistent.

Format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **type** — `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`.
- **scope** — optional, the affected area (`feat(api):`, `fix(upload):`, `chore(deps):`).
- **subject** — imperative, ≤ 72 chars, no trailing period.
- **body** — explain the *why*, not the *what*; wrap at 72 chars.
- **footer** — `BREAKING CHANGE: …` when applicable; closes a GitHub issue via `Closes #123`.

Examples:

```
feat(api): add Retry-After support to FetchApiClient

The 429 mapping previously returned a generic transport error.
We now surface Retry-After as a tag so monitoring can correlate
backoff with upstream pressure.

Closes #42
```

## Pull request

1. Branch from `main` using the naming above.
2. Run the full verification locally before requesting review.
3. Open the PR with a short description:
   - **What** changed.
   - **Why** it changed.
   - **How** it was verified (`npm run verify`, smoke screenshots, etc.).
   - Any **breaking change** clearly flagged.
4. PR title follows the commit convention.
5. PRs are squash-merged. The squash message becomes the commit on `main`.

Review expectations:

- At least one reviewer approves before merge.
- CI (or the local equivalents) must be green: `typecheck`, `lint`, `audit:images`, `audit:boundaries`, `smoke:api`, `verify`.
- Reviewer feedback is resolved before merge — comments acknowledged with explicit replies.

## Code style

TypeScript and React style follows Next.js conventions plus a few local rules.

- **TypeScript** — strict mode. No `any` in new code. Prefer `unknown` + narrowing.
- **React** — Server Components by default; `'use client'` only when interaction, browser API, or React hooks are needed.
- **Naming** — `PascalCase` for components, `camelCase` for variables/functions, `SCREAMING_SNAKE_CASE` for environment-driven constants.
- **Imports** — path-aliased (`@/...`); no deep relative imports across folders.
- **Tailwind** — semantic tokens only. No `text-white` / `bg-black` / raw `gray-*` etc. Per the token contract in `src/app/globals.css`.
- **Comments** — explain *why*, not *what*. Inline rationale > paragraph headers.
- **Error handling** — every async boundary uses the repository `RepositoryResult<T>` model. UI surfaces errors via `role="alert"` / `aria-live` regions.

## Folder rules

- `src/app/` — Next.js App Router pages and routes. Each page is a Server Component unless interactivity is required.
- `src/components/ui/` — render-only primitives. No state, no side effects, no fetch.
- `src/components/<domain>/` — feature components specific to a domain (albums, media, editor, …).
- `src/hooks/` — feature hooks. Always start with `use`.
- `src/lib/<area>/` — area-scoped helpers (`api`, `auth`, `config`, `monitoring`, `repositories`).
- `src/lib/repositories/` — the data access boundary. Direct `fetch()` and direct mock imports outside this folder are forbidden (see `scripts/audit-repository-boundaries.mjs`).
- `src/types/` — shared types. The repository DTO types live here but are *never* exported past the repository layer.
- `scripts/` — Node.js scripts for verification, audit, and smoke. Run via `npm run …`.
- `public/` — static assets served at the root.

## Pre-commit checklist

Run locally before opening a PR:

```bash
npm run typecheck
npm run lint
npm run audit:images
npm run audit:boundaries
npm run smoke:api
npm run build
npm run verify        # against a running deployment
```

All checks must report zero errors. Warnings are tolerated only when commented inline with rationale.

If you change the env contract, update `.env.example`. If you add a script, document it in the README. If you add or remove a dependency, mention it in the PR description.