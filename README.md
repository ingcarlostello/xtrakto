# Xtrakto

Xtrakto reads Colombian bank statements and explains where the money went. It separates real spending from money that only moved between the user's own accounts and from income, and it verifies every balance to the cent. The original file never leaves the browser.

## Status

Early development: the domain core and the spreadsheet parsers (stages 1 and 2) are done, verified against real Bancolombia exports; the database (Stage 3) is in progress. Nothing is deployed yet. Progress and the plan for each stage are in the [roadmap](docs/ROADMAP.md).

## Stack

- Next.js 16 (App Router), React 19 and Tailwind CSS 4
- TypeScript 6 in strict mode, on Node.js 22
- pnpm 12 workspaces and Turborepo 2
- ESLint 9, Prettier 3 and Vitest 5
- SheetJS 0.20 to read XLSX and CSV files, installed from its official CDN ([ADR 0011](docs/adr/0011-sheetjs-for-spreadsheet-extraction.md))
- PostgreSQL 18 with pgvector: Neon in the cloud, Docker Compose locally ([ADR 0013](docs/adr/0013-neon-for-postgresql.md))
- Planned: Drizzle, Clerk, Inngest and Vercel (see the [system design](docs/ARCHITECTURE.md))

## Monorepo layout

```text
apps/
  web/                 Next.js app: routes, UI, server actions
packages/
  core/                Domain types, money and dates (pure TypeScript)
  parsers/             Bank statement parsers and their registry (pure TypeScript)
  db/                  PostgreSQL access with Drizzle: connection, schema, migrations (server only)
  eslint-config/       Shared ESLint presets and project rules
  typescript-config/   Shared tsconfig presets
docker/                Local PostgreSQL setup for Docker Compose
docs/                  System design, roadmap and ADRs
```

## Local setup

Requirements: Node.js 22, pnpm 12.9.1 (the version pinned in `packageManager`) and Docker with Compose v2 (Docker Desktop on macOS).

```bash
nvm use                      # reads .nvmrc
npm install -g pnpm@12.9.1
pnpm install
cp .env.example .env.local   # git-ignored; the database values already match Docker
docker compose up --wait     # local PostgreSQL, see below
pnpm db:migrate              # creates the tables
pnpm db:seed                 # optional: synthetic statements for a dev user
pnpm dev                     # http://localhost:3000
```

`.env.example` documents every environment variable.

Real bank statements must never be committed. They may only live in git-ignored `fixtures/private/` folders, for private tests.

### Local database

PostgreSQL 18 with pgvector runs in Docker, with the same versions as the hosted database on Neon.

```bash
docker compose up --wait                    # starts it and waits until it accepts connections
docker compose exec postgres psql -U xtrakto  # SQL shell as the owner role
docker compose down                         # stops it; the data stays in a Docker volume
docker compose down -v                      # stops it and deletes the data
```

On its first start, `docker/postgres/init.sql` creates the application role, `xtrakto_app`, which owns no table and can't bypass Row-Level Security, and the `xtrakto_test` database for integration tests. It only runs on an empty volume: after changing it, reset with `docker compose down -v`. The port is bound to `127.0.0.1`, and the passwords in `docker-compose.yml` and `.env.example` are for local use only.

## Scripts

| Command             | What it does                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`          | Runs the web app in development mode                                                                                   |
| `pnpm build`        | Builds every package for production                                                                                    |
| `pnpm lint`         | Lints every package with ESLint                                                                                        |
| `pnpm check-types`  | Type-checks every package with TypeScript                                                                              |
| `pnpm test`         | Runs every package's tests with Vitest                                                                                 |
| `pnpm format`       | Formats the repository with Prettier                                                                                   |
| `pnpm format:check` | Checks formatting without changing files                                                                               |
| `pnpm db:generate`  | Writes a migration from the Drizzle schema (drizzle-kit)                                                               |
| `pnpm db:migrate`   | Applies pending migrations, as the owner role (`DATABASE_MIGRATION_URL`)                                               |
| `pnpm db:studio`    | Opens Drizzle Studio on the database                                                                                   |
| `pnpm db:seed`      | Loads three synthetic statements for a development user; needs `IDENTIFIER_HASH_KEY`, and a second run inserts nothing |

CI runs `pnpm turbo check-types lint test` and `pnpm format:check` on every pull request, with the database from `docker compose up --wait`.

The integration tests of `packages/db` use the `xtrakto_test` database through `TEST_DATABASE_URL` (application role) and `TEST_DATABASE_MIGRATION_URL` (owner), read from `.env.local`. With both set, they need the local database running and fail if it isn't; without them, they are skipped, except in CI, which always runs them. Both must point to a local database whose name ends in `_test`.

`pnpm --filter @xtrakto/parsers test:private` checks the parsers against real exports copied into `packages/parsers/fixtures/private/`, which git ignores. It runs only locally and prints counts and yes/no answers, never the files' content.

## Documentation

- [System design](docs/ARCHITECTURE.md): requirements, architecture, data model and privacy boundaries
- [Roadmap](docs/ROADMAP.md): stages, phases, decision gates and progress
- [Phase log](docs/phase-log.md): what each phase did, its deviations and follow-ups
- [Architecture decision records](docs/adr/README.md)
- [Project rules](.claude/rules/): code standards, design system and ML rules
