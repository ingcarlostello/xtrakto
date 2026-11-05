import {
  amountMinorSchema,
  type CalendarMonth,
  localDateSchema,
  periodSchema,
  type RecurringPayment,
} from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import {
  historyRead,
  historyUpTo,
  monthBefore,
  periodPayments,
  splitByMonth,
} from "./recurring.helpers";

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

describe("historyRead", () => {
  it("reads the year that ends with a quarter", () => {
    const third = periodSchema.parse({ from: "2026-07-01", to: "2026-09-30" });

    expect(
      historyRead({ kind: "quarter", year: 2026, quarter: 3 }, third),
    ).toEqual({
      from: "2025-10-01",
      to: "2026-09-30",
    });
  });

  it("reads a year with the eleven months before it, so any of its months finds its payments (10.2c)", () => {
    const year = periodSchema.parse({ from: "2027-01-01", to: "2027-12-31" });

    expect(historyRead({ kind: "year", year: 2027 }, year)).toEqual({
      from: "2026-02-01",
      to: "2027-12-31",
    });
  });
});

describe("historyUpTo", () => {
  it("keeps the movements of the year that ends with a day's month", () => {
    const movements = ["2026-01-31", "2026-02-01", "2027-01-20"].map(
      (value) => ({ date: date(value) }),
    );

    expect(
      historyUpTo(movements, date("2027-01-20")).map((m) => m.date),
    ).toEqual(["2026-02-01", "2027-01-20"]);
  });
});

describe("periodPayments", () => {
  // A gym paid on the 10th from June to August.
  const gym = [6, 7, 8].map((value) => ({
    date: date(`2026-0${value}-10`),
    amountMinor: amount(-11_000_000),
    descriptionRaw: "COMPRA EN  GIMNASIO FIT",
    referenceHash: null,
    referenceLast4: null,
    categoryId: "health" as const,
    categoryRuleId: null,
  }));
  const period = (from: string, to: string) => periodSchema.parse({ from, to });

  it("finds a period's payments by its last day with movements", () => {
    const found = periodPayments(gym, period("2026-07-01", "2026-09-30"));

    expect(found?.last).toBe("2026-08-10");
    expect(found?.payments.spending.map(({ label }) => label)).toEqual([
      "GIMNASIO FIT",
    ]);
  });

  it("finds none in a period without movements, whatever came before it", () => {
    expect(
      periodPayments(gym, period("2026-09-01", "2026-09-30")),
    ).toBeUndefined();
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
