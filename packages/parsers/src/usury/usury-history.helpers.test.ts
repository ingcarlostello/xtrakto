import type { SpreadsheetCell } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { asSingleSheet } from "../sheets/sheet.utils";
import { readUsuryHistory } from "./usury-history.helpers";

// An Excel serial of a day, as the history stores its dates.
const serial = (date: string): number => {
  const [year = 0, month = 0, day = 0] = date.split("-").map(Number);
  return (Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86_400_000;
};
const USURY = "TASA DE USURA\n1.5 veces el Interés Bancario Corriente";
const IBC = "INTERÉS BANCARIO CORRIENTE";

// An invented history in the Superintendencia Financiera's layout: an older
// block of other modalities, then consumer and ordinary credit's, first
// by quarter, then by month, with a row marking another modality's quarter,
// then a newer block of seven modalities, and the notes under them.
const rows = (changes: { from?: number; usury?: SpreadsheetCell } = {}) => [
  [null, null, "INTERÉS ANUAL EFECTIVO"],
  [null, null, "COMERCIAL", null, "CONSUMO", null],
  ["DESDE", "HASTA", IBC, USURY, IBC, USURY],
  [serial("2006-01-01"), serial("2006-03-31"), 0.15, 0.225, 0.16, 0.24],
  [],
  ["VIGENCIA", null, "INTERÉS ANUAL EFECTIVO"],
  [null, null, "CRÉDITO DE CONSUMO Y ORDINARIO", null, "MICROCRÉDITO"],
  ["DESDE", "HASTA", IBC, USURY, IBC, USURY],
  [serial("2007-04-01"), serial("2007-06-30"), 0.1675, 0.2512, 0.2, 0.3],
  [
    { excelSerial: changes.from ?? serial("2026-08-01") },
    { excelSerial: serial("2026-08-31") },
    0.1977,
    changes.usury === undefined ? 0.2966 : changes.usury,
  ],
  [serial("2026-07-01"), serial("2026-09-30"), " ", " "],
  [serial("2026-09-01"), serial("2026-09-30"), 0.1949, 0.2924],
  [serial("2026-10-01"), serial("2026-10-31"), 0.1906, 0.2859],
  [],
  ["VIGENCIA", null, "INTERÉS ANUAL EFECTIVO"],
  [null, null, "CRÉDITO DE CONSUMO Y ORDINARIO", null, "CONSUMO DE BAJO MONTO"],
  ["DESDE", "HASTA", IBC, USURY, IBC, USURY],
  [serial("2026-09-01"), serial("2026-09-30"), 0.195, 0.2925, 0.4, 0.6],
  [serial("2026-11-01"), serial("2026-11-30"), 0.1889, 0.2834, 0.446, 0.669],
  [],
  [
    "Para crédito de consumo y ordinario, la información corresponde a las 4 semanas anteriores.",
  ],
];

const historyOf = (changes?: Parameters<typeof rows>[0]) =>
  readUsuryHistory(asSingleSheet(rows(changes)));

describe("readUsuryHistory", () => {
  it("reads each month's usury rate of consumer credit, a quarter's for its months, the later row's for a month given twice", () => {
    expect(historyOf()).toEqual({
      ok: true,
      value: [
        { month: "2007-04-01", rateEaPpm: 251_200 },
        { month: "2007-05-01", rateEaPpm: 251_200 },
        { month: "2007-06-01", rateEaPpm: 251_200 },
        { month: "2026-08-01", rateEaPpm: 296_600 },
        { month: "2026-09-01", rateEaPpm: 292_500 },
        { month: "2026-10-01", rateEaPpm: 285_900 },
        { month: "2026-11-01", rateEaPpm: 283_400 },
      ],
    });
  });

  it("reads a history whose cells are text, as a CSV writes them", () => {
    const asText = rows().map((row) =>
      row.map((cell) => (typeof cell === "number" ? String(cell) : cell)),
    );

    expect(readUsuryHistory(asSingleSheet(asText))).toMatchObject({
      ok: true,
      value: expect.arrayContaining([
        { month: "2026-11-01", rateEaPpm: 283_400 },
      ]),
    });
  });

  it("says where a date or a rate doesn't read, never its value", () => {
    expect(historyOf({ from: serial("2026-08-02") })).toMatchObject({
      ok: false,
      error: {
        code: "PARSE_FAILED",
        details: { reason: "invalid_value", column: "DESDE", row: 9 },
      },
    });
    expect(historyOf({ usury: 12 })).toMatchObject({
      ok: false,
      error: { details: { reason: "invalid_value", column: "TASA DE USURA" } },
    });
  });

  it("fails without consumer credit's block, or without its usury rate", () => {
    const withoutBlock = rows().map((row) =>
      row.map((cell) =>
        cell === "CRÉDITO DE CONSUMO Y ORDINARIO" ? "CONSUMO" : cell,
      ),
    );
    expect(readUsuryHistory(asSingleSheet(withoutBlock))).toMatchObject({
      ok: false,
      error: { details: { reason: "missing_block" } },
    });
    const withoutUsury = rows().map((row) =>
      row.map((cell) => (cell === USURY ? "OTRA" : cell)),
    );
    expect(readUsuryHistory(asSingleSheet(withoutUsury))).toMatchObject({
      ok: false,
      error: { details: { reason: "missing_column" } },
    });
    expect(readUsuryHistory({ type: "pdf", pages: [] })).toMatchObject({
      ok: false,
      error: { details: { reason: "content_type" } },
    });
  });
});
