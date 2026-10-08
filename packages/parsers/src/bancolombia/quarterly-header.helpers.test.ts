import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type { SpreadsheetCell } from "@xtrakto/core";
import { fixtureRows } from "../../fixtures/fixture.utils";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import quarterlyBrokenBalance from "../../fixtures/quarterly-broken-balance.json";
import quarterlyRepeatedHeader from "../../fixtures/quarterly-repeated-header.json";
import quarterlyYearRollover from "../../fixtures/quarterly-year-rollover.json";
import type { SheetRows } from "../sheets/sheet.utils";
import { QUARTERLY_BLOCK } from "./bancolombia.constants";
import { readQuarterlyHeader } from "./quarterly-header.helpers";

const { CLIENT, GENERAL, SUMMARY } = QUARTERLY_BLOCK;

const BASIC = fixtureRows(quarterlyBasic);

// Invented values, as generated in scripts/fixture-data.mjs.
const BASIC_HEADER = {
  holderName: "ANA MARIA PRUEBA GOMEZ",
  period: { from: "2026-06-30", to: "2026-09-30" },
  accountType: "savings",
  accountLast4: "8901",
  openingBalanceMinor: 245_000_000,
  closingBalanceMinor: 781_851_882,
  totals: {
    creditsMinor: 1_071_951_882,
    debitsMinor: 535_100_000,
    interestMinor: 1_882,
    withholdingMinor: 0,
    averageBalanceMinor: 513_425_900,
  },
};

const rowOf = (label: string): number =>
  BASIC.findIndex((row) => row[0] === label);

// Position of a column in a block's header row.
const columnOf = (block: string, column: string): number =>
  (BASIC[rowOf(block) + 1] ?? []).indexOf(column);

const replaceCell = (
  row: number,
  column: number,
  value: SpreadsheetCell,
): SheetRows => BASIC.with(row, (BASIC[row] ?? []).with(column, value));

// The basic statement with one value of a block replaced.
const withValue = (
  block: string,
  column: string,
  value: SpreadsheetCell,
): SheetRows => replaceCell(rowOf(block) + 2, columnOf(block, column), value);

// The basic statement with one header name of a block replaced.
const withHeaderName = (block: string, column: string, name: string) =>
  replaceCell(rowOf(block) + 1, columnOf(block, column), name);

const without = (label: string): SheetRows =>
  BASIC.filter((row) => row[0] !== label);

const failed = (details: object) =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details });

describe("readQuarterlyHeader", () => {
  it("reads the holder, period, account and summary, with TOTAL CARGOS positive as printed", () => {
    expect(readQuarterlyHeader(BASIC)).toEqual(ok(BASIC_HEADER));
  });

  it("reads a period that ends in the next year", () => {
    expect(
      readQuarterlyHeader(fixtureRows(quarterlyYearRollover)),
    ).toMatchObject({
      ok: true,
      value: { period: { from: "2026-12-31", to: "2027-03-31" } },
    });
  });

  it.each([
    { name: "quarterly-repeated-header", fixture: quarterlyRepeatedHeader },
    { name: "quarterly-broken-balance", fixture: quarterlyBrokenBalance },
  ])("reads the same header from $name", ({ fixture }) => {
    expect(readQuarterlyHeader(fixtureRows(fixture))).toEqual(ok(BASIC_HEADER));
  });

  it("finds each block by its label wherever it is", () => {
    const moved = [...BASIC.slice(1, 5), [], [], ...BASIC.slice(5)];

    expect(readQuarterlyHeader(moved)).toEqual(ok(BASIC_HEADER));
  });

  it("reads a summary without CUPO SUGERIDO", () => {
    const header = rowOf(SUMMARY) + 1;
    const index = columnOf(SUMMARY, "CUPO SUGERIDO");
    const rows = BASIC.map((row, current) =>
      current === header || current === header + 1
        ? row.toSpliced(index, 1)
        : row,
    );

    expect(readQuarterlyHeader(rows)).toEqual(ok(BASIC_HEADER));
  });

  it("never outputs the address, the city or the full account number", () => {
    const output = JSON.stringify(readQuarterlyHeader(BASIC));

    for (const hidden of ["calle falsa", "MEDELLIN", "12345678901"]) {
      expect(output).not.toContain(hidden);
    }
  });

  it.each([
    {
      label: "the client block is missing",
      rows: without(CLIENT),
      details: { reason: "missing_block", block: CLIENT },
    },
    {
      label: "the general block is missing",
      rows: without(GENERAL),
      details: { reason: "missing_block", block: GENERAL },
    },
    {
      label: "the summary block is missing",
      rows: without(SUMMARY),
      details: { reason: "missing_block", block: SUMMARY },
    },
    {
      label: "the summary lacks TOTAL CARGOS",
      rows: withHeaderName(SUMMARY, "TOTAL CARGOS", "TOTAL"),
      details: {
        reason: "missing_column",
        block: SUMMARY,
        column: "TOTAL CARGOS",
      },
    },
    {
      label: "the summary label is the last row",
      rows: BASIC.slice(0, rowOf(SUMMARY) + 1),
      details: {
        reason: "missing_column",
        block: SUMMARY,
        column: "SALDO ANTERIOR",
      },
    },
    {
      label: "the summary has no values row",
      rows: BASIC.slice(0, rowOf(SUMMARY) + 2),
      details: {
        reason: "missing_value",
        block: SUMMARY,
        column: "SALDO ANTERIOR",
      },
    },
    {
      label: "the holder's name is empty",
      rows: withValue(CLIENT, "CLIENTE", null),
      details: { reason: "missing_value", block: CLIENT, column: "CLIENTE" },
    },
    {
      label: "an amount uses a decimal comma",
      rows: withValue(SUMMARY, "SALDO ACTUAL", "7.818.518,82"),
      details: {
        reason: "invalid_value",
        block: SUMMARY,
        column: "SALDO ACTUAL",
        cause: "format",
      },
    },
    {
      label: "a date uses dashes",
      rows: withValue(GENERAL, "DESDE", "2026-06-30"),
      details: {
        reason: "invalid_value",
        block: GENERAL,
        column: "DESDE",
        cause: "format",
      },
    },
    {
      label: "the period starts after it ends",
      rows: withValue(GENERAL, "DESDE", "2026/10/01"),
      details: { reason: "invalid_period", block: GENERAL },
    },
    {
      label: "the account is a checking account",
      rows: withValue(GENERAL, "TIPO CUENTA", "CUENTA CORRIENTE"),
      details: {
        reason: "unsupported_account_type",
        block: GENERAL,
        column: "TIPO CUENTA",
      },
    },
    {
      label: "the account number has a dash",
      rows: withValue(GENERAL, "NRO CUENTA", "1234-5678"),
      details: {
        reason: "invalid_value",
        block: GENERAL,
        column: "NRO CUENTA",
      },
    },
    {
      label: "the account number is too short",
      rows: withValue(GENERAL, "NRO CUENTA", "123"),
      details: {
        reason: "invalid_value",
        block: GENERAL,
        column: "NRO CUENTA",
      },
    },
    {
      label: "the account number is a number cell",
      rows: withValue(GENERAL, "NRO CUENTA", 12_345_678_901),
      details: {
        reason: "missing_value",
        block: GENERAL,
        column: "NRO CUENTA",
      },
    },
  ])("fails when $label", ({ rows, details }) => {
    expect(readQuarterlyHeader(rows)).toEqual(failed(details));
  });

  it("keeps the cell's text out of the error", () => {
    const output = JSON.stringify(
      readQuarterlyHeader(withValue(GENERAL, "NRO CUENTA", "9876-5432")),
    );

    expect(output).not.toContain("9876");
  });
});
