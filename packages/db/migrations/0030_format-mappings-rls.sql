-- How to read a format no parser knows (Phase 11.1b). A mapping its balances
-- proved holds no user's data and serves every user: any user's context may
-- read one and add one, and no grant changes or deletes one.
GRANT SELECT, INSERT ON format_mappings TO xtrakto_app;
--> statement-breakpoint
ALTER TABLE format_mappings ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY format_mappings_read ON format_mappings AS PERMISSIVE FOR SELECT
  TO xtrakto_app USING (true);
--> statement-breakpoint
CREATE POLICY format_mappings_add ON format_mappings AS PERMISSIVE FOR INSERT
  TO xtrakto_app WITH CHECK (true);
--> statement-breakpoint
-- The mapping a person confirmed holds their choice, so it gets the per-user
-- policy of the other tables with a user's data (ADR 0014). Their next
-- confirmation replaces it, an insert that names its conflict target, which
-- needs SELECT and UPDATE too; deleting the user takes it.
GRANT SELECT, INSERT, UPDATE ON user_format_mappings TO xtrakto_app;
--> statement-breakpoint
ALTER TABLE user_format_mappings ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY user_format_mappings_user_isolation ON user_format_mappings AS PERMISSIVE FOR ALL TO xtrakto_app
  USING (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid))
  WITH CHECK (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid));
