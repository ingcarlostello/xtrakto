import type { ExtractedContent, PdfTextItem } from "@xtrakto/core";
import { maskLongNumbers } from "../descriptions/description.helpers";
import { pdfLines } from "../pdf-layout/pdf-lines.helpers";
import type { PdfSegment, PdfTable } from "../pdf-layout/pdf-layout.types";
import { linesAboveTable, pdfTables } from "../pdf-layout/pdf-table.helpers";
import {
  ACCOUNT_LAST_DIGITS,
  EXPORT_COLUMN,
  MOVEMENTS_PDF_COLUMNS,
} from "./bancolombia.constants";
import { findMovementsPdfHeader } from "./movements-pdf-header.helpers";
import { isMovementsPdfFooter } from "./movements-pdf-movements.helpers";

/** Each item to send, as it is sent, by the item the page holds. */
type Sent = Map<PdfTextItem, PdfTextItem>;

const DESCRIPTION = MOVEMENTS_PDF_COLUMNS.indexOf(EXPORT_COLUMN.DESCRIPTION);

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

// Only the account's last digits leave the browser, where its number starts,
// as wide as their characters were.
const keepLastDigits = (sent: Sent, number: PdfSegment | undefined): void => {
  const first = number?.items[0];
  if (number === undefined || first === undefined) return;
  const digits = number.text.replace(/\D/g, "").slice(-ACCOUNT_LAST_DIGITS);
  const width = (first.width * digits.length) / first.str.length;
  sent.set(first, {
    ...first,
    str: digits,
    width: Math.round(width * 100) / 100,
  });
};

// Each page's titles, so its table is found again, and every cell of its
// movements, but not the pages' footers.
const keepTables = (sent: Sent, tables: readonly PdfTable[]): void => {
  for (const { header, lines } of tables) {
    header.forEach((segment) => keep(sent, segment));
    for (const { line, columns } of lines) {
      if (!isMovementsPdfFooter(line.segments[0]?.text ?? "")) {
        line.segments.forEach((segment, index) =>
          keep(
            sent,
            segment,
            columns[index] === DESCRIPTION ? masked : undefined,
          ),
        );
      }
    }
  }
};

/**
 * Keeps only the text items the parser reads, each where the page prints it
 * (ADR 0017): the holder's name, the account's type and last 4 digits, and
 * each page's table titles and movements, long numbers masked in their
 * descriptions. References stay whole: the server hashes them with a key the
 * browser doesn't have. Not the page's titles, the date and time it was
 * downloaded, or the IP address each page prints under its table. Pure and
 * idempotent.
 */
export const minimizeMovementsPdf = (
  content: ExtractedContent,
): ExtractedContent => {
  if (content.type !== "pdf") return content;
  const lines = pdfLines(content);
  const tables = pdfTables(lines, MOVEMENTS_PDF_COLUMNS);
  const header = findMovementsPdfHeader(linesAboveTable(lines, tables));
  const sent: Sent = new Map();
  keep(sent, header.holder);
  keep(sent, header.type);
  keepLastDigits(sent, header.number);
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
