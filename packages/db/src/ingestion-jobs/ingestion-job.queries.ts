import {
  type AmountMinor,
  type ExtractedContent,
  err,
  type LocalDate,
  ok,
  type Period,
  type Result,
} from "@xtrakto/core";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
import type { Database, DbTransaction } from "../client/db-client.types";
import { statements } from "../statements/statement.schemas";
import type { UserContext } from "../user-context/user-context.types";
import { INGESTION_JOB_STATUS } from "./ingestion-job.constants";
import { ingestionJobs } from "./ingestion-job.schemas";
import type {
  IngestionJobError,
  IngestionJobStatus,
  IngestionStats,
  StatementBalance,
} from "./ingestion-job.types";

const { PENDING, PROCESSING, DONE, FAILED } = INGESTION_JOB_STATUS;
// A job is open while the ingestion function hasn't finished it.
const OPEN = [PENDING, PROCESSING];

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

/** An open job, as the ingestion step reads it. */
export type OpenIngestionJob = {
  readonly accountId: string | null;
  readonly accountLast4: string | null;
  readonly extractedContent: ExtractedContent;
};

/** A job as the upload screen follows it: never its content. */
export type IngestionJobResult = {
  readonly id: string;
  readonly status: IngestionJobStatus;
  readonly formatId: string | null;
  /** Open for longer than an ingestion usually takes. */
  readonly isSlow: boolean;
  readonly errorCode: IngestionJobError | null;
  /** Counts only, once done. */
  readonly stats: Partial<IngestionStats>;
  /** Once done: the statement it saved, or the one that already held it. */
  readonly statement: {
    /** The account it was saved to. */
    readonly accountId: string;
    readonly period: Period;
    /** It reconciles, it doesn't, or it prints no balances (an export). */
    readonly balance: StatementBalance;
    /** The closing balance minus the opening balance and every amount. */
    readonly differenceMinor: AmountMinor | null;
    /**
     * The period of the account's previous quarterly statement, when this
     * one reconciles and opens with that one's verified closing balance.
     */
    readonly chainedTo: Period | null;
  } | null;
};

/** How many statements a user may submit in a month, and that month's bounds. */
export type SubmissionQuota = {
  readonly limit: number;
  readonly month: { readonly start: Date; readonly end: Date };
};

/** The month's quota is used up: how many slots its jobs hold. */
export type QuotaUsed = { readonly used: number };

// First keys of the two-key advisory locks that serialize a user's
// submissions, and their jobs' ingestion.
const LOCK = { SUBMISSIONS: 1, INGESTION: 2 } as const;

// Transaction-scoped: released at commit, and safe behind a transaction-mode
// connection pool such as Neon's. Users whose ids hash alike only wait for
// each other.
const lockForUser = async (
  { tx, userId }: UserContext,
  lock: (typeof LOCK)[keyof typeof LOCK],
): Promise<void> => {
  await tx.execute(
    sql`select pg_advisory_xact_lock(${lock}, hashtext(${userId}))`,
  );
};

// An ingestion takes seconds; open after two minutes, a job is late. Measured
// with the database's clock, the one that stamped the job.
const SLOW_AFTER = sql`interval '2 minutes'`;

// The context user's job with that id.
const ownJob = ({ userId }: UserContext, jobId: string) =>
  and(eq(ingestionJobs.id, jobId), eq(ingestionJobs.userId, userId));

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
          inArray(ingestionJobs.status, OPEN),
          and(
            eq(ingestionJobs.status, DONE),
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
  await lockForUser(ctx, LOCK.SUBMISSIONS);
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
  ctx: UserContext,
  jobId: string,
): Promise<boolean> => {
  const deleted = await ctx.tx
    .delete(ingestionJobs)
    .where(and(ownJob(ctx, jobId), eq(ingestionJobs.status, PENDING)))
    .returning({ id: ingestionJobs.id });
  return deleted.length > 0;
};

/**
 * Marks one of the context user's open jobs as processing. Returns whether
 * there's work to do: false once it's finished or gone.
 */
export const claimIngestionJob = async (
  ctx: UserContext,
  jobId: string,
): Promise<boolean> => {
  const claimed = await ctx.tx
    .update(ingestionJobs)
    .set({ status: PROCESSING })
    .where(and(ownJob(ctx, jobId), inArray(ingestionJobs.status, OPEN)))
    .returning({ id: ingestionJobs.id });
  return claimed.length > 0;
};

/**
 * One of the context user's open jobs, locked until the transaction ends;
 * undefined once it's finished or gone. A user's jobs wait for each other
 * here, so each statement's coverage and period versions see the statements
 * saved before it (ADR 0018), whatever the queue runs at once.
 */
export const lockIngestionJob = async (
  ctx: UserContext,
  jobId: string,
): Promise<OpenIngestionJob | undefined> => {
  await lockForUser(ctx, LOCK.INGESTION);
  const [job] = await ctx.tx
    .select({
      accountId: ingestionJobs.accountId,
      accountLast4: ingestionJobs.accountLast4,
      extractedContent: ingestionJobs.extractedContent,
    })
    .from(ingestionJobs)
    .where(and(ownJob(ctx, jobId), inArray(ingestionJobs.status, OPEN)))
    .for("update");
  if (!job) return undefined;
  const { extractedContent, ...pin } = job;
  if (!extractedContent) throw new Error("An open job has no content.");
  return { ...pin, extractedContent };
};

/** Finishes a locked job: done, with its statement and counts, without its content. */
export const finishIngestionJob = async (
  ctx: UserContext,
  jobId: string,
  outcome: { readonly statementId: string; readonly stats: IngestionStats },
): Promise<void> => {
  await ctx.tx
    .update(ingestionJobs)
    .set({ status: DONE, ...outcome, extractedContent: null })
    .where(ownJob(ctx, jobId));
};

/**
 * Fails one of the context user's open jobs, saying why, and deletes its
 * content. Returns whether it did: a finished job keeps its outcome.
 */
export const failIngestionJob = async (
  ctx: UserContext,
  jobId: string,
  errorCode: IngestionJobError,
): Promise<boolean> => {
  const failed = await ctx.tx
    .update(ingestionJobs)
    .set({ status: FAILED, errorCode, extractedContent: null })
    .where(and(ownJob(ctx, jobId), inArray(ingestionJobs.status, OPEN)))
    .returning({ id: ingestionJobs.id });
  return failed.length > 0;
};

/**
 * The daily cleanup, across users: every job pending or processing for more
 * than 24 hours fails with `CONTENT_EXPIRED` and loses its content. The one
 * query without a user context: it calls a database function that runs with
 * its owner's rights and takes no parameters (ADR 0014). Returns how many
 * jobs it expired.
 */
export const expireStaleIngestionJobs = async (
  db: Database | DbTransaction,
): Promise<number> => {
  const { rows } = await db.execute<{ expired: number }>(
    sql`select public.expire_stale_ingestion_jobs() as expired`,
  );
  return rows[0]?.expired ?? 0;
};

// A statement that reconciles is chained when it opens with the closing
// balance of the account's verified statement that ends the day it starts.
// Found when read, so the order the two were uploaded in doesn't matter.
const previous = alias(statements, "previous");
const PREVIOUS_START = new QueryBuilder()
  .select({ from: previous.periodFrom })
  .from(previous)
  .where(
    and(
      eq(previous.accountId, statements.accountId),
      eq(previous.userId, statements.userId),
      ne(previous.id, statements.id),
      eq(previous.balanceVerified, true),
      eq(previous.periodTo, statements.periodFrom),
      eq(previous.closingBalanceMinor, statements.openingBalanceMinor),
    ),
  )
  .orderBy(previous.periodFrom)
  .limit(1);

// What the upload screen reads of a job and its statement: never the content.
const RESULT_COLUMNS = {
  id: ingestionJobs.id,
  status: ingestionJobs.status,
  formatId: ingestionJobs.formatId,
  isSlow: sql<boolean>`${inArray(ingestionJobs.status, OPEN)} and ${ingestionJobs.createdAt} < now() - ${SLOW_AFTER}`,
  errorCode: ingestionJobs.errorCode,
  stats: ingestionJobs.stats,
  accountId: statements.accountId,
  from: statements.periodFrom,
  to: statements.periodTo,
  isVerified: statements.balanceVerified,
  hasBalances: sql<boolean>`${statements.openingBalanceMinor} is not null`,
  differenceMinor: statements.balanceDifferenceMinor,
  chainedFrom: sql<LocalDate | null>`case when ${statements.balanceVerified} then (${PREVIOUS_START}) end`,
};

const balanceOf = (
  isVerified: boolean | null,
  hasBalances: boolean,
): StatementBalance => {
  if (isVerified) return "verified";
  return hasBalances ? "unverified" : "none";
};

// The context user's jobs, newest first, each with the statement it saved.
const selectJobResults = ({ tx, userId }: UserContext, filter?: SQL) =>
  tx
    .select(RESULT_COLUMNS)
    .from(ingestionJobs)
    .leftJoin(
      statements,
      and(
        eq(statements.id, ingestionJobs.statementId),
        eq(statements.userId, ingestionJobs.userId),
      ),
    )
    .where(and(eq(ingestionJobs.userId, userId), filter))
    .orderBy(desc(ingestionJobs.createdAt), desc(ingestionJobs.id))
    .$dynamic();

type JobResultRow = Awaited<ReturnType<typeof selectJobResults>>[number];

const toJobResult = ({
  accountId,
  from,
  to,
  isVerified,
  hasBalances,
  differenceMinor,
  chainedFrom,
  ...job
}: JobResultRow): IngestionJobResult => ({
  ...job,
  statement:
    accountId && from && to
      ? {
          accountId,
          period: { from, to },
          balance: balanceOf(isVerified, hasBalances),
          differenceMinor,
          // The previous statement ends the day this one starts.
          chainedTo: chainedFrom ? { from: chainedFrom, to: from } : null,
        }
      : null,
});

/**
 * The context user's jobs among `jobIds`, as the upload screen follows them;
 * never their content. Other users' jobs, and jobs that are gone, are left
 * out.
 */
export const listIngestionJobResults = async (
  ctx: UserContext,
  jobIds: readonly string[],
): Promise<IngestionJobResult[]> => {
  if (jobIds.length === 0) return [];
  const rows = await selectJobResults(
    ctx,
    inArray(ingestionJobs.id, [...jobIds]),
  );
  return rows.map(toJobResult);
};

/**
 * The context user's latest `limit` jobs, newest first, as the upload screen
 * lists the files sent; never their content.
 */
export const listRecentIngestionJobs = async (
  ctx: UserContext,
  limit: number,
): Promise<IngestionJobResult[]> => {
  const rows = await selectJobResults(ctx).limit(limit);
  return rows.map(toJobResult);
};
