import type {
  AccountType,
  AppError,
  ExtractedContent,
  LocalDate,
  Period,
  PeriodSource,
  Result,
} from "@xtrakto/core";
import type { AccountRow, IngestionJobStatus } from "@xtrakto/db";
import type { z } from "zod";
import type {
  EXTRACTION_STAGE,
  NO_ANSWER,
  UPLOAD_STATUS,
} from "./upload.constants";
import type { submitStatementSchema } from "./upload.schemas";

export type ExtractionStage =
  (typeof EXTRACTION_STAGE)[keyof typeof EXTRACTION_STAGE];

/** One of the user's accounts, as the upload screen offers it. */
export type UploadAccount = AccountRow;

/** What the screen shows of a file before sending it: never its movements. */
export type StatementPreview = {
  readonly bankId: string;
  readonly formatId: string;
  readonly accountType: AccountType;
  /** Only a quarterly statement names its account, by these digits. */
  readonly accountLast4?: string;
  readonly period: Period;
  /** A statement's own period reads as months; one from its rows, as days. */
  readonly periodSource: PeriodSource;
  readonly movementCount: number;
};

/** A file read in the browser: what will be sent, and its preview. */
export type ExtractedStatement = {
  /** Only what the parser reads (ADR 0017). */
  readonly content: ExtractedContent;
  readonly preview: StatementPreview;
};

/** The one message a worker receives: the file's bytes, without its name. */
export type ExtractRequest = { readonly bytes: ArrayBuffer };

/** What a worker posts back: each stage as it starts, then the result. */
export type ExtractionMessage =
  | { readonly type: "stage"; readonly stage: ExtractionStage }
  | { readonly type: "done"; readonly result: Result<ExtractedStatement> };

/** What the upload queue needs from a worker, so tests can pass a fake one. */
export type ExtractionWorker = {
  postMessage: (request: ExtractRequest, transfer: Transferable[]) => void;
  terminate: () => void;
  onmessage: ((event: MessageEvent<ExtractionMessage>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
};

/** What the upload screen sends for a file: its content and, for an export, the account key. */
export type SubmitStatementInput = z.input<typeof submitStatementSchema>;

/** A submission once validated: the account key is now the account it pins. */
export type SubmitStatementRequest = z.output<typeof submitStatementSchema>;

/** The account chosen for a movements export, as the job will hold it. */
export type AccountChoice = NonNullable<SubmitStatementRequest["account"]>;

/** How the account selector names an account: `account:<id>` or `last4:<digits>`. */
export type AccountKey = NonNullable<SubmitStatementInput["account"]>;

/** A statement sent and waiting for the ingestion function. */
export type SubmittedStatement = { readonly jobId: string };

/** The server action that queues one file, or a stand-in in tests. */
export type SubmitStatement = (
  input: SubmitStatementInput,
) => Promise<Result<SubmittedStatement>>;

/** A file ready to send, with what goes up for it. */
export type FileToSend = {
  readonly id: string;
  readonly input: SubmitStatementInput;
};

/** What sending a file came to: the action's result, or no answer at all. */
export type SendOutcome = Result<SubmittedStatement> | typeof NO_ANSWER;

/** Why a file read is still waiting after an attempt to send it. */
export type SendProblem = AppError | typeof NO_ANSWER;

/** The month's statements, as the upload screen counts them. */
export type MonthlyUsage = {
  readonly used: number;
  readonly limit: number;
  /** The first day of next month in Bogotá, when the count starts again. */
  readonly resetsOn: LocalDate;
};

type UploadState =
  | { readonly status: typeof UPLOAD_STATUS.WAITING }
  | {
      readonly status: typeof UPLOAD_STATUS.EXTRACTING;
      readonly stage: ExtractionStage;
    }
  | {
      readonly status: typeof UPLOAD_STATUS.READY;
      readonly statement: ExtractedStatement;
      /** The account chosen for a movements export, when it had to be asked. */
      readonly accountKey?: AccountKey;
      /** Why the last attempt to send it didn't go through, if there was one. */
      readonly sendProblem?: SendProblem;
    }
  | {
      readonly status: typeof UPLOAD_STATUS.SENDING;
      readonly statement: ExtractedStatement;
      readonly accountKey?: AccountKey;
    }
  | {
      // Its content is let go: only the preview stays, with the job's id.
      readonly status: typeof UPLOAD_STATUS.SENT;
      readonly preview: StatementPreview;
      readonly jobId: string;
    }
  | { readonly status: typeof UPLOAD_STATUS.FAILED; readonly error: AppError };

/** A chosen file in the upload queue. Its name never leaves the browser. */
export type UploadItem = {
  readonly id: string;
  readonly file: File;
} & UploadState;

/** A job as the upload screen follows it: never its content. */
export type UploadJob = {
  readonly jobId: string;
  readonly status: IngestionJobStatus;
  readonly formatId?: string;
  /** Open for longer than an ingestion usually takes. */
  readonly isSlow: boolean;
  /** The period of the statement it saved, once done. */
  readonly period?: Period;
};

/** The server action that reports how some jobs go, or a stand-in in tests. */
export type GetUploadStatuses = (
  jobIds: readonly string[],
) => Promise<Result<readonly UploadJob[]>>;
