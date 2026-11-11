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
import type { MappingTest } from "@xtrakto/parsers";
import type { StatusTone } from "@/components/status-pill/StatusPill";
import {
  CONFIRMATION_COPY as COPY,
  DATE_ORDER_LABELS,
  NUMBER_LABELS,
} from "./format-confirmation.constants";
import type { MappingProposal } from "./format-mapping.types";

const NUMBERS = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

// A date cell shows the day it holds, as the file's bank sees it.
const BOGOTA = {
  serialTimeZone: DEFAULT_TIME_ZONE,
  targetTimeZone: DEFAULT_TIME_ZONE,
};

const AMOUNT_ROLES: ReadonlySet<ColumnRole> = new Set([
  COLUMN_ROLE.AMOUNT,
  COLUMN_ROLE.MONEY_OUT,
  COLUMN_ROLE.MONEY_IN,
  COLUMN_ROLE.BALANCE,
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

const counted = (
  count: number,
  { one, other }: { readonly one: string; readonly other: string },
): string => (count === 1 ? one : other.replace("{count}", String(count)));

/**
 * What the table says under its rows: how many more it has, and which row
 * opens it with its balance, by its text.
 */
export const rowsNote = ({ mapping, review }: MappingProposal): string => {
  const more =
    review.moreRows === 0 ? [] : [counted(review.moreRows, COPY.columns.more)];
  const description = mapping.columns.indexOf(COLUMN_ROLE.DESCRIPTION);
  const text = cellText(review.openingRow?.[description]);
  const opening =
    text === "" ? [] : [COPY.columns.openingNote.replace("{text}", text)];
  return [...more, ...opening].join(" ");
};

/** How the file writes its numbers and dates, and where its table is. */
export const formatFacts = ({ mapping, review }: MappingProposal) => {
  const { format } = COPY;
  return [
    { term: format.numbers, value: NUMBER_LABELS[mapping.decimalSeparator] },
    { term: format.dates, value: DATE_ORDER_LABELS[mapping.dateOrder] },
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

/** The test's verdict: the balances add up, they're off by an amount, or there are none. */
export const testVerdict = ({
  balances,
}: MappingTest): {
  readonly tone: StatusTone;
  readonly title: string;
  readonly detail: string;
} => {
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

/** "Leímos 78 movimientos con este mapeo." */
export const readText = ({ movementCount }: MappingTest): string =>
  counted(movementCount, COPY.test.read);
