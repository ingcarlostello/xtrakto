import { ok, parseAmountText, parseSlashDate } from "@xtrakto/core";
import type { AmountMinor, LocalDate, Result } from "@xtrakto/core";
import { normalizeDescription } from "../descriptions/description.helpers";
import type { PdfLine, PdfSegment } from "../pdf-layout/pdf-layout.types";
import { comparableText } from "../sheets/sheet.utils";
import {
  PDF_ACCOUNT_TYPE,
  QUARTERLY_PDF_BLOCK,
  QUARTERLY_PDF_LABEL,
  QUARTERLY_PDF_SUMMARY,
} from "./bancolombia.constants";
import { parseFailed } from "./parse-failure.helpers";
import { accountOf, periodOf, summaryOf } from "./quarterly-header.helpers";
import type { QuarterlyHeader } from "./quarterly-header.helpers";

type SummaryKey = keyof typeof QUARTERLY_PDF_SUMMARY;

/** A value the page prints after its label, and the segments it takes. */
export type LabeledText = {
  readonly text: string;
  readonly segments: readonly PdfSegment[];
};

/**
 * Where the first page prints each field of its header and summary; a field
 * it doesn't print is missing.
 */
export type QuarterlyPdfHeaderParts = {
  readonly from?: LabeledText;
  readonly to?: LabeledText;
  readonly type?: PdfSegment;
  readonly number?: LabeledText;
  readonly holder?: PdfSegment;
  readonly summary: Partial<Record<SummaryKey, LabeledText>>;
};

const HEADER = QUARTERLY_PDF_BLOCK.HEADER;
const SUMMARY = QUARTERLY_PDF_BLOCK.SUMMARY;
// What a failure calls the fields the box prints without a label.
const HOLDER_FIELD = "CLIENTE";
const TYPE_FIELD = "CUENTA";

const isAmount = (text: string): boolean => parseAmountText(text).ok;
const isFilled = (text: string): boolean => text !== "";
const hasLabel = (text: string, label: string): boolean =>
  comparableText(text) === comparableText(label);

// What a segment says after a label it starts with, ignoring accents and case.
const afterLabel = (segment: PdfSegment, label: string): string | undefined =>
  comparableText(segment.text).startsWith(comparableText(label))
    ? segment.text.slice(label.length).trim()
    : undefined;

// A label's value: the rest of its segment, or the next segment on its line
// that can be one, such as an amount after its "$".
const labeled = (
  lines: readonly PdfLine[],
  label: string,
  accepts: (text: string) => boolean,
): LabeledText | undefined => {
  for (const { segments } of lines) {
    const index = segments.findIndex(
      (segment) => afterLabel(segment, label) !== undefined,
    );
    const labelSegment = segments[index];
    if (labelSegment !== undefined) {
      const rest = afterLabel(labelSegment, label) ?? "";
      if (accepts(rest)) return { text: rest, segments: [labelSegment] };
      const value = segments
        .slice(index + 1)
        .find((segment) => accepts(segment.text));
      return value === undefined
        ? undefined
        : { text: value.text, segments: [labelSegment, value] };
    }
  }
  return undefined;
};

const summaryParts = (
  lines: readonly PdfLine[],
): Partial<Record<SummaryKey, LabeledText>> =>
  Object.fromEntries(
    Object.entries(QUARTERLY_PDF_SUMMARY).flatMap(([key, label]) => {
      const field = labeled(lines, label, isAmount);
      return field === undefined ? [] : [[key, field]];
    }),
  );

// The holder's name: the first text left of the header box and above the
// summary, whose labels sit at the left too.
const holderOf = (
  lines: readonly PdfLine[],
  boxLeft: number | undefined,
): PdfSegment | undefined => {
  if (boxLeft === undefined) return undefined;
  const summaryStart = lines.findIndex(({ segments }) =>
    segments.some(({ text }) => hasLabel(text, QUARTERLY_PDF_BLOCK.SUMMARY)),
  );
  return lines
    .slice(0, summaryStart === -1 ? lines.length : summaryStart)
    .flatMap(({ segments }) => segments)
    .find(({ right }) => right < boxLeft);
};

/**
 * Finds the header's fields in the lines above the first movements table (the
 * first page's header box, the holder's block beside it and the summary; every
 * page repeats the box and the block) by their labels, never by fixed
 * positions: the period after DESDE: and HASTA:, the account type that starts
 * with CUENTA, the number after NÚMERO, the summary's amounts after theirs,
 * and the holder, the first text left of the box, which has no label. The
 * address and the city under the holder are never read.
 */
export const findQuarterlyPdfHeader = (
  lines: readonly PdfLine[],
): QuarterlyPdfHeaderParts => {
  const from = labeled(lines, QUARTERLY_PDF_LABEL.FROM, isFilled);
  return {
    from,
    to: labeled(lines, QUARTERLY_PDF_LABEL.TO, isFilled),
    type: lines
      .flatMap(({ segments }) => segments)
      .find(({ text }) => PDF_ACCOUNT_TYPE.test(comparableText(text))),
    number: labeled(lines, QUARTERLY_PDF_LABEL.NUMBER, isFilled),
    holder: holderOf(lines, from?.segments[0]?.left),
    summary: summaryParts(lines),
  };
};

const missing = (block: string, column: string): Result<never> =>
  parseFailed({ reason: "missing_value", block, column });

const readDate = (
  field: LabeledText | undefined,
  label: string,
): Result<LocalDate> => {
  if (field === undefined) return missing(HEADER, label);
  const date = parseSlashDate(field.text);
  if (date.ok) return date;
  const cause = date.error.details?.reason;
  return parseFailed({
    reason: "invalid_value",
    block: HEADER,
    column: label,
    cause,
  });
};

const readSummary = (
  summary: QuarterlyPdfHeaderParts["summary"],
): Result<ReturnType<typeof summaryOf>> => {
  const amounts: Partial<Record<SummaryKey, AmountMinor>> = {};
  for (const [key, label] of Object.entries(QUARTERLY_PDF_SUMMARY)) {
    // Safe: the entries' keys are QUARTERLY_PDF_SUMMARY's.
    const field = summary[key as SummaryKey];
    if (field === undefined) return missing(SUMMARY, label);
    const amount = parseAmountText(field.text);
    if (!amount.ok) return missing(SUMMARY, label);
    amounts[key as SummaryKey] = amount.value;
  }
  // Safe: the loop set an amount for every key or returned.
  return ok(summaryOf(amounts as Record<SummaryKey, AmountMinor>));
};

/**
 * Reads the header's fields as the spreadsheet's are read: the holder's name,
 * the period, a savings account by its last 4 digits, and the summary.
 */
export const readQuarterlyPdfHeader = (
  parts: QuarterlyPdfHeaderParts,
): Result<QuarterlyHeader> => {
  const from = readDate(parts.from, QUARTERLY_PDF_LABEL.FROM);
  if (!from.ok) return from;
  const to = readDate(parts.to, QUARTERLY_PDF_LABEL.TO);
  if (!to.ok) return to;
  const period = periodOf({ from: from.value, to: to.value }, HEADER);
  if (!period.ok) return period;
  if (parts.holder === undefined) return missing(HEADER, HOLDER_FIELD);
  if (parts.type === undefined) return missing(HEADER, TYPE_FIELD);
  if (parts.number === undefined) {
    return missing(HEADER, QUARTERLY_PDF_LABEL.NUMBER);
  }
  const account = accountOf(
    { type: normalizeDescription(parts.type.text), number: parts.number.text },
    {
      block: HEADER,
      typeColumn: TYPE_FIELD,
      numberColumn: QUARTERLY_PDF_LABEL.NUMBER,
    },
  );
  if (!account.ok) return account;
  const summary = readSummary(parts.summary);
  if (!summary.ok) return summary;
  return ok({
    holderName: normalizeDescription(parts.holder.text),
    period: period.value,
    ...account.value,
    ...summary.value,
  });
};
