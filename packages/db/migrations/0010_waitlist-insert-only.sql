-- The waitlist (ADR 0021, Phase 16.0b). The application may only add people:
-- it can't read, count, change or delete the list, so a flaw in the app can't
-- leak it. Exporting entries and deleting them on request take the owner role.
-- An insert that names a conflict target, or returns rows, needs SELECT, so
-- the application's insert does neither: the email is the only unique key
-- that can conflict.
GRANT INSERT ON waitlist_entries TO xtrakto_app;
--> statement-breakpoint
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY waitlist_entries_add ON waitlist_entries AS PERMISSIVE FOR INSERT
  TO xtrakto_app WITH CHECK (true);
