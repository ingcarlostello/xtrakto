import type {
  AccountType,
  AmountMinor,
  AppError,
  ColumnRole,
  ExtractedContent,
  FormatMapping,
  FormatSample,
  LocalDate,
  Period,
  PeriodSource,
  Result,
} from "@xtrakto/core";
import type {
  AccountRow,
  IngestionJobError,
  IngestionJobStatus,
  IngestionStats,
  StatementBalance,
  StatementMatches,
} from "@xtrakto/db";
import type { z } from "zod";
import type {
  EXTRACTION_STAGE,
  NO_ANSWER,
  UPLOAD_STATUS,
} from "./upload.constants";
import type { MappingProposal } from "@/features/format-mappings/format-mapping.types";
import type { TodaysBalanceOffer } from "@/features/todays-balance/todays-balance.types";
import type { submitStatementSchema } from "./upload.schemas";

export type ExtractionStage =
  (typeof EXTRACTION_STAGE)[keyof typeof EXTRACTION_STAGE];

/** One of the user's accounts, as the upload screen offers it. */
export type UploadAccount = AccountRow;

/** What reading a PDF came to, in counts only: never its text. */
export type PdfReading = {
  readonly pageCount: number;
  /** Descriptions the PDF wrapped over two lines, joined again. */
  readonly joinedDescriptions: number;
};

/** What the screen shows of a file before sending it: never its movements. */
export type StatementPreview = {
  readonly bankId: string;
  readonly formatId: string;
  readonly accountType: AccountType;
  /** Only a format that names its account does, by these digits. */
  readonly accountLast4?: string;
  readonly period: Period;
  /** A statement's own period reads as months; one from its rows, as days. */
  readonly periodSource: PeriodSource;
  readonly movementCount: number;
  /** A PDF's reading, which its upload result tells while the page holds it. */
  readonly pdf?: PdfReading;
};

/** A file read in the browser: what will be sent, and its preview. */
export type ExtractedStatement = {
  /** Only what the parser reads (ADR 0017). */
  readonly content: ExtractedContent;
  readonly preview: StatementPreview;
};

/**
 * A file no parser knows, with a table: what's asked about its format (Stage
 * 11). Its header's names find a mapping saved for it, and its sample, names
 * and shapes only (ADR 0038), lets the LLM propose one.
 */
export type UnknownFormat = {
  readonly header: readonly string[];
  readonly sample: FormatSample;
};

/** A file read in the browser: a statement of a known format, or a table no parser knows. */
export type FileReading =
  | { readonly kind: "statement"; readonly statement: ExtractedStatement }
  | {
      readonly kind: "unknown";
      readonly content: ExtractedContent;
      readonly format: UnknownFormat;
    };

/**
 * What a worker is asked: to read a file's bytes, without its name and with
 * the password to open a PDF with when there's one to try; then, for a file
 * no parser knows, which it keeps, to read it with a mapping, or what a
 * mapping from the LLM's roles makes of it.
 */
export type ExtractRequest =
  | {
      readonly type: "extract";
      readonly bytes: ArrayBuffer;
      readonly password?: string;
    }
  | { readonly type: "read"; readonly mapping: FormatMapping }
  | { readonly type: "propose"; readonly roles: readonly ColumnRole[] };

/** The kind of file a row shows, by its icon. */
export type FileKind = "excel" | "pdf";

/**
 * A password to open a PDF with, which lives in the page's memory only: one
 * the person typed for it, or one that opened another PDF of theirs.
 */
export type PasswordTry = {
  readonly value: string;
  readonly isTyped: boolean;
};

/**
 * What a worker posts back: each stage as it starts, then the statement it
 * read; or, for a file no parser knows, its format, then what each mapping
 * asked about makes of it.
 */
export type ExtractionMessage =
  | { readonly type: "stage"; readonly stage: ExtractionStage }
  | { readonly type: "done"; readonly result: Result<ExtractedStatement> }
  | { readonly type: "unknown"; readonly format: UnknownFormat }
  | { readonly type: "read"; readonly result: Result<ExtractedStatement> }
  | { readonly type: "proposed"; readonly result: Result<MappingProposal> };

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

/** The server action that finds the mapping saved for a format, or a stand-in in tests. */
export type FindSavedFormat = (
  header: readonly string[],
) => Promise<Result<{ mapping: FormatMapping | null }>>;

/** Why the LLM proposed no roles: an app error or the AI's, by its code. */
export type ProposalError = {
  readonly code: string;
  /** For a limit reached: the user's month or the platform's budget. */
  readonly limit?: string;
};

/** The server action that asks the LLM for a format's roles, or a stand-in in tests. */
export type ProposeFormat = (
  sample: FormatSample,
) => Promise<Result<{ roles: ColumnRole[] }, ProposalError>>;

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
  | {
      readonly status: typeof UPLOAD_STATUS.WAITING;
      readonly password?: PasswordTry;
    }
  | {
      readonly status: typeof UPLOAD_STATUS.EXTRACTING;
      readonly stage: ExtractionStage;
      readonly password?: PasswordTry;
    }
  | {
      // A PDF that opens only with its password.
      readonly status: typeof UPLOAD_STATUS.LOCKED;
      /** The last password that didn't open it, so it isn't tried again. */
      readonly failedWith?: string;
      /** Whether the person typed that password for this file. */
      readonly isWrong: boolean;
    }
  // A file no parser knows (11.3a), while a mapping saved for its format is
  // looked up and read, then while the LLM proposes one.
  | { readonly status: typeof UPLOAD_STATUS.FINDING_FORMAT }
  | { readonly status: typeof UPLOAD_STATUS.PROPOSING }
  | {
      // Waiting for the person to confirm what the proposal makes of it.
      readonly status: typeof UPLOAD_STATUS.CONFIRMING;
      readonly proposal: MappingProposal;
    }
  | { readonly status: typeof UPLOAD_STATUS.CONFIRMED }
  | {
      readonly status: typeof UPLOAD_STATUS.READY;
      readonly statement: ExtractedStatement;
      /** The account chosen for a movements export, when it had to be asked. */
      readonly accountKey?: AccountKey;
      /** The mapping the person confirmed for it, which goes up with it. */
      readonly mapping?: FormatMapping;
      /** Why the last attempt to send it didn't go through, if there was one. */
      readonly sendProblem?: SendProblem;
    }
  | {
      readonly status: typeof UPLOAD_STATUS.SENDING;
      readonly statement: ExtractedStatement;
      readonly accountKey?: AccountKey;
      readonly mapping?: FormatMapping;
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
  /** Why it failed. */
  readonly errorCode?: IngestionJobError;
  /** Once done, what it came to. */
  readonly outcome?: JobOutcome;
};

/** What a done job came to: its counts and its statement's balances. */
export type JobOutcome = {
  readonly stats: IngestionStats;
  /** The statement it saved, or the one that already held its movements. */
  readonly statementId: string;
  /** The account its statement was saved to. */
  readonly accountId: string;
  readonly period: Period;
  readonly balance: StatementBalance;
  /** When it doesn't reconcile: the closing difference. */
  readonly differenceMinor?: AmountMinor;
  /** When it opens where the account's previous quarterly statement closed: that one's period. */
  readonly chainedTo?: Period;
  /** What matching it with the other format came to (10.1a), counted when read. */
  readonly matches: StatementMatches;
  /** The movements of its quarter that wait for the quick review, while the screen follows the job. */
  readonly toReview?: number;
  /** Today's balance, when the file can check it (10.3), while the screen follows the job. */
  readonly todaysBalance?: TodaysBalanceOffer;
};

/** The server action that reports how some jobs go, or a stand-in in tests. */
export type GetUploadStatuses = (
  jobIds: readonly string[],
) => Promise<Result<readonly UploadJob[]>>;
