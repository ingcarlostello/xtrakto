import { localDateSchema, periodSchema } from "@xtrakto/core";
import type {
  AccountCoverage,
  AccountRow,
  CoverageMonth,
  MonthFile,
} from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import {
  coverageViewOf,
  coverageViews,
  hasWholeMonth,
  monthsHad,
  timelineMonths,
  verifiedLegend,
} from "./coverage-timeline.helpers";

const day = (date: string) => localDateSchema.parse(date);

const file = (from: string, to: string, isQuarterly: boolean): MonthFile => ({
  statementId: `${isQuarterly ? "q" : "m"}-${from}-${to}`,
  isQuarterly,
  period: periodSchema.parse({ from, to }),
});

const quarterly = (from: string, to: string) => file(from, to, true);
const movements = (from: string, to: string) => file(from, to, false);

const month = (
  key: string,
  files: readonly MonthFile[],
  references = 0,
): CoverageMonth => ({ month: key, files, references });

const Q1 = quarterly("2025-12-31", "2026-03-31");
const Q2 = quarterly("2026-03-31", "2026-06-30");
const Q3 = quarterly("2026-06-30", "2026-09-30");

// docs/ui/v8-07: January to September in chained quarterly statements,
// August also in two movements files, October only in one.
const ANA: AccountCoverage = {
  accountId: "a1",
  months: [
    month("2026-01", [Q1]),
    month("2026-02", [Q1]),
    month("2026-03", [Q1]),
    month("2026-04", [Q2]),
    month("2026-05", [Q2]),
    month("2026-06", [Q2]),
    month("2026-07", [Q3]),
    month(
      "2026-08",
      [
        Q3,
        movements("2026-08-01", "2026-08-15"),
        movements("2026-08-10", "2026-08-31"),
      ],
      12,
    ),
    month("2026-09", [Q3]),
    month("2026-10", [movements("2026-10-01", "2026-10-08")]),
  ],
  quarters: [
    { period: Q1.period, isChained: false },
    { period: Q2.period, isChained: true },
    { period: Q3.period, isChained: true },
  ],
};

describe("timelineMonths", () => {
  it("runs from the account's first month with movements through this one", () => {
    expect(timelineMonths(["2026-08"], day("2026-11-05"))).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
    ]);
  });

  it("shows twelve months at most, across a year", () => {
    const shown = timelineMonths(["2025-01", "2026-02"], day("2026-03-10"));

    expect(shown).toHaveLength(12);
    expect(shown[0]).toEqual({ year: 2025, month: 4 });
    expect(shown.at(-1)).toEqual({ year: 2026, month: 3 });
  });

  it("reaches a later month with movements, and shows none without them", () => {
    expect(timelineMonths(["2026-11", "2027-01"], day("2026-12-20"))).toEqual([
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
    expect(timelineMonths([], day("2026-12-20"))).toEqual([]);
  });
});

describe("coverageViewOf", () => {
  it("reads v8's months: verified, also in movements, without balance, and what they say", () => {
    const view = coverageViewOf(ANA, day("2026-10-20"));

    expect(
      view.segments.map(({ label, status, isAlsoInMovements }) => [
        label,
        status,
        isAlsoInMovements,
      ]),
    ).toEqual([
      ["ene", "verified", false],
      ["feb", "verified", false],
      ["mar", "verified", false],
      ["abr", "verified", false],
      ["may", "verified", false],
      ["jun", "verified", false],
      ["jul", "verified", false],
      ["ago", "verified", true],
      ["sep", "verified", false],
      ["oct", "unverified", false],
    ]);
    expect(view).toMatchObject({
      accountId: "a1",
      sentence:
        "Enero a septiembre de 2026 completo y verificado. Octubre va en movimientos, sin saldo todavía.",
      isChained: true,
      note: "Agosto lo subiste también en 2 archivos de movimientos con fechas que se cruzan (1–15 y 10–31). Los juntamos sin duplicar y les agregamos 12 referencias.",
    });
  });

  it("reads a month its quarterly statement covers as verified, without movements in it", () => {
    const quiet = {
      ...ANA,
      months: ANA.months.filter(({ month: key }) => key !== "2026-05"),
    };

    expect(coverageViewOf(quiet, day("2026-10-20")).segments[4]).toMatchObject({
      label: "may",
      status: "verified",
    });
  });

  it("isn't chained when a quarter doesn't start where the one before ended, or with one quarter", () => {
    const broken = {
      ...ANA,
      quarters: ANA.quarters.map((quarter, index) =>
        index === 2 ? { ...quarter, isChained: false } : quarter,
      ),
    };
    const one = {
      ...ANA,
      months: ANA.months.slice(6),
      quarters: ANA.quarters.slice(2),
    };

    expect(coverageViewOf(broken, day("2026-10-20")).isChained).toBe(false);
    expect(coverageViewOf(one, day("2026-10-20")).isChained).toBe(false);
  });

  it("counts only the quarters whose months the timeline shows", () => {
    // Q1 ends before the twelve months; Q2 and Q3 chain.
    const view = coverageViewOf(
      {
        ...ANA,
        quarters: [
          { period: Q1.period, isChained: false },
          { period: Q2.period, isChained: false },
          { period: Q3.period, isChained: true },
        ],
      },
      day("2027-05-10"),
    );

    expect(view.segments[0]?.month).toEqual({ year: 2026, month: 6 });
    expect(view.isChained).toBe(true);
  });
});

describe("monthsHad", () => {
  it("counts the months verified quarterly statements cover and those movements files brought", () => {
    const quiet = {
      ...ANA,
      months: ANA.months.filter(({ month: key }) => key !== "2026-05"),
    };

    expect([...monthsHad(quiet)].sort()).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  it("leaves out a month only a quarterly statement's movements brought, without its days", () => {
    expect(
      monthsHad({
        accountId: "a1",
        months: [month("2026-04", [Q2])],
        quarters: [],
      }),
    ).toEqual(new Set());
  });
});

describe("coverageViews", () => {
  const account = (id: string, last4: string): AccountRow => ({
    id,
    bankId: "bancolombia",
    accountType: "savings",
    last4,
  });

  it("follows the accounts' order, naming each when there are several, and leaves out one without months", () => {
    const views = coverageViews(
      [
        { ...ANA, accountId: "a2" },
        ANA,
        { accountId: "a3", months: [], quarters: [] },
      ],
      [account("a1", "8901"), account("a2", "2109"), account("a3", "5555")],
      day("2026-10-20"),
    );

    expect(
      views.map(({ accountId, accountLabel }) => [accountId, accountLabel]),
    ).toEqual([
      ["a1", "Cuenta de ahorros ••••8901"],
      ["a2", "Cuenta de ahorros ••••2109"],
    ]);
  });

  it("names no account when the user has one", () => {
    const [view] = coverageViews(
      [ANA],
      [account("a1", "8901")],
      day("2026-10-20"),
    );

    expect(view?.accountLabel).toBeUndefined();
  });

  it("says which account is another bank's", () => {
    const views = coverageViews(
      [ANA, { ...ANA, accountId: "a2" }],
      [account("a1", "8901"), { ...account("a2", ""), bankId: "davivienda" }],
      day("2026-10-20"),
    );

    expect(views.map(({ isOtherBank }) => isOtherBank)).toEqual([false, true]);
  });
});

describe("verifiedLegend", () => {
  const ours = { isOtherBank: false };
  const theirs = { isOtherBank: true };

  it("names what verifies the months of the accounts shown", () => {
    expect(verifiedLegend([ours])).toBe("Extracto trimestral, verificado");
    expect(verifiedLegend([theirs])).toBe("Archivo con saldos, verificado");
    expect(verifiedLegend([ours, theirs])).toBe(
      "Extracto trimestral o archivo con saldos, verificado",
    );
  });
});

describe("hasWholeMonth", () => {
  const OCTOBER = { year: 2026, month: 10 };
  const of = (
    months: readonly CoverageMonth[],
    quarters: AccountCoverage["quarters"] = [],
  ): AccountCoverage => ({ accountId: "a1", months, quarters });

  it("takes a month a verified quarterly statement covers", () => {
    const quarter = {
      period: periodSchema.parse({ from: "2026-09-30", to: "2026-12-31" }),
      isChained: false,
    };

    expect(hasWholeMonth(of([], [quarter]), OCTOBER)).toBe(true);
  });

  it("takes a month a movements file reaches the last day of", () => {
    expect(
      hasWholeMonth(
        of([month("2026-10", [movements("2026-10-01", "2026-10-31")])]),
        OCTOBER,
      ),
    ).toBe(true);
  });

  it("takes a file that goes on past the month", () => {
    expect(
      hasWholeMonth(
        of([month("2026-10", [movements("2026-10-10", "2026-11-04")])]),
        OCTOBER,
      ),
    ).toBe(true);
  });

  it("leaves out one that stops before it, and a month it doesn't have", () => {
    expect(
      hasWholeMonth(
        of([month("2026-10", [movements("2026-10-01", "2026-10-15")])]),
        OCTOBER,
      ),
    ).toBe(false);
    expect(
      hasWholeMonth(
        of([month("2026-09", [movements("2026-09-01", "2026-09-30")])]),
        OCTOBER,
      ),
    ).toBe(false);
  });

  it("leaves out a quarterly statement that doesn't reconcile, whatever its days", () => {
    expect(
      hasWholeMonth(
        of([month("2026-10", [quarterly("2026-09-30", "2026-12-31")])]),
        OCTOBER,
      ),
    ).toBe(false);
  });
});
