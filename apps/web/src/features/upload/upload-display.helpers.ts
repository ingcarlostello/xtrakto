import {
  APP_ERROR_CODE,
  formatDayInWords,
  formatDayRange,
  formatMonthRange,
  PERIOD_SOURCE,
} from "@xtrakto/core";
import type { AppError } from "@xtrakto/core";
import type { StatusTone } from "@/components/status-pill/StatusPill";
import {
  BANK_LABELS,
  FILE_PROBLEM,
  FORMAT_LABELS,
  NO_ANSWER,
  PROBLEM_COPY,
  UPLOAD_COPY as COPY,
  MASKED_DIGITS,
  UPLOAD_STATUS,
} from "./upload.constants";
import type {
  MonthlyUsage,
  SendProblem,
  StatementPreview,
  UploadItem,
} from "./upload.types";

type Labels = Readonly<Partial<Record<string, string>>>;
type Noun = { readonly one: string; readonly other: string };
type ProblemText = { readonly title: string; readonly detail: string };

/** What a chosen file's row shows: its stage, its preview or its problem. */
export type FileRowView =
  | { readonly kind: "progress"; readonly text: string }
  | {
      readonly kind: "ready";
      readonly tags: readonly string[];
      readonly count: string;
      /** Once "Subir" is pressed: going up, or gone up. */
      readonly note?: string;
    }
  | ({ readonly kind: "problem" } & ProblemText);

const COUNT_FORMAT = new Intl.NumberFormat("es-CO");

/** A count with its noun: `"1 movimiento"`, `"1.234 movimientos"`. */
export const countText = (count: number, noun: Noun): string =>
  `${COUNT_FORMAT.format(count)} ${count === 1 ? noun.one : noun.other}`;

// An id without a label is shown as it is: no parser returns one today.
const labelOf = (labels: Labels, id: string): string => labels[id] ?? id;

/** The tags of a file read in the browser: bank, format, file type, period. */
export const previewTags = (preview: StatementPreview): readonly string[] => [
  labelOf(BANK_LABELS, preview.bankId),
  labelOf(FORMAT_LABELS, preview.formatId),
  COPY.excel,
  preview.periodSource === PERIOD_SOURCE.STATEMENT
    ? formatMonthRange(preview.period)
    : formatDayRange(preview.period),
];

// A quarterly statement names its account; a movements export gets its
// account below, from the destination.
const readyCount = (preview: StatementPreview): string => {
  const count = countText(preview.movementCount, COPY.movements);
  if (preview.accountLast4 === undefined) return count;
  return `${count} · ${COPY.statementAccount} ${MASKED_DIGITS}${preview.accountLast4}`;
};

const inputProblem = (reason: unknown): ProblemText => {
  if (reason === FILE_PROBLEM.SIZE) return PROBLEM_COPY.tooHeavy;
  if (reason === FILE_PROBLEM.DUPLICATE) return PROBLEM_COPY.duplicate;
  return PROBLEM_COPY.tooLarge;
};

// SheetJS gives no reason when it can't open a file; a parser always says
// which part of a statement it couldn't read.
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
      return reason === FILE_PROBLEM.TYPE
        ? PROBLEM_COPY.notExcel
        : PROBLEM_COPY.notAStatement;
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

export const fileRowView = (item: UploadItem): FileRowView => {
  switch (item.status) {
    case UPLOAD_STATUS.WAITING:
      return { kind: "progress", text: COPY.waiting };
    case UPLOAD_STATUS.EXTRACTING:
      return { kind: "progress", text: COPY.stage[item.stage] };
    case UPLOAD_STATUS.READY:
      return item.sendProblem
        ? { kind: "problem", ...sendProblemText(item.sendProblem) }
        : previewView(item.statement.preview);
    case UPLOAD_STATUS.SENDING:
      return previewView(item.statement.preview, COPY.sending);
    case UPLOAD_STATUS.SENT:
      return previewView(item.preview, COPY.sent);
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
