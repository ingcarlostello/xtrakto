import "server-only";
import { expireStaleIngestionJobs } from "@xtrakto/db";
import { getDb } from "@/lib/db";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";

/**
 * Expires every user's ingestion jobs left open for more than 24 hours: they
 * fail with `CONTENT_EXPIRED` and lose their content, so nothing a job holds
 * outlives a day (system design §4). The one service that works across users,
 * through the database's cleanup function (ADR 0014). A count only.
 */
export const expireStaleJobs = async (): Promise<{
  readonly expired: number;
}> => ({
  expired: await withSanitizedErrors("JOBS_NOT_EXPIRED", () =>
    expireStaleIngestionJobs(getDb()),
  ),
});
