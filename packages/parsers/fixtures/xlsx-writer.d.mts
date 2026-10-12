import type { SpreadsheetContent } from "@xtrakto/core";

/**
 * An XLSX file with the content's sheets, stored the way the bank's exports
 * store them: text, numbers, and date serials as numbers with a date format.
 */
export declare const contentToXlsx: (content: SpreadsheetContent) => Uint8Array;
