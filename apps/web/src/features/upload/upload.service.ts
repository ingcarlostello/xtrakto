import "server-only";
import {
  APP_ERROR_CODE,
  DEFAULT_TIME_ZONE,
  type ExtractedContent,
  err,
  localDateFromInstant,
  monthBoundsInTimeZone,
  ok,
  type Result,
} from "@xtrakto/core";
import {
  countSlotsUsed,
  createIngestionJobWithinLimit,
  type Database,
  deletePendingIngestionJob,
  findOrCreateUser,
  findUserId,
  type IngestionJobResult,
  type IngestionStats,
  listAccounts,
  listIngestionJobResults,
  listRecentIngestionJobs,
  type UserContext,
  type UserId,
  withUserContext,
} from "@xtrakto/db";
import { type BankParser, findParser } from "@xtrakto/parsers";
import { getDb } from "@/lib/db";
import { inngest, statementSubmitted } from "@/lib/inngest";
import {
  sanitizedError,
  withSanitizedErrors,
} from "@/utils/sanitized-error.utils";
import { pinAccount } from "./account-pin.helpers";
import { fitsInUpload } from "./upload-size.helpers";
import { CONTENT_TOO_LARGE, MONTHLY_STATEMENT_LIMIT } from "./upload.constants";
import type {
  AccountChoice,
  MonthlyUsage,
  SubmitStatementRequest,
  SubmittedStatement,
  JobOutcome,
  UploadAccount,
  UploadJob,
} from "./upload.types";
import { MAX_LISTED_FILES } from "./uploaded-files.constants";

// The calendar month in Bogotá the limit counts, and the day it renews.
const currentMonth = () => {
  const month = monthBoundsInTimeZone(new Date(), DEFAULT_TIME_ZONE);
  return {
    month,
    resetsOn: localDateFromInstant(month.end, DEFAULT_TIME_ZONE),
  };
};

/**
 * The signed-in user's accounts, where a movements export can go. Someone
 * who never sent a file has no user row yet, so no accounts; reading never
 * creates one. The Clerk id must come from the session.
 */
export const listUploadAccounts = async (
  clerkUserId: string,
): Promise<readonly UploadAccount[]> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  return userId ? withUserContext(db, userId, listAccounts) : [];
};

/**
 * How many of the month's statements the signed-in user has used: pending
 * and processing jobs, and finished ones that added movements. Someone who
 * never sent a file has used none; reading never creates their row.
 */
export const getMonthlyUsage = async (
  clerkUserId: string,
): Promise<MonthlyUsage> => {
  const { month, resetsOn } = currentMonth();
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  const used = userId
    ? await withUserContext(db, userId, (ctx) => countSlotsUsed(ctx, month))
    : 0;
  return { used, limit: MONTHLY_STATEMENT_LIMIT, resetsOn };
};

type JobRequest = {
  readonly parser: BankParser;
  readonly content: ExtractedContent;
  readonly choice?: AccountChoice;
};

// Pins the account and takes one of the month's slots, in one transaction.
const createJob = async (
  ctx: UserContext,
  { parser, content, choice }: JobRequest,
): Promise<Result<string>> => {
  const pin = pinAccount(parser, choice, await listAccounts(ctx));
  if (!pin.ok) return pin;
  const { month, resetsOn } = currentMonth();
  const created = await createIngestionJobWithinLimit(
    ctx,
    { formatId: parser.id, extractedContent: content, ...pin.value },
    { limit: MONTHLY_STATEMENT_LIMIT, month },
  );
  if (created.ok) return created;
  return err({
    code: APP_ERROR_CODE.LIMIT_REACHED,
    details: {
      limit: MONTHLY_STATEMENT_LIMIT,
      used: created.error.used,
      resetsOn,
    },
  });
};

// Ids only, since Inngest stores and shows event payloads. The event's id
// turns a repeated send of the same job into one event.
const announceJob = async (
  db: Database,
  userId: UserId,
  jobId: string,
): Promise<void> => {
  try {
    await inngest.send(
      statementSubmitted.create(
        { jobId, userId },
        { id: `statement-submitted-${jobId}` },
      ),
    );
  } catch (error) {
    // Without its event the job would hold a slot, and the content, until the
    // daily cleanup expires it.
    await withSanitizedErrors("JOB_NOT_DELETED", () =>
      withUserContext(db, userId, (ctx) =>
        deletePendingIngestionJob(ctx, jobId),
      ),
    );
    throw sanitizedError("EVENT_NOT_SENT", error);
  }
};

/**
 * Queues a statement read in the browser: checks its size, recognizes its
 * format and minimizes it again (ADR 0017), pins its account and takes one of
 * the month's slots, then sends the event that has it processed. The Clerk id
 * must come from the session; the user's row is created on their first
 * statement. Unexpected errors are thrown without their message, which could
 * quote the content.
 */
export const queueStatement = async (
  clerkUserId: string,
  request: SubmitStatementRequest,
): Promise<Result<SubmittedStatement>> => {
  if (!fitsInUpload(request.content)) return err(CONTENT_TOO_LARGE);
  const parser = findParser(request.content);
  if (!parser.ok) return parser;
  const content = parser.value.minimize(request.content);
  const db = getDb();
  const userId = await withSanitizedErrors("USER_NOT_RESOLVED", () =>
    findOrCreateUser(db, clerkUserId),
  );
  const job = await withSanitizedErrors("JOB_NOT_CREATED", () =>
    withUserContext(db, userId, (ctx) =>
      createJob(ctx, {
        parser: parser.value,
        content,
        choice: request.account,
      }),
    ),
  );
  if (!job.ok) return job;
  await announceJob(db, userId, job.value);
  return ok({ jobId: job.value });
};

// Only what the screen shows of a job (system design §4).
const NO_COUNTS: IngestionStats = {
  total: 0,
  added: 0,
  skipped: 0,
  covered: 0,
  hidden: 0,
  replaced: 0,
};

const outcomeOf = ({
  stats,
  statement,
}: IngestionJobResult): JobOutcome | undefined =>
  statement === null
    ? undefined
    : {
        stats: { ...NO_COUNTS, ...stats },
        statementId: statement.id,
        accountId: statement.accountId,
        period: statement.period,
        balance: statement.balance,
        ...(statement.differenceMinor === null
          ? {}
          : { differenceMinor: statement.differenceMinor }),
        ...(statement.chainedTo === null
          ? {}
          : { chainedTo: statement.chainedTo }),
      };

const uploadJob = (job: IngestionJobResult): UploadJob => {
  const outcome = outcomeOf(job);
  return {
    jobId: job.id,
    status: job.status,
    isSlow: job.isSlow,
    ...(job.formatId === null ? {} : { formatId: job.formatId }),
    ...(job.errorCode === null ? {} : { errorCode: job.errorCode }),
    ...(outcome ? { outcome } : {}),
  };
};

/**
 * The signed-in user's jobs among `jobIds`, in that order, as the upload
 * screen follows them: never their content. Other users' jobs, and jobs that
 * are gone, are left out; reading never creates the user's row.
 */
export const listUploadJobs = async (
  clerkUserId: string,
  jobIds: readonly string[],
): Promise<readonly UploadJob[]> => {
  if (jobIds.length === 0) return [];
  const jobs = await withSanitizedErrors("JOBS_NOT_READ", async () => {
    const db = getDb();
    const userId = await findUserId(db, clerkUserId);
    if (!userId) return [];
    return withUserContext(db, userId, (ctx) =>
      listIngestionJobResults(ctx, jobIds),
    );
  });
  const byId = new Map(jobs.map((job) => [job.id, job]));
  return jobIds.flatMap((id) => {
    const job = byId.get(id);
    return job ? [uploadJob(job)] : [];
  });
};

/**
 * The signed-in user's latest files sent, newest first, each with what its
 * job came to: never their content. Reading never creates the user's row.
 */
export const listUploadedFiles = async (
  clerkUserId: string,
): Promise<readonly UploadJob[]> => {
  const jobs = await withSanitizedErrors("FILES_NOT_READ", async () => {
    const db = getDb();
    const userId = await findUserId(db, clerkUserId);
    if (!userId) return [];
    return withUserContext(db, userId, (ctx) =>
      listRecentIngestionJobs(ctx, MAX_LISTED_FILES),
    );
  });
  return jobs.map(uploadJob);
};
