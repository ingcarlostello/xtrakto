-- What each call to an LLM's model used (Phase 8.3) holds one user's rows,
-- so it gets the per-user policy of the other tables with a user's data
-- (ADR 0014). Usage is only added and read: no grant changes or deletes it,
-- and deleting the user takes it through the cascade.
GRANT SELECT, INSERT ON llm_usage TO xtrakto_app;
--> statement-breakpoint
ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY llm_usage_user_isolation ON llm_usage AS PERMISSIVE FOR ALL TO xtrakto_app
  USING (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid))
  WITH CHECK (user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid));
--> statement-breakpoint
-- The platform's LLM spend this calendar month in Bogotá, against its budget
-- (8.3). It adds up every user's rows, which Row-Level Security hides from
-- the application, so it runs with its owner's rights (SECURITY DEFINER), as
-- the daily cleanup of ingestion jobs does. It takes no parameters, so it
-- can't be aimed at a user or a period; its search_path is fixed and its
-- table qualified; it returns a sum only, in millionths of a dollar.
CREATE FUNCTION public.llm_platform_cost_this_month() RETURNS bigint
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp
AS $$
  SELECT coalesce(sum(cost_micro_usd), 0)::bigint
  FROM public.llm_usage
  WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota';
$$;
--> statement-breakpoint
-- Functions are executable by everyone by default: only the application.
REVOKE ALL ON FUNCTION public.llm_platform_cost_this_month() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.llm_platform_cost_this_month() TO xtrakto_app;
