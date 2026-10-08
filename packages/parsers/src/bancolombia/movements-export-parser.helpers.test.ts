import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE, err } from "@xtrakto/core";
import type {
  ExtractedContent,
  ParsedStatement,
  ParsedTransaction,
  SpreadsheetCell,
} from "@xtrakto/core";
import { fixtureContent, fixtureRows } from "../../fixtures/fixture.utils";
import movementsBasic from "../../fixtures/movements-basic.json";
import movementsOverlap from "../../fixtures/movements-overlap.json";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import { reconcile } from "../reconciliation/reconciliation.helpers";
import type { BankParser } from "../registry/bank-parser.types";
import { bancolombiaMovementsExportParser } from "./movements-export-parser.helpers";
import { bancolombiaQuarterlyParser } from "./quarterly-parser.helpers";

// Mutable copies, to build variations of the basic export.
const BASIC_ROWS = fixtureRows(movementsBasic).map((row) => [...row]);
const HEADER = BASIC_ROWS[0] ?? [];

const spreadsheet = (rows: SpreadsheetCell[][]): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name: "Hoja1", rows }],
});

const PDF: ExtractedContent = { type: "pdf", pages: [{ items: [] }] };

const failed = (details: object) =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details });

const parsed = (parser: BankParser, fixture: unknown): ParsedStatement => {
  const result = parser.parse(fixtureContent(fixture));
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

// Movements as deduplication compares them: what they say and how much.
const descriptionsAndAmounts = (transactions: readonly ParsedTransaction[]) =>
  transactions
    .map(({ descriptionNormalized, amountMinor }) =>
      [descriptionNormalized, amountMinor].join(" "),
    )
    .toSorted();

const { canParse, parse } = bancolombiaMovementsExportParser;

describe("bancolombiaMovementsExportParser.parse", () => {
  it.each([
    { name: "movements-basic", fixture: movementsBasic },
    { name: "movements-overlap", fixture: movementsOverlap },
  ])("parses $name", ({ fixture }) => {
    expect(parse(fixtureContent(fixture))).toMatchObject({ ok: true });
  });

  it("reads an export without an account or balances, its period spanning the movements", () => {
    const { transactions, ...statement } = parsed(
      bancolombiaMovementsExportParser,
      movementsBasic,
    );

    expect(statement).toEqual({
      bankId: "bancolombia",
      formatId: "bancolombia-movements-export",
      accountType: "savings",
      currency: "COP",
      period: { from: "2026-10-01", to: "2026-10-07" },
      periodSource: "rows",
      warnings: [],
    });
    expect(transactions).toHaveLength(17);
  });

  it("can't be reconciled: it prints no balances", () => {
    const statement = parsed(bancolombiaMovementsExportParser, movementsBasic);

    expect(reconcile(statement)).toEqual({
      balanceVerified: false,
      issues: [{ code: "NO_BALANCE_DATA" }],
    });
  });

  it("reads the same movements as the quarterly statement for the same month", () => {
    const quarter = parsed(bancolombiaQuarterlyParser, quarterlyBasic);
    const july = quarter.transactions.filter(({ date }) =>
      date.startsWith("2026-07"),
    );
    const exported = parsed(bancolombiaMovementsExportParser, movementsOverlap);

    expect(descriptionsAndAmounts(exported.transactions)).toEqual(
      descriptionsAndAmounts(july),
    );
  });

  it.each([
    {
      label: "the content isn't a spreadsheet",
      content: PDF,
      details: { reason: "content_type" },
    },
    {
      label: "the content is another format",
      content: fixtureContent(quarterlyBasic),
      details: { reason: "missing_column", column: "Fecha" },
    },
    {
      label: "the export has no movements",
      content: spreadsheet([[...HEADER]]),
      details: { reason: "no_movements" },
    },
    {
      label: "a description is longer than a cell may be",
      content: spreadsheet(
        BASIC_ROWS.with(1, (BASIC_ROWS[1] ?? []).with(1, "A".repeat(600))),
      ),
      details: { reason: "invalid_output" },
    },
  ])("fails when $label", ({ content, details }) => {
    expect(parse(content)).toEqual(failed(details));
  });
});

describe("bancolombiaMovementsExportParser.canParse", () => {
  it.each([
    { name: "movements-basic", fixture: movementsBasic },
    { name: "movements-overlap", fixture: movementsOverlap },
  ])("recognizes $name", ({ fixture }) => {
    expect(canParse(fixtureContent(fixture))).toBe(true);
  });

  it.each([
    { label: "a quarterly statement", content: fixtureContent(quarterlyBasic) },
    { label: "a PDF", content: PDF },
    { label: "an empty sheet", content: spreadsheet([]) },
    {
      label: "a header without Valor",
      content: spreadsheet([HEADER.slice(0, 3)]),
    },
  ])("doesn't recognize $label", ({ content }) => {
    expect(canParse(content)).toBe(false);
  });
});
