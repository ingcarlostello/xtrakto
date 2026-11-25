import type { ExtractedContent, PdfTextItem } from "@xtrakto/core";
import { maskLongNumbers } from "../descriptions/description.helpers";
import { pdfLines } from "../pdf-layout/pdf-lines.helpers";
import type { PdfSegment, PdfTableLine } from "../pdf-layout/pdf-layout.types";
import { tableLineCells } from "../pdf-layout/pdf-table.helpers";
import { looksLikeCardMovement } from "./card-movements.helpers";
import type { CardTableColumns } from "./card-movements.helpers";
import type { PdfField } from "../cards/card-pdf-fields.helpers";
import { findCardPdfHeader } from "./card-pdf-header.helpers";
import type { CardPdfHeaderParts } from "./card-pdf-header.helpers";
import {
  cardPdfColumns,
  cardPdfPages,
  cardPdfTables,
} from "./card-pdf-movements.helpers";
import type { CardPdfTable } from "./card-pdf-movements.helpers";
import { CARD_PDF_COLUMNS } from "./card.constants";

/** Each item to send, as it is sent, by the item the page holds. */
type Sent = Map<PdfTextItem, PdfTextItem>;
type Change = (item: PdfTextItem) => PdfTextItem;

const WIDTH = CARD_PDF_COLUMNS.length;

const asIs: Change = (item) => item;

const masked: Change = (item) => ({
  ...item,
  str: maskLongNumbers(item.str),
});

const keep = (
  sent: Sent,
  segment: PdfSegment | undefined,
  change: Change = asIs,
): void => {
  for (const item of segment?.items ?? []) sent.set(item, change(item));
};

const keepField = (
  sent: Sent,
  field: PdfField | undefined,
  change: Change = asIs,
): void => {
  field?.segments.forEach((segment) => keep(sent, segment, change));
};

// The labels and values read, the bank's NIT the holder's name is found
// under, and the summaries' titles each half is found by. The card's number
// leaves with its last 4 digits only.
const keepHeader = (sent: Sent, parts: CardPdfHeaderParts): void => {
  keep(sent, parts.bankId, masked);
  keep(sent, parts.holder);
  keepField(sent, parts.card, masked);
  parts.titles?.forEach((title) => keep(sent, title));
  for (const field of [
    parts.period,
    parts.dueDate,
    ...Object.values(parts.payments),
    ...Object.values(parts.total),
    ...Object.values(parts.minimum),
  ]) {
    keepField(sent, field);
  }
};

type LineRule = {
  readonly columns: CardTableColumns["columns"];
  readonly datesOnly: boolean;
};

// What a table's line sends: a movement's cells read, its description's long
// numbers masked, or with `datesOnly` its date alone; any other line masked,
// so it warns the same, or nothing with `datesOnly`, which only counts.
const keepLine = (
  sent: Sent,
  placed: PdfTableLine,
  { columns, datesOnly }: LineRule,
): void => {
  const { DATE, DESCRIPTION } = columns;
  const read = new Set(Object.values(columns));
  const isMovement = looksLikeCardMovement(tableLineCells(placed, WIDTH)[DATE]);
  placed.line.segments.forEach((segment, index) => {
    const column = placed.columns[index] ?? -1;
    if (!isMovement) {
      if (!datesOnly) keep(sent, segment, masked);
    } else if (column === DATE) {
      keep(sent, segment);
    } else if (!datesOnly && read.has(column)) {
      keep(sent, segment, column === DESCRIPTION ? masked : asIs);
    }
  });
};

// Each table's title, its header's two lines on each page, and its lines.
const keepTables = (
  sent: Sent,
  tables: readonly CardPdfTable[],
  datesOnly: boolean,
): void => {
  for (const table of tables) {
    keep(sent, table.title);
    const columns = cardPdfColumns(table);
    for (const { header, second, lines } of table.pages) {
      header.forEach((segment) => keep(sent, segment));
      second?.line.segments.forEach((segment) => keep(sent, segment));
      if (!columns.ok) continue;
      const rule = { columns: columns.value.columns, datesOnly };
      lines.forEach((placed) => keepLine(sent, placed, rule));
    }
  }
};

/**
 * Keeps only the text items the parser reads, each where the page prints it
 * (ADR 0017): each page's currency; the holder's name and the bank's NIT over
 * it, the card's last 4 digits, the period, what's due and when, the limit
 * and what's available, and both summaries' lines; the tables' titles and
 * headers, and each movement's cells read, its description's long numbers
 * masked; of the pages in dollars, each movement's date. Never the address,
 * the city or the department, the rates, the authorization numbers or the
 * pages' footers, and a text drawn over itself only once. Pure and
 * idempotent.
 */
export const minimizeCardPdf = (
  content: ExtractedContent,
): ExtractedContent => {
  if (content.type !== "pdf") return content;
  const pages = cardPdfPages(pdfLines(content));
  const sent: Sent = new Map();
  pages.marks.forEach((mark) => keepField(sent, mark));
  keepHeader(sent, findCardPdfHeader(pages.pesos));
  keepTables(sent, cardPdfTables(pages.pesos), false);
  keepTables(sent, cardPdfTables(pages.dollars), true);
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
