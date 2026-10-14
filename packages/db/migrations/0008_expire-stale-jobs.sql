-- The daily cleanup of ingestion jobs that never finished (ADR 0014, Phase
-- 5.5c): a job pending or processing for more than 24 hours fails with
-- CONTENT_EXPIRED and loses its content, references included. The cleanup has
-- no user, and Row-Level Security shows the application role no row without
-- one, so it runs with its owner's rights (SECURITY DEFINER), and the owner
-- bypasses Row-Level Security. It takes no parameters, so the application
-- can't aim it at anything else; its search_path is fixed and its table
-- qualified, so no object in another schema can stand in for them. It returns
-- how many jobs it expired, a count only.
CREATE FUNCTION public.expire_stale_ingestion_jobs() RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  expired integer;
BEGIN
  UPDATE public.ingestion_jobs
  SET status = 'failed',
    error_code = 'CONTENT_EXPIRED',
    extracted_content = NULL,
    updated_at = now()
  WHERE status IN ('pending', 'processing')
    AND created_at < now() - interval '24 hours';
  GET DIAGNOSTICS expired = ROW_COUNT;
  RETURN expired;
END;
$$;
--> statement-breakpoint
-- Functions are executable by everyone by default: only the application.
REVOKE ALL ON FUNCTION public.expire_stale_ingestion_jobs() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.expire_stale_ingestion_jobs() TO xtrakto_app;
