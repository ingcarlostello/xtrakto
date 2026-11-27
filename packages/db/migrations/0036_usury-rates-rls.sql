-- Each month's usury rate (Phase 12.4a): public figures, linked to no one.
-- Any user's context reads them; the application can't add, change or
-- delete one, so a buggy query can't either.
GRANT SELECT ON usury_rates TO xtrakto_app;
--> statement-breakpoint
ALTER TABLE usury_rates ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY usury_rates_read ON usury_rates AS PERMISSIVE FOR SELECT
  TO xtrakto_app USING (true);
--> statement-breakpoint
-- Only the cron that reads the Superintendencia Financiera's history adds
-- months, through this function, which runs with its owner's rights
-- (SECURITY DEFINER), as the daily cleanup does (ADR 0014, amended): it
-- takes the months as JSON, adds those the table doesn't have, never
-- changes or deletes one, and its table's checks hold every value. Its
-- search_path is fixed and its table qualified; it returns a count.
CREATE FUNCTION public.save_usury_rates(rates jsonb) RETURNS integer
  LANGUAGE sql
  VOLATILE
  SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp
AS $$
  WITH saved AS (
    INSERT INTO public.usury_rates (month, rate_ea_ppm, source)
    SELECT (rate ->> 'month')::date,
      (rate ->> 'rateEaPpm')::integer,
      rate ->> 'source'
    FROM jsonb_array_elements(rates) AS rate
    ON CONFLICT (month) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::integer FROM saved;
$$;
--> statement-breakpoint
-- Functions are executable by everyone by default: only the application.
REVOKE ALL ON FUNCTION public.save_usury_rates(jsonb) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.save_usury_rates(jsonb) TO xtrakto_app;
