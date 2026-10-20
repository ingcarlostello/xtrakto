import { categoryKind } from "../categories/category.helpers";
import type { CategoryKind } from "../categories/category.types";
import { sumAmounts } from "../money/money.helpers";
import type {
  CategoryTotals,
  KindTotals,
  MovementTotal,
} from "./summary.types";

type MoneySide = "in" | "out";

const ofKind = (rows: readonly CategoryTotals[], kind: CategoryKind) =>
  rows.filter(
    ({ categoryId }) =>
      categoryId !== null && categoryKind(categoryId) === kind,
  );

const amountOf = (row: CategoryTotals, side: MoneySide) =>
  side === "in" ? row.inMinor : row.outMinor;

const countOf = (row: CategoryTotals, side: MoneySide) =>
  side === "in" ? row.inCount : row.outCount;

/** What some categories' movements add up to, the ways `sides` names. */
export const totalOf = (
  rows: readonly CategoryTotals[],
  sides: readonly MoneySide[],
): MovementTotal => {
  const parts = rows.flatMap((row) => sides.map((side) => ({ row, side })));
  return {
    amountMinor: sumAmounts(parts.map(({ row, side }) => amountOf(row, side))),
    count: parts.reduce((sum, { row, side }) => sum + countOf(row, side), 0),
  };
};

/**
 * A period's totals by kind, from its totals by category: what each kind
 * adds up to, money that moved in each direction. Movements no rule knows
 * have no kind and stay out.
 */
export const kindTotalsOf = (rows: readonly CategoryTotals[]): KindTotals => {
  const moved = ofKind(rows, "internal");
  return {
    income: totalOf(ofKind(rows, "income"), ["in", "out"]),
    spending: totalOf(ofKind(rows, "spending"), ["in", "out"]),
    moved: { out: totalOf(moved, ["out"]), back: totalOf(moved, ["in"]) },
  };
};
