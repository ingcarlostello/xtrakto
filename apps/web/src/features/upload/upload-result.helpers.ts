import {
  CURRENCY,
  formatAmount,
  formatMonthRange,
  isAmountMinor,
} from "@xtrakto/core";
import type { StatusTone } from "@/components/status-pill/StatusPill";
import { countText, recognizedText } from "./upload-display.helpers";
import {
  RESULT_COPY as COPY,
  STATEMENT_BALANCE,
  UPLOAD_COPY,
} from "./upload.constants";
import type { JobOutcome, UploadJob } from "./upload.types";

/** A step of the processing, as the result lists it. */
export type ResultStep = {
  readonly title: string;
  readonly detail: string;
  /** False for the balance check of a statement that doesn't reconcile. */
  readonly isOk: boolean;
};

/** What a done job's result shows (docs/ui/v8-08, within Stage 5). */
export type ResultView = {
  /** False when its statement doesn't reconcile: the attention surface. */
  readonly isOk: boolean;
  readonly title: string;
  readonly note?: string;
  readonly counts: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly pill: {
    readonly tone: StatusTone;
    readonly title: string;
    readonly detail: string;
  };
  readonly steps: readonly ResultStep[];
};

const NUMBER = new Intl.NumberFormat("es-CO");
const noun = <T>(count: number, words: { one: T; other: T }): T =>
  count === 1 ? words.one : words.other;

/** How far off a statement that doesn't reconcile is, when it says: `"$810"`. */
export const offBy = ({ differenceMinor }: JobOutcome): string | undefined => {
  const amount = Math.abs(differenceMinor ?? 0);
  return amount !== 0 && isAmountMinor(amount)
    ? formatAmount(amount, CURRENCY.COP)
    : undefined;
};

const titleOf = (outcome: JobOutcome): string => {
  if (outcome.balance === STATEMENT_BALANCE.UNVERIFIED) {
    const amount = offBy(outcome);
    return amount ? `${COPY.notReconciledBy} ${amount}` : COPY.notReconciled;
  }
  if (outcome.stats.replaced > 0) return COPY.replaced;
  return outcome.stats.added === 0 ? COPY.alreadyHad : COPY.read;
};

// A statement that doesn't reconcile counts nothing: only its size.
const countsOf = ({ stats, balance }: JobOutcome): ResultView["counts"] => {
  const tile = (count: number, label: { one: string; other: string }) => ({
    value: NUMBER.format(count),
    label: noun(count, label),
  });
  const inFile = tile(stats.total, COPY.inFile);
  if (balance === STATEMENT_BALANCE.UNVERIFIED) return [inFile];
  return [
    inFile,
    tile(stats.total - stats.added, COPY.had),
    tile(stats.added, COPY.new),
  ];
};

// Chained says more than verified: it also opens where the previous closed.
const verifiedPill = ({ stats, chainedTo }: JobOutcome): ResultView["pill"] =>
  chainedTo
    ? {
        tone: "ok",
        title: COPY.chained,
        detail: `${COPY.chainedTo} ${formatMonthRange(chainedTo)}`,
      }
    : {
        tone: "ok",
        title: COPY.verified,
        detail: `${countText(stats.total, UPLOAD_COPY.movements)} ${noun(stats.total, COPY.reconcile)}`,
      };

const pillOf = (outcome: JobOutcome): ResultView["pill"] => {
  const { balance } = outcome;
  if (balance === STATEMENT_BALANCE.VERIFIED) return verifiedPill(outcome);
  if (balance === STATEMENT_BALANCE.NONE)
    return { tone: "none", title: COPY.noBalance, detail: COPY.movementsFile };
  const amount = offBy(outcome);
  return {
    tone: "attention",
    title: amount
      ? `${COPY.notReconciledShortBy} ${amount}`
      : COPY.notReconciledShort,
    detail: COPY.checkTheFile,
  };
};

const duplicatesText = ({ stats, balance }: JobOutcome): string => {
  if (balance === STATEMENT_BALANCE.UNVERIFIED) return COPY.keptApart;
  const had = stats.total - stats.added;
  if (had === 0) return COPY.noneHad;
  return [
    `${countText(had, UPLOAD_COPY.movements)} ${COPY.hadIn}`,
    ...(stats.covered > 0 ? [COPY.coveredNote] : []),
    ...(stats.hidden > 0 ? [COPY.hiddenNote] : []),
  ].join(" ");
};

const balanceStep = ({ balance }: JobOutcome): ResultStep => {
  if (balance === STATEMENT_BALANCE.VERIFIED)
    return { title: COPY.verified, detail: COPY.verifiedDetail, isOk: true };
  if (balance === STATEMENT_BALANCE.NONE)
    return { title: COPY.noBalance, detail: COPY.noBalanceDetail, isOk: true };
  return {
    title: COPY.notReconciled,
    detail: COPY.notReconciledDetail,
    isOk: false,
  };
};

const stepsOf = (
  job: UploadJob,
  outcome: JobOutcome,
): readonly ResultStep[] => [
  {
    title: COPY.stepRead,
    detail: countText(outcome.stats.total, UPLOAD_COPY.movements),
    isOk: true,
  },
  {
    title: COPY.stepRecognized,
    detail: recognizedText(job.formatId ?? "", outcome.period),
    isOk: true,
  },
  { title: COPY.stepDuplicates, detail: duplicatesText(outcome), isOk: true },
  balanceStep(outcome),
];

/** A done job's result: what it came to, its balances and how it was processed. */
export const resultView = (job: UploadJob, outcome: JobOutcome): ResultView => {
  const isOk = outcome.balance !== STATEMENT_BALANCE.UNVERIFIED;
  return {
    isOk,
    title: titleOf(outcome),
    ...(isOk ? {} : { note: COPY.notReconciledNote }),
    counts: countsOf(outcome),
    pill: pillOf(outcome),
    steps: stepsOf(job, outcome),
  };
};
