import { describe, expect, expectTypeOf, it } from "vitest";
import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type {
  Result,
  SpreadsheetCell,
  SpreadsheetContent,
} from "@xtrakto/core";
import { utils, write } from "xlsx";
import type { BookType, CellObject, WorkSheet } from "xlsx";
import { extractSpreadsheet } from "./spreadsheet-extraction.helpers";

// TextEncoder exists in Node and browsers; its type comes from libraries this
// package leaves out.
const { TextEncoder } = globalThis as unknown as {
  readonly TextEncoder: new () => { encode(text: string): Uint8Array };
};

type Rows = readonly (readonly (CellObject | undefined)[])[];
type FileOptions = {
  readonly bookType?: BookType;
  readonly date1904?: boolean;
};

// Synthetic workbooks, written by SheetJS the way Excel stores them: a date
// cell is a serial number with a date format. Invented values only.
const worksheet = (rows: Rows): WorkSheet => {
  const sheet: WorkSheet = {};
  rows.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell) sheet[utils.encode_cell({ r, c })] = cell;
    }),
  );
  const lastColumn = Math.max(0, ...rows.map((row) => row.length - 1));
  sheet["!ref"] = utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(0, rows.length - 1), c: lastColumn },
  });
  return sheet;
};

const workbookFile = (
  sheets: Readonly<Record<string, Rows>>,
  { bookType = "xlsx", date1904 = false }: FileOptions = {},
): Uint8Array => {
  const workbook = utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    utils.book_append_sheet(workbook, worksheet(rows), name);
  }
  if (date1904) workbook.Workbook = { WBProps: { date1904 } };
  return new Uint8Array(write(workbook, { type: "array", bookType }));
};

const textFile = (text: string): Uint8Array => new TextEncoder().encode(text);

const text = (v: string): CellObject => ({ t: "s", v });
const number = (v: number, z?: string): CellObject => ({ t: "n", v, z });

const oneSheet = (
  name: string,
  rows: SpreadsheetCell[][],
): SpreadsheetContent => ({ type: "spreadsheet", sheets: [{ name, rows }] });

// 2026-07-01 05:00: local midnight in Bogotá stored as UTC, as in the
// movements export.
const SERIAL = 46204.208333333336;

describe("extractSpreadsheet", () => {
  describe("XLSX", () => {
    it("reads text, amounts and date cells", () => {
      const file = workbookFile({
        Movimientos: [
          [text("Fecha"), text("Descripción"), text("Valor")],
          [
            number(SERIAL, "dd/mm/yyyy hh:mm"),
            text("COMPRA EN  TIENDA EJEMPLO"),
            number(-50_000, "#,##0.00"),
          ],
          [text("1/07"), text("PAGO QR CAFE DEL PARQUE"), text("-15,000.00")],
          [number(46_205), text("ABONO INTERESES AHORROS"), number(12.34)],
        ],
      });

      expect(extractSpreadsheet(file)).toEqual(
        ok(
          oneSheet("Movimientos", [
            ["Fecha", "Descripción", "Valor"],
            [{ excelSerial: SERIAL }, "COMPRA EN  TIENDA EJEMPLO", -50_000],
            ["1/07", "PAGO QR CAFE DEL PARQUE", "-15,000.00"],
            [46_205, "ABONO INTERESES AHORROS", 12.34],
          ]),
        ),
      );
    });

    it.each([
      "dd/mm/yyyy",
      "m/d/yy",
      "dd/mm/yyyy hh:mm",
      "yyyy-mm-dd",
      "[h]:mm",
    ])("keeps a %s cell as its serial number, never a Date", (format) => {
      const file = workbookFile({ Hoja1: [[number(SERIAL, format)]] });

      expect(extractSpreadsheet(file)).toEqual(
        ok(oneSheet("Hoja1", [[{ excelSerial: SERIAL }]])),
      );
    });

    it.each(["General", "0", "#,##0.00", "0%"])(
      "keeps a number formatted as %s as a number",
      (format) => {
        const file = workbookFile({ Hoja1: [[number(-15_000.5, format)]] });

        expect(extractSpreadsheet(file)).toEqual(
          ok(oneSheet("Hoja1", [[-15_000.5]])),
        );
      },
    );

    it("converts serials from the 1904 date system to the 1900 system", () => {
      const file = workbookFile(
        { Hoja1: [[number(SERIAL - 1462, "dd/mm/yyyy hh:mm"), number(7)]] },
        { date1904: true },
      );

      expect(extractSpreadsheet(file)).toEqual(
        ok(oneSheet("Hoja1", [[{ excelSerial: SERIAL }, 7]])),
      );
    });

    it("keeps every sheet in order, with its name", () => {
      const file = workbookFile({
        Resumen: [[text("SALDO ACTUAL")]],
        Movimientos: [[text("FECHA")]],
      });

      expect(extractSpreadsheet(file)).toEqual(
        ok({
          type: "spreadsheet",
          sheets: [
            { name: "Resumen", rows: [["SALDO ACTUAL"]] },
            { name: "Movimientos", rows: [["FECHA"]] },
          ],
        }),
      );
    });

    it("keeps cell positions: empty cells are null and empty rows are empty", () => {
      const file = workbookFile({
        Hoja1: [
          [undefined, text("B1")],
          [],
          [text("A3"), undefined, text("C3")],
        ],
      });

      expect(extractSpreadsheet(file)).toEqual(
        ok(oneSheet("Hoja1", [[null, "B1"], [], ["A3", null, "C3"]])),
      );
    });

    it("drops trailing empty cells and rows", () => {
      const file = workbookFile({
        Hoja1: [[text("A1"), text("")], [], [text("")]],
      });

      expect(extractSpreadsheet(file)).toEqual(ok(oneSheet("Hoja1", [["A1"]])));
    });

    it("keeps a formula's saved result without evaluating it", () => {
      const file = workbookFile({ Hoja1: [[{ t: "n", v: 999, f: "1+2" }]] });

      expect(extractSpreadsheet(file)).toEqual(ok(oneSheet("Hoja1", [[999]])));
    });

    it("reads booleans as text and error cells as empty", () => {
      const notAvailable = 0x2a; // #N/A
      const file = workbookFile({
        Hoja1: [
          [
            { t: "b", v: true },
            { t: "e", v: notAvailable },
            { t: "b", v: false },
          ],
        ],
      });

      expect(extractSpreadsheet(file)).toEqual(
        ok(oneSheet("Hoja1", [["TRUE", null, "FALSE"]])),
      );
    });
  });

  describe("CSV", () => {
    it("reads every value of a UTF-8 file as text, without guessing types", () => {
      const csv =
        'Fecha,Descripción,Valor\r\n1/07,"COMPRA EN  TIENDA, CENTRO","-15,000.00"\r\n,,\r\n2/07,"DICE ""HOLA""",12.34\r\nTRUE,=1+2,#N/A\r\n';
      const byteOrderMark = [0xef, 0xbb, 0xbf];
      const file = Uint8Array.of(...byteOrderMark, ...textFile(csv));

      expect(extractSpreadsheet(file)).toEqual(
        ok(
          oneSheet("Sheet1", [
            ["Fecha", "Descripción", "Valor"],
            ["1/07", "COMPRA EN  TIENDA, CENTRO", "-15,000.00"],
            [],
            ["2/07", 'DICE "HOLA"', "12.34"],
            ["TRUE", "=1+2", "#N/A"],
          ]),
        ),
      );
    });

    it("detects a semicolon separator", () => {
      const file = textFile("Fecha;Valor\n1/07;-15.000,00\n");

      expect(extractSpreadsheet(file)).toEqual(
        ok(
          oneSheet("Sheet1", [
            ["Fecha", "Valor"],
            ["1/07", "-15.000,00"],
          ]),
        ),
      );
    });

    it("decodes a Windows-1252 file, as Excel saves CSV in Spanish", () => {
      const file = Uint8Array.from("Descripción;Año\nCOMPRA;2026\n", (char) =>
        char.charCodeAt(0),
      );

      expect(extractSpreadsheet(file)).toEqual(
        ok(
          oneSheet("Sheet1", [
            ["Descripción", "Año"],
            ["COMPRA", "2026"],
          ]),
        ),
      );
    });
  });

  describe("errors", () => {
    const sample: Rows = [[text("FECHA")]];

    it.each([
      {
        label: "a legacy XLS file",
        file: workbookFile({ Hoja1: sample }, { bookType: "xls" }),
      },
      {
        label: "an ODS spreadsheet",
        file: workbookFile({ Hoja1: sample }, { bookType: "ods" }),
      },
      {
        label: "an XLSB workbook",
        file: workbookFile({ Hoja1: sample }, { bookType: "xlsb" }),
      },
      {
        label: "an HTML table",
        file: textFile("<table><tr><td>FECHA</td></tr></table>"),
      },
      {
        label: "a PDF",
        file: Uint8Array.of(...textFile("%PDF-1.7\n"), 0x00, 0x9c),
      },
    ])("rejects $label as an unknown file type", ({ file }) => {
      expect(extractSpreadsheet(file)).toEqual(
        err({
          code: APP_ERROR_CODE.UNKNOWN_FORMAT,
          details: { reason: "file_type" },
        }),
      );
    });

    it("returns PARSE_FAILED for a damaged XLSX file", () => {
      const zipSignature = [0x50, 0x4b, 0x03, 0x04];
      const file = Uint8Array.of(...zipSignature, 1, 2, 3, 4, 5, 6);

      expect(extractSpreadsheet(file)).toEqual(
        err({ code: APP_ERROR_CODE.PARSE_FAILED }),
      );
    });

    it("returns INVALID_INPUT when the content exceeds the size bounds", () => {
      // Far longer than any cell may be.
      const file = textFile(`DESCRIPCION\n${"A".repeat(10_000)}\n`);

      expect(extractSpreadsheet(file)).toEqual(
        err({
          code: APP_ERROR_CODE.INVALID_INPUT,
          details: { reason: "too_large" },
        }),
      );
    });
  });

  it("types its result as spreadsheet content", () => {
    expectTypeOf(extractSpreadsheet).returns.toEqualTypeOf<
      Result<SpreadsheetContent>
    >();
  });
});
