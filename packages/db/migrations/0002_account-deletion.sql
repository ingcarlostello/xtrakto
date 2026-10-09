-- Account deletion (ADR 0016). The application may delete a user's row, but
-- only its own: deleting it removes, through the foreign keys' cascades, every
-- account, statement, movement and ingestion job of that user. Reading and
-- adding users stays open, as before: a Clerk id is mapped to its internal id
-- before any user context exists.
GRANT DELETE ON users TO xtrakto_app;
--> statement-breakpoint
ALTER TABLE users ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY users_read ON users AS PERMISSIVE FOR SELECT TO xtrakto_app
  USING (true);
--> statement-breakpoint
CREATE POLICY users_add ON users AS PERMISSIVE FOR INSERT TO xtrakto_app
  WITH CHECK (true);
--> statement-breakpoint
-- The same user check as the other tables' policies (migration 0001).
CREATE POLICY users_delete_own ON users AS PERMISSIVE FOR DELETE TO xtrakto_app
  USING (id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid));
