# 0005. Inngest for background work

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Ingesting a statement means parsing, reconciling, categorizing and persisting, sometimes with LLM calls. That can outlast a request, and each stage should retry on its own when it fails. Vercel's serverless hosting has no always-on worker. A daily job must delete extracted content left behind.

## Decision

Run background work as Inngest functions served by the Next.js app (`/api/inngest`), one step per stage. Events carry IDs only, because Inngest stores and displays event payloads: the extracted content waits in the `ingestion_jobs` row and is deleted as the last step, or by a daily cron after 24 hours.

## Alternatives considered

- **pg-boss:** a PostgreSQL-backed queue, but it needs an always-on worker that Vercel doesn't provide.
- **Doing all the work inside the request:** no per-step retries, and the request may time out.

## Consequences

- Each step retries independently, so every write must be idempotent (fingerprints with `ON CONFLICT DO NOTHING`).
- Inngest Cloud never sees financial content.
- Local development needs the Inngest dev server.
