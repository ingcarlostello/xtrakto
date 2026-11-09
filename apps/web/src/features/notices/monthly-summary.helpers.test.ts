import {
  DEFAULT_TIME_ZONE,
  localDateFromInstant,
  localDateSchema,
  periodSchema,
} from "@xtrakto/core";
import type { AccountCoverage, MonthFile } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import { monthlyStatusOf, monthThatEnded } from "./monthly-summary.helpers";

const OCTOBER = { year: 2026, month: 10 };

const movements = (from: string, to: string): MonthFile => ({
  statementId: `${from}-${to}`,
  isQuarterly: false,
  period: periodSchema.parse({ from, to }),
});

const account = (
  accountId: string,
  ...files: readonly [string, MonthFile][]
): AccountCoverage => ({
  accountId,
  months: files.map(([month, file]) => ({
    month,
    files: [file],
    references: 0,
  })),
  quarters: [],
});

const WHOLE = movements("2026-10-01", "2026-10-31");
const HALF = movements("2026-10-01", "2026-10-15");
const SEPTEMBER = movements("2026-09-01", "2026-09-30");

describe("monthThatEnded", () => {
  it("is the month before", () => {
    expect(monthThatEnded(localDateSchema.parse("2026-11-01"))).toEqual(
      OCTOBER,
    );
  });

  it("goes back across a new year", () => {
    expect(monthThatEnded(localDateSchema.parse("2027-01-01"))).toEqual({
      year: 2026,
      month: 12,
    });
  });

  it.each([
    ["2026-11-01T04:59:59Z", { year: 2026, month: 9 }],
    ["2026-11-01T05:00:00Z", OCTOBER],
  ])("reads the month in Bogotá at %s", (instant, month) => {
    expect(
      monthThatEnded(
        localDateFromInstant(new Date(instant), DEFAULT_TIME_ZONE),
      ),
    ).toEqual(month);
  });
});

describe("monthlyStatusOf", () => {
  it("is ready with an account that has the month through its last day", () => {
    expect(
      monthlyStatusOf([account("a1", ["2026-10", WHOLE])], OCTOBER),
    ).toEqual({ kind: "ready", accountId: "a1" });
  });

  it("names the account that has it, among several", () => {
    expect(
      monthlyStatusOf(
        [account("a1", ["2026-10", HALF]), account("a2", ["2026-10", WHOLE])],
        OCTOBER,
      ),
    ).toEqual({ kind: "ready", accountId: "a2" });
  });

  it("is partial when no account reaches its last day", () => {
    expect(
      monthlyStatusOf([account("a1", ["2026-10", HALF])], OCTOBER),
    ).toEqual({
      kind: "partial",
    });
  });

  it("is missing without a movement of it, or without accounts", () => {
    expect(
      monthlyStatusOf([account("a1", ["2026-09", SEPTEMBER])], OCTOBER),
    ).toEqual({ kind: "missing" });
    expect(monthlyStatusOf([], OCTOBER)).toEqual({ kind: "missing" });
  });
});
