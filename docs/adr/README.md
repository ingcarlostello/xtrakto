# Architecture decision records

An ADR records one significant decision: why it was needed, what was decided, which alternatives were rejected and what follows from it. ADRs explain the reasoning behind the [system design](../ARCHITECTURE.md); the design document describes the result.

## When to write one

Write an ADR when a decision is hard to reverse or shapes how other code is written: a technology choice, a data model rule, a privacy boundary, a deviation from the system design. Routine implementation choices don't need one.

## How to write one

1. Copy [`0000-template.md`](0000-template.md) to `NNNN-short-title.md`, using the next free number.
2. Fill in every section. Keep it to one page.
3. Start with the status **Proposed**; it becomes **Accepted** when the change that applies it is merged.
4. Never rewrite an accepted decision. To change it, write a new ADR and mark the old one **Superseded by NNNN**.
5. Add it to the index below, in the same commit as the change it records.

## Index

| ADR                                                             | Title                                                           | Status   |
| --------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| [0001](0001-monorepo-pnpm-turborepo.md)                         | Monorepo with pnpm workspaces and Turborepo                     | Accepted |
| [0002](0002-typescript-backend-python-for-ml.md)                | TypeScript on Node for the backend; Python only for ML training | Accepted |
| [0003](0003-postgresql-with-drizzle.md)                         | PostgreSQL with Drizzle                                         | Accepted |
| [0004](0004-clerk-for-authentication.md)                        | Clerk for authentication                                        | Accepted |
| [0005](0005-inngest-for-background-work.md)                     | Inngest for background work                                     | Accepted |
| [0006](0006-money-as-integer-minor-units.md)                    | Money as integer minor units                                    | Accepted |
| [0007](0007-transaction-dates-as-local-date.md)                 | Transaction dates as `LocalDate`                                | Accepted |
| [0008](0008-files-read-in-the-browser.md)                       | Files are read in the browser                                   | Accepted |
| [0009](0009-deterministic-parsing-first.md)                     | Deterministic parsing first, LLM as a fallback                  | Accepted |
| [0010](0010-typescript-6-until-typescript-eslint-supports-7.md) | TypeScript 6.0 until typescript-eslint supports TypeScript 7    | Accepted |
| [0011](0011-sheetjs-for-spreadsheet-extraction.md)              | SheetJS for spreadsheet extraction                              | Accepted |
| [0012](0012-long-numbers-masked-when-parsed.md)                 | Long numbers in descriptions are masked when parsed             | Accepted |
| [0013](0013-neon-for-postgresql.md)                             | Neon for PostgreSQL                                             | Accepted |
| [0014](0014-forced-rls-with-transaction-local-user.md)          | Forced Row-Level Security with a transaction-local user id      | Accepted |
