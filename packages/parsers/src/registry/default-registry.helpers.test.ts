import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE, err } from "@xtrakto/core";
import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { fixtureContent, fixtureRows } from "../../fixtures/fixture.utils";
import movementsBasic from "../../fixtures/movements-basic.json";
import movementsOverlap from "../../fixtures/movements-overlap.json";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import quarterlyBrokenBalance from "../../fixtures/quarterly-broken-balance.json";
import quarterlyLarge from "../../fixtures/quarterly-large.json";
import quarterlyRepeatedHeader from "../../fixtures/quarterly-repeated-header.json";
import quarterlyYearRollover from "../../fixtures/quarterly-year-rollover.json";
import { DEFAULT_PARSERS, findParser } from "./default-registry.helpers";

const QUARTERLY = "bancolombia-savings-quarterly";
const EXPORT = "bancolombia-movements-export";

const spreadsheet = (rows: SpreadsheetCell[][]): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name: "Hoja1", rows }],
});

// A fixture's rows with some of them replaced, by index.
const withRows = (
  fixture: unknown,
  changes: Readonly<Record<number, SpreadsheetCell[]>>,
): ExtractedContent =>
  spreadsheet(
    fixtureRows(fixture).map((row, index) => changes[index] ?? [...row]),
  );

// quarterly-basic with its labels, headers and end marker written otherwise.
const QUARTERLY_RELABELED = withRows(quarterlyBasic, {
  1: ["informacion  cliente:"],
  2: ["cliente", "direccion", "ciudad"],
  5: ["INFORMACION GENERAL:"],
  6: ["Desde", "Hasta", "Tipo Cuenta", "Nro Cuenta", "Sucursal"],
  9: [" resumen: "],
  10: [
    "saldo anterior",
    "total abonos",
    "total cargos",
    "saldo actual",
    "saldo promedio",
    "cupo sugerido",
    "intereses",
    "retefuente",
  ],
  13: ["MOVIMIENTOS:"],
  14: ["Fecha", "Descripcion", "Sucursal", "Dcto.", "Valor", "Saldo"],
  48: [null, "Fin Estado De Cuenta"],
});

// movements-basic with its header written otherwise.
const EXPORT_RELABELED = withRows(movementsBasic, {
  0: ["FECHA", "descripcion", " Referencia ", "VALOR"],
});

const recognizedBy = (content: ExtractedContent) =>
  DEFAULT_PARSERS.filter((parser) => parser.canParse(content)).map(
    ({ id }) => id,
  );

describe("format detection", () => {
  it.each([
    { name: "quarterly-basic", fixture: quarterlyBasic, id: QUARTERLY },
    {
      name: "quarterly-year-rollover",
      fixture: quarterlyYearRollover,
      id: QUARTERLY,
    },
    {
      name: "quarterly-repeated-header",
      fixture: quarterlyRepeatedHeader,
      id: QUARTERLY,
    },
    {
      name: "quarterly-broken-balance",
      fixture: quarterlyBrokenBalance,
      id: QUARTERLY,
    },
    { name: "quarterly-large", fixture: quarterlyLarge, id: QUARTERLY },
    { name: "movements-basic", fixture: movementsBasic, id: EXPORT },
    { name: "movements-overlap", fixture: movementsOverlap, id: EXPORT },
  ])("recognizes $name with exactly one parser", ({ fixture, id }) => {
    const content = fixtureContent(fixture);

    expect(recognizedBy(content)).toEqual([id]);
    expect(findParser(content)).toMatchObject({ ok: true, value: { id } });
  });

  it.each([
    {
      name: "a quarterly statement",
      original: quarterlyBasic,
      relabeled: QUARTERLY_RELABELED,
      id: QUARTERLY,
    },
    {
      name: "a movements export",
      original: movementsBasic,
      relabeled: EXPORT_RELABELED,
      id: EXPORT,
    },
  ])(
    "recognizes and reads $name whatever the accents, case and spacing of its labels",
    ({ original, relabeled, id }) => {
      const parser = DEFAULT_PARSERS.find((candidate) => candidate.id === id);
      const expected = parser?.parse(fixtureContent(original));

      expect(recognizedBy(relabeled)).toEqual([id]);
      expect(expected).toMatchObject({ ok: true });
      expect(parser?.parse(relabeled)).toEqual(expected);
    },
  );

  it.each<{ label: string; content: ExtractedContent }>([
    {
      label: "a budget spreadsheet",
      content: spreadsheet([
        ["Mes", "Ingresos", "Gastos"],
        ["Enero", 3_200_000, 2_100_000],
      ]),
    },
    {
      label: "another bank's movements, without Referencia",
      content: spreadsheet([
        ["Fecha", "Descripción", "Valor", "Saldo"],
        [{ excelSerial: 46_296.25 }, "COMPRA", -10_000, 90_000],
      ]),
    },
    {
      label: "the export saved as CSV with semicolons, in one column",
      content: spreadsheet([
        ["Fecha;Descripción;Referencia;Valor"],
        ["1/10/2026;TRANSFERENCIAS A NEQUI;3001234567;-50000,00"],
      ]),
    },
    { label: "an empty sheet", content: spreadsheet([]) },
    {
      label: "a workbook without sheets",
      content: { type: "spreadsheet", sheets: [] },
    },
    { label: "a PDF", content: { type: "pdf", pages: [{ items: [] }] } },
  ])("reports $label as an unknown format", ({ content }) => {
    expect(recognizedBy(content)).toEqual([]);
    expect(findParser(content)).toEqual(
      err({ code: APP_ERROR_CODE.UNKNOWN_FORMAT }),
    );
  });
});
