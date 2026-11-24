import { CARD_SUMMARY_KIND, ok, parseCardPeriod } from "@xtrakto/core";
import type { AmountMinor, CardStatement, Result } from "@xtrakto/core";
import { normalizeDescription } from "../descriptions/description.helpers";
import type { PdfLine, PdfSegment } from "../pdf-layout/pdf-layout.types";
import { parseFailed } from "../registry/parse-failure.helpers";
import { comparableText } from "../sheets/sheet.utils";
import {
  dueDateOf,
  lastFourOf,
  readAll,
  readCardAmount,
} from "./card-header.helpers";
import type { CardHeader } from "./card-header.helpers";
import { findField } from "./card-pdf-fields.helpers";
import type { PdfField, SegmentFilter } from "./card-pdf-fields.helpers";
import {
  CARD_PDF_LABEL,
  CARD_PDF_MINIMUM_LABEL,
  CARD_PDF_SUMMARY_TITLE,
  CARD_TOTAL_LABEL,
} from "./card.constants";

type PaymentKey = keyof Pick<
  CardStatement,
  | "creditLimitMinor"
  | "availableMinor"
  | "minimumPaymentMinor"
  | "totalPaymentMinor"
>;
type TotalKey = keyof typeof CARD_TOTAL_LABEL;
type MinimumKey = keyof typeof CARD_PDF_MINIMUM_LABEL;

/**
 * Where the first page in pesos prints each field read; a field it doesn't
 * print is missing. The bank's NIT and the summaries' titles are where the
 * holder's name and each summary's half are found.
 */
export type CardPdfHeaderParts = {
  readonly bankId?: PdfSegment;
  readonly holder?: PdfSegment;
  readonly card?: PdfField;
  readonly period?: PdfField;
  readonly dueDate?: PdfField;
  readonly payments: Partial<Record<PaymentKey, PdfField>>;
  readonly titles?: readonly [PdfSegment, PdfSegment];
  readonly total: Partial<Record<TotalKey, PdfField>>;
  readonly minimum: Partial<Record<MinimumKey, PdfField>>;
};

/** The limit and what's available in "Cupo de tu tarjeta", what's due in "Información de pago". */
const PAYMENT_LABEL = {
  creditLimitMinor: CARD_PDF_LABEL.CREDIT_LIMIT,
  availableMinor: CARD_PDF_LABEL.AVAILABLE,
  minimumPaymentMinor: CARD_PDF_LABEL.MINIMUM,
  totalPaymentMinor: CARD_PDF_LABEL.TOTAL,
} as const satisfies Record<PaymentKey, string>;

// Each amount sits beside its label but these, under it: what's due, and the
// charges' total under its category, "Cargos".
const UNDER_ITS_LABEL: ReadonlySet<string> = new Set([
  CARD_PDF_LABEL.MINIMUM,
  CARD_PDF_LABEL.TOTAL,
  CARD_TOTAL_LABEL.chargesMinor,
]);

// What a failure calls the holder's name, which has no label.
const HOLDER_FIELD = "Cliente";

const everywhere: SegmentFilter = () => true;

const center = ({ left, right }: PdfSegment): number => (left + right) / 2;

// The segments nearer one summary's title than the other's: its half.
const nearer =
  (title: PdfSegment, other: PdfSegment): SegmentFilter =>
  (segment) =>
    Math.abs(center(segment) - center(title)) <
    Math.abs(center(segment) - center(other));

const startsWithText = (text: string, start: string): boolean =>
  comparableText(text).startsWith(comparableText(start));

// The first segment whose text is `name` or starts with it, and its line.
const segmentAt = (lines: readonly PdfLine[], name: string) => {
  for (const [at, { segments }] of lines.entries()) {
    const segment = segments.find(({ text }) => startsWithText(text, name));
    if (segment !== undefined) return { at, segment };
  }
  return undefined;
};

// Each label's amount among the segments looked at, beside or under it.
const fieldsOf = <K extends string>(
  lines: readonly PdfLine[],
  labels: Readonly<Record<K, string>>,
  within: SegmentFilter = everywhere,
): Partial<Record<K, PdfField>> => {
  const fields: Partial<Record<K, PdfField>> = {};
  // Safe: Object.entries types keys as string, and these are the keys of K.
  for (const [key, label] of Object.entries(labels) as [K, string][]) {
    const place = UNDER_ITS_LABEL.has(label) ? "under" : "beside";
    const field = findField(lines, { label, place, within });
    if (field !== undefined) fields[key] = field;
  }
  return fields;
};

// Both summaries, under their titles: the total's at the left, the minimum's
// detail at the right, which repeats some of its labels.
const summaryParts = (
  lines: readonly PdfLine[],
): Pick<CardPdfHeaderParts, "titles" | "total" | "minimum"> => {
  const total = segmentAt(lines, CARD_PDF_SUMMARY_TITLE.TOTAL);
  const minimum = segmentAt(lines, CARD_PDF_SUMMARY_TITLE.MINIMUM);
  if (total === undefined || minimum === undefined) {
    return { total: {}, minimum: {} };
  }
  const below = lines.slice(Math.max(total.at, minimum.at) + 1);
  return {
    titles: [total.segment, minimum.segment],
    total: fieldsOf(
      below,
      CARD_TOTAL_LABEL,
      nearer(total.segment, minimum.segment),
    ),
    minimum: fieldsOf(
      below,
      CARD_PDF_MINIMUM_LABEL,
      nearer(minimum.segment, total.segment),
    ),
  };
};

// The holder's name: the line under the bank's NIT, the first of the client's
// block. The address, the city and the department under it are never read.
const holderParts = (
  lines: readonly PdfLine[],
): Pick<CardPdfHeaderParts, "bankId" | "holder"> => {
  const bankId = segmentAt(lines, CARD_PDF_LABEL.BANK_ID);
  return bankId === undefined
    ? {}
    : {
        bankId: bankId.segment,
        holder: lines[bankId.at + 1]?.segments[0],
      };
};

/**
 * Finds what the first page in pesos prints by its labels (Appendix A.4b),
 * never by fixed positions: the holder's name under the bank's NIT, the card's
 * last 4 digits, the period, the due date and what's due under their labels,
 * the limit and what's available beside theirs, and each summary's lines in
 * its half of the page.
 */
export const findCardPdfHeader = (
  pesos: readonly PdfLine[],
): CardPdfHeaderParts => {
  const page = pesos[0]?.page;
  const lines = pesos.filter((line) => line.page === page);
  return {
    ...holderParts(lines),
    card: findField(lines, { label: CARD_PDF_LABEL.CARD, place: "beside" }),
    period: findField(lines, { label: CARD_PDF_LABEL.PERIOD, place: "under" }),
    dueDate: findField(lines, {
      label: CARD_PDF_LABEL.DUE_DATE,
      place: "under",
    }),
    payments: fieldsOf(lines, PAYMENT_LABEL),
    ...summaryParts(lines),
  };
};

type Where = { readonly block: string; readonly column?: string };

const readField = <T>(
  field: PdfField | undefined,
  where: Where,
  read: (text: string) => Result<T>,
): Result<T> => {
  if (field === undefined) {
    return parseFailed({ reason: "missing_value", ...where });
  }
  const value = read(field.text);
  if (value.ok) return value;
  const cause = value.error.details?.["reason"];
  return parseFailed({ reason: "invalid_value", ...where, cause });
};

const readAmounts = <K extends string>(
  fields: Partial<Record<K, PdfField>>,
  labels: Readonly<Record<K, string>>,
  block: string,
): Result<Record<K, AmountMinor>> => {
  const amounts: Partial<Record<K, AmountMinor>> = {};
  // Safe: Object.entries types keys as string, and these are the keys of K.
  for (const [key, label] of Object.entries(labels) as [K, string][]) {
    const where = { block, column: label };
    const amount = readField(fields[key], where, readCardAmount);
    if (!amount.ok) return amount;
    amounts[key] = amount.value;
  }
  // Safe: the loop set every label's amount or returned.
  return ok(amounts as Record<K, AmountMinor>);
};

const readHolder = (holder: PdfSegment | undefined): Result<string> =>
  holder === undefined
    ? parseFailed({
        reason: "missing_value",
        block: CARD_PDF_LABEL.CARD,
        column: HOLDER_FIELD,
      })
    : ok(normalizeDescription(holder.text));

// Each field read, or the first that doesn't read.
const readFields = (parts: CardPdfHeaderParts) => {
  const { PERIOD, DUE_DATE, CARD } = CARD_PDF_LABEL;
  const { TOTAL, MINIMUM } = CARD_PDF_SUMMARY_TITLE;
  return readAll({
    holderName: () => readHolder(parts.holder),
    accountLast4: () => readField(parts.card, { block: CARD }, lastFourOf),
    period: () => readField(parts.period, { block: PERIOD }, parseCardPeriod),
    dueDate: () => readField(parts.dueDate, { block: DUE_DATE }, dueDateOf),
    payments: () => readAmounts(parts.payments, PAYMENT_LABEL, CARD),
    total: () => readAmounts(parts.total, CARD_TOTAL_LABEL, TOTAL),
    minimum: () => readAmounts(parts.minimum, CARD_PDF_MINIMUM_LABEL, MINIMUM),
  });
};

/**
 * Reads the fields found as the spreadsheet's are read: the holder's name,
 * the card's last 4 digits, the billed period, when it's due, what's due, the
 * limit and what's available, and both summaries.
 */
export const readCardPdfHeader = (
  parts: CardPdfHeaderParts,
): Result<CardHeader> => {
  if (parts.titles === undefined) {
    return parseFailed({
      reason: "missing_block",
      block: CARD_PDF_SUMMARY_TITLE.TOTAL,
    });
  }
  const header = readFields(parts);
  if (!header.ok) return header;
  const {
    holderName,
    accountLast4,
    period,
    dueDate,
    payments,
    total,
    minimum,
  } = header.value;
  return ok({
    holderName,
    accountLast4,
    period,
    card: {
      ...payments,
      ...(dueDate === undefined ? {} : { dueDate }),
      summary: { kind: CARD_SUMMARY_KIND.BANCOLOMBIA, total, minimum },
    },
  });
};
