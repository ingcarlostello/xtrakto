import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { maskLongNumbers } from "../descriptions/description.helpers";
import {
  asSingleSheet,
  findColumns,
  firstSheetRows,
  hasText,
  keepCells,
} from "../sheets/sheet.utils";
import type { ColumnRef, SheetRows } from "../sheets/sheet.utils";
import {
  ACCOUNT_COLUMN,
  ACCOUNT_LAST_DIGITS,
  ACCOUNT_NUMBER_PATTERN,
  CLIENT_COLUMN,
  PERIOD_COLUMN,
  QUARTERLY_BLOCK,
  SPLIT_MARK,
  SUMMARY_COLUMN,
} from "./bancolombia.constants";
import {
  findMovementsTable,
  looksLikeMovement,
} from "./quarterly-movements.helpers";
import type { MovementColumns } from "./quarterly-movements.helpers";

type Row = readonly SpreadsheetCell[];
type ReadBlock = {
  readonly label: string;
  readonly columns: Readonly<Record<string, string>>;
};

// The columns of each block the parser reads. Nothing else in them is sent:
// not the address, the city, the branch or the suggested credit line.
const READ_BLOCKS: readonly ReadBlock[] = [
  { label: QUARTERLY_BLOCK.CLIENT, columns: CLIENT_COLUMN },
  {
    label: QUARTERLY_BLOCK.GENERAL,
    columns: { ...PERIOD_COLUMN, ...ACCOUNT_COLUMN },
  },
  { label: QUARTERLY_BLOCK.SUMMARY, columns: SUMMARY_COLUMN },
];

// Only the account's last digits leave the browser. Any other value keeps the
// parse error it gives: text stays text, without long numbers, and anything
// else becomes empty.
const minimizeAccountNumber = (cell: SpreadsheetCell): SpreadsheetCell => {
  if (typeof cell !== "string") return null;
  const number = cell.trim();
  return ACCOUNT_NUMBER_PATTERN.test(number)
    ? number.slice(-ACCOUNT_LAST_DIGITS)
    : maskLongNumbers(cell);
};

const keepReadValues = (
  values: Row,
  columns: readonly ColumnRef<string>[],
): SpreadsheetCell[] => {
  const account = columns.find(({ name }) => name === ACCOUNT_COLUMN.NUMBER);
  const cleaned =
    account === undefined || account.index >= values.length
      ? values
      : values.with(
          account.index,
          minimizeAccountNumber(values[account.index] ?? null),
        );
  return keepCells(cleaned, new Set(columns.map(({ index }) => index)));
};

// The values row of every block, by position, kept to the cells read. Every
// page repeats the client and general blocks, so each copy is cleaned; a row
// is a block's values only if the row before it is that block's header.
const readValueRows = (rows: SheetRows): ReadonlyMap<number, Row> => {
  const values = new Map<number, Row>();
  rows.forEach((row, index) => {
    const block = READ_BLOCKS.find(({ label }) => hasText(row[0], label));
    const header = block && findColumns(rows[index + 1] ?? [], block.columns);
    const valuesRow = rows[index + 2];
    if (header?.ok && valuesRow !== undefined)
      values.set(index + 2, keepReadValues(valuesRow, header.value));
  });
  return values;
};

const isSplitTail = (cell: SpreadsheetCell | undefined): boolean =>
  typeof cell === "string" && cell.startsWith(SPLIT_MARK);

// A split description pushes the rest of its row one column to the right per
// tail, as the parser reads it.
const splitTails = (row: Row, descriptionColumn: number): number => {
  if (typeof row[descriptionColumn] !== "string") return 0;
  let tails = 0;
  while (isSplitTail(row[descriptionColumn + 1 + tails])) tails += 1;
  return tails;
};

const NO_AMOUNTS: ReadonlySet<number> = new Set();

// Long numbers are masked in every text but a movement's amounts, which stay
// untouched in case a bank prints them without thousands separators.
const maskRow = (row: Row, amounts = NO_AMOUNTS): SpreadsheetCell[] =>
  row.map((cell, index) =>
    typeof cell === "string" && !amounts.has(index)
      ? maskLongNumbers(cell)
      : cell,
  );

// A movement keeps the cells the parser reads: the date, the description and
// its split tails, and the amounts, which each tail moves one column to the
// right. SUCURSAL and DCTO. go.
const minimizeMovement = (row: Row, columns: MovementColumns): Row => {
  const tails = splitTails(row, columns.DESCRIPTION);
  const amounts = new Set([columns.AMOUNT + tails, columns.BALANCE + tails]);
  const descriptionCells = Array.from(
    { length: tails + 1 },
    (_, cell) => columns.DESCRIPTION + cell,
  );
  const kept = new Set([columns.DATE, ...descriptionCells, ...amounts]);
  return maskRow(keepCells(row, kept), amounts);
};

// Other rows after the movements header keep their cells, so the parser
// classifies them as before: page repeats, headers, the end marker, and rows
// it reports as unexpected.
const minimizeTableRow = (row: Row, columns: MovementColumns): Row =>
  looksLikeMovement(row[columns.DATE])
    ? minimizeMovement(row, columns)
    : maskRow(row);

/**
 * The quarterly statement with only what its parser reads (ADR 0017): one
 * sheet without a name; in every block, the holder's name, the period, the
 * account type, the account's last 4 digits and the summary's amounts; each
 * movement's date, description and amounts; and long numbers masked in every
 * text but the amounts. Rows keep their positions, so parsing the result
 * gives the same statement.
 */
export const minimizeQuarterly = (
  content: ExtractedContent,
): ExtractedContent => {
  const rows = firstSheetRows(content);
  if (rows === undefined) return content;
  const values = readValueRows(rows);
  const table = findMovementsTable(rows);
  return asSingleSheet(
    rows.map((row, index) => {
      const kept = values.get(index) ?? row;
      return table.ok && index >= table.value.start
        ? minimizeTableRow(kept, table.value.columns)
        : maskRow(kept);
    }),
  );
};
