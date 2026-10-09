# 0016. Users delete only their own row

- **Status:** Accepted
- **Date:** 2026-10-09

## Context

A user can delete their account and every row of their data, from the settings page or from Clerk, whose `user.deleted` webhook reaches the app ([ADR 0004](0004-clerk-for-authentication.md)). Deleting the user's row in `users` removes the rest through the foreign keys' cascades: accounts, statements, movements and ingestion jobs. [ADR 0014](0014-forced-rls-with-transaction-local-user.md) gave the application role only `SELECT` and `INSERT` on `users`, which had no Row-Level Security because it holds no financial data. A plain `DELETE` grant would let any query of the app delete any user, and with them all their data, since cascades skip Row-Level Security.

## Decision

The application role gets `DELETE` on `users`, and `users` gets forced Row-Level Security with three policies for `xtrakto_app`: anyone may be read, anyone may be added (a Clerk id is mapped to its internal id before a user context exists), and a row may be deleted only when it is the current user's: `id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid)`, the same check the other tables use. `deleteAllUserData(ctx)` deletes the context's user; the webhook finds the user by Clerk id with `findUserId`, which never creates the row, and deletes them from their own context.

This supersedes the part of ADR 0014 that kept `users` at `SELECT` and `INSERT` without Row-Level Security.

## Alternatives considered

- **A `DELETE` grant without Row-Level Security:** one buggy query, or a user id taken from the wrong place, would delete another user's data.
- **A `SECURITY DEFINER` function owned by the owner:** works, but adds a function that runs with the owner's rights, which the catalog test rejects unless explicitly allowed; the policy keeps one mechanism for every table.
- **Deleting only the data tables and keeping the `users` row:** the Clerk id would stay behind for a deleted user.

## Consequences

- Without a user context, or in another user's context, a `DELETE` on `users` affects no row instead of failing; the tests check both.
- Updating or truncating `users` still fails: the role has no such privileges.
- Deleting is idempotent: a second call, or the webhook arriving after the settings action, finds nothing to delete.
- The catalog test now expects forced Row-Level Security on every table, with three policies on `users`.
