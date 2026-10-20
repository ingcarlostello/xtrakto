import {
  amountMinorSchema,
  type CalendarMonth,
  localDateSchema,
  type RecurringPayment,
} from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { monthBefore, paidIn } from "./recurring.helpers";

const amount = (value: number) => amountMinorSchema.parse(value);
const month = (value: number, year = 2026): CalendarMonth => ({
  year,
  month: value,
});
const SEPTEMBER = month(9);

// A payment of each of its months.
const paidOn = (months: readonly number[]): RecurringPayment => ({
  label: "GIMNASIO FIT",
  referenceLast4: null,
  bankTexts: ["COMPRA EN  GIMNASIO FIT"],
  categoryId: "health",
  channels: ["debit_card"],
  months: months.map((value) => ({
    month: month(value),
    amountMinor: amount(-11_000_000),
    payments: [amount(-11_000_000)],
  })),
  typicalAmountMinor: amount(-11_000_000),
  days: { first: 10, last: 10 },
  lastDate: localDateSchema.parse("2026-09-10"),
  trend: { kind: "stable" },
});

describe("monthBefore", () => {
  it.each([
    [month(9), 2, month(7)],
    [month(2, 2027), 2, month(12)],
    [month(1, 2027), 12, month(1)],
  ])("counts back from %o by %i months", (from, back, expected) => {
    expect(monthBefore(from, back)).toEqual(expected);
  });
});

describe("paidIn", () => {
  const paid = paidOn([7, 8, 9]);
  const stopped = paidOn([6, 7, 8]);

  it("keeps the payments paid in the page's month", () => {
    expect(
      paidIn({ spending: [paid, stopped], moved: [stopped, paid] }, SEPTEMBER),
    ).toEqual({ spending: [paid], moved: [paid] });
  });

  it("keeps none without a month", () => {
    expect(paidIn({ spending: [paid], moved: [paid] }, undefined)).toEqual({
      spending: [],
      moved: [],
    });
  });
});
