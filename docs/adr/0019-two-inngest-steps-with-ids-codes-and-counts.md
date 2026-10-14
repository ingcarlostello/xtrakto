# 0019. Two Inngest steps that keep only ids, codes and counts

- **Status:** Accepted
- **Date:** 2026-10-14

## Context

[ADR 0005](0005-inngest-for-background-work.md) planned one Inngest step per stage of ingestion: parse, reconcile, categorize, persist. Inngest stores and shows each step's output, the function's result and the errors of every attempt, and its failure event repeats the last error. A parse step would hand the next step a parsed statement: descriptions, amounts and raw references such as Nequi phone numbers, kept in the run history that ADR 0005 itself keeps free of financial content. Passing that data through the database instead would need temporary tables for half-processed statements, and a failure between steps would leave them to clean up. Errors carry data too: a Drizzle query error lists the query's parameters in its message ([system design §4](../ARCHITECTURE.md#4-privacy-boundaries)).

## Decision

- **Two steps.** `claim` marks the job as processing in its own transaction, so a screen sees it start. `ingest` does the rest in one transaction: it locks the job, parses its content again (the authoritative parse), resolves the account, reconciles, prepares the movements (fingerprints, HMACs of references) and saves them, then finishes the job and deletes its content. The statement is saved all or nothing.
- **Only ids, codes and counts** leave a step: `claim` returns whether there is work to do, and `ingest` a status with the movements' counts or an error code. Every step's errors are sanitized before Inngest sees them: a label, the error's class, a SQLSTATE or system code and a constraint's name, never the message or its cause.
- **Expected failures** (content no parser recognizes, a part the parser can't read, an export the user has to place among several accounts) fail the job with their code in the same transaction, without retries. **Unexpected ones** throw; after 3 retries, the failure handler fails the job with `INTERNAL_ERROR` and deletes its content.
- **One job per user at a time:** the function's concurrency is keyed by the user's id, and `ingest` takes a per-user advisory lock and locks the job's row, so each statement's coverage and period versions see the ones saved before it ([ADR 0018](0018-verified-quarterly-statement-covers-other-formats.md)), whatever the queue runs at once.
- **Idempotent:** a retried `ingest` whose transaction had committed finds the job finished and returns `closed`; the same content saved again adds nothing.

This supersedes the step layout of ADR 0005; the rest of it stands.

## Alternatives considered

- **One step per stage (ADR 0005):** each output would land in the run history, or need temporary storage in the database and a cleanup for the statements a failure left half processed.
- **One step for everything, the claim included:** a job would stay pending until its statement is saved, so the screen couldn't tell a queued file from one being read.
- **Error messages as they are, filtered later by an observability tool:** Inngest keeps them before any filter runs.

## Consequences

- Inngest's run history shows statuses, codes, counts and ids; an error names what failed without the data involved.
- A retry redoes the whole ingestion, which is cheap for a spreadsheet of a few hundred rows; the transaction must fit in the route's `maxDuration` (60 s).
- Work that later joins ingestion, such as rule-based categorization (6.1), runs inside `ingest`'s transaction or in a step that reads and writes by ids.
- The failure handler can't be run by `@inngest/test`; it is checked against the local Dev Server.
