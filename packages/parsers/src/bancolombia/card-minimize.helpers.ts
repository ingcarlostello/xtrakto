import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { maskLongNumbers } from "../descriptions/description.helpers";
import {
  findColumns,
  findLabelRow,
  hasText,
  keepCells,
} from "../sheets/sheet.utils";
import type { SheetRows } from "../sheets/sheet.utils";
import { CLIENT_COLUMN, QUARTERLY_BLOCK } from "./bancolombia.constants";
import {
  cardSheets,
  findSummaries,
  purchaseRateRow,
} from "./card-header.helpers";
import {
  findCardTable,
  looksLikeCardMovement,
  tableRows,
} from "./card-movements.helpers";
import type { CardTable } from "./card-movements.helpers";
import {
  CARD_LABEL,
  CARD_MINIMUM_LABEL,
  CARD_NUMBER_PATTERN,
  CARD_TABLE,
  CARD_TOTAL_LABEL,
} from "./card.constants";

type Row = readonly SpreadsheetCell[];
// The rows kept, by position; every other row goes empty.
type Kept = Map<number, Row>;

const maskRow = (row: Row): SpreadsheetCell[] =>
  row.map((cell) => (typeof cell === "string" ? maskLongNumbers(cell) : cell));

// Only the card's last 4 digits leave the browser; any other value keeps the
// parse error it gives.
const lastFour = (cell: SpreadsheetCell): SpreadsheetCell => {
  if (typeof cell !== "string") return null;
  const [, digits] = CARD_NUMBER_PATTERN.exec(cell.trim()) ?? [];
  return digits ?? maskLongNumbers(cell);
};

// The holder's name: the block's label, the header's "Cliente" and its value.
const keepClient = (rows: SheetRows, kept: Kept): void => {
  const index = findLabelRow(rows, QUARTERLY_BLOCK.CLIENT);
  if (index === undefined) return;
  kept.set(index, keepCells(rows[index] ?? [], new Set([0])));
  const columns = findColumns(rows[index + 1] ?? [], CLIENT_COLUMN);
  if (!columns.ok) return;
  const positions = new Set(columns.value.map(({ index: at }) => at));
  for (const row of [index + 1, index + 2]) {
    kept.set(row, maskRow(keepCells(rows[row] ?? [], positions)));
  }
};

// The rows of the first column's labels, with what's right of them: dates
// and amounts, and the card's last 4 digits.
const keepLabels = (rows: SheetRows, kept: Kept): void => {
  for (const label of Object.values(CARD_LABEL)) {
    const index = findLabelRow(rows, label);
    const row = index === undefined ? undefined : rows[index];
    if (index === undefined || row === undefined) continue;
    kept.set(
      index,
      label === CARD_LABEL.CARD
        ? row.map((cell, column) => (column === 0 ? cell : lastFour(cell)))
        : [...row],
    );
  }
};

// Both summaries' header, each of their lines with its amount, and the
// rates' line for purchases in installments with its monthly rate (12.4b):
// not the other rates beside them.
const keepSummaries = (rows: SheetRows, kept: Kept): void => {
  const header = findSummaries(rows);
  if (!header.ok) return;
  const { row: start, total, minimum, rates } = header.value;
  const rateCells = rates === undefined ? [] : [rates.label, rates.monthly];
  const rateRow = purchaseRateRow(rows, header.value);
  kept.set(
    start,
    keepCells(rows[start] ?? [], new Set([total, minimum, ...rateCells])),
  );
  const isLine = (cell: SpreadsheetCell | undefined, labels: object) =>
    Object.values(labels).some((label: string) => hasText(cell, label));
  rows.forEach((row, index) => {
    if (index <= start) return;
    const positions = [
      ...(isLine(row[total], CARD_TOTAL_LABEL) ? [total, total + 1] : []),
      ...(isLine(row[minimum], CARD_MINIMUM_LABEL)
        ? [minimum, minimum + 1]
        : []),
      ...(index === rateRow ? rateCells : []),
    ];
    if (positions.length > 0)
      kept.set(index, keepCells(row, new Set(positions)));
  });
};

// A movement keeps the cells read, its description's long numbers masked;
// with `datesOnly`, only its date, which says a movement is there.
const keepMovement = (row: Row, table: CardTable, datesOnly: boolean): Row => {
  const { columns } = table;
  if (datesOnly) return keepCells(row, new Set([columns.DATE]));
  const kept = keepCells(row, new Set(Object.values(columns)));
  const description = kept[columns.DESCRIPTION];
  return typeof description === "string"
    ? kept.with(columns.DESCRIPTION, maskLongNumbers(description))
    : kept;
};

// Each table's label, its header's names read, and its rows: a movement as
// read, any other row as it was, masked, so it's classified the same.
const keepTables = (rows: SheetRows, kept: Kept, datesOnly: boolean): void => {
  for (const label of Object.values(CARD_TABLE)) {
    const index = findLabelRow(rows, label);
    if (index === undefined) continue;
    kept.set(index, keepCells(rows[index] ?? [], new Set([0])));
    const table = findCardTable(rows, label);
    if (!table.ok) kept.set(index + 1, maskRow(rows[index + 1] ?? []));
    if (!table.ok || table.value === undefined) continue;
    const { columns } = table.value;
    const header = new Set(Object.values(columns));
    kept.set(index + 1, keepCells(rows[index + 1] ?? [], header));
    for (const [at, row] of tableRows(rows, table.value)) {
      kept.set(
        at,
        looksLikeCardMovement(row[columns.DATE])
          ? keepMovement(row, table.value, datesOnly)
          : maskRow(row),
      );
    }
  }
};

const keptRows = (rows: SheetRows, kept: Kept): SpreadsheetCell[][] =>
  rows.map((_, index) => [...(kept.get(index) ?? [])]);

const minimizePesos = (rows: SheetRows): SpreadsheetCell[][] => {
  const kept: Kept = new Map();
  keepClient(rows, kept);
  keepLabels(rows, kept);
  keepSummaries(rows, kept);
  keepTables(rows, kept, false);
  return keptRows(rows, kept);
};

// Of the sheet in dollars, its currency and how many movements it has.
const minimizeDollars = (rows: SheetRows): SpreadsheetCell[][] => {
  const kept: Kept = new Map();
  const currency = findLabelRow(rows, CARD_LABEL.CURRENCY);
  if (currency !== undefined) kept.set(currency, [...(rows[currency] ?? [])]);
  keepTables(rows, kept, true);
  return keptRows(rows, kept);
};

/**
 * Bancolombia's card statement with only what its parser reads (ADR 0017):
 * its sheet in pesos with the holder's name, the card's last 4 digits, the
 * period, what's due and when, the limit, both summaries' lines and each
 * movement's cells read, and its rate for purchases in installments (12.4b);
 * and of its sheet in dollars, its currency and each movement's date. Never
 * the address, the city or the department, the other rates or the
 * authorization numbers. Rows keep their positions and sheets
 * lose their names, so parsing the result gives the same statement.
 */
export const minimizeCard = (content: ExtractedContent): ExtractedContent => {
  const sheets = cardSheets(content);
  if (sheets === undefined) return content;
  return {
    type: "spreadsheet",
    sheets: [
      ...(sheets.pesos === undefined
        ? []
        : [{ name: "", rows: minimizePesos(sheets.pesos) }]),
      ...(sheets.dollars === undefined
        ? []
        : [{ name: "", rows: minimizeDollars(sheets.dollars) }]),
    ],
  };
};
