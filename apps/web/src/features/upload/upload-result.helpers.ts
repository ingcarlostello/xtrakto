import {
  CURRENCY,
  formatAmount,
  formatMonthRange,
  isAmountMinor,
  type Period,
} from "@xtrakto/core";
import type { StatementMatches } from "@xtrakto/db";
import type { StatusTone } from "@/components/status-pill/StatusPill";
import { countText } from "@/utils/count-text.utils";
import {
  breaksHref,
  periodOfStatement,
  transactionsHref,
} from "@/utils/transactions-url.helpers";
import { recognizedText } from "./upload-display.helpers";
import { RESULT_COPY as COPY } from "./upload-result.constants";
import { STATEMENT_BALANCE, UPLOAD_COPY } from "./upload.constants";
import type { JobOutcome, PdfReading, UploadJob } from "./upload.types";

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
    /** Information, on the soft blue: the references a file added. */
    readonly isInfo?: boolean;
  }[];
  readonly pill: {
    readonly tone: StatusTone;
    readonly title: string;
    readonly detail: string;
  };
  readonly steps: readonly ResultStep[];
  /** A file the account had all of: the way to "Lo que tienes" (10.2d, v8-13). */
  readonly showsWhatYouHave?: boolean;
  /** Its movements, when they count: not those of a statement that doesn't reconcile. */
  readonly movementsHref?: ReturnType<typeof transactionsHref>;
  /** Where its balance breaks, for a statement that doesn't reconcile. */
  readonly breaksHref?: ReturnType<typeof breaksHref>;
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

// A file that brought nothing the account didn't have: neither a movement
// nor a reference, which still brings something (v8-08).
const isAlreadyHad = ({ stats, matches }: JobOutcome): boolean =>
  stats.replaced === 0 && stats.added === 0 && matches.references === 0;

const titleOf = (outcome: JobOutcome): string => {
  if (outcome.balance === STATEMENT_BALANCE.UNVERIFIED) {
    const amount = offBy(outcome);
    return amount ? `${COPY.notReconciledBy} ${amount}` : COPY.notReconciled;
  }
  if (outcome.stats.replaced > 0) return COPY.replaced;
  return isAlreadyHad(outcome) ? COPY.alreadyHad : COPY.read;
};

// Where the result leads: what the account has, when it had all of the file
// (10.2d, v8-13); else the file's movements, once they count (5.7b), or
// where its balance breaks, when it doesn't reconcile (5.7d).
const linkOf = (
  outcome: JobOutcome,
): Pick<ResultView, "showsWhatYouHave" | "movementsHref" | "breaksHref"> => {
  if (outcome.balance === STATEMENT_BALANCE.UNVERIFIED)
    return { breaksHref: breaksHref(outcome.statementId) };
  if (isAlreadyHad(outcome)) return { showsWhatYouHave: true };
  return {
    movementsHref: transactionsHref({
      accountId: outcome.accountId,
      period: periodOfStatement(outcome.period),
    }),
  };
};

// A statement that doesn't reconcile counts nothing: only its size. The
// references a file added come last, as information (v8-08).
const countsOf = ({
  stats,
  balance,
  matches,
}: JobOutcome): ResultView["counts"] => {
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
    ...(matches.references > 0
      ? [{ ...tile(matches.references, COPY.references), isInfo: true }]
      : []),
  ];
};

// The quarterly statements that verify a movements export, in words:
// "jul–sep 2026", or "jul–sep 2026 y oct–dic 2026".
const quarterlyWords = (periods: readonly Period[]): string =>
  periods.map(formatMonthRange).join(` ${COPY.and} `);

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

// A movements export prints no balances, unless its quarterly statement
// verifies it, movement by movement (10.1b).
const noBalancePill = ({ verifiedBy }: StatementMatches): ResultView["pill"] =>
  verifiedBy.length > 0
    ? {
        tone: "ok",
        title: COPY.verifiedByQuarterly,
        detail: `${COPY.verifiedByQuarterlyDetail} ${quarterlyWords(verifiedBy)} ${COPY.andMatches}`,
      }
    : { tone: "none", title: COPY.noBalance, detail: COPY.movementsFile };

const pillOf = (outcome: JobOutcome): ResultView["pill"] => {
  const { balance } = outcome;
  if (balance === STATEMENT_BALANCE.VERIFIED) return verifiedPill(outcome);
  if (balance === STATEMENT_BALANCE.NONE) return noBalancePill(outcome.matches);
  const amount = offBy(outcome);
  return {
    tone: "attention",
    title: amount
      ? `${COPY.notReconciledShortBy} ${amount}`
      : COPY.notReconciledShort,
    detail: COPY.checkTheFile,
  };
};

// What the account had of the file, and where: a movements export its
// quarterly statement repeats says so (10.1b).
const hadSentences = (
  { stats, balance, matches }: JobOutcome,
  had: number,
): readonly string[] => {
  const movements = countText(had, UPLOAD_COPY.movements);
  if (balance === STATEMENT_BALANCE.NONE && matches.matched > 0)
    return matches.matched === had
      ? [`${movements} ${COPY.hadInQuarterly}`]
      : [
          `${movements} ${COPY.hadIn}`,
          `${COPY.someInQuarterly} ${NUMBER.format(matches.matched)} ${COPY.inQuarterly}`,
        ];
  return [
    `${movements} ${COPY.hadIn}`,
    ...(stats.covered > 0 ? [COPY.coveredNote] : []),
    ...(stats.hidden > 0 ? [COPY.hiddenNote] : []),
  ];
};

const duplicatesText = (outcome: JobOutcome): string => {
  const { stats, balance, matches } = outcome;
  if (balance === STATEMENT_BALANCE.UNVERIFIED) return COPY.keptApart;
  const had = stats.total - stats.added;
  if (had === 0) return COPY.noneHad;
  return [
    ...hadSentences(outcome, had),
    ...(matches.dayApart > 0 ? [COPY.interestDayApart] : []),
  ].join(" ");
};

// A movements export: verified by its quarterly statement, matched in
// part, or waiting for the statement of its period (v8-13).
const noBalanceStep = ({
  verifiedBy,
  matched,
}: StatementMatches): ResultStep => {
  if (verifiedBy.length > 0)
    return {
      title: COPY.verifiedWithQuarterly,
      detail: `${COPY.verifiedWithQuarterlyDetail} ${quarterlyWords(verifiedBy)}.`,
      isOk: true,
    };
  return {
    title: COPY.noBalanceStep,
    detail:
      matched > 0
        ? `${countText(matched, UPLOAD_COPY.movements)} ${COPY.partlyVerifiedDetail}`
        : COPY.noBalanceDetail,
    isOk: true,
  };
};

const balanceStep = ({ balance, matches }: JobOutcome): ResultStep => {
  if (balance === STATEMENT_BALANCE.VERIFIED)
    return { title: COPY.verified, detail: COPY.verifiedDetail, isOk: true };
  if (balance === STATEMENT_BALANCE.NONE) return noBalanceStep(matches);
  return {
    title: COPY.notReconciled,
    detail: COPY.notReconciledDetail,
    isOk: false,
  };
};

// The references a movements export gave its quarterly statement's
// movements, which the quick review can now ask about (v8-08).
const classifiedSteps = ({
  matches: { references },
}: JobOutcome): readonly ResultStep[] =>
  references > 0
    ? [
        {
          title: COPY.stepClassified,
          detail: `${countText(references, COPY.newReferences)}, ${COPY.referencesKinds}`,
          isOk: true,
        },
      ]
    : [];

// A PDF's pages and rows while the page holds its reading: "2 páginas · 48
// filas. Unimos 3 descripciones partidas en dos líneas." (docs/ui/v8-08).
// Otherwise, and after a reload, the movements in the file.
const readText = (total: number, pdf: PdfReading | undefined): string => {
  if (pdf === undefined) return countText(total, UPLOAD_COPY.movements);
  const read = `${countText(pdf.pageCount, COPY.pages)} · ${countText(total, COPY.rows)}`;
  if (pdf.joinedDescriptions === 0) return read;
  return `${read}. ${COPY.joined} ${countText(pdf.joinedDescriptions, COPY.joinedDescriptions)}.`;
};

const stepsOf = (
  job: UploadJob,
  outcome: JobOutcome,
  pdf: PdfReading | undefined,
): readonly ResultStep[] => [
  {
    title: COPY.stepRead,
    detail: readText(outcome.stats.total, pdf),
    isOk: true,
  },
  {
    title: COPY.stepRecognized,
    detail: recognizedText(job.formatId ?? "", outcome.period),
    isOk: true,
  },
  { title: COPY.stepDuplicates, detail: duplicatesText(outcome), isOk: true },
  balanceStep(outcome),
  ...classifiedSteps(outcome),
];

/**
 * A done job's result: what it came to, its balances and how it was
 * processed, with what the page read of a PDF while it holds that.
 */
export const resultView = (
  job: UploadJob,
  outcome: JobOutcome,
  pdf?: PdfReading,
): ResultView => {
  const isOk = outcome.balance !== STATEMENT_BALANCE.UNVERIFIED;
  return {
    isOk,
    title: titleOf(outcome),
    ...(isOk ? {} : { note: COPY.notReconciledNote }),
    counts: countsOf(outcome),
    pill: pillOf(outcome),
    steps: stepsOf(job, outcome, pdf),
    ...linkOf(outcome),
  };
};
