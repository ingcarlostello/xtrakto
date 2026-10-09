-- Row-Level Security (ADR 0014). For the application role, each table with a
-- user's financial data shows and accepts only the rows of the user set with
-- set_config('app.user_id', …, true) in the current transaction. Owners skip
-- it: the local superuser and Neon's neondb_owner have BYPASSRLS.

-- The application role, if this environment doesn't have it yet. Created with
-- SQL on purpose: roles made in Neon's console, API or MCP server can bypass
-- RLS. Each environment gives it LOGIN and a password outside migrations.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'xtrakto_app') THEN
    CREATE ROLE xtrakto_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO xtrakto_app;
--> statement-breakpoint
-- users holds no financial data and has no RLS. No UPDATE or DELETE: account
-- deletion (Phase 4.5) brings its own privileges and policy.
GRANT SELECT, INSERT ON users TO xtrakto_app;
--> statement-breakpoint
-- Explicit grants, never default privileges: a table whose migration forgets
-- its grant stays closed to the application.
GRANT SELECT, INSERT, UPDATE, DELETE ON accounts, statements, transactions, ingestion_jobs TO xtrakto_app;
--> statement-breakpoint
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE statements ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- The same policy on every table. The subquery reads the setting once per
-- query. After a transaction that set it ends, a pooled connection reads it as
-- '' rather than NULL: nullif makes that NULL, which matches no row, instead of
-- a failed uuid cast.
CREATE POLICY accounts_user_isolation ON accounts AS PERMISSIVE FOR ALL TO xtrakto_app
  USING (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid))
  WITH CHECK (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid));
--> statement-breakpoint
CREATE POLICY statements_user_isolation ON statements AS PERMISSIVE FOR ALL TO xtrakto_app
  USING (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid))
  WITH CHECK (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid));
--> statement-breakpoint
CREATE POLICY transactions_user_isolation ON transactions AS PERMISSIVE FOR ALL TO xtrakto_app
  USING (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid))
  WITH CHECK (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid));
--> statement-breakpoint
CREATE POLICY ingestion_jobs_user_isolation ON ingestion_jobs AS PERMISSIVE FOR ALL TO xtrakto_app
  USING (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid))
  WITH CHECK (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid));
