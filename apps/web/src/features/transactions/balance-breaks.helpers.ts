import {
  type AmountMinor,
  CURRENCY,
  formatAmount,
  formatMonthRange,
  isAmountMinor,
  type Period,
  sumAmounts,
} from "@xtrakto/core";
import type { StatementBreaks, UnreconciledStatement } from "@xtrakto/db";
import { countText } from "@/utils/count-text.utils";
import { TRANSACTIONS_COPY } from "./transaction.constants";
import type { MovementMark } from "./transaction.types";

const COPY = TRANSACTIONS_COPY.breaks;

/** The id of the first row where the balance breaks, for the jump link. */
export const FIRST_BREAK_ANCHOR = "primera-fila-que-no-cuadra";

// Statements are in pesos: other currencies are out of scope.
const money = (amount: AmountMinor) => formatAmount(amount, CURRENCY.COP);

// How much a statement is off, as a positive amount, or `undefined` if not.
const offBy = (difference: AmountMinor | null): string | undefined => {
  const amount = Math.abs(difference ?? 0);
  return amount !== 0 && isAmountMinor(amount) ? money(amount) : undefined;
};

/** `"Extracto trimestral jul–sep 2026"`: only quarterly statements have balances. */
export const statementName = (period: Period): string =>
  `${COPY.statement} ${formatMonthRange(period)}`;

/** `"Tu extracto trimestral jul–sep 2026 no cuadra por $810: …"`. */
export const unreconciledText = ({
  period,
  differenceMinor,
}: UnreconciledStatement): string => {
  const amount = offBy(differenceMinor);
  const off = amount ? `${COPY.offBy} ${amount}` : COPY.off;
  return `${COPY.yourStatement} ${formatMonthRange(period)} ${off}: ${COPY.notCounted}`;
};

/** `"El saldo final no cuadra por $810"`, or why else it doesn't. */
export const breaksTitle = (difference: AmountMinor | null): string => {
  const amount = offBy(difference);
  return amount ? `${COPY.closingOffBy} ${amount}` : COPY.closingOff;
};

/** How many rows break the chain of balances, or that none does. */
export const breaksSummary = (count: number): string =>
  count === 0 ? COPY.noRows : countText(count, COPY.rows);

/** Each row where the balance breaks: what it should be, and what the bank printed. */
export const breakMarks = ({
  statement,
  movements,
}: StatementBreaks): ReadonlyMap<string, MovementMark> => {
  const byPosition = new Map(movements.map((m) => [m.position, m]));
  const first = Math.min(...statement.breakPositions);
  const marks = new Map<string, MovementMark>();
  for (const position of statement.breakPositions) {
    const movement = byPosition.get(position);
    if (!movement) continue;
    // A row's balance follows the printed balance before it (reconcile).
    const previous =
      position === 0
        ? statement.openingBalanceMinor
        : (byPosition.get(position - 1)?.balanceAfterMinor ?? null);
    const printed = movement.balanceAfterMinor;
    const note =
      previous === null || printed === null
        ? COPY.rowNoteUnknown
        : `${COPY.rowNote.before} (${money(previous)}) ${COPY.rowNote.expected} ${money(sumAmounts([previous, movement.amountMinor]))}; ${COPY.rowNote.printed} ${money(printed)}.`;
    marks.set(movement.id, {
      note,
      ...(position === first ? { anchor: FIRST_BREAK_ANCHOR } : {}),
    });
  }
  return marks;
};
