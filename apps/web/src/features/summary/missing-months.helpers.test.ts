import {
  type CalendarMonth,
  localDateSchema,
  periodSchema,
} from "@xtrakto/core";
import type { AccountCoverage, AccountRow } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type {
  CoverageGaps,
  GapFile,
} from "@/components/coverage-timeline/coverage-gaps.helpers";
import { missingMonthsView, missingOf } from "./missing-months.helpers";

const month = (value: number, year = 2026): CalendarMonth => ({
  year,
  month: value,
});
const quarterly = (quarter: number, year = 2026): GapFile => ({
  kind: "quarterly",
  quarter: { year, quarter },
});
const movements = (...months: CalendarMonth[]): GapFile => ({
  kind: "movements",
  months,
});

const accountOf = (bankId: string): AccountRow => ({
  id: "a1",
  bankId,
  accountType: "savings",
  last4: null,
});
const BANCOLOMBIA = accountOf("bancolombia");

// The notice reads only what the account misses, and its bank.
const missing = (
  gaps: CoverageGaps,
  today = "2026-11-05",
  account = BANCOLOMBIA,
) =>
  missingMonthsView({
    missing: {
      segments: [],
      sentence: "Enero a marzo de 2026 completo y verificado.",
      gaps,
      today: localDateSchema.parse(today),
    },
    account,
  });

describe("missingMonthsView", () => {
  it("names a quarter that ended and its quarterly statement, as v8-13 does", () => {
    expect(
      missing({
        runs: [[month(4), month(5), month(6)]],
        files: [quarterly(2)],
      }),
    ).toEqual({
      title: "Te falta abril a junio",
      text: "Para ver el año completo, sube el extracto trimestral abr–jun.",
      action: "Subir abr–jun",
      segments: [],
      timelineLabel: "Enero a marzo de 2026 completo y verificado.",
    });
  });

  it("names every run and file, and goes to Subir for several", () => {
    const view = missing({
      runs: [[month(4), month(5), month(6)], [month(10)]],
      files: [quarterly(2), movements(month(10))],
    });

    expect(view?.title).toBe("Te falta abril a junio y octubre");
    expect(view?.text).toBe(
      "Para ver el año completo, sube el extracto trimestral abr–jun y los movimientos de octubre.",
    );
    expect(view?.action).toBe("Ir a Subir");
  });

  it("names two quarterly statements, and months apart one by one", () => {
    const view = missing({
      runs: [[month(2)], [month(4), month(5)], [month(7)]],
      files: [quarterly(1), quarterly(2), quarterly(3)],
    });

    expect(view?.title).toBe("Te falta febrero, abril, mayo y julio");
    expect(view?.text).toBe(
      "Para ver el año completo, sube los extractos trimestrales ene–mar, abr–jun y jul–sep.",
    );
  });

  it("names one month of movements by its name", () => {
    const view = missing({
      runs: [[month(10)]],
      files: [movements(month(10))],
    });

    expect(view?.text).toBe(
      "Para ver el año completo, sube los movimientos de octubre.",
    );
    expect(view?.action).toBe("Subir octubre");
  });

  it("names two months of movements by their short range", () => {
    const view = missing(
      {
        runs: [[month(10), month(11)]],
        files: [movements(month(10), month(11))],
      },
      "2026-12-10",
    );

    expect(view?.title).toBe("Te falta octubre y noviembre");
    expect(view?.text).toBe(
      "Para ver el año completo, sube los movimientos de octubre y noviembre.",
    );
    expect(view?.action).toBe("Subir oct–nov");
  });

  it("says the year of what isn't of this one", () => {
    const december = missing(
      { runs: [[month(11), month(12)]], files: [quarterly(4)] },
      "2027-01-10",
    );
    const acrossYears = missing(
      {
        runs: [[month(11, 2025), month(12, 2025), month(1)]],
        files: [quarterly(4, 2025), movements(month(1))],
      },
      "2026-02-10",
    );

    expect(december?.title).toBe("Te falta noviembre y diciembre de 2026");
    expect(december?.text).toBe(
      "Para ver el año completo, sube el extracto trimestral oct–dic 2026.",
    );
    expect(december?.action).toBe("Subir oct–dic 2026");
    expect(acrossYears?.title).toBe(
      "Te falta noviembre de 2025 a enero de 2026",
    );
  });

  it("asks another bank's account for its movements of those months, by its bank", () => {
    const gaps: CoverageGaps = {
      runs: [[month(4), month(5), month(6)]],
      files: [quarterly(2)],
    };
    const davivienda = missing(gaps, "2026-11-05", accountOf("davivienda"));
    const chosenOther = missing(gaps, "2026-11-05", accountOf("other"));

    expect(davivienda).toMatchObject({
      title: "Te falta abril a junio",
      text: "Para ver el año completo, sube tus movimientos de Davivienda de abril a junio.",
      action: "Ir a Subir",
    });
    expect(chosenOther?.text).toBe(
      "Para ver el año completo, sube tus movimientos de tu banco de abril a junio.",
    );
  });

  it("shows nothing when the account misses nothing", () => {
    expect(missingMonthsView({ account: BANCOLOMBIA })).toBeUndefined();
  });
});

describe("missingOf", () => {
  const april = periodSchema.parse({ from: "2026-03-31", to: "2026-06-30" });
  const quarterly = { statementId: "q2", isQuarterly: true, period: april };
  const octoberWeek = {
    statementId: "m10",
    isQuarterly: false,
    period: periodSchema.parse({ from: "2026-10-01", to: "2026-10-07" }),
  };
  // April to June, then October's first week: July to September missing.
  const ANA: AccountCoverage = {
    accountId: "a1",
    months: [
      { month: "2026-05", files: [quarterly], references: 0 },
      { month: "2026-10", files: [octoberWeek], references: 0 },
    ],
    quarters: [{ period: april, isChained: false }],
  };
  const OTHER: AccountCoverage = {
    accountId: "a2",
    months: [{ month: "2026-05", files: [quarterly], references: 0 }],
    quarters: [{ period: april, isChained: false }],
  };

  it("reads the page's account, through today", () => {
    const found = missingOf(
      [OTHER, ANA],
      "a1",
      localDateSchema.parse("2026-11-05"),
    );

    expect(found.missingMonths).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(found.missing?.gaps.files).toEqual([
      { kind: "quarterly", quarter: { year: 2026, quarter: 3 } },
    ]);
    expect(found.missing?.segments).toHaveLength(8);
    expect(found.missing?.sentence).toMatch(
      /^Abril a junio de 2026 completo y verificado\. Julio a septiembre no los tienes\./,
    );
  });

  it("misses nothing of an account without months", () => {
    expect(
      missingOf([OTHER], "a1", localDateSchema.parse("2026-11-05")),
    ).toEqual({
      missingMonths: [],
    });
  });
});
