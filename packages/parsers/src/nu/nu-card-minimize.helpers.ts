import type { ExtractedContent, PdfTextItem } from "@xtrakto/core";
import type { PdfField } from "../cards/card-pdf-fields.helpers";
import { maskLongNumbers } from "../descriptions/description.helpers";
import { pdfLines } from "../pdf-layout/pdf-lines.helpers";
import type { PdfSegment, PdfTableLine } from "../pdf-layout/pdf-layout.types";
import { tableLineCells } from "../pdf-layout/pdf-table.helpers";
import { findNuCardHeader } from "./nu-card-header.helpers";
import type { NuCardHeaderParts } from "./nu-card-header.helpers";
import {
  NU_LINE,
  NU_WIDTH,
  nuLineKind,
  nuTable,
} from "./nu-card-table.helpers";
import type { NuColumns, NuLineKind, NuTable } from "./nu-card-table.helpers";

/** Each item to send, as it is sent, by the item the page holds. */
type Sent = Map<PdfTextItem, PdfTextItem>;
type Change = (item: PdfTextItem) => PdfTextItem;

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

const keepField = (sent: Sent, field: PdfField | undefined): void => {
  field?.segments.forEach((segment) => keep(sent, segment));
};

// The labels and values read, "Tus tarjetas" the holder's name is found
// beside, and the summary's title its lines are found under.
const keepHeader = (sent: Sent, parts: NuCardHeaderParts): void => {
  keep(sent, parts.cards);
  keep(sent, parts.holder);
  keep(sent, parts.title);
  for (const field of [
    parts.card,
    parts.dueDate,
    parts.cutDate,
    parts.period,
    parts.creditLimit,
    parts.available,
    ...Object.values(parts.summary),
  ]) {
    keepField(sent, field);
  }
};

// How each kind of line sends a column's segment, or doesn't.
const changeOf = (
  kind: NuLineKind,
  column: number,
  columns: NuColumns,
): Change | undefined => {
  const { DATE, DESCRIPTION, AMOUNT, TOTAL, INTEREST } = columns;
  if (kind === NU_LINE.STRAY || column === DESCRIPTION) return masked;
  if (column === DATE) return asIs;
  if (kind === NU_LINE.ROW) return column === TOTAL ? undefined : asIs;
  if (kind === NU_LINE.LATE) return column === INTEREST ? asIs : undefined;
  if (kind === NU_LINE.CONVERSION) {
    return column === AMOUNT || column === TOTAL ? asIs : undefined;
  }
  return undefined;
};

// Each line of the table, by its kind: a row's cells read but what it pays
// this month; a conversion charge's words and charge; a late interest's words
// and rate; a row's year and words; any other line masked, so it warns the
// same. A payment's parts never reach the table.
const keepLine = (sent: Sent, placed: PdfTableLine, columns: NuColumns) => {
  const kind = nuLineKind(tableLineCells(placed, NU_WIDTH), columns);
  placed.line.segments.forEach((segment, index) => {
    const change = changeOf(kind, placed.columns[index] ?? -1, columns);
    if (change !== undefined) keep(sent, segment, change);
  });
};

const keepTable = (sent: Sent, table: NuTable): void => {
  table.headers.forEach((segments) =>
    segments.forEach((segment) => keep(sent, segment)),
  );
  if (table.columns === undefined || !table.columns.ok) return;
  const columns = table.columns.value;
  table.lines.forEach((placed) => keepLine(sent, placed, columns));
};

/**
 * Keeps only the text items Nu's parser reads, each where the page prints it
 * (ADR 0017): the holder's name, the physical card's last 4 digits, the
 * dates, the limit and what's available, the summary's lines; the table's
 * header and each movement's cells read, its description's long numbers
 * masked, the conversion charges and the late interest under them. Never the
 * greeting, the ID number, the address, the virtual card, what was used or
 * paid, a payment's parts, what each purchase pays this month, Nu's contact
 * or the pages' footers. Pure and idempotent.
 */
export const minimizeNuCard = (content: ExtractedContent): ExtractedContent => {
  if (content.type !== "pdf") return content;
  const lines = pdfLines(content);
  const sent: Sent = new Map();
  keepHeader(sent, findNuCardHeader(lines));
  keepTable(sent, nuTable(lines));
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
