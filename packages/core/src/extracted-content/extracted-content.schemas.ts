import { z } from "zod";
import {
  MAX_PDF_PAGE_ITEMS,
  MAX_PDF_PAGES,
  MAX_ROW_CELLS,
  MAX_SHEET_ROWS,
  MAX_SPREADSHEET_SHEETS,
  MAX_TEXT_LENGTH,
} from "./extracted-content.constants";

// What the browser sends to the server after reading a file. It is untrusted
// input, so every object is strict and every list is bounded.

const textSchema = z.string().max(MAX_TEXT_LENGTH);

// A date cell keeps Excel's serial number; parsers convert it with the bank's
// time zone. It never becomes a JavaScript Date.
const excelSerialCellSchema = z.strictObject({ excelSerial: z.number() });

export const spreadsheetCellSchema = z.union([
  textSchema,
  z.number(),
  z.null(),
  excelSerialCellSchema,
]);

const sheetSchema = z.strictObject({
  name: textSchema,
  rows: z
    .array(z.array(spreadsheetCellSchema).max(MAX_ROW_CELLS))
    .max(MAX_SHEET_ROWS),
});

export const spreadsheetContentSchema = z.strictObject({
  type: z.literal("spreadsheet"),
  sheets: z.array(sheetSchema).min(1).max(MAX_SPREADSHEET_SHEETS),
});

export const pdfTextItemSchema = z.strictObject({
  str: textSchema,
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
});

const pdfPageSchema = z.strictObject({
  items: z.array(pdfTextItemSchema).max(MAX_PDF_PAGE_ITEMS),
});

export const pdfContentSchema = z.strictObject({
  type: z.literal("pdf"),
  pages: z.array(pdfPageSchema).min(1).max(MAX_PDF_PAGES),
});

export const extractedContentSchema = z.discriminatedUnion("type", [
  spreadsheetContentSchema,
  pdfContentSchema,
]);
