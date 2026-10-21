import { categoriesOfKind } from "../categories/category.helpers";
import type { CategoryId, CategoryKind } from "../categories/category.types";
import { GMF_TAX_RULE_ID } from "../categorization/categorization.constants";
import { compareLocalDates } from "../dates/date.helpers";
import type { LocalDate } from "../dates/date.types";
import { isAmountMinor, sumAmounts } from "../money/money.helpers";
import type { AmountMinor } from "../money/money.types";
import { kindTotalsOf, totalOf } from "./kind-totals.helpers";
import type {
  BalanceMovement,
  CategoryMoved,
  CategoryTotal,
  CategoryTotals,
  DailyBalances,
  DayTotals,
  MovementTotal,
  PeriodSummary,
  SummaryMovement,
} from "./summary.types";

/** Some movements' amounts added up, and how many they are. */
export const totalOfMovements = (
  movements: readonly SummaryMovement[],
): MovementTotal => ({
  amountMinor: sumAmounts(movements.map(({ amountMinor }) => amountMinor)),
  count: movements.length,
});

const groupBy = <K, T>(items: readonly T[], keyOf: (item: T) => K) => {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const group = groups.get(keyOf(item));
    if (group === undefined) groups.set(keyOf(item), [item]);
    else group.push(item);
  }
  return groups;
};

/**
 * Movements added up by category, each way, as SQL adds them up for the
 * movements list (`listCategoryTotals`). A movement of 0 goes neither way.
 */
export const categoryTotalsOf = (
  movements: readonly SummaryMovement[],
): CategoryTotals[] =>
  [...groupBy(movements, ({ categoryId }) => categoryId)].map(
    ([categoryId, group]) => {
      const moneyIn = totalOfMovements(group.filter((m) => m.amountMinor > 0));
      const moneyOut = totalOfMovements(group.filter((m) => m.amountMinor < 0));
      return {
        categoryId,
        inMinor: moneyIn.amountMinor,
        inCount: moneyIn.count,
        outMinor: moneyOut.amountMinor,
        outCount: moneyOut.count,
      };
    },
  );

const rowsOf = (rows: readonly CategoryTotals[], categoryId: CategoryId) =>
  rows.filter((row) => row.categoryId === categoryId);

// A kind's categories with movements, the largest first; a tie keeps the
// table's order.
const byCategory = (
  rows: readonly CategoryTotals[],
  kind: Exclude<CategoryKind, "internal">,
): CategoryTotal[] =>
  categoriesOfKind(kind)
    .map((categoryId) => ({
      categoryId,
      ...totalOf(rowsOf(rows, categoryId), ["in", "out"]),
    }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => Math.abs(b.amountMinor) - Math.abs(a.amountMinor));

const movedByCategory = (rows: readonly CategoryTotals[]): CategoryMoved[] =>
  categoriesOfKind("internal")
    .map((categoryId) => ({
      categoryId,
      out: totalOf(rowsOf(rows, categoryId), ["out"]),
      back: totalOf(rowsOf(rows, categoryId), ["in"]),
    }))
    .filter(({ out, back }) => out.count + back.count > 0)
    .sort((a, b) => a.out.amountMinor - b.out.amountMinor);

const daysOf = (movements: readonly SummaryMovement[]): DayTotals[] =>
  [...groupBy(movements, ({ date }) => date)]
    .sort(([a], [b]) => compareLocalDates(a, b))
    .map(([date, group]) => {
      const rows = categoryTotalsOf(group);
      return {
        date,
        kinds: kindTotalsOf(rows),
        movedByCategory: movedByCategory(rows),
      };
    });

/**
 * What a period's movements that count add up to: what went out, each
 * kind, real spending and income by category, money that moved by type,
 * each day, and the interest, 4x1000, cash and card payments. Each figure
 * keeps its sign, and a movement still to review counts as its best guess.
 */
export const summarizeMovements = (
  movements: readonly SummaryMovement[],
): PeriodSummary => {
  const rows = categoryTotalsOf(movements);
  const ofCategory = (categoryId: CategoryId) =>
    totalOf(rowsOf(rows, categoryId), ["in", "out"]);
  return {
    outflows: totalOfMovements(movements.filter((m) => m.amountMinor < 0)),
    kinds: kindTotalsOf(rows),
    spendingByCategory: byCategory(rows, "spending"),
    incomeByCategory: byCategory(rows, "income"),
    movedByCategory: movedByCategory(rows),
    days: daysOf(movements),
    interest: ofCategory("interest"),
    gmfTax: totalOfMovements(
      movements.filter((m) => m.categoryRuleId === GMF_TAX_RULE_ID),
    ),
    cash: ofCategory("cash_withdrawal"),
    cardPayments: ofCategory("credit_card_payment"),
  };
};

/**
 * A period's balance day by day: before its first movement, and after each
 * day's last, as its statement printed them. The movements come the oldest
 * first, in the bank's order within a day, as `listSummaryMovements` reads
 * them. `null` without movements, or when one printed no balance, as a
 * movements export's don't: a day's balance can't be known then.
 */
export const dailyBalances = (
  movements: readonly BalanceMovement[],
): DailyBalances | null => {
  const [first] = movements;
  if (first === undefined || first.balanceAfterMinor === null) return null;
  const opening = first.balanceAfterMinor - first.amountMinor;
  if (!isAmountMinor(opening)) return null;
  const closing = new Map<LocalDate, AmountMinor>();
  for (const { date, balanceAfterMinor } of movements) {
    if (balanceAfterMinor === null) return null;
    closing.set(date, balanceAfterMinor);
  }
  return {
    openingMinor: opening,
    days: [...closing].map(([date, closingMinor]) => ({ date, closingMinor })),
  };
};
