import { describe, expect, it } from "vitest";
import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { fixtureContent, fixtureRows } from "../../fixtures/fixture.utils";
import movementsBasic from "../../fixtures/movements-basic.json";
import movementsOverlap from "../../fixtures/movements-overlap.json";
import { findParser } from "../registry/default-registry.helpers";
import type { SheetRows } from "../sheets/sheet.utils";
import { minimizeMovementsExport } from "./movements-export-minimize.helpers";
import { bancolombiaMovementsExportParser } from "./movements-export-parser.helpers";

const FIXTURES = {
  "movements-basic": movementsBasic,
  "movements-overlap": movementsOverlap,
};

// Columns of the fixtures' header: Fecha, Descripción, Referencia, Valor.
const DESCRIPTION = 1;
const REFERENCE = 2;
const FIRST_MOVEMENT = 1;

const { parse } = bancolombiaMovementsExportParser;

const spreadsheet = (
  rows: SpreadsheetCell[][],
  otherSheets: { name: string; rows: SpreadsheetCell[][] }[] = [],
): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name: "Hoja1", rows }, ...otherSheets],
});

const rowsOf = (content: ExtractedContent): SheetRows =>
  content.type === "spreadsheet" ? (content.sheets[0]?.rows ?? []) : [];

const basicRows = (): SpreadsheetCell[][] =>
  fixtureRows(movementsBasic).map((row) => [...row]);

// movements-basic with its first movement changed.
const withFirstMovement = (
  change: (row: SpreadsheetCell[]) => SpreadsheetCell[],
): ExtractedContent =>
  spreadsheet(
    basicRows().map((row, index) =>
      index === FIRST_MOVEMENT ? change(row) : row,
    ),
  );

describe("minimizeMovementsExport", () => {
  it.each(Object.entries(FIXTURES))(
    "keeps the format and the parse of %s",
    (_name, fixture) => {
      const content = fixtureContent(fixture);
      const minimized = minimizeMovementsExport(content);

      expect(findParser(minimized)).toEqual(findParser(content));
      expect(parse(minimized)).toEqual(parse(content));
    },
  );

  it.each(Object.entries(FIXTURES))(
    "gives %s the same result when run twice",
    (_name, fixture) => {
      const minimized = minimizeMovementsExport(fixtureContent(fixture));

      expect(minimizeMovementsExport(minimized)).toEqual(minimized);
    },
  );

  it("keeps every reference whole, since the server hashes them", () => {
    const original = fixtureRows(movementsBasic);
    const minimized = rowsOf(
      minimizeMovementsExport(fixtureContent(movementsBasic)),
    );

    expect(minimized.map((row) => row[REFERENCE] ?? null)).toEqual(
      original.map((row) => row[REFERENCE] ?? null),
    );
  });

  it("masks long numbers in descriptions", () => {
    const content = withFirstMovement((row) =>
      row.with(DESCRIPTION, "INTERES INV VIRT 10000000001"),
    );

    expect(
      rowsOf(minimizeMovementsExport(content))[FIRST_MOVEMENT]?.[DESCRIPTION],
    ).toBe("INTERES INV VIRT *******0001");
  });

  it("drops cells outside the four columns it reads, and keeps the header", () => {
    const content = withFirstMovement((row) => [...row, "nota 1234567890"]);
    const minimized = rowsOf(minimizeMovementsExport(content));

    expect(minimized[FIRST_MOVEMENT]).toHaveLength(4);
    expect(minimized[0]).toEqual(fixtureRows(movementsBasic)[0]);
  });

  it("leaves a row with nothing where the parser reads as it is, so it still fails", () => {
    const content = withFirstMovement(() => [null, null, null, null, "suelto"]);
    const minimized = minimizeMovementsExport(content);

    expect(rowsOf(minimized)[FIRST_MOVEMENT]).toEqual([
      null,
      null,
      null,
      null,
      "suelto",
    ]);
    expect(parse(minimized)).toEqual(parse(content));
    expect(parse(content).ok).toBe(false);
  });

  it("keeps one sheet, without its name", () => {
    const content = spreadsheet(basicRows(), [
      { name: "Notas", rows: [["Mi celular 3001234567"]] },
    ]);
    const minimized = minimizeMovementsExport(content);

    expect(
      minimized.type === "spreadsheet" &&
        minimized.sheets.map((sheet) => sheet.name),
    ).toEqual([""]);
  });
});
