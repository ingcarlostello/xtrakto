import "server-only";
import { DEFAULT_TIME_ZONE, localDateFromInstant } from "@xtrakto/core";
import {
  countCountedMovements,
  findUserId,
  type IngestionJobResult,
  type IngestionStats,
  listIngestionJobResults,
  listRecentIngestionJobs,
  listStatementMatches,
  type StatementMatches,
  type UserContext,
  withUserContext,
} from "@xtrakto/db";
import { readTodaysBalanceOffer } from "@/features/todays-balance/todays-balance.service";
import type { TodaysBalanceOffer } from "@/features/todays-balance/todays-balance.types";
import { getDb } from "@/lib/db";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";
import { periodDays, periodParam } from "@/utils/transactions-url.helpers";
import { reviewQuarterOf } from "./next-step.helpers";
import type { JobOutcome, UploadJob } from "./upload.types";
import { MAX_LISTED_FILES } from "./uploaded-files.constants";

// Only what the screen shows of a job (system design §4).
const NO_COUNTS: IngestionStats = {
  total: 0,
  added: 0,
  skipped: 0,
  covered: 0,
  hidden: 0,
  replaced: 0,
};

const NO_MATCHES: StatementMatches = {
  matched: 0,
  dayApart: 0,
  references: 0,
  verifiedBy: [],
};

/**
 * What the screen reads with some jobs: what each statement matched and,
 * while the screen follows them, what each quarter has to review.
 */
type JobsRead = {
  readonly jobs: readonly IngestionJobResult[];
  readonly matches: ReadonlyMap<string, StatementMatches>;
  readonly toReview: ReadonlyMap<string, number>;
  /** By statement: the field a movements file's result offers (10.3). */
  readonly todaysBalance: ReadonlyMap<string, TodaysBalanceOffer>;
};

type JobStatement = NonNullable<IngestionJobResult["statement"]>;

const NOTHING_READ: JobsRead = {
  jobs: [],
  matches: new Map(),
  toReview: new Map(),
  todaysBalance: new Map(),
};

const statementsOf = (
  jobs: readonly IngestionJobResult[],
): readonly JobStatement[] =>
  jobs.flatMap(({ statement }) => (statement === null ? [] : [statement]));

// An account's quarter, whose movements the quick review asks about.
const reviewKeyOf = ({ accountId, period }: JobStatement): string =>
  `${accountId} ${periodParam(reviewQuarterOf(period))}`;

// The movements waiting for review in each statement's quarter, once each.
// One after the other: they share the transaction.
const countToReview = async (
  ctx: UserContext,
  jobs: readonly IngestionJobResult[],
): Promise<ReadonlyMap<string, number>> => {
  const counts = new Map<string, number>();
  for (const statement of statementsOf(jobs)) {
    const key = reviewKeyOf(statement);
    if (counts.has(key)) continue;
    counts.set(
      key,
      await countCountedMovements(ctx, {
        accountId: statement.accountId,
        period: periodDays(reviewQuarterOf(statement.period)),
        isPendingReview: true,
      }),
    );
  }
  return counts;
};

// The field each movements file of the jobs offers, through today in Bogotá.
// One after the other: they share the transaction.
const todaysBalanceOffers = async (
  ctx: UserContext,
  jobs: readonly IngestionJobResult[],
): Promise<ReadonlyMap<string, TodaysBalanceOffer>> => {
  const today = localDateFromInstant(new Date(), DEFAULT_TIME_ZONE);
  const offers = new Map<string, TodaysBalanceOffer>();
  for (const statement of statementsOf(jobs)) {
    if (statement.balance !== "none" || offers.has(statement.id)) continue;
    const offer = await readTodaysBalanceOffer(ctx, statement, today);
    if (offer) offers.set(statement.id, offer);
  }
  return offers;
};

// What each statement of the jobs matched, counted when read (10.1b).
const matchesOf = (ctx: UserContext, jobs: readonly IngestionJobResult[]) =>
  listStatementMatches(ctx, [
    ...new Set(statementsOf(jobs).map(({ id }) => id)),
  ]);

// What the job's statement matched, as the job sees it: one that saved
// nothing of its own, as the same file again, points at the statement saved
// before, whose upload carried the references over, not this one.
const jobMatches = (
  stats: IngestionStats,
  matches: StatementMatches = NO_MATCHES,
): StatementMatches =>
  stats.total > 0 && stats.skipped === stats.total
    ? { ...matches, references: 0 }
    : matches;

const outcomeOf = (
  job: IngestionJobResult,
  { matches, toReview, todaysBalance }: JobsRead,
): JobOutcome | undefined => {
  const { statement } = job;
  if (statement === null) return undefined;
  const stats = { ...NO_COUNTS, ...job.stats };
  const waiting = toReview.get(reviewKeyOf(statement));
  const offer = todaysBalance.get(statement.id);
  return {
    stats,
    statementId: statement.id,
    accountId: statement.accountId,
    bankId: statement.bankId,
    period: statement.period,
    balance: statement.balance,
    ...(statement.differenceMinor === null
      ? {}
      : { differenceMinor: statement.differenceMinor }),
    ...(statement.chainedTo === null ? {} : { chainedTo: statement.chainedTo }),
    matches: jobMatches(stats, matches.get(statement.id)),
    ...(waiting === undefined ? {} : { toReview: waiting }),
    ...(offer === undefined ? {} : { todaysBalance: offer }),
  };
};

const uploadJob = (job: IngestionJobResult, read: JobsRead): UploadJob => {
  const outcome = outcomeOf(job, read);
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
 * screen follows them: never their content. Each done job says what its
 * statement matched and what its quarter has to review. Other users' jobs,
 * and jobs that are gone, are left out; reading never creates the user's
 * row.
 */
export const listUploadJobs = async (
  clerkUserId: string,
  jobIds: readonly string[],
): Promise<readonly UploadJob[]> => {
  if (jobIds.length === 0) return [];
  const read = await withSanitizedErrors("JOBS_NOT_READ", async () => {
    const db = getDb();
    const userId = await findUserId(db, clerkUserId);
    if (!userId) return NOTHING_READ;
    return withUserContext(db, userId, async (ctx) => {
      const jobs = await listIngestionJobResults(ctx, jobIds);
      return {
        jobs,
        matches: await matchesOf(ctx, jobs),
        toReview: await countToReview(ctx, jobs),
        todaysBalance: await todaysBalanceOffers(ctx, jobs),
      };
    });
  });
  const byId = new Map(read.jobs.map((job) => [job.id, job]));
  return jobIds.flatMap((id) => {
    const job = byId.get(id);
    return job ? [uploadJob(job, read)] : [];
  });
};

/**
 * The signed-in user's latest files sent, newest first, each with what its
 * job came to and what its statement matched: never their content. Reading
 * never creates the user's row.
 */
export const listUploadedFiles = async (
  clerkUserId: string,
): Promise<readonly UploadJob[]> => {
  const read = await withSanitizedErrors("FILES_NOT_READ", async () => {
    const db = getDb();
    const userId = await findUserId(db, clerkUserId);
    if (!userId) return NOTHING_READ;
    return withUserContext(db, userId, async (ctx) => {
      const jobs = await listRecentIngestionJobs(ctx, MAX_LISTED_FILES);
      return { ...NOTHING_READ, jobs, matches: await matchesOf(ctx, jobs) };
    });
  });
  return read.jobs.map((job) => uploadJob(job, read));
};
