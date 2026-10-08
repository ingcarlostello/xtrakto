import { APP_ERROR_CODE, err, extractedContentSchema, ok } from "@xtrakto/core";
import type {
  Result,
  SpreadsheetCell,
  SpreadsheetContent,
} from "@xtrakto/core";
import { read, SSF } from "xlsx";
import type { CellObject, ParsingOptions, WorkBook, WorkSheet } from "xlsx";

// TextDecoder exists in browsers, workers and Node 22, but its type comes from
// the DOM or Node libraries, which this package leaves out so platform globals
// can't slip in. Only the subset used here is declared.
type TextDecoding = {
  readonly TextDecoder: new (
    label: "utf-8" | "windows-1252",
    options?: { readonly fatal: boolean },
  ) => { decode(input: Uint8Array): string };
};

// Safe: every runtime that runs this package provides TextDecoder (see above).
const platform = globalThis as unknown as TextDecoding;

// SheetJS types its number format library as `any`; this is the one function used.
const numberFormats: { is_date(format: string): boolean } = SSF;

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
// Days between the 1900 and 1904 date systems. Serials always come out in the
// 1900 system, the one `localDateFromExcelSerial` reads.
const DATE_1904_OFFSET_DAYS = 1462;

const unknownFileType: Result<never> = err({
  code: APP_ERROR_CODE.UNKNOWN_FORMAT,
  details: { reason: "file_type" },
});
const tooLarge: Result<never> = err({
  code: APP_ERROR_CODE.INVALID_INPUT,
  details: { reason: "too_large" },
});

// SheetJS writes into the options it receives, so every read gets new ones.
const xlsxOptions = (): ParsingOptions => ({
  type: "array",
  dense: true,
  cellDates: false, // date cells keep their serial number, never a Date
  cellNF: true, // the number format tells date cells apart from amounts
  cellFormula: false,
  cellHTML: false,
  cellText: false,
});

const csvOptions = (): ParsingOptions => ({
  type: "string",
  dense: true,
  raw: true, // every value stays text: no guessed numbers or dates
  cellHTML: false,
  cellText: false,
});

const isZip = (bytes: Uint8Array): boolean =>
  ZIP_SIGNATURE.every((byte, index) => bytes[index] === byte);

const decodeText = (bytes: Uint8Array): string => {
  try {
    return new platform.TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Excel saves CSV as UTF-8 only when asked to; otherwise it uses the
    // system's code page, Windows-1252 in Spanish ("Descripción").
    return new platform.TextDecoder("windows-1252").decode(bytes);
  }
};

// SheetJS throws on damaged or encrypted files.
const tryRead = (
  data: Uint8Array | string,
  options: ParsingOptions,
): Result<WorkBook> => {
  try {
    return ok(read(data, options));
  } catch {
    return err({ code: APP_ERROR_CODE.PARSE_FAILED });
  }
};

const isDateFormat = (format: CellObject["z"]): boolean =>
  typeof format === "string" && numberFormats.is_date(format);

const toCell = (
  cell: CellObject | undefined,
  isDate1904: boolean,
): SpreadsheetCell => {
  const value = cell?.v;
  if (typeof value === "string") return value === "" ? null : value;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  // Empty, or an error such as #N/A, whose number is an error code.
  if (typeof value !== "number" || cell?.t === "e") return null;
  if (!isDateFormat(cell?.z)) return value;
  return { excelSerial: isDate1904 ? value + DATE_1904_OFFSET_DAYS : value };
};

// Dense sheet data is still sparse: empty rows and cells are holes. They come
// out as undefined, and a missing list as an empty one.
const withHoles = <T>(items: readonly T[] | undefined): (T | undefined)[] =>
  Array.from(items ?? []);

const toRow = (
  cells: readonly CellObject[] | undefined,
  isDate1904: boolean,
): SpreadsheetCell[] => {
  const row = withHoles(cells).map((cell) => toCell(cell, isDate1904));
  while (row.at(-1) === null) row.pop();
  return row;
};

const toRows = (
  sheet: WorkSheet | undefined,
  isDate1904: boolean,
): SpreadsheetCell[][] => {
  const rows = withHoles(sheet?.["!data"]).map((cells) =>
    toRow(cells, isDate1904),
  );
  while (rows.at(-1)?.length === 0) rows.pop();
  return rows;
};

const toContent = (workbook: WorkBook): SpreadsheetContent => {
  const isDate1904 = workbook.Workbook?.WBProps?.date1904 === true;
  return {
    type: "spreadsheet",
    sheets: workbook.SheetNames.map((name) => ({
      name,
      rows: toRows(workbook.Sheets[name], isDate1904),
    })),
  };
};

/**
 * Reads an XLSX or CSV file into the content bank parsers read, the same way
 * in a browser worker and in Node. Values stay raw: text as written, numbers
 * as stored, date cells as Excel serials (never `Date` objects) and formulas
 * as their saved result. Every CSV value stays text.
 */
export const extractSpreadsheet = (
  bytes: Uint8Array,
): Result<SpreadsheetContent> => {
  const isXlsx = isZip(bytes);
  // Binary files (PDF, images, legacy XLS) contain zero bytes; CSV text doesn't.
  if (!isXlsx && bytes.includes(0)) return unknownFileType;
  const workbook = isXlsx
    ? tryRead(bytes, xlsxOptions())
    : tryRead(decodeText(bytes), csvOptions());
  if (!workbook.ok) return workbook;
  // ODS and XLSB files are ZIP archives too, and SheetJS also reads HTML or
  // SYLK text: only its CSV reader leaves `bookType` unset.
  if (workbook.value.bookType !== (isXlsx ? "xlsx" : undefined)) {
    return unknownFileType;
  }
  const content = toContent(workbook.value);
  // The bounds the server enforces, checked before anything leaves the browser.
  return extractedContentSchema.safeParse(content).success
    ? ok(content)
    : tooLarge;
};
