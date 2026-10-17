-- The user's own category rules (Phase 6.3a) hold one user's answers, so
-- they get the same grants and per-user policy as the other tables with a
-- user's data (ADR 0014). An answer replaces the earlier one with an insert
-- that names its conflict target, which needs SELECT and UPDATE too.
GRANT SELECT, INSERT, UPDATE, DELETE ON user_category_rules TO xtrakto_app;
--> statement-breakpoint
ALTER TABLE user_category_rules ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY user_category_rules_user_isolation ON user_category_rules AS PERMISSIVE FOR ALL TO xtrakto_app
  USING (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid))
  WITH CHECK (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid));
