import { describe, expect, expectTypeOf, it } from "vitest";
import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type { ExtractedContent, ParsedStatement, Result } from "@xtrakto/core";
import type { BankParser } from "./bank-parser.types";
import { createParserRegistry } from "./parser-registry.helpers";

// A test-only format: the first cell of the first sheet holds its signature.
// The registry only calls `canParse`, so `parse` never succeeds here.
const testParser = (id: string, signature: string): BankParser => ({
  id,
  bankId: "test-bank",
  canParse: (content) =>
    content.type === "spreadsheet" &&
    content.sheets[0]?.rows[0]?.[0] === signature,
  parse: () => err({ code: APP_ERROR_CODE.PARSE_FAILED }),
});

const spreadsheetStartingWith = (firstCell: string): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [
    {
      name: "Hoja1",
      rows: [[firstCell], ["1/07", "COMPRA EN TIENDA EJEMPLO", "-50,000.00"]],
    },
  ],
});

const statementParser = testParser("test-bank-statement", "ESTADO DE CUENTA");
const movementsParser = testParser("test-bank-movements", "MOVIMIENTOS");
const registry = createParserRegistry([statementParser, movementsParser]);
const unknownFormat = err({ code: APP_ERROR_CODE.UNKNOWN_FORMAT });

describe("createParserRegistry", () => {
  it.each([
    { signature: "ESTADO DE CUENTA", parser: statementParser },
    { signature: "MOVIMIENTOS", parser: movementsParser },
  ])("finds the parser that recognizes $signature", ({ signature, parser }) => {
    expect(registry.findParser(spreadsheetStartingWith(signature))).toEqual(
      ok(parser),
    );
  });

  it.each<{ label: string; content: ExtractedContent }>([
    {
      label: "an unknown spreadsheet",
      content: spreadsheetStartingWith("REPORTE DE VENTAS"),
    },
    {
      label: "an empty sheet",
      content: { type: "spreadsheet", sheets: [{ name: "Hoja1", rows: [] }] },
    },
    { label: "a PDF", content: { type: "pdf", pages: [{ items: [] }] } },
  ])("returns UNKNOWN_FORMAT for $label", ({ content }) => {
    expect(registry.findParser(content)).toEqual(unknownFormat);
  });

  it("returns UNKNOWN_FORMAT when no parser is registered", () => {
    const empty = createParserRegistry([]);

    expect(empty.findParser(spreadsheetStartingWith("MOVIMIENTOS"))).toEqual(
      unknownFormat,
    );
  });

  it("picks the first parser in registry order when several recognize the content", () => {
    const sameSignature = testParser("test-bank-movements-v2", "MOVIMIENTOS");
    const ordered = createParserRegistry([movementsParser, sameSignature]);

    expect(ordered.findParser(spreadsheetStartingWith("MOVIMIENTOS"))).toEqual(
      ok(movementsParser),
    );
  });

  it("rejects two parsers with the same id", () => {
    const sameId = testParser("test-bank-movements", "OTRO ENCABEZADO");

    expect(() => createParserRegistry([movementsParser, sameId])).toThrow(
      "Duplicate parser id: test-bank-movements",
    );
  });

  it("types parsers with the contract from core", () => {
    expectTypeOf<BankParser["canParse"]>()
      .parameter(0)
      .toEqualTypeOf<ExtractedContent>();
    expectTypeOf<BankParser["parse"]>().returns.toEqualTypeOf<
      Result<ParsedStatement>
    >();
    expectTypeOf(registry.findParser).returns.toEqualTypeOf<
      Result<BankParser>
    >();
  });
});
