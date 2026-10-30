-- The LLM's answers by redacted text (Phase 8.5a) hold no user's data and
-- are shared by every user: any user's context may read them and add one.
-- No grant changes or deletes an answer; a new prompt version adds its own.
GRANT SELECT, INSERT ON llm_category_answers TO xtrakto_app;
--> statement-breakpoint
ALTER TABLE llm_category_answers ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY llm_category_answers_read ON llm_category_answers AS PERMISSIVE FOR SELECT
  TO xtrakto_app USING (true);
--> statement-breakpoint
CREATE POLICY llm_category_answers_add ON llm_category_answers AS PERMISSIVE FOR INSERT
  TO xtrakto_app WITH CHECK (true);
