# 0003. PostgreSQL with Drizzle

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

The data is tabular and analytical: transactions summed by month, category and kind. Each user's data must stay isolated even if a query forgets its filter. Later stages need vector search (Stage 15). The provider (Neon or Supabase) is chosen separately at gate 3.1.

## Decision

Use PostgreSQL, accessed through Drizzle ORM in `@xtrakto/db`. Row types are inferred from the Drizzle schema. Every financial table uses forced Row-Level Security with a transaction-local `app.user_id`, in addition to filtering by user in every query. Embeddings use pgvector in the same database.

## Alternatives considered

- **Convex:** good developer experience and realtime updates, but a document model that fits SQL aggregates, Row-Level Security and pgvector less well.
- **SQL without an ORM:** full control, but no inferred types and more boilerplate for a single developer.

## Consequences

- Summaries can move to SQL rollups when load grows, without changing the data model.
- Migrations must stay backward compatible (expand, deploy, then contract), because Vercel deploys while the migration job runs.
- A managed PostgreSQL provider is required in every environment, with Docker for local development.
