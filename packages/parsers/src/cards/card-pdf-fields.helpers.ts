import { ok } from "@xtrakto/core";
import type { AmountMinor, Result } from "@xtrakto/core";
import type { PdfLine, PdfSegment } from "../pdf-layout/pdf-layout.types";
import { parseFailed } from "../registry/parse-failure.helpers";
import { comparableText } from "../sheets/sheet.utils";
import { readCardAmount } from "./card-readers.helpers";

/**
 * A value the card's PDF prints by its label, and the segments read: the
 * label's, the words it wraps onto, and the value's.
 */
export type PdfField = {
  readonly text: string;
  readonly segments: readonly PdfSegment[];
};

/** Which segments a search looks at, such as those of one half of a page. */
export type SegmentFilter = (segment: PdfSegment) => boolean;

/**
 * How to find a field: its label as printed, and where its value is: beside
 * it on its line, or under it (Appendix A.4b).
 */
export type FieldSpec = {
  readonly label: string;
  readonly place: "beside" | "under";
  readonly within?: SegmentFilter;
};

// A label's words go on under it within this many heights of the line above,
// and its value sits under it within this many of its own line.
const WRAP_DISTANCE = 2;
const UNDER_DISTANCE = 3;
// The summaries print the currency's sign apart from each amount.
const CURRENCY_SIGN = "$";

const everywhere: SegmentFilter = () => true;

const overlaps = (a: PdfSegment, b: PdfSegment): boolean =>
  a.left < b.right && b.left < a.right;

const isAmount = ({ text }: PdfSegment): boolean => readCardAmount(text).ok;

const joined = (segments: readonly PdfSegment[]): string =>
  segments.map(({ text }) => text).join(" ");

// What a text says after a label it starts with, ignoring accents and case.
const afterLabel = (text: string, label: string): string | undefined =>
  comparableText(text).startsWith(comparableText(label))
    ? text.slice(label.length).trim()
    : undefined;

/** A line of a page's lines, by its index among them. */
type Position = { readonly lines: readonly PdfLine[]; readonly at: number };

// The words a label wraps onto the lines under it: segments that overlap it,
// each line within two heights of the one before, on lines whose segments
// looked at hold no amount.
const wrappedWords = (
  { lines, at }: Position,
  label: PdfSegment,
  within: SegmentFilter,
): PdfSegment[] => {
  const words: PdfSegment[] = [];
  let previous = lines[at];
  for (const line of lines.slice(at + 1)) {
    const looked = line.segments.filter(within);
    if (previous === undefined || looked.length === 0) continue;
    const under = looked.filter((segment) => overlaps(segment, label));
    if (
      line.page !== previous.page ||
      line.y - previous.y > WRAP_DISTANCE * previous.height ||
      looked.some(isAmount) ||
      under.length === 0
    ) {
      break;
    }
    words.push(...under);
    previous = line;
  }
  return words;
};

// The segments that make a label, if a segment of the line starts one:
// itself, or itself and the words it wraps onto when the label goes on under
// it.
const labelAt = (
  position: Position,
  segment: PdfSegment,
  { label, within = everywhere }: FieldSpec,
): PdfSegment[] | undefined => {
  const own = comparableText(segment.text);
  const wanted = comparableText(label);
  if (own.startsWith(wanted)) return [segment];
  if (own === "" || !wanted.startsWith(own)) return undefined;
  const words = [segment, ...wrappedWords(position, segment, within)];
  return afterLabel(joined(words), label) === undefined ? undefined : words;
};

// A label's value beside it: what its segment says after it, else the next
// segment on its line, among those looked at, that isn't the sign alone.
const valueBeside = (
  line: PdfLine,
  label: readonly PdfSegment[],
  { label: text, within = everywhere }: FieldSpec,
): PdfField | undefined => {
  const [first] = label;
  if (first === undefined) return undefined;
  const rest = afterLabel(first.text, text);
  if (rest !== undefined && rest !== "") return { text: rest, segments: label };
  const value = line.segments
    .slice(line.segments.indexOf(first) + 1)
    .filter(within)
    .find((segment) => segment.text !== CURRENCY_SIGN);
  return value === undefined
    ? undefined
    : { text: value.text, segments: [...label, value] };
};

// A label's value under it: the first segment that overlaps it on the lines
// below, within three heights of its own.
const valueUnder = (
  { lines, at }: Position,
  label: readonly PdfSegment[],
): PdfField | undefined => {
  const line = lines[at];
  const [first] = label;
  if (line === undefined || first === undefined) return undefined;
  for (const below of lines.slice(at + 1)) {
    if (
      below.page !== line.page ||
      below.y - line.y > UNDER_DISTANCE * line.height
    ) {
      return undefined;
    }
    const value = below.segments.find((segment) => overlaps(segment, first));
    if (value !== undefined) {
      return { text: value.text, segments: [...label, value] };
    }
  }
  return undefined;
};

/**
 * A field by its label, never by fixed positions: the first segment looked at
 * whose text, with the words it wraps onto, starts with the label, ignoring
 * accents and case; and its value, beside it or under it. Nothing when the
 * label isn't printed, or its value isn't where it should be.
 */
export const findField = (
  lines: readonly PdfLine[],
  spec: FieldSpec,
): PdfField | undefined => {
  for (const [at, line] of lines.entries()) {
    const position = { lines, at };
    for (const segment of line.segments.filter(spec.within ?? everywhere)) {
      const label = labelAt(position, segment, spec);
      if (label === undefined) continue;
      return spec.place === "beside"
        ? valueBeside(line, label, spec)
        : valueUnder(position, label);
    }
  }
  return undefined;
};

/** Where a field is printed, for a failure to say: its block and column. */
type Where = { readonly block: string; readonly column?: string };

/**
 * A field's value, read with `read`: a missing value when the field wasn't
 * found, an invalid one with the reader's reason when it doesn't read.
 */
export const readField = <T>(
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

/** How to read a group of amounts: their labels by field, their block, and the reader. */
type AmountsSpec<K extends string> = {
  readonly labels: Readonly<Record<K, string>>;
  readonly block: string;
  readonly read?: (text: string) => Result<AmountMinor>;
};

/** Each label's amount, from the fields found for it, or the first that doesn't read. */
export const readAmounts = <K extends string>(
  fields: Partial<Record<K, PdfField>>,
  { labels, block, read = readCardAmount }: AmountsSpec<K>,
): Result<Record<K, AmountMinor>> => {
  const amounts: Partial<Record<K, AmountMinor>> = {};
  // Safe: Object.entries types keys as string, and these are the keys of K.
  for (const [key, label] of Object.entries(labels) as [K, string][]) {
    const amount = readField(fields[key], { block, column: label }, read);
    if (!amount.ok) return amount;
    amounts[key] = amount.value;
  }
  // Safe: the loop set every label's amount or returned.
  return ok(amounts as Record<K, AmountMinor>);
};
