import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { fixtureContent } from "../../fixtures/fixture.utils";
import mappedDirection from "../../fixtures/mapped-direction.json";
import mappedNewestFirst from "../../fixtures/mapped-newest-first.json";
import mappedNoBalance from "../../fixtures/mapped-no-balance.json";
import mappedOutIn from "../../fixtures/mapped-out-in.json";
import mappedTitleRows from "../../fixtures/mapped-title-rows.json";
import { findTable, headerNames } from "./mapping-table.helpers";

const spreadsheet = (rows: SpreadsheetCell[][]): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name: "Hoja1", rows }],
});

const noTable = err({
  code: APP_ERROR_CODE.UNKNOWN_FORMAT,
  details: { reason: "no_table" },
});

const MOVEMENT = ["02/09/2026", "COMPRA POS SUPERMERCADO", "85.400,00"];

describe("findTable", () => {
  it.each([
    {
      name: "mapped-out-in",
      fixture: mappedOutIn,
      headerRow: 6,
      header: [
        "FECHA TRANS",
        "DETALLE",
        "OFICINA",
        "DEBITOS",
        "CREDITOS",
        "SALDO",
      ],
    },
    {
      name: "mapped-newest-first",
      fixture: mappedNewestFirst,
      headerRow: 2,
      header: [
        "FECHA TRANSACCION",
        "CONCEPTO",
        "REFERENCIA",
        "MONTO",
        "SALDO DISPONIBLE",
      ],
    },
    {
      name: "mapped-direction",
      fixture: mappedDirection,
      headerRow: 0,
      header: ["FECHA", "DESCRIPCION", "TIPO", "VALOR", "SALDO"],
    },
    {
      name: "mapped-no-balance",
      fixture: mappedNoBalance,
      headerRow: 2,
      header: ["FECHA", "DETALLE", "DEBITOS", "CREDITOS"],
    },
    {
      name: "mapped-title-rows",
      fixture: mappedTitleRows,
      headerRow: 3,
      header: [
        "FECHA",
        "FECHA VALOR",
        "DESCRIPCION",
        "DOCUMENTO",
        "VALOR",
        "SALDO",
      ],
    },
  ])(
    "finds the header of $name, over its first movement",
    ({ fixture, headerRow, header }) => {
      expect(findTable(fixtureContent(fixture))).toEqual(
        ok({ headerRow, header, dateColumn: 0 }),
      );
    },
  );

  it("skips a title row that holds a date and an amount", () => {
    const content = spreadsheet([
      ["BANCO DEL RIO"],
      ["Fecha de corte", "30/09/2026", "Saldo", "2.874.150,00"],
      ["Fecha", "Detalle", "Valor"],
      MOVEMENT,
    ]);

    expect(findTable(content)).toEqual(
      ok({
        headerRow: 2,
        header: ["FECHA", "DETALLE", "VALOR"],
        dateColumn: 0,
      }),
    );
  });

  it("says which column its first movement dates", () => {
    const content = spreadsheet([
      ["Detalle", "Oficina", "Fecha", "Valor"],
      ["COMPRA POS", "0102", "02/09/2026", "85.400,00"],
    ]);

    expect(findTable(content)).toMatchObject(ok({ dateColumn: 2 }));
  });

  it("finds a header with empty rows under it", () => {
    const content = spreadsheet([
      ["Fecha", "Detalle", "Valor"],
      [],
      [],
      MOVEMENT,
    ]);

    expect(findTable(content)).toMatchObject(ok({ headerRow: 0 }));
  });

  it("names an empty cell of the header with an empty name", () => {
    const content = spreadsheet([
      ["Fecha", null, "Detalle", "Valor"],
      ["02/09/2026", null, "COMPRA POS", "85.400,00"],
    ]);

    expect(findTable(content)).toEqual(
      ok({
        headerRow: 0,
        header: ["FECHA", "", "DETALLE", "VALOR"],
        dateColumn: 0,
      }),
    );
  });

  it.each([
    {
      reason: "a header that doesn't name the dates' column",
      rows: [[null, "Detalle", "Valor", "Saldo"], MOVEMENT],
    },
    {
      reason: "a header of two names",
      rows: [["Fecha", "Detalle"], MOVEMENT],
    },
    {
      reason: "a header with an amount",
      rows: [["Fecha", "Detalle", "85.400,00"], MOVEMENT],
    },
    {
      reason: "rows without an amount",
      rows: [
        ["Fecha", "Detalle", "Valor"],
        ["02/09/2026", "COMPRA POS", "no aplica"],
      ],
    },
    {
      reason: "a shopping list",
      rows: [["Lista de mercado"], ["Arroz", "2"], ["Leche", "3"]],
    },
    { reason: "an empty sheet", rows: [] },
  ])("finds no table under $reason", ({ rows }) => {
    expect(findTable(spreadsheet(rows))).toEqual(noTable);
  });

  it("finds no table in a PDF", () => {
    const pdf: ExtractedContent = { type: "pdf", pages: [{ items: [] }] };

    expect(findTable(pdf)).toEqual(noTable);
  });
});

describe("headerNames", () => {
  it("compares names without accents, case or extra spaces", () => {
    expect(headerNames([" Fecha  de la transacción ", "DESCRIPCIÓN"])).toEqual([
      "FECHA DE LA TRANSACCION",
      "DESCRIPCION",
    ]);
  });

  it("reads each digit, also a masked one, as any other", () => {
    expect(headerNames(["Saldo al 30/09/2026"])).toEqual(
      headerNames(["Saldo al 31/10/2026"]),
    );
    expect(headerNames(["Cuenta 1234567890"])).toEqual(
      headerNames(["Cuenta ******7890"]),
    );
  });

  it("gives a cell without text an empty name", () => {
    expect(headerNames([null, 7, { excelSerial: 46_267 }, "  "])).toEqual([
      "",
      "",
      "",
      "",
    ]);
  });
});
