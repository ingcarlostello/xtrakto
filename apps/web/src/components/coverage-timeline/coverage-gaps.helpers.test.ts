import {
  type CalendarMonth,
  localDateSchema,
  periodSchema,
} from "@xtrakto/core";
import type { AccountCoverage, MonthFile } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import { coverageGaps, monthsMissing } from "./coverage-gaps.helpers";
import type {
  CoverageSegment,
  CoverageStatus,
} from "./coverage-timeline.types";

const day = (date: string) => localDateSchema.parse(date);
const month = (value: number, year = 2026): CalendarMonth => ({
  year,
  month: value,
});

const STATUSES: Record<string, CoverageStatus> = {
  v: "verified",
  u: "unverified",
  "-": "missing",
};

// A timeline from its first month, one letter a month: "v" verified by a
// quarterly statement, "u" in movements alone, "-" missing.
const timeline = (first: CalendarMonth, months: string): CoverageSegment[] =>
  [...months].map((letter, index) => {
    const at = first.month - 1 + index;
    return {
      month: month((at % 12) + 1, first.year + Math.floor(at / 12)),
      label: "",
      status: STATUSES[letter] ?? "missing",
      isAlsoInMovements: false,
    };
  });

describe("coverageGaps", () => {
  it("asks for a quarter that ended in its quarterly statement", () => {
    // January to November 2026: April to June missing, and November, this
    // month, still going on.
    const gaps = coverageGaps(
      timeline(month(1), "vvv---vvvu-"),
      day("2026-11-05"),
    );

    expect(gaps).toEqual({
      runs: [[month(4), month(5), month(6)]],
      files: [{ kind: "quarterly", quarter: { year: 2026, quarter: 2 } }],
    });
  });

  it("asks for the months of the quarter that goes on in movements, which the bank still gives", () => {
    const gaps = coverageGaps(timeline(month(7), "vvv---"), day("2026-12-10"));

    expect(gaps).toEqual({
      runs: [[month(10), month(11)]],
      files: [{ kind: "movements", months: [month(10), month(11)] }],
    });
  });

  it("names every run, each with its file", () => {
    const gaps = coverageGaps(
      timeline(month(1), "vvv---vvv--"),
      day("2026-11-05"),
    );

    expect(gaps).toEqual({
      runs: [[month(4), month(5), month(6)], [month(10)]],
      files: [
        { kind: "quarterly", quarter: { year: 2026, quarter: 2 } },
        { kind: "movements", months: [month(10)] },
      ],
    });
  });

  it("asks once for a quarterly statement that brings months apart", () => {
    // July missing, August in movements, September missing.
    expect(
      coverageGaps(timeline(month(6), "v-u-uu"), day("2026-11-05"))?.files,
    ).toEqual([{ kind: "quarterly", quarter: { year: 2026, quarter: 3 } }]);
  });

  it("asks for December in its quarterly statement in January, and for January in movements in February", () => {
    const january = coverageGaps(
      timeline(month(10), "uu--"),
      day("2027-01-10"),
    );
    const february = coverageGaps(
      timeline(month(11), "uv--"),
      day("2027-02-10"),
    );

    expect(january).toEqual({
      runs: [[month(12)]],
      files: [{ kind: "quarterly", quarter: { year: 2026, quarter: 4 } }],
    });
    expect(february).toEqual({
      runs: [[month(1, 2027)]],
      files: [{ kind: "movements", months: [month(1, 2027)] }],
    });
  });

  it("misses nothing while only this month waits", () => {
    expect(
      coverageGaps(timeline(month(7), "vvvu-"), day("2026-11-05")),
    ).toBeUndefined();
    expect(coverageGaps([], day("2026-11-05"))).toBeUndefined();
  });
});

describe("monthsMissing", () => {
  const file = (from: string, to: string, isQuarterly: boolean): MonthFile => ({
    statementId: `${from}-${to}`,
    isQuarterly,
    period: periodSchema.parse({ from, to }),
  });
  const Q1 = file("2025-12-31", "2026-03-31", true);
  const Q3 = file("2026-06-30", "2026-09-30", true);

  it("finds the months between the first and the last that the account doesn't have", () => {
    const coverage: AccountCoverage = {
      accountId: "a1",
      months: [
        { month: "2026-02", files: [Q1], references: 0 },
        { month: "2026-08", files: [Q3], references: 0 },
        {
          month: "2026-11",
          files: [file("2026-11-01", "2026-11-07", false)],
          references: 0,
        },
      ],
      quarters: [
        { period: Q1.period, isChained: false },
        { period: Q3.period, isChained: false },
      ],
    };

    expect(monthsMissing(coverage)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-10",
    ]);
  });

  it("finds none without months", () => {
    expect(
      monthsMissing({ accountId: "a1", months: [], quarters: [] }),
    ).toEqual([]);
  });
});
