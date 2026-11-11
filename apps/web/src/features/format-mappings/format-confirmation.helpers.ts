import {
  COLUMN_ROLE,
  CURRENCY,
  DEFAULT_TIME_ZONE,
  formatAmount,
  formatDayInWords,
  isAmountMinor,
  localDateFromExcelSerial,
} from "@xtrakto/core";
import type { AmountMinor, ColumnRole, SpreadsheetCell } from "@xtrakto/core";
import type { MappingReview, MappingTest } from "@xtrakto/parsers";
import type { StatusTone } from "@/components/status-pill/StatusPill";
import {
  CONFIRMATION_COPY as COPY,
  ROLE_LABELS,
} from "./format-confirmation.constants";

const NUMBERS = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

// A date cell shows the day it holds, as the file's bank sees it.
const BOGOTA = {
  serialTimeZone: DEFAULT_TIME_ZONE,
  targetTimeZone: DEFAULT_TIME_ZONE,
};

const {
  DATE,
  DESCRIPTION,
  AMOUNT,
  MONEY_OUT,
  MONEY_IN,
  BALANCE,
  REFERENCE,
  DIRECTION,
} = COLUMN_ROLE;

const AMOUNT_ROLES: ReadonlySet<ColumnRole> = new Set([
  AMOUNT,
  MONEY_OUT,
  MONEY_IN,
  BALANCE,
]);

/** Whether a column holds amounts, which line up on the right. */
export const isAmountRole = (role: ColumnRole | undefined): boolean =>
  role !== undefined && AMOUNT_ROLES.has(role);

/**
 * A cell as the confirmation shows it: text as the file writes it, a number
 * the Colombian way, a date cell as its day. Shown in the browser only.
 */
export const cellText = (cell: SpreadsheetCell | undefined): string => {
  if (cell === undefined || cell === null) return "";
  if (typeof cell === "string") return cell.trim();
  if (typeof cell === "number") return NUMBERS.format(cell);
  const day = localDateFromExcelSerial(cell.excelSerial, BOGOTA);
  if (!day.ok) return "";
  const [year, month, date] = day.value.split("-");
  return `${date}/${month}/${year}`;
};

// The roles another column's role leaves no room for: one of each, and money
// read one way.
const CLASHES: Readonly<Record<ColumnRole, readonly ColumnRole[]>> = {
  [DATE]: [DATE],
  [DESCRIPTION]: [DESCRIPTION],
  [AMOUNT]: [AMOUNT, MONEY_OUT, MONEY_IN],
  [MONEY_OUT]: [MONEY_OUT, AMOUNT, DIRECTION],
  [MONEY_IN]: [MONEY_IN, AMOUNT, DIRECTION],
  [BALANCE]: [BALANCE],
  [REFERENCE]: [REFERENCE],
  [DIRECTION]: [DIRECTION, MONEY_OUT, MONEY_IN],
  [COLUMN_ROLE.NONE]: [],
};

const ROLES = Object.keys(ROLE_LABELS).filter((role): role is ColumnRole =>
  Object.hasOwn(CLASHES, role),
);

/**
 * The roles a column can take, among those the other columns leave (11.3b):
 * one date, one description, one balance and one reference, money read one
 * way, and "Ignorar" always. Its own role stays among them.
 */
export const rolesLeft = (
  roles: readonly ColumnRole[],
  column: number,
): ColumnRole[] => {
  const others = roles.filter((_, index) => index !== column);
  return ROLES.filter(
    (role) =>
      role === roles[column] ||
      !CLASHES[role].some((clash) => others.includes(clash)),
  );
};

/** What a column's choice is read as: its name as the file writes it, or its place. */
export const columnLabel = (
  header: SpreadsheetCell | undefined,
  column: number,
) =>
  COPY.columns.choose.replace("{name}", cellText(header) || String(column + 1));

const counted = (
  count: number,
  { one, other }: { readonly one: string; readonly other: string },
): string => (count === 1 ? one : other.replace("{count}", String(count)));

/**
 * What the table says under its rows: how many more it has, and which row
 * opens it with its balance, by its text in the description's column.
 */
export const rowsNote = (
  review: MappingReview,
  roles: readonly ColumnRole[],
): string => {
  const more =
    review.moreRows === 0 ? [] : [counted(review.moreRows, COPY.columns.more)];
  const text = cellText(review.openingRow?.[roles.indexOf(DESCRIPTION)]);
  const opening =
    text === "" ? [] : [COPY.columns.openingNote.replace("{text}", text)];
  return [...more, ...opening].join(" ");
};

/** What the file's format holds that the person doesn't choose: its currency and where its table is. */
export const formatFacts = (review: MappingReview) => {
  const { format } = COPY;
  return [
    { term: format.currency, value: format.currencyValue },
    { term: format.starts, value: `${format.row} ${review.firstRow}` },
    { term: format.ends, value: `${format.row} ${review.lastRow}` },
  ];
};

const pesos = (amount: AmountMinor): string =>
  formatAmount(amount, CURRENCY.COP);

/** A line of the test: what it is, and its amount, in its way's color. */
export type TestLine = {
  readonly label: string;
  readonly amount: string;
  readonly tone?: "income" | "spending";
};

/** What the movements add up to: the balances around them, when the file prints them. */
export const testLines = ({
  moneyIn,
  moneyOut,
  balances,
}: MappingTest): {
  readonly ways: readonly TestLine[];
  readonly closing?: TestLine;
} => {
  const { test } = COPY;
  const ways: TestLine[] = [
    {
      label: `${test.moneyIn} (${moneyIn.count})`,
      amount: pesos(moneyIn.totalMinor),
      tone: "income",
    },
    {
      label: `${test.moneyOut} (${moneyOut.count})`,
      amount: pesos(moneyOut.totalMinor),
      tone: "spending",
    },
  ];
  if (balances === undefined) return { ways };
  const opening = { label: test.opening, amount: pesos(balances.openingMinor) };
  return {
    ways: [opening, ...ways],
    closing: {
      label: test.closing,
      amount: pesos(balances.computedClosingMinor),
    },
  };
};

/** What a status pill says: its tone, its title and its detail. */
export type Verdict = {
  readonly tone: StatusTone;
  readonly title: string;
  readonly detail: string;
};

/** The test's verdict: the balances add up, they're off by an amount, or there are none. */
export const testVerdict = ({ balances }: MappingTest): Verdict => {
  const { test } = COPY;
  if (balances === undefined) {
    return { tone: "none", title: test.noBalances, detail: test.checkWays };
  }
  const { computedClosingMinor, closingMinor, closingOn, isVerified } =
    balances;
  const detail = test.fileSays
    .replace("{amount}", pesos(closingMinor))
    .replace("{day}", formatDayInWords(closingOn));
  if (isVerified) return { tone: "ok", title: test.verified, detail };
  // A row can break the chain while the closing balance still adds up.
  const difference = Math.abs(computedClosingMinor - closingMinor);
  const title =
    difference !== 0 && isAmountMinor(difference)
      ? `${test.off} ${pesos(difference)}`
      : test.offWithoutDifference;
  return { tone: "attention", title, detail };
};

/** The test's line under its title: what the choices read, or that they're read again. */
export const readText = (
  { reading }: MappingReview,
  isRereading: boolean,
): string => {
  if (isRereading) return COPY.test.rereading;
  if (!reading.ok) return COPY.test.notRead;
  return counted(reading.value.test.movementCount, COPY.test.read);
};
