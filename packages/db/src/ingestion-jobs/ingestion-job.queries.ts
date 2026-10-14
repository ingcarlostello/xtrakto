import { type ExtractedContent, err, ok, type Result } from "@xtrakto/core";
import { and, count, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import { INGESTION_JOB_STATUS } from "./ingestion-job.constants";
import { ingestionJobs } from "./ingestion-job.schemas";

/** A submitted statement, waiting for the ingestion function. */
export type NewIngestionJob = {
  readonly formatId: string;
  /** Minimized (ADR 0017); deleted when the job ends. */
  readonly extractedContent: ExtractedContent;
  /** For a movements export: the account it was pinned to, if any. */
  readonly accountId?: string;
  /** Or the last 4 digits of one a quarterly statement of the upload creates. */
  readonly accountLast4?: string;
};

/** How many statements a user may submit in a month, and that month's bounds. */
export type SubmissionQuota = {
  readonly limit: number;
  readonly month: { readonly start: Date; readonly end: Date };
};

/** The month's quota is used up: how many slots its jobs hold. */
export type QuotaUsed = { readonly used: number };

// First key of the two-key advisory lock that serializes a user's submissions.
const SUBMISSIONS_LOCK = 1;

// Transaction-scoped: released at commit, and safe behind a transaction-mode
// connection pool such as Neon's. Users whose ids hash alike only wait for
// each other.
const lockSubmissions = async ({ tx, userId }: UserContext): Promise<void> => {
  await tx.execute(
    sql`select pg_advisory_xact_lock(${SUBMISSIONS_LOCK}, hashtext(${userId}))`,
  );
};

/**
 * How many of the month's slots the context user's jobs hold. Pending and
 * processing jobs hold one. A finished job keeps it only if it added at least
 * one movement (`stats.added`, which the ingestion function writes), so
 * sending a file already loaded costs nothing; a failed job never holds one.
 */
export const countSlotsUsed = async (
  { tx, userId }: UserContext,
  month: SubmissionQuota["month"],
): Promise<number> => {
  const [row] = await tx
    .select({ used: count() })
    .from(ingestionJobs)
    .where(
      and(
        eq(ingestionJobs.userId, userId),
        gte(ingestionJobs.createdAt, month.start),
        lt(ingestionJobs.createdAt, month.end),
        or(
          inArray(ingestionJobs.status, [
            INGESTION_JOB_STATUS.PENDING,
            INGESTION_JOB_STATUS.PROCESSING,
          ]),
          and(
            eq(ingestionJobs.status, INGESTION_JOB_STATUS.DONE),
            sql`(${ingestionJobs.stats} ->> 'added')::integer > 0`,
          ),
        ),
      ),
    );
  return row?.used ?? 0;
};

/**
 * Creates a pending job holding the statement's content and returns its id,
 * unless the month's quota is used up: then how many slots are held. A user's
 * submissions count and insert one at a time, under a lock, so two racing for
 * the last slot can't both take it. Run it inside `withUserContext`.
 */
export const createIngestionJobWithinLimit = async (
  ctx: UserContext,
  job: NewIngestionJob,
  quota: SubmissionQuota,
): Promise<Result<string, QuotaUsed>> => {
  await lockSubmissions(ctx);
  const used = await countSlotsUsed(ctx, quota.month);
  if (used >= quota.limit) return err({ used });
  const [created] = await ctx.tx
    .insert(ingestionJobs)
    .values({ ...job, userId: ctx.userId })
    .returning({ id: ingestionJobs.id });
  if (!created) throw new Error("No ingestion job inserted.");
  return ok(created.id);
};

/**
 * Deletes one of the context user's jobs, content included, while nothing has
 * started it: for a job whose event couldn't be sent. Returns whether it did.
 */
export const deletePendingIngestionJob = async (
  { tx, userId }: UserContext,
  jobId: string,
): Promise<boolean> => {
  const deleted = await tx
    .delete(ingestionJobs)
    .where(
      and(
        eq(ingestionJobs.id, jobId),
        eq(ingestionJobs.userId, userId),
        eq(ingestionJobs.status, INGESTION_JOB_STATUS.PENDING),
      ),
    )
    .returning({ id: ingestionJobs.id });
  return deleted.length > 0;
};
