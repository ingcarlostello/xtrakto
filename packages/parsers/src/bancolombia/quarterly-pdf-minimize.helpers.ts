import type { ExtractedContent, PdfTextItem } from "@xtrakto/core";
import { maskLongNumbers } from "../descriptions/description.helpers";
import { pdfLines } from "../pdf-layout/pdf-lines.helpers";
import type { PdfSegment, PdfTable } from "../pdf-layout/pdf-layout.types";
import { linesAboveTable, pdfTables } from "../pdf-layout/pdf-table.helpers";
import {
  ACCOUNT_LAST_DIGITS,
  ACCOUNT_NUMBER_PATTERN,
  MOVEMENTS_COLUMN,
  QUARTERLY_PDF_COLUMNS,
} from "./bancolombia.constants";
import { findQuarterlyPdfHeader } from "./quarterly-pdf-header.helpers";
import type { QuarterlyPdfHeaderParts } from "./quarterly-pdf-header.helpers";
import { isPageFooter } from "./quarterly-pdf-movements.helpers";

/** Each item to send, as it is sent, by the item the page holds. */
type Sent = Map<PdfTextItem, PdfTextItem>;

const columnOf = (name: string): number =>
  QUARTERLY_PDF_COLUMNS.findIndex((column) => column === name);

// The columns of the movements table the parser reads. SUCURSAL and DCTO.
// aren't sent.
const READ_COLUMNS = new Set(Object.values(MOVEMENTS_COLUMN).map(columnOf));
const DESCRIPTION_COLUMN = columnOf(MOVEMENTS_COLUMN.DESCRIPTION);

const keep = (
  sent: Sent,
  segment: PdfSegment | undefined,
  change: (item: PdfTextItem) => PdfTextItem = (item) => item,
): void => {
  for (const item of segment?.items ?? []) sent.set(item, change(item));
};

const masked = (item: PdfTextItem): PdfTextItem => ({
  ...item,
  str: maskLongNumbers(item.str),
});

// Only the account's last digits leave the browser, as wide as their
// characters were. Any other text keeps the error it gives, without long
// numbers.
const lastDigits = (item: PdfTextItem): PdfTextItem => {
  const number = item.str.trim();
  if (!ACCOUNT_NUMBER_PATTERN.test(number)) return masked(item);
  const digits = number.slice(-ACCOUNT_LAST_DIGITS);
  return {
    ...item,
    str: digits,
    width:
      Math.round(((item.width * digits.length) / item.str.length) * 100) / 100,
  };
};

const keepHeader = (sent: Sent, parts: QuarterlyPdfHeaderParts): void => {
  for (const field of [parts.from, parts.to, ...Object.values(parts.summary)]) {
    field?.segments.forEach((segment) => keep(sent, segment));
  }
  keep(sent, parts.type);
  keep(sent, parts.holder);
  parts.number?.segments.forEach((segment) => keep(sent, segment, lastDigits));
};

// Each page's titles, so its table is found again, and the cells the parser
// reads, but not the pages' footers.
const keepTables = (sent: Sent, tables: readonly PdfTable[]): void => {
  for (const { header, lines } of tables) {
    header.forEach((segment) => keep(sent, segment));
    for (const { line, columns } of lines) {
      if (!isPageFooter(line.segments[0]?.text ?? "")) {
        line.segments.forEach((segment, index) => {
          const column = columns[index] ?? -1;
          if (!READ_COLUMNS.has(column)) return;
          keep(
            sent,
            segment,
            column === DESCRIPTION_COLUMN ? masked : undefined,
          );
        });
      }
    }
  }
};

/**
 * Keeps only the text items the parser reads, each where the page prints it
 * (ADR 0017): the first page's period, account type, holder's name and
 * summary, the account's last 4 digits, and each page's table titles and
 * movements, long numbers masked in their descriptions. Not the address or
 * the city, the branch, the promotions, the pages' footers or the blocks
 * each page repeats. Pure and idempotent.
 */
export const minimizeQuarterlyPdf = (
  content: ExtractedContent,
): ExtractedContent => {
  if (content.type !== "pdf") return content;
  const lines = pdfLines(content);
  const tables = pdfTables(lines, QUARTERLY_PDF_COLUMNS);
  const sent: Sent = new Map();
  keepHeader(sent, findQuarterlyPdfHeader(linesAboveTable(lines, tables)));
  keepTables(sent, tables);
  return {
    type: "pdf",
    pages: content.pages.map(({ items }) => ({
      items: items.flatMap((item) => {
        const kept = sent.get(item);
        return kept === undefined ? [] : [kept];
      }),
    })),
  };
};
