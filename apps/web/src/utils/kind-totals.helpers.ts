import {
  type AmountMinor,
  type CategoryKind,
  categoryKind,
  sumAmounts,
} from "@xtrakto/core";
import type { CategoryTotals } from "@xtrakto/db";

/** Some movements of a kind: their amounts added up, and how many. */
export type KindTotal = {
  readonly amountMinor: AmountMinor;
  readonly count: number;
};

/** A period's movements that count, by kind (design-system.md §3.4). */
export type KindTotals = {
  readonly income: KindTotal;
  readonly spending: KindTotal;
  /** Money that only moved goes both ways: out, and back. */
  readonly moved: { readonly out: KindTotal; readonly back: KindTotal };
};

const ofKind = (rows: readonly CategoryTotals[], kind: CategoryKind) =>
  rows.filter(
    ({ categoryId }) =>
      categoryId !== null && categoryKind(categoryId) === kind,
  );

const amountOf = (row: CategoryTotals, side: "in" | "out") =>
  side === "in" ? row.inMinor : row.outMinor;

const countOf = (row: CategoryTotals, side: "in" | "out") =>
  side === "in" ? row.inCount : row.outCount;

const totalOf = (
  rows: readonly CategoryTotals[],
  sides: readonly ("in" | "out")[],
): KindTotal => {
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
