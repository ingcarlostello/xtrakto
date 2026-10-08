import { describe, expect, it } from "vitest";
import { err, ok } from "@xtrakto/core";
import type { SheetRows } from "./sheet.utils";
import { cellText, findColumns, findLabelRow } from "./sheet.utils";

describe("cellText", () => {
  it.each([
    { label: "text", cell: "Resumen:", text: "Resumen:" },
    {
      label: "text with spaces",
      cell: "  SALDO ACTUAL ",
      text: "SALDO ACTUAL",
    },
    { label: "blank text", cell: "   ", text: undefined },
    { label: "a number", cell: 12.5, text: undefined },
    { label: "a date", cell: { excelSerial: 46204 }, text: undefined },
    { label: "an empty cell", cell: null, text: undefined },
    { label: "a missing cell", cell: undefined, text: undefined },
  ])("reads $label", ({ cell, text }) => {
    expect(cellText(cell)).toBe(text);
  });
});

describe("findLabelRow", () => {
  const rows: SheetRows = [
    [],
    ["Información Cliente:"],
    ["CLIENTE", "DIRECCIÓN", "CIUDAD"],
    [null, "Resumen:"],
    ["  Resumen:  "],
  ];

  it("finds the first row whose first cell is the label", () => {
    expect(findLabelRow(rows, "Información Cliente:")).toBe(1);
  });

  it("ignores spaces around the label and labels in other columns", () => {
    expect(findLabelRow(rows, "Resumen:")).toBe(4);
  });

  it("returns undefined when no row has the label", () => {
    expect(findLabelRow(rows, "Movimientos:")).toBeUndefined();
  });
});

describe("findColumns", () => {
  const header = ["SALDO ANTERIOR", " TOTAL ABONOS ", null, "TOTAL CARGOS"];

  it("finds each column wherever the header puts it", () => {
    expect(
      findColumns(header, {
        CREDITS: "TOTAL ABONOS",
        OPENING_BALANCE: "SALDO ANTERIOR",
      }),
    ).toEqual(
      ok([
        { key: "CREDITS", name: "TOTAL ABONOS", index: 1 },
        { key: "OPENING_BALANCE", name: "SALDO ANTERIOR", index: 0 },
      ]),
    );
  });

  it("fails with the name of the first missing column", () => {
    expect(
      findColumns(header, {
        OPENING_BALANCE: "SALDO ANTERIOR",
        CLOSING_BALANCE: "SALDO ACTUAL",
        AVERAGE_BALANCE: "SALDO PROMEDIO",
      }),
    ).toEqual(err("SALDO ACTUAL"));
  });
});
