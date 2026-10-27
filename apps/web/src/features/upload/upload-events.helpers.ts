import { APP_ERROR_CODE, type AppError } from "@xtrakto/core";
import type { AnalyticsCall } from "@/utils/analytics-events.constants";
import {
  FILE_PROBLEM,
  JOB_STATUS,
  NO_ANSWER,
  UPLOAD_STATUS,
} from "./upload.constants";
import type { SendProblem, UploadItem, UploadJob } from "./upload.types";

/** Where a file stopped: read in the browser, sent, or ingested. */
export const FAILURE_STAGE = {
  BROWSER: "browser",
  SEND: "send",
  SERVER: "server",
} as const;

// The ranges PostHog sees instead of a statement's count of movements.
const MOVEMENT_RANGES = [
  { from: 500, label: "500+" },
  { from: 200, label: "200-499" },
  { from: 50, label: "50-199" },
  { from: 1, label: "1-49" },
] as const;

/** A count of movements as its range: 0, 1-49, 50-199, 200-499 or 500+. */
export const movementsRange = (count: number): string =>
  MOVEMENT_RANGES.find(({ from }) => count >= from)?.label ?? "0";

const FILE_PROBLEMS: ReadonlySet<unknown> = new Set(
  Object.values(FILE_PROBLEM),
);

// The browser's own checks say which one failed (type, size, a file chosen
// twice, one it couldn't read); anything else is told by its code.
const failureCode = (error: AppError): string => {
  const reason = error.details?.["reason"];
  return FILE_PROBLEMS.has(reason) ? String(reason) : error.code;
};

const sendFailureCode = (problem: SendProblem): string =>
  problem === NO_ANSWER ? NO_ANSWER : failureCode(problem);

type Failure = {
  readonly stage: (typeof FAILURE_STAGE)[keyof typeof FAILURE_STAGE];
  readonly errorCode?: string;
  readonly formatId?: string;
};

const failed = ({ stage, errorCode, formatId }: Failure): AnalyticsCall => ({
  event: "ingestion_failed",
  properties: {
    stage,
    ...(errorCode === undefined ? {} : { error_code: errorCode }),
    ...(formatId === undefined ? {} : { format_id: formatId }),
  },
});

// What one file's change tells: the server took it, it failed in the
// browser or when sent, or the send was refused. A send the month's limit
// stopped leaves the file ready without a problem, which only that refusal
// does.
const itemEvent = (
  before: UploadItem | undefined,
  item: UploadItem,
): AnalyticsCall | undefined => {
  const wasSending = before?.status === UPLOAD_STATUS.SENDING;
  if (item.status === UPLOAD_STATUS.SENT && wasSending)
    return {
      event: "statement_uploaded",
      properties: {
        format_id: item.preview.formatId,
        movements: movementsRange(item.preview.movementCount),
      },
    };
  if (item.status === UPLOAD_STATUS.FAILED && before?.status !== item.status)
    return wasSending
      ? failed({
          stage: FAILURE_STAGE.SEND,
          errorCode: failureCode(item.error),
          formatId: before.statement.preview.formatId,
        })
      : failed({
          stage: FAILURE_STAGE.BROWSER,
          errorCode: failureCode(item.error),
        });
  if (item.status === UPLOAD_STATUS.READY && wasSending)
    return failed({
      stage: FAILURE_STAGE.SEND,
      errorCode:
        item.sendProblem === undefined
          ? APP_ERROR_CODE.LIMIT_REACHED
          : sendFailureCode(item.sendProblem),
      formatId: item.statement.preview.formatId,
    });
  return undefined;
};

/**
 * What changed in the upload queue, as events: each file the server took
 * (`statement_uploaded`), and each one that stopped in the browser or when
 * sent (`ingestion_failed`), once. Never the file's name, its period or its
 * account.
 */
export const queueEvents = (
  before: readonly UploadItem[],
  after: readonly UploadItem[],
): AnalyticsCall[] => {
  const previous = new Map(before.map((item) => [item.id, item]));
  return after.flatMap((item) => itemEvent(previous.get(item.id), item) ?? []);
};

/**
 * The ingestions that failed since the last answer, among the jobs of the
 * files this page sent: those a reload brings back were told already.
 */
export const jobEvents = (
  before: ReadonlyMap<string, UploadJob>,
  after: ReadonlyMap<string, UploadJob>,
  sentJobIds: readonly string[],
): AnalyticsCall[] =>
  sentJobIds.flatMap((jobId) => {
    const job = after.get(jobId);
    if (job?.status !== JOB_STATUS.FAILED) return [];
    if (before.get(jobId)?.status === JOB_STATUS.FAILED) return [];
    return [
      failed({
        stage: FAILURE_STAGE.SERVER,
        errorCode: job.errorCode,
        formatId: job.formatId,
      }),
    ];
  });
