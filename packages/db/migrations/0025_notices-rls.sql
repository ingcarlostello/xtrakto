-- Which email notices a user receives (Phase 10.4a) holds one user's row, so
-- it gets the per-user policy of the other tables with a user's data
-- (ADR 0014). A notice is turned on or off, never deleted: deleting the user
-- takes the row through the cascade.
GRANT SELECT, INSERT, UPDATE ON notice_preferences TO xtrakto_app;
--> statement-breakpoint
ALTER TABLE notice_preferences ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY notice_preferences_user_isolation ON notice_preferences AS PERMISSIVE FOR ALL TO xtrakto_app
  USING (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid))
  WITH CHECK (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid));
