import { describe, expect, it } from "vitest";
import {
  MAX_PDF_PAGE_ITEMS,
  MAX_PDF_PAGES,
  MAX_ROW_CELLS,
  MAX_SHEET_ROWS,
  MAX_SPREADSHEET_SHEETS,
  MAX_TEXT_LENGTH,
} from "./extracted-content.constants";
import { extractedContentSchema } from "./extracted-content.schemas";

// Invented values only.
const spreadsheet = (rows: unknown[][], sheetCount = 1) => ({
  type: "spreadsheet",
  sheets: Array.from({ length: sheetCount }, () => ({ name: "Hoja1", rows })),
});

const textItem = {
  str: "COMPRA EN TIENDA",
  x: 40,
  y: 120,
  width: 90,
  height: 8,
};

const pdf = (items: unknown[], pageCount = 1) => ({
  type: "pdf",
  pages: Array.from({ length: pageCount }, () => ({ items })),
});

const isValid = (content: unknown) =>
  extractedContentSchema.safeParse(content).success;

describe("extractedContentSchema", () => {
  it("accepts a spreadsheet with text, number, empty and date cells", () => {
    const content = spreadsheet([
      ["FECHA", "DESCRIPCIÓN", "VALOR"],
      [{ excelSerial: 46_204.208_333_333_336 }, "COMPRA EN TIENDA", -50_000],
      [null, "", 12.34],
      [],
    ]);

    expect(extractedContentSchema.parse(content)).toEqual(content);
  });

  it("accepts a PDF with text items and blank pages", () => {
    const content = {
      type: "pdf",
      pages: [{ items: [textItem] }, { items: [] }],
    };

    expect(extractedContentSchema.parse(content)).toEqual(content);
  });

  it.each([
    { label: "an unknown content type", content: { type: "docx", sheets: [] } },
    { label: "a spreadsheet without sheets", content: spreadsheet([], 0) },
    { label: "a JavaScript Date cell", content: spreadsheet([[new Date()]]) },
    { label: "a NaN cell", content: spreadsheet([[Number.NaN]]) },
    {
      label: "an infinite cell",
      content: spreadsheet([[Number.POSITIVE_INFINITY]]),
    },
    { label: "a boolean cell", content: spreadsheet([[true]]) },
    {
      label: "a date cell with extra keys",
      content: spreadsheet([[{ excelSerial: 46_204, formatted: "1/07" }]]),
    },
    {
      label: "an unexpected top-level key",
      content: { ...spreadsheet([]), fileName: "extracto.xlsx" },
    },
    { label: "a PDF without pages", content: pdf([], 0) },
    {
      label: "a text item with negative width",
      content: pdf([{ ...textItem, width: -1 }]),
    },
    {
      label: "a text item with extra keys",
      content: pdf([{ ...textItem, fontName: "Helvetica" }]),
    },
  ])("rejects $label", ({ content }) => {
    expect(isValid(content)).toBe(false);
  });
});

describe("extractedContentSchema size bounds", () => {
  const longText = "A".repeat(MAX_TEXT_LENGTH + 1);
  const maxText = "A".repeat(MAX_TEXT_LENGTH);
  const rows = (count: number) => Array.from({ length: count }, () => [1]);
  const cells = (count: number) => Array.from({ length: count }, () => 1);

  it.each([
    {
      label: "sheets",
      atLimit: spreadsheet([], MAX_SPREADSHEET_SHEETS),
      overLimit: spreadsheet([], MAX_SPREADSHEET_SHEETS + 1),
    },
    {
      label: "rows per sheet",
      atLimit: spreadsheet(rows(MAX_SHEET_ROWS)),
      overLimit: spreadsheet(rows(MAX_SHEET_ROWS + 1)),
    },
    {
      label: "cells per row",
      atLimit: spreadsheet([cells(MAX_ROW_CELLS)]),
      overLimit: spreadsheet([cells(MAX_ROW_CELLS + 1)]),
    },
    {
      label: "cell text length",
      atLimit: spreadsheet([[maxText]]),
      overLimit: spreadsheet([[longText]]),
    },
    {
      label: "PDF pages",
      atLimit: pdf([], MAX_PDF_PAGES),
      overLimit: pdf([], MAX_PDF_PAGES + 1),
    },
    {
      label: "text items per page",
      atLimit: pdf(Array.from({ length: MAX_PDF_PAGE_ITEMS }, () => textItem)),
      overLimit: pdf(
        Array.from({ length: MAX_PDF_PAGE_ITEMS + 1 }, () => textItem),
      ),
    },
    {
      label: "text item length",
      atLimit: pdf([{ ...textItem, str: maxText }]),
      overLimit: pdf([{ ...textItem, str: longText }]),
    },
  ])(
    "accepts the maximum of $label and rejects one more",
    ({ atLimit, overLimit }) => {
      expect(isValid(atLimit)).toBe(true);
      expect(isValid(overLimit)).toBe(false);
    },
  );
});
