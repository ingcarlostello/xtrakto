# 0013. Neon for PostgreSQL

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

[ADR 0003](0003-postgresql-with-drizzle.md) chose PostgreSQL with Drizzle and left the provider to gate 3.1. The app runs on Vercel's serverless functions, every pull request gets a preview deployment ([system design §9](../ARCHITECTURE.md#9-infrastructure)), each user's rows are isolated with Row-Level Security and a transaction-local `app.user_id`, and Stage 15 needs pgvector. Authentication is Clerk ([ADR 0004](0004-clerk-for-authentication.md)) and no files are stored ([ADR 0008](0008-files-read-in-the-browser.md)), so only the database is needed.

## Decision

Use Neon: project `xtrakto` in AWS us-east-1, next to Vercel's default region, with PostgreSQL 18 and pgvector 0.8.6. Each preview deployment gets its own Neon branch. Locally, Docker Compose runs the same PostgreSQL and pgvector versions.

The app connects with node-postgres (`pg`) through Drizzle's `node-postgres` driver, using the pooled connection string (PgBouncer in transaction mode) and the application role. Migrations use the direct connection string and the owner role.

## Alternatives considered

- **Supabase:** PostgreSQL bundled with authentication, file storage, realtime and generated APIs. Xtrakto uses Clerk, stores no files and reads data through Drizzle, so most of the platform would go unused, and its Row-Level Security helpers revolve around its own authentication. A database branch per pull request is heavier there and paid.
- **Neon's serverless driver (`@neondatabase/serverless`):** its HTTP mode has no interactive transactions, which setting `app.user_id` and then querying in the same transaction requires, and its WebSocket mode needs a proxy to reach the local Docker database. Neon recommends TCP with a connection pool on Vercel's Fluid compute.

## Consequences

- The pooler runs in transaction mode, so no session-level `SET`: the user id is set with `set_config(…, true)` inside each transaction, as ADR 0003 already planned.
- Neon's default owner role, `neondb_owner`, has `BYPASSRLS`, and so do roles created from the Neon console, API, CLI or MCP server (members of `neon_superuser`). The application role is created with SQL and checked by tests (Phase 3.4), and the app must never receive the owner's connection string.
- The free plan gives 512 MB per branch, 6 hours of history to restore and a 0.25 CU compute that sleeps when idle, so the first query after a pause is slower. Enough for the private beta; review it before the public launch.
- The local owner is a superuser, which also bypasses Row-Level Security, so isolation is always tested through the application role.
- Hosted connection strings use `sslmode=verify-full`.
