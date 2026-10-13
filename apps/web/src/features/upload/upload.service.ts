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
  createIngestionJobWithinLimit,
  type Database,
  deletePendingIngestionJob,
  findOrCreateUser,
  findUserId,
  listAccounts,
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
  SubmitStatementRequest,
  SubmittedStatement,
  UploadAccount,
} from "./upload.types";

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

type JobRequest = {
  readonly parser: BankParser;
  readonly content: ExtractedContent;
  readonly choice?: AccountChoice;
  readonly now: Date;
};

// Pins the account and takes one of the month's slots, in one transaction.
const createJob = async (
  ctx: UserContext,
  { parser, content, choice, now }: JobRequest,
): Promise<Result<string>> => {
  const pin = pinAccount(parser, choice, await listAccounts(ctx));
  if (!pin.ok) return pin;
  const month = monthBoundsInTimeZone(now, DEFAULT_TIME_ZONE);
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
      resetsOn: localDateFromInstant(month.end, DEFAULT_TIME_ZONE),
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
        now: new Date(),
      }),
    ),
  );
  if (!job.ok) return job;
  await announceJob(db, userId, job.value);
  return ok({ jobId: job.value });
};
