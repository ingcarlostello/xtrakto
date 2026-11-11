import { periodSchema } from "@xtrakto/core";
import type { UnreconciledStatement } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import {
  quarterChoices,
  selectPagePeriod,
  selectPeriod,
  yearChoices,
} from "./period-choices.helpers";
import type { QuarterChoice } from "./period-controls.types";

const QUARTERS: QuarterChoice[] = [
  { year: 2026, quarter: 3, status: "verified" },
  { year: 2026, quarter: 2, status: "unverified" },
];
const AUGUST: MovementPeriod = { kind: "month", year: 2026, month: 8 };

describe("selectPeriod", () => {
  it("shows the period asked when its quarter has movements", () => {
    expect(selectPeriod(AUGUST, QUARTERS)).toEqual(AUGUST);
  });

  it.each([
    ["no period", undefined],
    [
      "a quarter without movements",
      { kind: "quarter", year: 2025, quarter: 4 },
    ],
    ["a month of such a quarter", { kind: "month", year: 2026, month: 11 }],
  ] as const)("shows the latest quarter for %s", (_, requested) => {
    expect(selectPeriod(requested, QUARTERS)).toEqual({
      kind: "quarter",
      year: 2026,
      quarter: 3,
    });
  });

  it("shows nothing for an account without quarters", () => {
    expect(selectPeriod(AUGUST, [])).toBeUndefined();
  });
});

describe("selectPagePeriod", () => {
  it("shows a year the account has quarters in, or a quarter as selectPeriod does", () => {
    expect(selectPagePeriod({ kind: "year", year: 2026 }, QUARTERS)).toEqual({
      kind: "year",
      year: 2026,
    });
    expect(selectPagePeriod(AUGUST, QUARTERS)).toEqual(AUGUST);
  });

  it("shows the latest quarter for a year without quarters", () => {
    expect(selectPagePeriod({ kind: "year", year: 2025 }, QUARTERS)).toEqual({
      kind: "quarter",
      year: 2026,
      quarter: 3,
    });
    expect(selectPagePeriod({ kind: "year", year: 2026 }, [])).toBeUndefined();
  });
});

describe("yearChoices", () => {
  it("gives the quarters' years, the latest first, each with the months the account has in it", () => {
    expect(
      yearChoices(
        [
          { year: 2026, quarter: 1 },
          { year: 2025, quarter: 4 },
          { year: 2026, quarter: 2 },
        ],
        new Set(["2025-10", "2025-12", "2026-01", "2026-02", "2026-06"]),
      ),
    ).toEqual([
      { year: 2026, months: 3 },
      { year: 2025, months: 2 },
    ]);
  });
});

describe("quarterChoices", () => {
  const unreconciled = (from: string, to: string): UnreconciledStatement => ({
    id: "s1",
    accountId: "a1",
    bankId: "bancolombia",
    period: periodSchema.parse({ from, to }),
    differenceMinor: null,
  });

  it("adds the quarter of a statement that doesn't reconcile, marking it before anything else", () => {
    expect(
      quarterChoices(
        [
          { year: 2026, quarter: 3, verified: false },
          { year: 2026, quarter: 1, verified: true },
        ],
        [
          unreconciled("2026-06-30", "2026-09-30"),
          unreconciled("2026-03-31", "2026-06-30"),
        ],
      ),
    ).toEqual([
      { year: 2026, quarter: 3, status: "unreconciled" },
      { year: 2026, quarter: 2, status: "unreconciled" },
      { year: 2026, quarter: 1, status: "verified" },
    ]);
  });
});
