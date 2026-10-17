import "server-only";
import {
  categorizeStatement,
  err,
  normalizeHolderName,
  ok,
  type ParsedStatement,
  prepareStatement,
  type Result,
} from "@xtrakto/core";
import {
  claimIngestionJob,
  failIngestionJob,
  findAccountHolderName,
  finishIngestionJob,
  INGESTION_JOB_ERROR,
  type IngestionJobError,
  type IngestionStats,
  lockIngestionJob,
  type OpenIngestionJob,
  resolveIdentifiedAccount,
  resolveUnidentifiedAccount,
  saveStatement,
  toUserId,
  type UserContext,
  withUserContext,
} from "@xtrakto/db";
import { findParser } from "@xtrakto/parsers";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";
import { balanceCheckOf } from "./balance-check.helpers";

/** The job a `statement/submitted` event names, and its user. */
export type JobRef = { readonly jobId: string; readonly userId: string };

/** What ingesting a job did, in ids, codes and counts only (ADR 0019). */
export type IngestOutcome =
  | { readonly status: "done"; readonly stats: IngestionStats }
  | { readonly status: "failed"; readonly errorCode: IngestionJobError }
  // Finished before, by an earlier attempt, or deleted with its user.
  | { readonly status: "closed" };

const { UNKNOWN_FORMAT, PARSE_FAILED, ACCOUNT_REQUIRED, INTERNAL_ERROR } =
  INGESTION_JOB_ERROR;
const CLOSED: IngestOutcome = { status: "closed" };

// The job's user's transaction, throwing errors that never quote its data.
const inUserContext = <T>(
  label: string,
  { userId }: JobRef,
  work: (ctx: UserContext) => Promise<T>,
): Promise<T> =>
  withSanitizedErrors(label, () =>
    withUserContext(getDb(), toUserId(userId), work),
  );

// The server's parse is the authoritative one; the browser's was a preview.
const parseJob = ({
  extractedContent,
}: OpenIngestionJob): Result<ParsedStatement, IngestionJobError> => {
  const parser = findParser(extractedContent);
  if (!parser.ok) return err(UNKNOWN_FORMAT);
  const parsed = parser.value.parse(extractedContent);
  return parsed.ok ? parsed : err(PARSE_FAILED);
};

// A quarterly statement names its account. A movements export goes where it
// was pinned when submitted, or to the user's only account of its kind.
const resolveAccount = async (
  ctx: UserContext,
  statement: ParsedStatement,
  job: OpenIngestionJob,
): Promise<Result<string>> => {
  const kind = {
    bankId: statement.bankId,
    accountType: statement.accountType,
    currency: statement.currency,
  };
  if (statement.accountLast4 !== undefined) {
    const { holderName } = statement;
    return ok(
      await resolveIdentifiedAccount(ctx, {
        ...kind,
        last4: statement.accountLast4,
        holderNameNormalized:
          holderName === undefined
            ? undefined
            : normalizeHolderName(holderName),
      }),
    );
  }
  if (job.accountId) return ok(job.accountId);
  if (job.accountLast4)
    return ok(
      await resolveIdentifiedAccount(ctx, { ...kind, last4: job.accountLast4 }),
    );
  return resolveUnidentifiedAccount(ctx, kind);
};

const fail = async (
  ctx: UserContext,
  jobId: string,
  errorCode: IngestionJobError,
): Promise<IngestOutcome> => {
  await failIngestionJob(ctx, jobId, errorCode);
  return { status: "failed", errorCode };
};

const ingestOpenJob = async (
  ctx: UserContext,
  jobId: string,
  job: OpenIngestionJob,
): Promise<IngestOutcome> => {
  const parsed = parseJob(job);
  if (!parsed.ok) return fail(ctx, jobId, parsed.error);
  const account = await resolveAccount(ctx, parsed.value, job);
  if (!account.ok) return fail(ctx, jobId, ACCOUNT_REQUIRED);
  const prepared = await prepareStatement(
    parsed.value,
    getServerEnv().IDENTIFIER_HASH_KEY,
  );
  // The holder's name a quarterly statement of the account printed, this one
  // or an earlier one: a movements export prints none.
  const holderName = await findAccountHolderName(ctx, account.value);
  const saved = await saveStatement(ctx, {
    accountId: account.value,
    statement: categorizeStatement(prepared, { holderName }),
    balance: balanceCheckOf(parsed.value),
  });
  if (!saved.ok) throw new Error("The resolved account isn't the user's.");
  const { statementId, ...stats } = saved.value;
  await finishIngestionJob(ctx, jobId, { statementId, stats });
  return { status: "done", stats };
};

/** Marks a job as processing; false when it has nothing left to do. */
export const claimJob = (job: JobRef): Promise<boolean> =>
  inUserContext("JOB_NOT_CLAIMED", job, (ctx) =>
    claimIngestionJob(ctx, job.jobId),
  );

/**
 * Ingests a job's statement in one transaction: parses it again on the
 * server, resolves its account, reconciles, prepares its movements
 * (fingerprints, HMAC), categorizes them by the rules (ADR 0023) and saves
 * them, then finishes the job and deletes its content. A statement the
 * parser can't read, or an export whose account the user has to choose,
 * fails the job with its code. Unexpected errors are thrown without their
 * message, for Inngest to retry.
 */
export const ingestJob = (job: JobRef): Promise<IngestOutcome> =>
  inUserContext("JOB_NOT_INGESTED", job, async (ctx) => {
    const open = await lockIngestionJob(ctx, job.jobId);
    return open ? ingestOpenJob(ctx, job.jobId, open) : CLOSED;
  });

/** After the last retry: fails the job, if still open, and deletes its content. */
export const failJob = (job: JobRef): Promise<boolean> =>
  inUserContext("JOB_NOT_FAILED", job, (ctx) =>
    failIngestionJob(ctx, job.jobId, INTERNAL_ERROR),
  );
