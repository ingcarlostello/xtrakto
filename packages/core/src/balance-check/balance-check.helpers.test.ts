import { describe, expect, it } from "vitest";
import { localDateSchema } from "../dates/date.schemas";
import { amountMinorSchema } from "../money/money.schemas";
import {
  checkReportedBalance,
  withCheckedBalances,
} from "./balance-check.helpers";
import type { ReportedBalanceCheck, DatedBalance } from "./balance-check.types";

const day = (date: string) => localDateSchema.parse(date);
const amount = (value: number) => amountMinorSchema.parse(value);
const balance = (date: string, value: number): DatedBalance => ({
  date: day(date),
  amountMinor: amount(value),
});
const movement = (date: string, value: number) => ({
  date: day(date),
  amountMinor: amount(value),
});

const CLOSING = balance("2026-09-30", 1_000_000);
const OCTOBER = [
  movement("2026-10-02", -100_000),
  movement("2026-10-02", 50_000),
  movement("2026-10-05", -200_000),
];

describe("checkReportedBalance", () => {
  it("adds up the closing balance and the movements since, day by day", () => {
    const check = checkReportedBalance(
      balance("2026-10-09", 750_000),
      CLOSING,
      OCTOBER,
    );

    expect(check).toEqual({
      status: "adds_up",
      reported: balance("2026-10-09", 750_000),
      closingDate: "2026-09-30",
      days: [
        { date: "2026-10-02", openingMinor: 1_000_000, closingMinor: 950_000 },
        { date: "2026-10-05", openingMinor: 950_000, closingMinor: 750_000 },
      ],
    });
  });

  it("says by how much a balance is off what the movements add up to", () => {
    expect(
      checkReportedBalance(balance("2026-10-09", 762_400), CLOSING, OCTOBER),
    ).toEqual({
      status: "off",
      reported: balance("2026-10-09", 762_400),
      closingDate: "2026-09-30",
      differenceMinor: 12_400,
    });
  });

  it("is off when a day's movements are missing", () => {
    // The bank's balance holds October 5th's payment, which no file brought.
    const check = checkReportedBalance(
      balance("2026-10-09", 750_000),
      CLOSING,
      OCTOBER.slice(0, 2),
    );

    expect(check).toMatchObject({ status: "off", differenceMinor: -200_000 });
  });

  it("adds up with no movements since the closing", () => {
    expect(
      checkReportedBalance(balance("2026-10-09", 1_000_000), CLOSING, []),
    ).toMatchObject({ status: "adds_up", days: [] });
  });

  it("leaves out movements after the day typed, and up to the closing", () => {
    const check = checkReportedBalance(
      balance("2026-10-02", 950_000),
      CLOSING,
      [movement("2026-09-30", -1), ...OCTOBER],
    );

    expect(check).toMatchObject({ status: "adds_up" });
    expect(check?.status === "adds_up" && check.days).toHaveLength(1);
  });

  it("has nothing to compare without a closing balance before the day typed", () => {
    expect(
      checkReportedBalance(balance("2026-10-09", 750_000), undefined, OCTOBER),
    ).toBeUndefined();
  });

  it("has nothing to compare once a quarterly statement covers the day typed", () => {
    // October to December arrived afterwards: its balances speak for the day.
    expect(
      checkReportedBalance(
        balance("2026-10-09", 750_000),
        balance("2026-12-31", 2_000_000),
        OCTOBER,
      ),
    ).toBeUndefined();
    expect(
      checkReportedBalance(balance("2026-09-30", 750_000), CLOSING, OCTOBER),
    ).toBeUndefined();
  });

  it("doesn't compare past the safe integers", () => {
    expect(
      checkReportedBalance(
        balance("2026-10-09", 750_000),
        balance("2026-09-30", Number.MAX_SAFE_INTEGER),
        [movement("2026-10-01", 10)],
      ),
    ).toBeUndefined();
  });
});

describe("withCheckedBalances", () => {
  const unprinted = (date: string, value: number) => ({
    ...movement(date, value),
    balanceAfterMinor: null,
  });
  const CHECK: ReportedBalanceCheck = {
    status: "adds_up",
    reported: balance("2026-10-09", 750_000),
    closingDate: day("2026-09-30"),
    days: [
      {
        date: day("2026-10-02"),
        openingMinor: amount(1_000_000),
        closingMinor: amount(950_000),
      },
      {
        date: day("2026-10-05"),
        openingMinor: amount(950_000),
        closingMinor: amount(750_000),
      },
    ],
  };

  it("gives each movement of the check's days its balance, from the day's opening", () => {
    const movements = [
      unprinted("2026-10-02", -100_000),
      unprinted("2026-10-02", 50_000),
      unprinted("2026-10-05", -200_000),
    ];

    expect(
      withCheckedBalances(movements, CHECK).map(
        ({ balanceAfterMinor }) => balanceAfterMinor,
      ),
    ).toEqual([900_000, 950_000, 750_000]);
  });

  it("keeps what a statement printed, and days the check doesn't know", () => {
    const printed = {
      ...movement("2026-10-02", 500),
      balanceAfterMinor: amount(1_000_000),
    };
    const after = unprinted("2026-10-12", -1_000);

    expect(withCheckedBalances([printed, after], CHECK)).toEqual([
      printed,
      after,
    ]);
  });

  it("changes nothing without a check that added up", () => {
    const movements = [unprinted("2026-10-02", -100_000)];
    const off: ReportedBalanceCheck = {
      status: "off",
      reported: CHECK.reported,
      closingDate: CHECK.closingDate,
      differenceMinor: amount(5),
    };

    expect(withCheckedBalances(movements, off)).toBe(movements);
    expect(withCheckedBalances(movements, undefined)).toBe(movements);
  });
});
