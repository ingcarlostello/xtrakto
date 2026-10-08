import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE, err } from "@xtrakto/core";
import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { fixtureContent, fixtureRows } from "../../fixtures/fixture.utils";
import movementsBasic from "../../fixtures/movements-basic.json";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import quarterlyBrokenBalance from "../../fixtures/quarterly-broken-balance.json";
import quarterlyLarge from "../../fixtures/quarterly-large.json";
import quarterlyRepeatedHeader from "../../fixtures/quarterly-repeated-header.json";
import quarterlyYearRollover from "../../fixtures/quarterly-year-rollover.json";
import { bancolombiaQuarterlyParser } from "./quarterly-parser.helpers";

const QUARTERLY_FIXTURES = Object.entries({
  "quarterly-basic": quarterlyBasic,
  "quarterly-year-rollover": quarterlyYearRollover,
  "quarterly-repeated-header": quarterlyRepeatedHeader,
  "quarterly-broken-balance": quarterlyBrokenBalance,
  "quarterly-large": quarterlyLarge,
});

// Mutable copies, to build variations of the basic statement.
const BASIC_ROWS = fixtureRows(quarterlyBasic).map((row) => [...row]);

const spreadsheet = (rows: SpreadsheetCell[][]): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name: "Hoja1", rows }],
});

const PDF: ExtractedContent = { type: "pdf", pages: [{ items: [] }] };

const failed = (details: object) =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details });

const { canParse, parse } = bancolombiaQuarterlyParser;

describe("bancolombiaQuarterlyParser.parse", () => {
  it.each(QUARTERLY_FIXTURES)("parses %s", (_name, fixture) => {
    expect(parse(fixtureContent(fixture))).toMatchObject({ ok: true });
  });

  it("reads a whole statement: identity, period, balances and movements", () => {
    const result = parse(fixtureContent(quarterlyBasic));

    expect(result).toMatchObject({
      ok: true,
      value: {
        bankId: "bancolombia",
        formatId: "bancolombia-savings-quarterly",
        accountType: "savings",
        accountLast4: "8901",
        currency: "COP",
        period: { from: "2026-06-30", to: "2026-09-30" },
        periodSource: "statement",
        openingBalanceMinor: 245_000_000,
        closingBalanceMinor: 781_851_882,
        holderName: "ANA MARIA PRUEBA GOMEZ",
        warnings: [],
      },
    });
    expect(result.ok && result.value.transactions).toHaveLength(33);
  });

  it("never outputs the address, the city or a full account number", () => {
    const output = JSON.stringify(parse(fixtureContent(quarterlyBasic)));

    for (const hidden of [
      "calle falsa",
      "MEDELLIN",
      "12345678901",
      "10000000001",
    ]) {
      expect(output).not.toContain(hidden);
    }
  });

  it("rejects content that isn't a spreadsheet", () => {
    expect(parse(PDF)).toEqual(failed({ reason: "content_type" }));
  });

  it.each([
    {
      label: "the summary is missing",
      rows: BASIC_ROWS.filter((row) => row[0] !== "Resumen:"),
      details: { reason: "missing_block", block: "Resumen:" },
    },
    {
      label: "the end marker is missing",
      rows: BASIC_ROWS.slice(0, 48),
      details: { reason: "missing_end", block: "Movimientos:" },
    },
    {
      label: "a description is longer than a cell may be",
      rows: BASIC_ROWS.with(
        16,
        (BASIC_ROWS[16] ?? []).with(1, "A".repeat(600)),
      ),
      details: { reason: "invalid_output" },
    },
  ])("fails when $label", ({ rows, details }) => {
    expect(parse(spreadsheet(rows))).toEqual(failed(details));
  });
});

describe("bancolombiaQuarterlyParser.canParse", () => {
  it.each(QUARTERLY_FIXTURES)("recognizes %s", (_name, fixture) => {
    expect(canParse(fixtureContent(fixture))).toBe(true);
  });

  it.each([
    { label: "a movements export", content: fixtureContent(movementsBasic) },
    { label: "a PDF", content: PDF },
    { label: "an empty sheet", content: spreadsheet([]) },
  ])("doesn't recognize $label", ({ content }) => {
    expect(canParse(content)).toBe(false);
  });
});
