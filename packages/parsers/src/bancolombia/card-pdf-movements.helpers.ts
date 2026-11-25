import { ok, PARSE_WARNING_CODE } from "@xtrakto/core";
import type { ParseWarning, Result } from "@xtrakto/core";
import type {
  PdfLine,
  PdfSegment,
  PdfTable,
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
  looksLikeCardMovement,
  readCardTableRows,
} from "./card-movements.helpers";
import type { CardMovements, CardTableColumns } from "./card-movements.helpers";
import { findField } from "../cards/card-pdf-fields.helpers";
import type { PdfField } from "../cards/card-pdf-fields.helpers";
import {
  CARD_CURRENCY,
  CARD_PDF_COLUMNS,
  CARD_PDF_LABEL,
  CARD_PDF_MOVEMENTS_COLUMN,
  CARD_PDF_PAGE_CURRENCY,
  CARD_PDF_TABLE_TITLE,
} from "./card.constants";
import { isPageFooter } from "./quarterly-pdf-movements.helpers";

/**
 * A card statement's lines by the currency their pages are in, and what each
 * page that says its currency says.
 */
export type CardPdfPages = {
  readonly pesos: readonly PdfLine[];
  readonly dollars: readonly PdfLine[];
  readonly marks: readonly PdfField[];
};

/** A page's part of a table: its header's two lines, and the lines under them. */
export type CardPdfTablePage = {
  readonly header: readonly PdfSegment[];
  readonly second?: PdfTableLine;
  readonly lines: readonly PdfTableLine[];
};

/** A table of movements: the title it's found by, and its pages' parts. */
export type CardPdfTable = {
  readonly label: string;
  readonly title: PdfSegment;
  readonly pages: readonly CardPdfTablePage[];
};

const WIDTH = CARD_PDF_COLUMNS.length;
const DATE = CARD_PDF_COLUMNS.indexOf(CARD_PDF_MOVEMENTS_COLUMN.DATE);

const sameText = (text: string, expected: string): boolean =>
  comparableText(text) === comparableText(expected);

// What a page says its currency is: beside "Moneda:" on the first page of
// each currency, beside "ESTADO DE CUENTA EN:" over its movements.
const currencyOf = (lines: readonly PdfLine[]): PdfField | undefined =>
  findField(lines, { label: CARD_PDF_LABEL.CURRENCY, place: "beside" }) ??
  findField(lines, { label: CARD_PDF_PAGE_CURRENCY, place: "beside" });

/**
 * The statement's lines by currency, page by page: each page in the currency
 * it says, or, when it says none, in its previous page's.
 */
export const cardPdfPages = (lines: readonly PdfLine[]): CardPdfPages => {
  const pesos: PdfLine[] = [];
  const dollars: PdfLine[] = [];
  const marks: PdfField[] = [];
  let currency: string | undefined;
  for (const page of new Set(lines.map((line) => line.page))) {
    const own = lines.filter((line) => line.page === page);
    const mark = currencyOf(own);
    if (mark !== undefined) {
      marks.push(mark);
      currency = mark.text;
    }
    if (currency !== undefined && sameText(currency, CARD_CURRENCY.PESOS)) {
      pesos.push(...own);
    }
    if (currency !== undefined && sameText(currency, CARD_CURRENCY.DOLLARS)) {
      dollars.push(...own);
    }
  }
  return { pesos, dollars, marks };
};

// A table's title on a line, and the label it starts with.
const titleOf = (line: PdfLine) => {
  for (const title of line.segments) {
    const label = Object.values(CARD_PDF_TABLE_TITLE).find((start) =>
      comparableText(title.text).startsWith(comparableText(start)),
    );
    if (label !== undefined) return { title, label };
  }
  return undefined;
};

// A page's part: the first line under its header is the header's second line
// when it has no date; the page's footer isn't the table's.
const tablePage = ({ header, lines }: PdfTable): CardPdfTablePage => {
  const body = lines.filter(
    ({ line }) => !isPageFooter(line.segments[0]?.text ?? ""),
  );
  const [first, ...rest] = body;
  const isSecond =
    first !== undefined && tableLineCells(first, WIDTH)[DATE] === null;
  return isSecond
    ? { header, second: first, lines: rest }
    : { header, lines: body };
};

/**
 * A currency's tables of movements, each found by its title ("Nuevos
 * movimientos entre…", "Movimientos antes de…"), then by its header on each
 * page it takes, its lines until the next title. None when the currency has
 * no movements, as the bank prints neither table then.
 */
export const cardPdfTables = (
  lines: readonly PdfLine[],
): readonly CardPdfTable[] => {
  const starts = lines.flatMap((line, at) => {
    const found = titleOf(line);
    return found === undefined ? [] : [{ at, ...found }];
  });
  return starts.map(({ at, title, label }, index) => {
    const end = starts[index + 1]?.at ?? lines.length;
    const pages = pdfTables(lines.slice(at + 1, end), CARD_PDF_COLUMNS);
    return { label, title, pages: pages.map(tablePage) };
  });
};

/** Where a table's columns are read, by its first page's header. */
export const cardPdfColumns = (
  table: CardPdfTable,
): Result<CardTableColumns> => {
  const [first] = table.pages;
  const columns = findColumns(
    first === undefined ? [] : twoLineHeaderNames(first.header, first.second),
    CARD_PDF_MOVEMENTS_COLUMN,
  );
  if (!columns.ok) {
    return parseFailed({
      reason: "missing_column",
      block: table.label,
      column: columns.error,
    });
  }
  return ok({
    label: table.label,
    columns: columnPositions(columns.value),
    names: CARD_PDF_MOVEMENTS_COLUMN,
  });
};

// Each table's lines as rows, numbered across the tables as a sheet's are.
const tableRows = (tables: readonly CardPdfTable[]) => {
  let offset = 0;
  return tables.map(({ pages }) => {
    const lines = pages.flatMap((page) => page.lines);
    const rows = lines.map(
      (placed, index) =>
        [offset + index, tableLineCells(placed, WIDTH)] as const,
    );
    offset += lines.length;
    return rows;
  });
};

/**
 * The movements of the pages in pesos, as the spreadsheet's are read: those
 * of the period, then the purchases of earlier statements whose installments
 * go on; a line in a table that isn't one becomes a warning.
 */
export const readCardPdfMovements = (
  tables: readonly CardPdfTable[],
): Result<CardMovements> => {
  const movements: CardMovements = { transactions: [], warnings: [] };
  const rows = tableRows(tables);
  for (const [index, table] of tables.entries()) {
    const columns = cardPdfColumns(table);
    if (!columns.ok) return columns;
    const read = readCardTableRows(rows[index] ?? [], columns.value);
    if (!read.ok) return read;
    movements.transactions.push(...read.value.transactions);
    movements.warnings.push(...read.value.warnings);
  }
  return ok(movements);
};

/**
 * A warning for each movement of the pages in dollars, which a statement in
 * pesos doesn't count (12.2b): only how many there are is read.
 */
export const foreignCardPdfWarnings = (
  tables: readonly CardPdfTable[],
): Result<ParseWarning[]> => {
  const warnings: ParseWarning[] = [];
  for (const table of tables) {
    const columns = cardPdfColumns(table);
    if (!columns.ok) return columns;
    const dates = table.pages
      .flatMap(({ lines }) => lines)
      .map(
        (placed) => tableLineCells(placed, WIDTH)[columns.value.columns.DATE],
      );
    warnings.push(
      ...dates
        .filter(looksLikeCardMovement)
        .map(() => ({ code: PARSE_WARNING_CODE.FOREIGN_CURRENCY })),
    );
  }
  return ok(warnings);
};
