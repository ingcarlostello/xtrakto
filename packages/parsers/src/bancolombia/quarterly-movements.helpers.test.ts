import { describe, expect, it } from "vitest";
import {
  APP_ERROR_CODE,
  err,
  extractedContentSchema,
  ok,
  PARSE_WARNING_CODE,
  periodSchema,
} from "@xtrakto/core";
import type { ParsedTransaction, SpreadsheetCell } from "@xtrakto/core";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import quarterlyBrokenBalance from "../../fixtures/quarterly-broken-balance.json";
import quarterlyLarge from "../../fixtures/quarterly-large.json";
import quarterlyRepeatedHeader from "../../fixtures/quarterly-repeated-header.json";
import quarterlyYearRollover from "../../fixtures/quarterly-year-rollover.json";
import type { SheetRows } from "../sheets/sheet.utils";
import { readQuarterlyMovements } from "./quarterly-movements.helpers";

// A fixture's first sheet, checked against the extracted content schema.
const rowsOf = (fixture: unknown): SheetRows => {
  const content = extractedContentSchema.parse(fixture);
  return content.type === "spreadsheet" ? (content.sheets[0]?.rows ?? []) : [];
};

// Invented values, as generated in scripts/fixture-data.mjs.
const QUARTER = periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" });
const BASIC = rowsOf(quarterlyBasic);
const BLOCK = "Movimientos:";
const FIRST_MOVEMENT = 15;
const END_ROW = 48;

const movementsOf = (rows: SheetRows, period = QUARTER) => {
  const result = readQuarterlyMovements(rows, period);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

const BASIC_MOVEMENTS = movementsOf(BASIC);

const movementAt = (sourceRow: number) =>
  BASIC_MOVEMENTS.transactions.find(
    (movement) => movement.sourceRow === sourceRow,
  );

// Each balance must be the previous one plus the movement's amount.
const expectChainedBalances = (
  movements: readonly ParsedTransaction[],
  opening: number,
) => {
  let balance = opening;
  for (const { amountMinor, balanceAfterMinor } of movements) {
    balance += amountMinor;
    expect(balanceAfterMinor).toBe(balance);
  }
};

const withCell = (row: number, column: number, value: SpreadsheetCell) =>
  BASIC.with(row, (BASIC[row] ?? []).with(column, value));

// The blocks a new page repeats, as in quarterly-repeated-header.
const PAGE_HEADER = [...BASIC.slice(1, 9), ...BASIC.slice(13, 15)];

const failed = (details: object) =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details });

describe("readQuarterlyMovements", () => {
  it("reads every movement until the end marker", () => {
    const { transactions, warnings } = BASIC_MOVEMENTS;

    expect(transactions).toHaveLength(33);
    expect(transactions[0]).toEqual({
      date: "2026-07-01",
      descriptionRaw: "ABONO INTERESES AHORROS",
      descriptionNormalized: "ABONO INTERESES AHORROS",
      amountMinor: 289,
      balanceAfterMinor: 245_000_289,
      sourceRow: FIRST_MOVEMENT,
    });
    expect(transactions.at(-1)).toMatchObject({
      date: "2026-09-30",
      amountMinor: 520,
      balanceAfterMinor: 781_851_882,
      sourceRow: END_ROW - 1,
    });
    expect(warnings).toEqual([]);
  });

  it("reads amounts and balances to the cent, below one peso too", () => {
    expectChainedBalances(BASIC_MOVEMENTS.transactions, 245_000_000);
    expect(movementAt(22)?.amountMinor).toBe(85);
  });

  it("keeps the bank's spacing and case in the raw description and collapses spaces in the normalized one", () => {
    expect(movementAt(20)).toMatchObject({
      descriptionRaw: "COMPRA EN  TIENDA LA ESQUI",
      descriptionNormalized: "COMPRA EN TIENDA LA ESQUI",
    });
    expect(movementAt(17)).toMatchObject({
      descriptionRaw: "PAGO PSE Banco Ejemplo S",
      descriptionNormalized: "PAGO PSE Banco Ejemplo S",
    });
  });

  it("masks the account number in an investment's description", () => {
    expect(movementAt(40)).toMatchObject({
      descriptionRaw: "INTERES INV VIRT *******0001",
      descriptionNormalized: "INTERES INV VIRT *******0001",
    });
    expect(JSON.stringify(BASIC_MOVEMENTS)).not.toContain("10000000001");
  });

  it("takes each date's year from the period, across the new year", () => {
    const rollover = periodSchema.parse({
      from: "2026-12-31",
      to: "2027-03-31",
    });
    const { transactions } = movementsOf(
      rowsOf(quarterlyYearRollover),
      rollover,
    );

    expect(transactions.map(({ date }) => date)).toEqual([
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-10",
      "2027-02-14",
      "2027-02-28",
      "2027-03-31",
    ]);
  });

  it("skips the blocks each new page repeats", () => {
    const { transactions, warnings } = movementsOf(
      rowsOf(quarterlyRepeatedHeader),
    );
    const withoutRows = (movements: readonly ParsedTransaction[]) =>
      movements.map((movement) => ({ ...movement, sourceRow: 0 }));

    expect(withoutRows(transactions)).toEqual(
      withoutRows(BASIC_MOVEMENTS.transactions),
    );
    expect(warnings).toEqual([]);
  });

  it("reads a large quarter split into pages", () => {
    const { transactions, warnings } = movementsOf(rowsOf(quarterlyLarge));

    expect(transactions).toHaveLength(465);
    expectChainedBalances(transactions, 500_000_000);
    expect(warnings).toEqual([]);
  });

  it("keeps a misprinted amount as printed", () => {
    const { transactions } = movementsOf(rowsOf(quarterlyBrokenBalance));

    expect(
      transactions.find(({ sourceRow }) => sourceRow === 20),
    ).toMatchObject({
      amountMinor: -4_509_000,
      balanceAfterMinor: 218_410_560,
    });
  });

  it("warns about an unexpected row and keeps reading", () => {
    const stray = ["SUBTOTAL", null, null, null, "1,000.00"];
    const { transactions, warnings } = movementsOf(
      BASIC.toSpliced(21, 0, stray),
    );

    expect(transactions).toHaveLength(33);
    expect(warnings).toEqual([
      { code: PARSE_WARNING_CODE.UNEXPECTED_ROW, sourceRow: 21 },
    ]);
  });

  it("skips a repeated movements header without a warning", () => {
    const header = BASIC[FIRST_MOVEMENT - 1] ?? [];
    const { transactions, warnings } = movementsOf(
      BASIC.toSpliced(21, 0, header),
    );

    expect(transactions).toHaveLength(33);
    expect(warnings).toEqual([]);
  });

  it.each([
    { label: "a whole page header", header: PAGE_HEADER },
    { label: "half a page header", header: PAGE_HEADER.slice(0, 8) },
  ])("finds the end marker right after $label", ({ header }) => {
    const rows = BASIC.toSpliced(END_ROW, 0, ...header);

    expect(movementsOf(rows).transactions).toHaveLength(33);
  });

  it("ignores rows after the end marker", () => {
    const rows = [...BASIC, BASIC[FIRST_MOVEMENT] ?? []];

    expect(movementsOf(rows).transactions).toHaveLength(33);
  });

  it("reads a statement without movements", () => {
    const rows = [...BASIC.slice(0, FIRST_MOVEMENT), BASIC[END_ROW] ?? []];

    expect(readQuarterlyMovements(rows, QUARTER)).toEqual(
      ok({ transactions: [], warnings: [] }),
    );
  });

  it.each([
    {
      label: "the movements block is missing",
      rows: BASIC.filter((row) => row[0] !== BLOCK),
      details: { reason: "missing_block", block: BLOCK },
    },
    {
      label: "the header lacks VALOR",
      rows: withCell(FIRST_MOVEMENT - 1, 4, "MONTO"),
      details: { reason: "missing_column", block: BLOCK, column: "VALOR" },
    },
    {
      label: "the end marker is missing",
      rows: BASIC.slice(0, END_ROW),
      details: { reason: "missing_end", block: BLOCK },
    },
    {
      label: "a movement appears among a page's repeated blocks",
      rows: BASIC.toSpliced(21, 0, ...PAGE_HEADER.slice(0, 5), ["1/08"]),
      details: { reason: "incomplete_page_header", block: BLOCK, row: 26 },
    },
    {
      label: "an amount uses a decimal comma",
      rows: withCell(16, 4, "-20.000,00"),
      details: {
        reason: "invalid_value",
        block: BLOCK,
        column: "VALOR",
        row: 16,
        cause: "format",
      },
    },
    {
      label: "a balance can't be read",
      rows: withCell(16, 5, "SALDO"),
      details: {
        reason: "invalid_value",
        block: BLOCK,
        column: "SALDO",
        row: 16,
        cause: "format",
      },
    },
    {
      label: "a date falls outside the period",
      rows: withCell(16, 0, "15/11"),
      details: {
        reason: "invalid_value",
        block: BLOCK,
        column: "FECHA",
        row: 16,
        cause: "out_of_period",
      },
    },
    {
      label: "a date doesn't exist",
      rows: withCell(16, 0, "31/02"),
      details: {
        reason: "invalid_value",
        block: BLOCK,
        column: "FECHA",
        row: 16,
        cause: "format",
      },
    },
    {
      label: "a date is a number cell",
      rows: withCell(16, 0, 46_204),
      details: {
        reason: "missing_value",
        block: BLOCK,
        column: "FECHA",
        row: 16,
      },
    },
    {
      label: "a description is empty",
      rows: withCell(16, 1, null),
      details: {
        reason: "missing_value",
        block: BLOCK,
        column: "DESCRIPCIÓN",
        row: 16,
      },
    },
  ])("fails when $label", ({ rows, details }) => {
    expect(readQuarterlyMovements(rows, QUARTER)).toEqual(failed(details));
  });
});
