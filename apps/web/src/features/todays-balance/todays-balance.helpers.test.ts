import {
  amountMinorSchema,
  localDateSchema,
  periodSchema,
  type ReportedBalanceCheck,
} from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import {
  answerOf,
  answerPill,
  checkedDayBalances,
  checkedNote,
  checkInPeriod,
  reachesToday,
} from "./todays-balance.helpers";

const day = (date: string) => localDateSchema.parse(date);
const amount = (value: number) => amountMinorSchema.parse(value);
const REPORTED = { date: day("2026-11-09"), amountMinor: amount(781_851_882) };
const ADDS_UP: ReportedBalanceCheck = {
  status: "adds_up",
  reported: REPORTED,
  closingDate: day("2026-09-30"),
  days: [
    {
      date: day("2026-10-02"),
      openingMinor: amount(900_000),
      closingMinor: amount(850_000),
    },
    {
      date: day("2026-11-09"),
      openingMinor: amount(850_000),
      closingMinor: amount(781_851_882),
    },
  ],
};
const OFF: ReportedBalanceCheck = {
  status: "off",
  reported: REPORTED,
  closingDate: day("2026-09-30"),
  differenceMinor: amount(-1_240_000),
};

describe("reachesToday", () => {
  it.each([
    ["2026-11-09", true],
    ["2026-11-08", true],
    ["2026-11-07", false],
    ["2026-10-31", false],
  ])("a file whose last movement is of %s: %s", (lastDay, reaches) => {
    expect(reachesToday(day(lastDay), day("2026-11-09"))).toBe(reaches);
  });

  it("counts yesterday across a month's end", () => {
    expect(reachesToday(day("2026-10-31"), day("2026-11-01"))).toBe(true);
  });
});

describe("what the field answers", () => {
  it("says a balance adds up, with the amount and day it was typed", () => {
    const answer = answerOf(ADDS_UP);

    expect(answer).toEqual({ status: "adds_up", ...REPORTED });
    expect(answerPill(answer)).toEqual({
      tone: "ok",
      title: "Cuadra con tu banco",
      detail: "$7.818.518,82 el 9 de noviembre",
    });
  });

  it("says by how much a balance is off, whichever way, and that a file may be missing", () => {
    const answer = answerOf(OFF);

    expect(answer).toEqual({ status: "off", differenceMinor: -1_240_000 });
    expect(answerPill(answer)).toEqual({
      tone: "attention",
      title: "No cuadra por $12.400",
      detail: "Puede faltar un archivo de movimientos.",
    });
  });
});

describe("the days a check speaks about", () => {
  const period = (from: string, to: string) => periodSchema.parse({ from, to });

  it.each([
    ["the quarter after the closing", "2026-10-01", "2026-12-31"],
    ["the month it was typed in", "2026-11-01", "2026-11-30"],
    ["a year that holds them", "2026-01-01", "2026-12-31"],
    ["ending the day after the closing", "2026-09-01", "2026-10-01"],
    ["starting on the day typed", "2026-11-09", "2026-11-30"],
  ])("meets %s", (_name, from, to) => {
    expect(checkInPeriod(ADDS_UP, period(from, to))).toBe(ADDS_UP);
  });

  it.each([
    ["a period that ends with the closing", "2026-07-01", "2026-09-30"],
    ["one after the day typed", "2026-11-10", "2026-12-31"],
  ])("leaves out %s", (_name, from, to) => {
    expect(checkInPeriod(ADDS_UP, period(from, to))).toBeUndefined();
  });

  it("has no check to show without one", () => {
    expect(
      checkInPeriod(undefined, period("2026-10-01", "2026-12-31")),
    ).toBeUndefined();
  });

  it("gives each day a check added up, none of one that's off", () => {
    expect([...checkedDayBalances(ADDS_UP)]).toEqual([
      ["2026-10-02", 850_000],
      ["2026-11-09", 781_851_882],
    ]);
    expect(checkedDayBalances(OFF).size).toBe(0);
    expect(checkedDayBalances(undefined).size).toBe(0);
  });

  it("says where the calculated balances start, only when they add up", () => {
    expect(checkedNote(ADDS_UP)).toBe(
      "Desde el 1 de octubre, el saldo es calculado y cuadra con el de tu banco.",
    );
    expect(checkedNote(OFF)).toBeUndefined();
    expect(checkedNote(undefined)).toBeUndefined();
  });
});
