// Bounds that reject oversized payloads before any parsing. Real statements are
// far smaller: a quarter of Bancolombia movements is about 500 rows of 6 cells.
export const MAX_SPREADSHEET_SHEETS = 10;
export const MAX_SHEET_ROWS = 10_000;
export const MAX_ROW_CELLS = 50;
export const MAX_PDF_PAGES = 30;
export const MAX_PDF_PAGE_ITEMS = 5_000;
/** Longest text accepted in a cell, a sheet name or a PDF text item. */
export const MAX_TEXT_LENGTH = 500;
