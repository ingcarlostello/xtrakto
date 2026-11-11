import { APP_ERROR_CODE, formatDayInWords } from "@xtrakto/core";
import type { AppError, Period } from "@xtrakto/core";
import type { StatusTone } from "@/components/status-pill/StatusPill";
import { BANK_LABELS, MASKED_DIGITS } from "@/utils/account-label.constants";
import { countText } from "@/utils/count-text.utils";
import { FORMAT_LABELS } from "@/utils/statement-label.constants";
import {
  fileTypeOf,
  isPdfFormat,
  labelOf,
  periodText,
  statementLabel,
  statementPeriodText,
} from "@/utils/statement-label.helpers";
import { isPdfName } from "./file-checks.helpers";
import { UNKNOWN_FORMAT_COPY as FORMAT_COPY } from "./unknown-format.constants";
import {
  FILE_PROBLEM,
  FORMAT_BANKS,
  JOB_PROBLEMS,
  JOB_STATUS,
  NO_ANSWER,
  PROBLEM_COPY,
  UPLOAD_COPY as COPY,
  UPLOAD_STATUS,
} from "./upload.constants";
import type {
  FileKind,
  MonthlyUsage,
  SendProblem,
  StatementPreview,
  UploadItem,
  UploadJob,
} from "./upload.types";

type Labels = Readonly<Partial<Record<string, string>>>;
type ProblemText = { readonly title: string; readonly detail: string };

/**
 * What a chosen file's row shows: its stage, its preview, its problem, or the
 * password its PDF asks for, while it opens with a typed one too.
 */
export type FileRowView =
  | { readonly kind: "progress"; readonly text: string }
  | {
      readonly kind: "ready";
      readonly tags: readonly string[];
      readonly count?: string;
      /** Once "Subir" is pressed: going up, gone up, then how its job goes. */
      readonly note?: string;
      /** When its job takes longer than usual. */
      readonly notice?: string;
    }
  | ({ readonly kind: "problem" } & ProblemText)
  | ({
      readonly kind: "locked";
      /** The password the person typed didn't open it. */
      readonly isWrong: boolean;
      /** A password the person typed is being tried. */
      readonly isOpening: boolean;
    } & ProblemText);

/** The tags of a file read in the browser: bank, format, file type, period. */
export const previewTags = (preview: StatementPreview): readonly string[] => [
  labelOf(BANK_LABELS, preview.bankId),
  labelOf(FORMAT_LABELS, preview.formatId),
  fileTypeOf(preview.formatId),
  periodText(preview.period, preview.periodSource),
];

/** A job's file as its icon shows it: a PDF, or a spreadsheet. */
export const jobFileKind = ({ formatId }: UploadJob): FileKind =>
  isPdfFormat(formatId) ? "pdf" : "excel";

const previewOf = (item: UploadItem): StatementPreview | undefined => {
  if (item.status === UPLOAD_STATUS.SENT) return item.preview;
  if (item.status === UPLOAD_STATUS.READY) return item.statement.preview;
  if (item.status === UPLOAD_STATUS.SENDING) return item.statement.preview;
  return undefined;
};

/**
 * A chosen file as its icon shows it: by its format once read, since its
 * bytes decide how it's read, and by its name until then.
 */
export const fileKindOf = (item: UploadItem): FileKind => {
  const preview = previewOf(item);
  if (preview !== undefined)
    return isPdfFormat(preview.formatId) ? "pdf" : "excel";
  return isPdfName(item.file.name) ? "pdf" : "excel";
};

/**
 * What the server recognized in a job's file: bank, format and period. A
 * spreadsheet read through a mapping has no bank of its format's (Stage 11).
 */
export const recognizedText = (formatId: string, period: Period): string => {
  const banks: Labels = FORMAT_BANKS;
  const bankId = banks[formatId];
  return [
    ...(bankId === undefined ? [] : [labelOf(BANK_LABELS, bankId)]),
    labelOf(FORMAT_LABELS, formatId),
    statementPeriodText(formatId, period),
  ].join(" · ");
};

/**
 * What names a job the page didn't read: its format and, once saved, its
 * period. A file's name never leaves the browser.
 */
export const jobLabel = ({ formatId, outcome }: UploadJob): string => {
  if (formatId === undefined) return COPY.statement;
  if (outcome === undefined) return labelOf(FORMAT_LABELS, formatId);
  return statementLabel(formatId, outcome.period);
};

// A quarterly statement names its account; a movements export gets its
// account below, from the destination.
const readyCount = (preview: StatementPreview): string => {
  const count = countText(preview.movementCount, COPY.movements);
  if (preview.accountLast4 === undefined) return count;
  return `${count} · ${COPY.statementAccount} ${MASKED_DIGITS}${preview.accountLast4}`;
};

const INPUT_PROBLEMS: Readonly<Partial<Record<string, ProblemText>>> = {
  [FILE_PROBLEM.SIZE]: PROBLEM_COPY.tooHeavy,
  [FILE_PROBLEM.DUPLICATE]: PROBLEM_COPY.duplicate,
  [FILE_PROBLEM.SCANNED]: PROBLEM_COPY.scanned,
  [FILE_PROBLEM.TOO_MANY_PAGES]: PROBLEM_COPY.tooManyPages,
};

// Content over the extraction's bounds or the upload's is too large.
const inputProblem = (reason: unknown): ProblemText =>
  (typeof reason === "string" ? INPUT_PROBLEMS[reason] : undefined) ??
  PROBLEM_COPY.tooLarge;

// A file that isn't a spreadsheet or a PDF, or one that holds no table.
const unknownFormatProblem = (reason: unknown): ProblemText =>
  reason === FILE_PROBLEM.TYPE
    ? PROBLEM_COPY.wrongType
    : PROBLEM_COPY.notAStatement;

// SheetJS and pdf.js give no reason when they can't open a file; a parser
// always says which part of a statement it couldn't read.
const parseProblem = (reason: unknown): ProblemText => {
  if (reason === undefined) return PROBLEM_COPY.damaged;
  if (reason === FILE_PROBLEM.UNREADABLE) return PROBLEM_COPY.unreadable;
  return PROBLEM_COPY.incomplete;
};

/** What happened to a file and what to do about it (`docs/ui/v8-13`). */
export const problemText = ({ code, details }: AppError): ProblemText => {
  const reason = details?.reason;
  switch (code) {
    case APP_ERROR_CODE.UNKNOWN_FORMAT:
      return unknownFormatProblem(reason);
    case APP_ERROR_CODE.INVALID_INPUT:
      return inputProblem(reason);
    case APP_ERROR_CODE.PARSE_FAILED:
      return parseProblem(reason);
    case APP_ERROR_CODE.UNAUTHORIZED:
      return PROBLEM_COPY.signedOut;
    default:
      return PROBLEM_COPY.unreadable;
  }
};

// The server refuses an account only when the person has several to choose
// from, or chose one that's gone.
const sendProblemText = (problem: SendProblem): ProblemText => {
  if (problem === NO_ANSWER) return PROBLEM_COPY.noAnswer;
  return problem.code === APP_ERROR_CODE.ACCOUNT_REQUIRED
    ? PROBLEM_COPY.chooseAccount
    : PROBLEM_COPY.accountGone;
};

const previewView = (preview: StatementPreview, note?: string) =>
  ({
    kind: "ready",
    tags: previewTags(preview),
    count: readyCount(preview),
    note,
  }) as const;

const jobNote = (job: UploadJob | undefined): string => {
  if (job?.status === JOB_STATUS.PROCESSING) return COPY.processing;
  if (job?.status === JOB_STATUS.DONE) return COPY.processed;
  return COPY.sent;
};

/** A sent file's row as its job goes, under its preview when the page read it. */
export const jobView = (
  job: UploadJob | undefined,
  preview?: StatementPreview,
): FileRowView => {
  if (job?.status === JOB_STATUS.FAILED)
    return {
      kind: "problem",
      ...(job.errorCode
        ? JOB_PROBLEMS[job.errorCode]
        : PROBLEM_COPY.notProcessed),
    };
  return {
    ...(preview ? previewView(preview) : { kind: "ready", tags: [] }),
    note: jobNote(job),
    notice: job?.isSlow ? COPY.slow : undefined,
  };
};

/** Whether a file's row asks for its PDF's password, also while it opens. */
export const isAskingForPassword = (item: UploadItem): boolean =>
  item.status === UPLOAD_STATUS.LOCKED ||
  ((item.status === UPLOAD_STATUS.WAITING ||
    item.status === UPLOAD_STATUS.EXTRACTING) &&
    item.password?.isTyped === true);

const lockedView = (isWrong: boolean, isOpening: boolean): FileRowView => ({
  kind: "locked",
  title: COPY.locked.title,
  detail: COPY.locked.detail,
  isWrong,
  isOpening,
});

// While a password the person typed is tried, the row keeps asking for it,
// so the field and its focus stay; another PDF's password is tried quietly.
export const fileRowView = (item: UploadItem, job?: UploadJob): FileRowView => {
  switch (item.status) {
    case UPLOAD_STATUS.WAITING:
      return item.password?.isTyped
        ? lockedView(false, true)
        : { kind: "progress", text: COPY.waiting };
    case UPLOAD_STATUS.EXTRACTING:
      return item.password?.isTyped
        ? lockedView(false, true)
        : { kind: "progress", text: COPY.stage[item.stage] };
    case UPLOAD_STATUS.LOCKED:
      return lockedView(item.isWrong, false);
    case UPLOAD_STATUS.FINDING_FORMAT:
      return { kind: "progress", text: FORMAT_COPY.finding };
    case UPLOAD_STATUS.PROPOSING:
      return { kind: "progress", text: FORMAT_COPY.proposing };
    case UPLOAD_STATUS.CONFIRMING:
      return { kind: "progress", text: FORMAT_COPY.confirming };
    case UPLOAD_STATUS.CONFIRMED:
      return { kind: "progress", text: FORMAT_COPY.confirmed };
    case UPLOAD_STATUS.READY:
      return item.sendProblem
        ? { kind: "problem", ...sendProblemText(item.sendProblem) }
        : previewView(item.statement.preview);
    case UPLOAD_STATUS.SENDING:
      return previewView(item.statement.preview, COPY.sending);
    case UPLOAD_STATUS.SENT:
      return jobView(job, item.preview);
    case UPLOAD_STATUS.FAILED:
      return { kind: "problem", ...problemText(item.error) };
  }
};

/** Whether the month's statements are used up. */
export const isLimitReached = ({ used, limit }: MonthlyUsage): boolean =>
  used >= limit;

const renewal = ({ resetsOn }: MonthlyUsage): string =>
  `${COPY.renewsOn} ${formatDayInWords(resetsOn)}`;

/** The month's count as its pill says it: how many are left, and when they renew once none are. */
export const usagePill = (
  usage: MonthlyUsage,
): {
  readonly tone: StatusTone;
  readonly title: string;
  readonly detail: string;
} => {
  const available = Math.max(0, usage.limit - usage.used);
  return {
    tone: available > 0 ? "ok" : "attention",
    title: `${available} de ${usage.limit} ${COPY.available}`,
    detail: available > 0 ? COPY.filesThisMonth : renewal(usage),
  };
};

/** Why "Subir" waits once the month's statements are used up. */
export const limitText = (usage: MonthlyUsage): string =>
  `${COPY.limitReached} ${renewal(usage)}.`;
