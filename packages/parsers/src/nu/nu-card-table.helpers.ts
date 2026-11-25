import { ok } from "@xtrakto/core";
import type { Result } from "@xtrakto/core";
import { readCardAmount } from "../cards/card-readers.helpers";
import type {
  PdfLine,
  PdfSegment,
  PdfTableLine,
} from "../pdf-layout/pdf-layout.types";
import {
  pdfTables,
  tableLineCells,
  twoLineHeaderNames,
} from "../pdf-layout/pdf-table.helpers";
import { parseFailed } from "../registry/parse-failure.helpers";
import {
  columnPositions,
  comparableText,
  findColumns,
} from "../sheets/sheet.utils";
import {
  NU_COLUMNS,
  NU_MOVEMENTS_COLUMN,
  NU_RATE,
  NU_ROW_DATE,
  NU_ROW_TEXT,
  NU_SUB_ROW_MARK,
  NU_YEAR,
} from "./nu.constants";

/** A table line's cells, a text or `null` in each of the header's columns. */
export type Cells = readonly (string | null)[];

/** A column read, by its key in `NU_MOVEMENTS_COLUMN`. */
export type ColumnKey = keyof typeof NU_MOVEMENTS_COLUMN;

/** Where each column read is, by its index among the header's. */
export type NuColumns = Readonly<Record<ColumnKey, number>>;

/** What a line of the movements' table is. */
export const NU_LINE = {
  /** A movement's first line, with its date. */
  ROW: "row",
  /** A conversion charge, marked, under a purchase abroad. */
  CONVERSION: "conversion",
  /** A purchase's late interest: its words and its rate, without a date. */
  LATE: "late",
  /** The rest of a row: its date's year, its description's end. */
  CONTINUATION: "continuation",
  /** None of these. */
  STRAY: "stray",
} as const;

export type NuLineKind = (typeof NU_LINE)[keyof typeof NU_LINE];

/** The movements' table: each page's header lines, its columns, its lines. */
export type NuTable = {
  readonly headers: readonly (readonly PdfSegment[])[];
  /** None when the statement prints no header, so no movements. */
  readonly columns?: Result<NuColumns>;
  readonly lines: readonly PdfTableLine[];
};

/** How many columns the table has. */
export const NU_WIDTH = NU_COLUMNS.length;

const DATE = NU_COLUMNS.indexOf(NU_MOVEMENTS_COLUMN.DATE);

/** Whether a text is another, ignoring accents, case and extra spaces. */
export const sameText = (text: string, expected: string): boolean =>
  comparableText(text) === comparableText(expected);

const isFooter = ({ line }: PdfTableLine): boolean =>
  comparableText(line.segments[0]?.text ?? "").startsWith(
    comparableText(NU_ROW_TEXT.FOOTER),
  );

const isEnd = ({ line }: PdfTableLine): boolean =>
  line.segments.some(({ text }) => sameText(text, NU_ROW_TEXT.END));

// A rate and what it charges sit together under "Interés del mes", a little
// apart: one cell, so a row's segments each find their own column.
const withRatesJoined = (line: PdfLine): PdfLine => {
  const segments: PdfSegment[] = [];
  for (const segment of line.segments) {
    const last = segments.at(-1);
    if (
      last !== undefined &&
      NU_RATE.test(last.text) &&
      readCardAmount(segment.text).ok
    ) {
      segments[segments.length - 1] = {
        text: `${last.text} ${segment.text}`,
        left: last.left,
        right: segment.right,
        items: [...last.items, ...segment.items],
      };
    } else {
      segments.push(segment);
    }
  }
  return { ...line, segments };
};

const isConversion = (text: string): boolean =>
  sameText(text.replace(NU_SUB_ROW_MARK, ""), NU_ROW_TEXT.CONVERSION);

// A payment's parts under it, marked as a conversion charge is, aren't
// movements: left out before the table is read, as the pages' footers are,
// so a movement's line doesn't depend on whether they were sent.
const withoutPaymentParts = (line: PdfLine): PdfLine => ({
  ...line,
  segments: line.segments.filter(
    ({ text }) => !NU_SUB_ROW_MARK.test(text) || isConversion(text),
  ),
});

const columnsOf = (
  header: readonly PdfSegment[],
  second: PdfTableLine | undefined,
): Result<NuColumns> => {
  const found = findColumns(
    twoLineHeaderNames(header, second),
    NU_MOVEMENTS_COLUMN,
  );
  return found.ok
    ? ok(columnPositions(found.value))
    : parseFailed({ reason: "missing_column", column: found.error });
};

/**
 * Nu's movements' table, page after page: each page's header, found by its
 * first line's names, with the line under it, its second; then its lines up
 * to the page's footer, and up to "Pago mínimo", which ends the table. A
 * payment's parts are left out, and a rate is one cell with what it charges.
 */
export const nuTable = (lines: readonly PdfLine[]): NuTable => {
  const headers: PdfSegment[][] = [];
  const body: PdfTableLine[] = [];
  let columns: Result<NuColumns> | undefined;
  const read = lines
    .map((line) => withRatesJoined(withoutPaymentParts(line)))
    .filter(({ segments }) => segments.length > 0);
  const tables = pdfTables(read, NU_COLUMNS);
  for (const { header, lines: pageLines } of tables) {
    const [first, ...rest] = pageLines;
    const second =
      first !== undefined && tableLineCells(first, NU_WIDTH)[DATE] === null
        ? first
        : undefined;
    headers.push([...header, ...(second?.line.segments ?? [])]);
    columns ??= columnsOf(header, second);
    const own = second === undefined ? pageLines : rest;
    const stop = own.findIndex((placed) => isFooter(placed) || isEnd(placed));
    body.push(...(stop === -1 ? own : own.slice(0, stop)));
    const stopper = own[stop];
    if (stopper !== undefined && isEnd(stopper)) break;
  }
  return {
    headers,
    ...(columns === undefined ? {} : { columns }),
    lines: body,
  };
};

const isLateWords = (text: string): boolean =>
  comparableText(NU_ROW_TEXT.LATE_INTEREST).startsWith(comparableText(text));

/** What a table's line is, by its cells (`NU_LINE`). */
export const nuLineKind = (cells: Cells, columns: NuColumns): NuLineKind => {
  const at = (key: ColumnKey) => cells[columns[key]] ?? null;
  const date = at("DATE");
  if (date !== null && NU_ROW_DATE.test(date)) return NU_LINE.ROW;
  if (isConversion(at("AMOUNT") ?? "")) return NU_LINE.CONVERSION;
  // Safe: Object.keys types keys as string, and these are ColumnKey's.
  const others = (Object.keys(columns) as ColumnKey[]).filter(
    (key) => key !== "DATE" && key !== "DESCRIPTION" && at(key) !== null,
  );
  const description = at("DESCRIPTION");
  if (
    others.join() === "INTEREST" &&
    description !== null &&
    isLateWords(description)
  ) {
    return NU_LINE.LATE;
  }
  return others.length === 0 && (date === null || NU_YEAR.test(date))
    ? NU_LINE.CONTINUATION
    : NU_LINE.STRAY;
};
