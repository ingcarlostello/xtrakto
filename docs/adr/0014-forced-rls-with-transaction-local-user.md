# 0014. Forced Row-Level Security with a transaction-local user id

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

[ADR 0003](0003-postgresql-with-drizzle.md) asks for a second barrier: a user's rows must stay hidden from other users even if a query forgets its `user_id` filter. The app reaches Neon through a pooler in transaction mode ([ADR 0013](0013-neon-for-postgresql.md)), which doesn't keep session-level settings, so one connection serves many users in turn. Owners skip Row-Level Security: Neon's `neondb_owner` and the local superuser both bypass it. Foreign key checks skip it too.

## Decision

The app connects as `xtrakto_app`: no superuser, no `BYPASSRLS`, member of no role, owner of nothing. Migrations create it without login if it's missing; each environment gives it `LOGIN` and a password outside migrations. Every table that holds a user's data enables and forces Row-Level Security with one policy for `xtrakto_app`, the same for reads and writes: `user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid)`. Each migration grants its tables' privileges explicitly; there are no default privileges, and `users` gets only `SELECT` and `INSERT`.

`withUserContext(db, userId, fn)` in `@xtrakto/db` opens a transaction, sets `app.user_id` with `set_config(…, true)`, which lasts until the transaction ends, and runs `fn` with `{ tx, userId }`. Queries inside still filter by `userId`. Once per database object it checks that the connection's role doesn't bypass Row-Level Security, and throws if it does. Foreign keys carry `user_id` (Phase 3.3), and a test reads the catalog to check all of this for every table.

## Alternatives considered

- **Filtering in the application only:** one forgotten `where` would show another user's movements.
- **A session-level `SET app.user_id`:** the pooler doesn't keep it, and on a reused connection it would leak to the next request.
- **Policies for `PUBLIC`:** any other role without `BYPASSRLS` would get the app's access by default; targeting `xtrakto_app` leaves every other role with no rows.
- **Default privileges for future tables:** they fail open, granting read and write even to a table without a policy.

## Consequences

- Every query runs inside a transaction, with one extra statement to set the user.
- The transaction commits when `fn` resolves, even with an `err()` result: validate before writing, and throw to undo writes. It holds a pooled connection until `fn` ends, so no network calls inside.
- After a transaction, a pooled connection reads the setting as `''`. `nullif` turns that into no user, which matches no row, instead of failing the cast.
- Work across users, such as the daily cleanup of ingestion content (Phase 5.5), needs a `SECURITY DEFINER` function owned by the owner, explicitly allowed by the catalog test.
- On Neon, `neondb_owner` keeps only an admin membership on `xtrakto_app` (PostgreSQL 16 and later): it can set the role's password but can't act as it. Checked on a temporary branch.
- Migrations and Drizzle Studio run as the owner, which sees every row.
