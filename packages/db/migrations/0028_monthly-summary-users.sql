-- Who asked for the monthly email (Phase 10.5). The cron that sends it has
-- no user, and Row-Level Security shows the application no row without one,
-- so it runs with its owner's rights (SECURITY DEFINER), as the daily cleanup
-- does (ADR 0014). It takes no parameters, so it can't be aimed at anyone;
-- its search_path is fixed and its table qualified; it returns ids only.
CREATE FUNCTION public.users_with_monthly_summary() RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp
AS $$
  SELECT user_id FROM public.notice_preferences WHERE monthly_summary;
$$;
--> statement-breakpoint
-- Functions are executable by everyone by default: only the application.
REVOKE ALL ON FUNCTION public.users_with_monthly_summary() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.users_with_monthly_summary() TO xtrakto_app;
