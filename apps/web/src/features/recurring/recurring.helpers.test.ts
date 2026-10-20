import {
  amountMinorSchema,
  type CalendarMonth,
  localDateSchema,
  type RecurringPayment,
} from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { monthBefore, splitByMonth } from "./recurring.helpers";

const amount = (value: number) => amountMinorSchema.parse(value);
const date = (value: string) => localDateSchema.parse(value);
const month = (value: number, year = 2026): CalendarMonth => ({
  year,
  month: value,
});

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
  lastDate: date(`2026-${String(months.at(-1)).padStart(2, "0")}-10`),
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

describe("splitByMonth", () => {
  const september = paidOn([7, 8, 9]);
  const august = paidOn([6, 7, 8]);
  const july = paidOn([5, 6, 7]);

  it("in a whole month, expects the payments paid in it and stops the fixed ones that weren't", () => {
    expect(
      splitByMonth(
        { spending: [september, august], moved: [august, september] },
        date("2026-09-30"),
      ),
    ).toEqual({
      payments: { spending: [september], moved: [september] },
      stopped: [august],
    });
  });

  it("still expects last month's payments while the month's movements go on", () => {
    expect(
      splitByMonth(
        { spending: [september, august, july], moved: [august, july] },
        date("2026-09-12"),
      ),
    ).toEqual({
      payments: { spending: [september, august], moved: [august] },
      stopped: [july],
    });
  });

  it("finds last month's across a new year", () => {
    const december = paidOn([10, 11, 12]);

    expect(
      splitByMonth({ spending: [december], moved: [] }, date("2027-01-05")),
    ).toEqual({ payments: { spending: [december], moved: [] }, stopped: [] });
  });
});
