import { amountMinorSchema, type CategoryId } from "@xtrakto/core";
import type { CategoryTotals } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import { kindTotalsOf } from "./kind-totals.helpers";

const amount = (value: number) => amountMinorSchema.parse(value);

const row = (
  categoryId: CategoryId | null,
  [inMinor, inCount]: [number, number],
  [outMinor, outCount]: [number, number],
): CategoryTotals => ({
  categoryId,
  inMinor: amount(inMinor),
  inCount,
  outMinor: amount(outMinor),
  outCount,
});

// A quarter in pesos' minor units: salary and interest, spending and a
// purchase that came back, an investment and money back from Nequi, and
// money in no rule knows.
const QUARTER_TOTALS = [
  row("income_transfer", [4_500_000_000, 3], [0, 0]),
  row("interest", [42_000, 90], [0, 0]),
  row("groceries", [30_000_000, 1], [-1_200_000_000, 26]),
  row("transfers_to_people", [0, 0], [-1_240_000_000, 58]),
  row("investment", [0, 0], [-2_200_000_000, 2]),
  row("own_account_transfer", [280_000_000, 8], [-780_000_000, 55]),
  row(null, [100_000, 1], [0, 0]),
];

describe("kindTotalsOf", () => {
  it("adds up the categories of each kind, money that moved in each direction", () => {
    expect(kindTotalsOf(QUARTER_TOTALS)).toEqual({
      income: { amountMinor: 4_500_042_000, count: 93 },
      spending: { amountMinor: -2_410_000_000, count: 85 },
      moved: {
        out: { amountMinor: -2_980_000_000, count: 57 },
        back: { amountMinor: 280_000_000, count: 8 },
      },
    });
  });

  it("adds up nothing without movements", () => {
    const nothing = { amountMinor: 0, count: 0 };

    expect(kindTotalsOf([])).toEqual({
      income: nothing,
      spending: nothing,
      moved: { out: nothing, back: nothing },
    });
  });
});
