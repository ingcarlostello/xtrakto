import {
  COLUMN_ROLE,
  DATE_ORDER,
  DECIMAL_SEPARATOR,
  formatMappingSchema,
} from "@xtrakto/core";
import type {
  DateOrder,
  FormatMapping,
  SpreadsheetCell,
  SpreadsheetContent,
} from "@xtrakto/core";
import { findTable } from "@xtrakto/parsers";
import { amountCell, dateCell, dayAfter } from "./format-mapping-cells.helpers";
import {
  BANK_NAMES,
  CHANNELS,
  HOLDER_NAME,
  INCOME_TEXTS,
  MAPPING_SET_SEED,
  SPENDING_TEXTS,
} from "./format-mapping-set.constants";
import type {
  DateStyle,
  Layout,
  LayoutColumn,
  MappingCase,
} from "./format-mapping.types";
import { between, pick, seededRandom } from "./seeded-random.utils";
import type { Random } from "./seeded-random.utils";

/** An invented movement, in cents, with the balance it leaves. */
type Movement = {
  readonly date: string;
  readonly text: string;
  readonly amount: number;
  readonly balance: number;
  readonly reference?: string;
};

type Month = {
  readonly opening: number;
  readonly movements: readonly Movement[];
};

type Row = SpreadsheetCell[];

const { DATE, DESCRIPTION, AMOUNT, MONEY_OUT, MONEY_IN, BALANCE, REFERENCE } =
  COLUMN_ROLE;

const DATE_ORDERS: Readonly<Record<DateStyle, DateOrder>> = {
  dmy_slash: DATE_ORDER.DAY_MONTH_YEAR,
  dmy_dash: DATE_ORDER.DAY_MONTH_YEAR,
  dmy_time: DATE_ORDER.DAY_MONTH_YEAR,
  dmy_short_year: DATE_ORDER.DAY_MONTH_YEAR,
  dmy_month_name: DATE_ORDER.DAY_MONTH_YEAR,
  mdy_slash: DATE_ORDER.MONTH_DAY_YEAR,
  ymd_dash: DATE_ORDER.YEAR_MONTH_DAY,
  // A date cell reads as the day it shows, whatever the order.
  date_cell: DATE_ORDER.DAY_MONTH_YEAR,
};

const pad = (number: number): string => String(number).padStart(2, "0");

const digits = (random: Random, count: number): string =>
  Array.from({ length: count }, () => between(random, 0, 9)).join("");

// A transfer names a phone, a PSE payment its code; the rest, nothing.
const referenceOf = (text: string, random: Random): string | undefined => {
  if (text.startsWith("TRANSFERENCIA A")) return `3${digits(random, 9)}`;
  return text.startsWith("PAGO PSE") ? digits(random, 9) : undefined;
};

// Spending of 5.000 to 900.000 pesos, now and then with cents; an income of
// 200.000 to 4.000.000.
const amountOf = (random: Random, isIncome: boolean): number =>
  isIncome
    ? between(random, 20, 400) * 1_000_000
    : between(random, 5, 900) * 100_000 +
      (random() < 0.2 ? between(random, 1, 99) : 0);

// A month of invented movements, oldest first, the last on its 28th so a
// date tells its day from its month; the balance never goes below zero.
const monthOf = (random: Random, month: number): Month => {
  const count = between(random, 10, 22);
  const days = [
    ...Array.from({ length: count - 1 }, () => between(random, 1, 27)),
    28,
  ].toSorted((a, b) => a - b);
  const opening = between(random, 300, 900) * 1_000_000;
  let balance = opening;
  const movements = days.map((day, index): Movement => {
    const spending = amountOf(random, false);
    const isIncome = index % 6 === 2 || spending > balance;
    const amount = isIncome ? amountOf(random, true) : -spending;
    const text = pick(random, isIncome ? INCOME_TEXTS : SPENDING_TEXTS);
    const reference = isIncome ? undefined : referenceOf(text, random);
    balance += amount;
    const date = `2026-${pad(month)}-${pad(day)}`;
    return { date, text, amount, balance, ...(reference ? { reference } : {}) };
  });
  return { opening, movements };
};

type CellContext = { readonly layout: Layout; readonly index: number };

// What a column no mapping reads holds on a movement's row.
const ignoredCell = (
  { holds }: LayoutColumn,
  movement: Movement,
  { layout, index }: CellContext,
): SpreadsheetCell => {
  if (holds === "second_date") {
    return dateCell(dayAfter(movement.date, index % 2), layout.dates);
  }
  if (holds === "branch") return String(100 + (index % 7)).padStart(4, "0");
  if (holds === "fee") {
    return index % 5 === 0 ? amountCell(150_000, layout.numbers) : null;
  }
  if (holds === "available_balance") {
    const hold = index % 4 === 1 ? 5_000_000 : 0;
    return amountCell(movement.balance - hold, layout.numbers);
  }
  return holds === "channel"
    ? (CHANNELS[index % CHANNELS.length] ?? null)
    : null;
};

// The empty side of money out and in: nothing, or 0 where the layout says so.
const emptySide = (layout: Layout): SpreadsheetCell =>
  layout.zeroSide ? amountCell(0, layout.numbers) : null;

const moneyCell = (
  column: LayoutColumn,
  { amount }: Movement,
  layout: Layout,
): SpreadsheetCell => {
  const hasDirection = layout.directionWords !== undefined;
  if (column.role === AMOUNT) {
    return amountCell(hasDirection ? Math.abs(amount) : amount, layout.numbers);
  }
  if (column.role === MONEY_OUT) {
    return amount < 0 ? amountCell(-amount, layout.numbers) : emptySide(layout);
  }
  if (column.role === MONEY_IN) {
    return amount > 0 ? amountCell(amount, layout.numbers) : emptySide(layout);
  }
  const words = layout.directionWords;
  return (amount < 0 ? words?.out : words?.in) ?? null;
};

const movementCell = (
  column: LayoutColumn,
  movement: Movement,
  context: CellContext,
): SpreadsheetCell => {
  const { layout } = context;
  if (column.role === DATE) return dateCell(movement.date, layout.dates);
  if (column.role === DESCRIPTION) return movement.text;
  if (column.role === BALANCE)
    return amountCell(movement.balance, layout.numbers);
  if (column.role === REFERENCE) return movement.reference ?? null;
  if (column.role === COLUMN_ROLE.NONE) {
    return ignoredCell(column, movement, context);
  }
  return moneyCell(column, movement, layout);
};

// "SALDO ANTERIOR" on the day before the first movement, with the opening.
const openingRow = (layout: Layout, month: Month): Row => {
  const day = dayAfter(month.movements[0]?.date ?? "2026-01-01", -1);
  return layout.columns.map(({ role }) => {
    if (role === DATE) return dateCell(day, layout.dates);
    if (role === DESCRIPTION) return "SALDO ANTERIOR";
    return role === BALANCE ? amountCell(month.opening, layout.numbers) : null;
  });
};

const tableRows = (layout: Layout, month: Month): Row[] => {
  const movements = month.movements.map((movement, index) =>
    layout.columns.map((column) =>
      movementCell(column, movement, { layout, index }),
    ),
  );
  const opening = layout.openingRow ? [openingRow(layout, month)] : [];
  const oldestFirst = [...opening, ...movements];
  return layout.newestFirst ? oldestFirst.toReversed() : oldestFirst;
};

// The invented bank's, holder's and account's rows above the table.
const titleRows = (random: Random): Row[] => [
  [pick(random, BANK_NAMES)],
  ["Extracto de movimientos"],
  ["Cliente:", HOLDER_NAME],
  ["Cuenta:", digits(random, 11)],
  [],
];

const footerRows = (count: number): Row[] => [
  [],
  ["Total de movimientos", String(count)],
  ["Fin del extracto"],
];

// As the extraction returns rows: without their empty cells at the end.
const trimmed = (row: Row): Row =>
  row.slice(0, row.findLastIndex((cell) => cell !== null) + 1);

const expectedMapping = (
  layout: Layout,
  content: SpreadsheetContent,
): FormatMapping => {
  const table = findTable(content);
  if (!table.ok) throw new Error(`No table in the layout ${layout.name}.`);
  const words = layout.directionWords;
  return formatMappingSchema.parse({
    header: table.value.header,
    columns: layout.columns.map(({ role }) => role),
    dateOrder: DATE_ORDERS[layout.dates],
    decimalSeparator:
      layout.numbers === "point"
        ? DECIMAL_SEPARATOR.POINT
        : DECIMAL_SEPARATOR.COMMA,
    ...(words ? { directionWords: { in: [words.in], out: [words.out] } } : {}),
    bankId: "other",
  });
};

/**
 * A case of the set: its layout written with a month of invented movements
 * from a seed of its own, and the mapping a person would confirm for it.
 */
export const mappingCase = (layout: Layout, index: number): MappingCase => {
  const random = seededRandom(MAPPING_SET_SEED + index + 1);
  const month = monthOf(random, (index % 12) + 1);
  const above = layout.titleRows ? titleRows(random) : [];
  const rows = [
    ...above,
    layout.columns.map(({ name }) => name),
    ...tableRows(layout, month),
    ...(layout.footer ? footerRows(month.movements.length) : []),
  ].map(trimmed);
  const content: SpreadsheetContent = {
    type: "spreadsheet",
    sheets: [{ name: "Movimientos", rows }],
  };
  return {
    name: layout.name,
    content,
    expected: expectedMapping(layout, content),
    headerRow: above.length,
    movementCount: month.movements.length,
    hasBalances: layout.columns.some(({ role }) => role === BALANCE),
    isHard: layout.isHard,
  };
};
