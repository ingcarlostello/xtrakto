import { readFileSync } from "node:fs";
import {
  APP_ERROR_CODE,
  err,
  type ExtractedContent,
  extractedContentSchema,
  type FormatMapping,
  formatMappingSchema,
} from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { proveMapping } from "./format-mapping.helpers";

const FIXTURES = new URL(
  "../../../../../packages/parsers/fixtures/",
  import.meta.url,
);

// Invented banks' spreadsheets (Phase 11.1a), as they're extracted.
const fixture = (name: string): ExtractedContent =>
  extractedContentSchema.parse(
    JSON.parse(readFileSync(new URL(`${name}.json`, FIXTURES), "utf8")),
  );

// v8-14's "Banco Horizonte", as the person confirmed it.
const OUT_AND_IN: FormatMapping = formatMappingSchema.parse({
  header: ["FECHA TRANS", "DETALLE", "OFICINA", "DEBITOS", "CREDITOS", "SALDO"],
  columns: ["date", "description", "none", "money_out", "money_in", "balance"],
  dateOrder: "dmy",
  decimalSeparator: ",",
  bankId: "other",
});

const NO_BALANCE: FormatMapping = formatMappingSchema.parse({
  header: ["FECHA", "DETALLE", "DEBITOS", "CREDITOS"],
  columns: ["date", "description", "money_out", "money_in"],
  dateOrder: "dmy",
  decimalSeparator: ",",
  bankId: "other",
});

const HORIZONTE = fixture("mapped-out-in");

// Horizonte's first movement with another amount: its balances break.
const withMisprint = (content: ExtractedContent): ExtractedContent =>
  content.type === "spreadsheet"
    ? {
        ...content,
        sheets: content.sheets.map((sheet) => ({
          ...sheet,
          rows: sheet.rows.map((row, index) =>
            index === 8 ? row.with(3, "85.000,00") : row,
          ),
        })),
      }
    : content;

describe("proveMapping", () => {
  it("proves a mapping that reads its file and whose balances add up", () => {
    const proven = proveMapping(HORIZONTE, OUT_AND_IN);

    expect(proven).toMatchObject({ ok: true, value: { isVerified: true } });
    expect(proven.ok && proven.value.parser.bankId).toBe("other");
  });

  it("proves a mapping of a file without balances, which can't be verified", () => {
    expect(
      proveMapping(fixture("mapped-no-balance"), NO_BALANCE),
    ).toMatchObject({ ok: true, value: { isVerified: false } });
  });

  it("proves a mapping whose balances don't add up, without verifying it", () => {
    expect(proveMapping(withMisprint(HORIZONTE), OUT_AND_IN)).toMatchObject({
      ok: true,
      value: { isVerified: false },
    });
  });

  it("refuses a mapping of another header", () => {
    expect(proveMapping(fixture("mapped-no-balance"), OUT_AND_IN)).toEqual(
      err({ code: APP_ERROR_CODE.PARSE_FAILED, details: { reason: "header" } }),
    );
  });

  it("refuses a mapping that doesn't read its file, saying where", () => {
    const misread = formatMappingSchema.parse({
      ...OUT_AND_IN,
      dateOrder: "ymd",
    });

    expect(proveMapping(HORIZONTE, misread)).toMatchObject({
      ok: false,
      error: {
        code: "PARSE_FAILED",
        details: { row: 7, cause: "date_format" },
      },
    });
  });

  it("refuses content without a table to read", () => {
    const list: ExtractedContent = {
      type: "spreadsheet",
      sheets: [{ name: "", rows: [["Lista de mercado"], ["Arroz", "2"]] }],
    };

    expect(proveMapping(list, OUT_AND_IN)).toMatchObject({
      ok: false,
      error: { code: "UNKNOWN_FORMAT" },
    });
  });
});
