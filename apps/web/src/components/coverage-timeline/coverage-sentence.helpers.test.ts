import { periodSchema } from "@xtrakto/core";
import type { CoverageMonth, MonthFile } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import { coverageSentence, overlapNote } from "./coverage-sentence.helpers";
import type {
  CoverageSegment,
  CoverageStatus,
} from "./coverage-timeline.types";

const segment = (
  year: number,
  month: number,
  status: CoverageStatus,
): CoverageSegment => ({
  month: { year, month },
  label: "",
  status,
  isAlsoInMovements: false,
});

const NOVEMBER = { year: 2026, month: 11 };

describe("coverageSentence", () => {
  it("says each run of months, with the year where it first shows or changes", () => {
    const segments = [
      segment(2025, 11, "verified"),
      segment(2025, 12, "verified"),
      segment(2026, 1, "verified"),
      segment(2026, 2, "missing"),
      segment(2026, 3, "missing"),
      segment(2026, 4, "unverified"),
      segment(2026, 5, "missing"),
      segment(2026, 6, "missing"),
      segment(2026, 7, "missing"),
    ];

    expect(coverageSentence(segments, { year: 2026, month: 7 })).toBe(
      "Noviembre de 2025 a enero de 2026 completo y verificado. Febrero y marzo no los tienes. Abril está en movimientos, sin saldo para verificar. Mayo a julio no los tienes todavía.",
    );
  });

  it("says this month and the ones before it in the plural, still to come", () => {
    const segments = [
      segment(2026, 8, "missing"),
      segment(2026, 9, "verified"),
      segment(2026, 10, "unverified"),
      segment(2026, 11, "unverified"),
    ];

    expect(coverageSentence(segments, NOVEMBER)).toBe(
      "Agosto de 2026 no lo tienes. Septiembre completo y verificado. Octubre y noviembre van en movimientos, sin saldo todavía.",
    );
  });

  it("says a month missing now is still to come", () => {
    expect(
      coverageSentence(
        [segment(2026, 10, "unverified"), segment(2026, 11, "missing")],
        NOVEMBER,
      ),
    ).toBe(
      "Octubre de 2026 está en movimientos, sin saldo para verificar. Noviembre no lo tienes todavía.",
    );
  });
});

const movements = (from: string, to: string): MonthFile => ({
  statementId: `${from}-${to}`,
  isQuarterly: false,
  period: periodSchema.parse({ from, to }),
});

const QUARTER: MonthFile = {
  statementId: "q",
  isQuarterly: true,
  period: periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" }),
};

const month = (
  key: string,
  files: readonly MonthFile[],
  references = 0,
): CoverageMonth => ({ month: key, files, references });

describe("overlapNote", () => {
  it("names a month several overlapping movements files brought, their days within it, and the references", () => {
    const august = month(
      "2026-08",
      [
        QUARTER,
        movements("2026-07-25", "2026-08-05"),
        movements("2026-08-05", "2026-08-05"),
        movements("2026-08-15", "2026-09-10"),
        movements("2026-08-01", "2026-08-20"),
      ],
      1,
    );

    expect(overlapNote([august], NOVEMBER)).toBe(
      "Agosto lo subiste también en 4 archivos de movimientos con fechas que se cruzan (1–5, 1–20, 5 y 15–31). Los juntamos sin duplicar y les agregamos 1 referencia.",
    );
  });

  it("says nothing of files whose days don't meet, nor of one file", () => {
    expect(
      overlapNote(
        [
          month("2026-08", [
            movements("2026-08-01", "2026-08-15"),
            movements("2026-08-16", "2026-08-31"),
          ]),
          month("2026-09", [QUARTER, movements("2026-09-01", "2026-09-30")]),
        ],
        NOVEMBER,
      ),
    ).toBeUndefined();
  });

  it("takes the latest such month, without a quarterly statement or references, with its year when it isn't this one's", () => {
    const overlapping = (key: string) =>
      month(key, [
        movements(`${key}-01`, `${key}-10`),
        movements(`${key}-05`, `${key}-20`),
      ]);

    expect(
      overlapNote([overlapping("2025-11"), overlapping("2025-12")], {
        year: 2026,
        month: 1,
      }),
    ).toBe(
      "Diciembre de 2025 lo subiste en 2 archivos de movimientos con fechas que se cruzan (1–10 y 5–20). Los juntamos sin duplicar.",
    );
  });
});
