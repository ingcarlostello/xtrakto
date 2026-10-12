import { describe, expect, it } from "vitest";
import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { fixtureContent, fixtureRows } from "../../fixtures/fixture.utils";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import quarterlyBrokenBalance from "../../fixtures/quarterly-broken-balance.json";
import quarterlyLarge from "../../fixtures/quarterly-large.json";
import quarterlyRepeatedHeader from "../../fixtures/quarterly-repeated-header.json";
import quarterlyYearRollover from "../../fixtures/quarterly-year-rollover.json";
import { findParser } from "../registry/default-registry.helpers";
import type { SheetRows } from "../sheets/sheet.utils";
import { minimizeQuarterly } from "./quarterly-minimize.helpers";
import { bancolombiaQuarterlyParser } from "./quarterly-parser.helpers";

const FIXTURES = {
  "quarterly-basic": quarterlyBasic,
  "quarterly-year-rollover": quarterlyYearRollover,
  "quarterly-repeated-header": quarterlyRepeatedHeader,
  "quarterly-broken-balance": quarterlyBrokenBalance,
  "quarterly-large": quarterlyLarge,
};

// Invented values from scripts/fixture-data.mjs that must not leave the browser.
const ADDRESS = "calle falsa #12-34 apto 101";
const CITY = "MEDELLIN (ANTIOQUIA)  ANTI";
const BRANCH = "SUCURSAL CENTRO";
const ACCOUNT_NUMBER = "12345678901";
const HOLDER = "ANA MARIA PRUEBA GOMEZ";
const LONG_NUMBER = /\d{6,}/;

// Rows of quarterly-basic (see the fixture).
const ACCOUNT_ROW = 7;
const SUMMARY_ROW = 11;
const SPLIT_ROW = 17;
const CHANNEL_ROW = 18;
const SUGGESTED_CREDIT_LINE = 5;
// Columns of its movements: FECHA, DESCRIPCIÓN, SUCURSAL, DCTO., VALOR, SALDO.
const BRANCH_COLUMN = 2;
const DOCUMENT_COLUMN = 3;

const { parse } = bancolombiaQuarterlyParser;

const spreadsheet = (
  rows: SpreadsheetCell[][],
  otherSheets: { name: string; rows: SpreadsheetCell[][] }[] = [],
): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name: "Hoja1", rows }, ...otherSheets],
});

const rowsOf = (content: ExtractedContent): SheetRows =>
  content.type === "spreadsheet" ? (content.sheets[0]?.rows ?? []) : [];

// quarterly-basic with one row replaced.
const basicWithRow = (index: number, row: SpreadsheetCell[]) =>
  spreadsheet(
    fixtureRows(quarterlyBasic).map((current, at) =>
      at === index ? row : [...current],
    ),
  );

describe("minimizeQuarterly", () => {
  it.each(Object.entries(FIXTURES))(
    "keeps the format and the parse of %s",
    (_name, fixture) => {
      const content = fixtureContent(fixture);
      const minimized = minimizeQuarterly(content);

      expect(findParser(minimized)).toEqual(findParser(content));
      expect(parse(minimized)).toEqual(parse(content));
    },
  );

  it.each(Object.entries(FIXTURES))(
    "gives %s the same result when run twice",
    (_name, fixture) => {
      const minimized = minimizeQuarterly(fixtureContent(fixture));

      expect(minimizeQuarterly(minimized)).toEqual(minimized);
    },
  );

  it.each(Object.entries(FIXTURES))(
    "leaves no address, city, branch or long number in %s",
    (_name, fixture) => {
      const text = JSON.stringify(minimizeQuarterly(fixtureContent(fixture)));

      for (const value of [ADDRESS, CITY, BRANCH, ACCOUNT_NUMBER])
        expect(text).not.toContain(value);
      expect(text).not.toMatch(LONG_NUMBER);
    },
  );

  it("cleans every block a page repeats, keeping the account's last 4 digits", () => {
    const rows = rowsOf(
      minimizeQuarterly(fixtureContent(quarterlyRepeatedHeader)),
    );
    const accountRows = rows.filter((row) => row[2] === "CUENTA DE AHORROS");
    const holderRows = rows.filter((row) => row[0] === HOLDER);

    expect(accountRows.length).toBeGreaterThan(1);
    for (const row of accountRows)
      expect(row).toEqual([
        "2026/06/30",
        "2026/09/30",
        "CUENTA DE AHORROS",
        "8901",
      ]);
    expect(holderRows).toEqual(accountRows.map(() => [HOLDER]));
  });

  it("keeps the summary's amounts but not the suggested credit line", () => {
    const original = fixtureRows(quarterlyBasic)[SUMMARY_ROW] ?? [];
    const minimized =
      rowsOf(minimizeQuarterly(fixtureContent(quarterlyBasic)))[SUMMARY_ROW] ??
      [];

    expect(minimized).toEqual(
      original.map((cell, index) =>
        index === SUGGESTED_CREDIT_LINE ? null : cell,
      ),
    );
  });

  it("keeps one sheet, without its name", () => {
    const content = spreadsheet(
      fixtureRows(quarterlyBasic).map((r) => [...r]),
      [{ name: "Notas", rows: [["Calle de mi casa 123"]] }],
    );
    const minimized = minimizeQuarterly(content);

    expect(
      minimized.type === "spreadsheet" &&
        minimized.sheets.map((sheet) => sheet.name),
    ).toEqual([""]);
  });

  it("keeps a movement's date, description and amounts, without SUCURSAL or DCTO.", () => {
    const original = fixtureRows(quarterlyBasic)[CHANNEL_ROW] ?? [];
    const content = basicWithRow(
      CHANNEL_ROW,
      original.with(DOCUMENT_COLUMN, "4521"),
    );
    const minimized = minimizeQuarterly(content);

    expect(original[BRANCH_COLUMN]).toBe("CANAL CORRESPONSA");
    expect(rowsOf(minimized)[CHANNEL_ROW]).toEqual(
      original.map((cell, index) =>
        index === BRANCH_COLUMN || index === DOCUMENT_COLUMN ? null : cell,
      ),
    );
    expect(parse(minimized)).toEqual(parse(content));
  });

  it("follows a split description's tail to the amounts, masking the tail and dropping what it moves", () => {
    const content = basicWithRow(SPLIT_ROW, [
      "1/07",
      "PAGO PSE Ejemplo Compa",
      "¡a de Finan 1234567890",
      "VIRTUAL",
      "4521",
      "-350,000.00",
      "2,080,002.89",
    ]);
    const minimized = minimizeQuarterly(content);

    expect(rowsOf(minimized)[SPLIT_ROW]).toEqual([
      "1/07",
      "PAGO PSE Ejemplo Compa",
      "¡a de Finan ******7890",
      null,
      null,
      "-350,000.00",
      "2,080,002.89",
    ]);
    expect(parse(minimized)).toEqual(parse(content));
  });

  it("leaves a block's next rows alone when they aren't its header and values", () => {
    const content = spreadsheet([
      ["Información Cliente:"],
      ["OTRO", "ENCABEZADO"],
      ["calle falsa 1", "ciudad"],
    ]);

    expect(rowsOf(minimizeQuarterly(content))).toEqual(rowsOf(content));
  });

  it.each([
    { kind: "text that isn't only digits", cell: "CTA 12345678901" },
    { kind: "a number cell", cell: 12345678901 },
  ])(
    "keeps the parse error of an account number written as $kind, without the number",
    ({ cell }) => {
      const original = fixtureRows(quarterlyBasic)[ACCOUNT_ROW] ?? [];
      const content = basicWithRow(
        ACCOUNT_ROW,
        original.map((value, index) => (index === 3 ? cell : value)),
      );
      const minimized = minimizeQuarterly(content);

      expect(parse(minimized)).toEqual(parse(content));
      expect(parse(content).ok).toBe(false);
      expect(JSON.stringify(minimized)).not.toMatch(LONG_NUMBER);
    },
  );

  it("returns other content as it is", () => {
    const pdf: ExtractedContent = { type: "pdf", pages: [{ items: [] }] };

    expect(minimizeQuarterly(pdf)).toBe(pdf);
  });
});
