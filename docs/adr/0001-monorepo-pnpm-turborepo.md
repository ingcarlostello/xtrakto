# 0001. Monorepo with pnpm workspaces and Turborepo

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Xtrakto has one web app and several pieces of logic that must be shared between the browser, the server and background jobs: domain types, money and date helpers, bank parsers and database access. One developer maintains everything, so keeping versions and types in sync across repositories would cost more than it gives.

## Decision

Use a single repository with pnpm workspaces: `apps/web` plus internal packages under `packages/` (`core`, `parsers`, `db` and the shared configs). Packages export TypeScript source and are imported by their public name only. Turborepo runs `build`, `lint`, `check-types` and `test` across the workspace with caching; a `transit` task lets checks run in parallel while still invalidating the cache when a dependency's source changes.

## Alternatives considered

- **Separate repositories per package:** versioning and publishing internal packages adds work with no benefit for a single app.
- **A single Next.js app without packages:** parsers and domain logic would mix with UI code and could not be tested or run in a Web Worker on their own.
- **Nx:** more features than needed; Turborepo is simpler and integrates with Vercel.

## Consequences

- Types are shared from the parsers to the UI without publishing anything.
- Package boundaries are enforced by convention and by ESLint (no deep imports into `@xtrakto/*/src`).
- Python (`ml/`) stays outside the pnpm workspace.
