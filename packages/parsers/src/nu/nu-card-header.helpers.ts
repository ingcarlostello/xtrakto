import {
  APP_ERROR_CODE,
  CARD_SUMMARY_KIND,
  err,
  ok,
  parseCardDate,
  parseCardPeriod,
} from "@xtrakto/core";
import type { AmountMinor, Result } from "@xtrakto/core";
import {
  findField,
  readAmounts,
  readField,
} from "../cards/card-pdf-fields.helpers";
import type { PdfField } from "../cards/card-pdf-fields.helpers";
import { readAll, readCardAmount } from "../cards/card-readers.helpers";
import type { CardHeader } from "../cards/card.types";
import { normalizeDescription } from "../descriptions/description.helpers";
import type { PdfLine, PdfSegment } from "../pdf-layout/pdf-layout.types";
import { parseFailed } from "../registry/parse-failure.helpers";
import { comparableText } from "../sheets/sheet.utils";
import {
  NU_CARD_NUMBER,
  NU_LABEL,
  NU_PAYMENTS_LABEL,
  NU_SUMMARY_LABEL,
} from "./nu.constants";

/**
 * Every line the summary prints, by the field it fills: late interest only
 * when charged, so apart, and the payments by where they sit.
 */
const SUMMARY_LINES = {
  dueThisMonthMinor: NU_SUMMARY_LABEL.dueThisMonthMinor,
  interestMinor: NU_SUMMARY_LABEL.interestMinor,
  advanceFeesMinor: NU_SUMMARY_LABEL.advanceFeesMinor,
  serviceFeesMinor: NU_SUMMARY_LABEL.serviceFeesMinor,
  conversionChargesMinor: NU_SUMMARY_LABEL.conversionChargesMinor,
  paymentsToMinimumMinor: NU_PAYMENTS_LABEL,
  refundsMinor: NU_SUMMARY_LABEL.refundsMinor,
  paymentsToTotalMinor: NU_PAYMENTS_LABEL,
  remainingDebtMinor: NU_SUMMARY_LABEL.remainingDebtMinor,
  minimumPaymentMinor: NU_LABEL.MINIMUM,
  totalPaymentMinor: NU_LABEL.TOTAL,
} as const;

type LedgerKey = keyof typeof SUMMARY_LINES | "lateInterestMinor";

/**
 * Where Nu's first page prints each field read; a field it doesn't print is
 * missing. "Tus tarjetas" and the summary's title are where the holder's
 * name and the summary's lines are found.
 */
export type NuCardHeaderParts = {
  readonly cards?: PdfSegment;
  readonly holder?: PdfSegment;
  readonly card?: PdfField;
  readonly dueDate?: PdfField;
  readonly cutDate?: PdfField;
  readonly period?: PdfField;
  readonly creditLimit?: PdfField;
  readonly available?: PdfField;
  readonly title?: PdfSegment;
  readonly summary: Partial<Record<LedgerKey, PdfField>>;
};

/** A summary's line: its label and the amount beside it. */
type LedgerLine = { readonly label: PdfSegment; readonly value: PdfSegment };

const sameText = (text: string, expected: string): boolean =>
  comparableText(text) === comparableText(expected);

const formatError = (): Result<never> =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details: { reason: "format" } });

// The first segment whose text is `name`, and its line.
const segmentAt = (lines: readonly PdfLine[], name: string) => {
  for (const [at, { segments }] of lines.entries()) {
    const segment = segments.find(({ text }) => sameText(text, name));
    if (segment !== undefined) return { at, segment };
  }
  return undefined;
};

// The summary's lines: the last two segments of each line under its title,
// since the figures of the page's left column come first.
const ledgerOf = (lines: readonly PdfLine[]): LedgerLine[] =>
  lines.flatMap(({ segments }) => {
    const [label, value] = segments.slice(-2);
    return label === undefined || value === undefined ? [] : [{ label, value }];
  });

const fieldOf = ({ label, value }: LedgerLine): PdfField => ({
  text: value.text,
  segments: [label, value],
});

// Each line by its label, the whole label but the total's, which goes on with
// the due date; the payments by where they sit: to the minimum over
// "PAGO MÍNIMO", to the total under it.
const summaryFields = (
  ledger: readonly LedgerLine[],
): NuCardHeaderParts["summary"] => {
  const fields: Partial<Record<LedgerKey, PdfField>> = {};
  const indexOf = (label: string) =>
    ledger.findIndex((line) => sameText(line.label.text, label));
  const minimum = indexOf(NU_LABEL.MINIMUM);
  // Safe: Object.entries types keys as string, and these are LedgerKey's.
  for (const [key, label] of Object.entries(NU_SUMMARY_LABEL) as [
    LedgerKey,
    string,
  ][]) {
    const line = ledger[indexOf(label)];
    if (line !== undefined) fields[key] = fieldOf(line);
  }
  const total = ledger.find(({ label }) =>
    comparableText(label.text).startsWith(comparableText(NU_LABEL.TOTAL)),
  );
  const payments = ledger.flatMap((line, index) =>
    sameText(line.label.text, NU_PAYMENTS_LABEL) ? [{ line, index }] : [],
  );
  const toMinimum = payments.findLast(({ index }) => index < minimum);
  const toTotal = payments.find(
    ({ index }) => minimum !== -1 && index > minimum,
  );
  const minimumLine = ledger[minimum];
  return {
    ...fields,
    ...(minimumLine === undefined
      ? {}
      : { minimumPaymentMinor: fieldOf(minimumLine) }),
    ...(total === undefined ? {} : { totalPaymentMinor: fieldOf(total) }),
    ...(toMinimum === undefined
      ? {}
      : { paymentsToMinimumMinor: fieldOf(toMinimum.line) }),
    ...(toTotal === undefined
      ? {}
      : { paymentsToTotalMinor: fieldOf(toTotal.line) }),
  };
};

// The holder's name: the text left of "Tus tarjetas", on its line. The ID
// number and the address under it are never read.
const holderParts = (
  lines: readonly PdfLine[],
): Pick<NuCardHeaderParts, "cards" | "holder"> => {
  const cards = segmentAt(lines, NU_LABEL.CARDS);
  if (cards === undefined) return {};
  const segments = lines[cards.at]?.segments ?? [];
  return {
    cards: cards.segment,
    holder: segments[segments.indexOf(cards.segment) - 1],
  };
};

/**
 * Finds what Nu's first page prints by its labels (Appendix A.5), never by
 * fixed positions: the holder's name left of "Tus tarjetas", the physical
 * card's last 4 digits, the dates, the limit and what's available, each under
 * its label, and the summary's lines, each amount beside its label.
 */
export const findNuCardHeader = (
  lines: readonly PdfLine[],
): NuCardHeaderParts => {
  const page = lines[0]?.page;
  const front = lines.filter((line) => line.page === page);
  const under = (label: string) => findField(front, { label, place: "under" });
  const title = segmentAt(front, NU_LABEL.SUMMARY);
  return {
    ...holderParts(front),
    card: under(NU_LABEL.PHYSICAL_CARD),
    dueDate: under(NU_LABEL.DUE_DATE),
    cutDate: under(NU_LABEL.CUT_DATE),
    period: under(NU_LABEL.PERIOD),
    creditLimit: under(NU_LABEL.CREDIT_LIMIT),
    available: under(NU_LABEL.AVAILABLE),
    title: title?.segment,
    summary:
      title === undefined
        ? {}
        : summaryFields(ledgerOf(front.slice(title.at + 1))),
  };
};

const lastFourOf = (text: string): Result<string> => {
  const [, digits] = NU_CARD_NUMBER.exec(text) ?? [];
  return digits === undefined ? formatError() : ok(digits);
};

// The summary prints a sign before most lines; its figures keep none (12.2a).
const unsignedAmount = (text: string): Result<AmountMinor> => {
  const amount = readCardAmount(text);
  if (!amount.ok) return amount;
  // Safe: the opposite of a safe integer is one too.
  return ok(Math.abs(amount.value) as AmountMinor);
};

const readHolder = (holder: PdfSegment | undefined): Result<string> =>
  holder === undefined
    ? parseFailed({ reason: "missing_value", block: NU_LABEL.CARDS })
    : ok(normalizeDescription(holder.text));

const readLateInterest = (
  field: PdfField | undefined,
): Result<AmountMinor | undefined> =>
  field === undefined
    ? ok(undefined)
    : readField(
        field,
        { block: NU_LABEL.SUMMARY, column: NU_SUMMARY_LABEL.lateInterestMinor },
        unsignedAmount,
      );

// Each field read, or the first that doesn't read.
const readFields = (parts: NuCardHeaderParts) => {
  const { PHYSICAL_CARD, PERIOD, DUE_DATE, CUT_DATE, SUMMARY } = NU_LABEL;
  return readAll({
    holderName: () => readHolder(parts.holder),
    accountLast4: () =>
      readField(parts.card, { block: PHYSICAL_CARD }, lastFourOf),
    period: () => readField(parts.period, { block: PERIOD }, parseCardPeriod),
    dueDate: () => readField(parts.dueDate, { block: DUE_DATE }, parseCardDate),
    cutDate: () => readField(parts.cutDate, { block: CUT_DATE }, parseCardDate),
    limits: () =>
      readAmounts(
        {
          creditLimitMinor: parts.creditLimit,
          availableMinor: parts.available,
        },
        {
          labels: {
            creditLimitMinor: NU_LABEL.CREDIT_LIMIT,
            availableMinor: NU_LABEL.AVAILABLE,
          },
          block: NU_LABEL.CREDIT_LIMIT,
        },
      ),
    lines: () =>
      readAmounts<keyof typeof SUMMARY_LINES>(parts.summary, {
        labels: SUMMARY_LINES,
        block: SUMMARY,
        read: unsignedAmount,
      }),
    lateInterest: () => readLateInterest(parts.summary.lateInterestMinor),
  });
};

/**
 * Reads the fields found: the holder's name, the physical card's last 4
 * digits, the billed period, when it's due and its cut, the limit and what's
 * available, what's due, and the summary, each line as a positive amount.
 */
export const readNuCardHeader = (
  parts: NuCardHeaderParts,
): Result<CardHeader> => {
  if (parts.title === undefined) {
    return parseFailed({ reason: "missing_block", block: NU_LABEL.SUMMARY });
  }
  const header = readFields(parts);
  if (!header.ok) return header;
  const { lines, limits, lateInterest, ...read } = header.value;
  const { minimumPaymentMinor, totalPaymentMinor, ...summary } = lines;
  return ok({
    holderName: read.holderName,
    accountLast4: read.accountLast4,
    period: read.period,
    card: {
      ...limits,
      minimumPaymentMinor,
      totalPaymentMinor,
      dueDate: read.dueDate,
      cutDate: read.cutDate,
      summary: {
        kind: CARD_SUMMARY_KIND.NU,
        ...summary,
        ...(lateInterest === undefined
          ? {}
          : { lateInterestMinor: lateInterest }),
      },
    },
  });
};
