import { DEFAULT_TIME_ZONE } from "@xtrakto/core";
import type { ExcelDateTimeZones } from "@xtrakto/core";

// The quarterly statement and the movements export, in Excel and in PDF, as
// Appendix A of docs/ROADMAP.md describes them.

export const BANCOLOMBIA_BANK_ID = "bancolombia";

// Stored with each statement as its format.
export const QUARTERLY_FORMAT_ID = "bancolombia-savings-quarterly";
export const QUARTERLY_PDF_FORMAT_ID = "bancolombia-savings-quarterly-pdf";
export const MOVEMENTS_EXPORT_FORMAT_ID = "bancolombia-movements-export";
export const MOVEMENTS_PDF_FORMAT_ID = "bancolombia-movements-export-pdf";

/** The formats this package reads. */
export type FormatId =
  | typeof QUARTERLY_FORMAT_ID
  | typeof QUARTERLY_PDF_FORMAT_ID
  | typeof MOVEMENTS_EXPORT_FORMAT_ID
  | typeof MOVEMENTS_PDF_FORMAT_ID;

/** Labels that open each block, in the first column. */
export const QUARTERLY_BLOCK = {
  CLIENT: "Información Cliente:",
  GENERAL: "Información General:",
  SUMMARY: "Resumen:",
  MOVEMENTS: "Movimientos:",
} as const;

/** Labels that open the blocks each new page repeats; the summary isn't one. */
export const PAGE_START_LABELS = [
  QUARTERLY_BLOCK.CLIENT,
  QUARTERLY_BLOCK.GENERAL,
  QUARTERLY_BLOCK.MOVEMENTS,
] as const;

/** Printed in the DESCRIPCIÓN column after the last movement. */
export const END_MARKER = "FIN ESTADO DE CUENTA";

// Header names of the columns read in each block. The address and the city
// are never read.
export const CLIENT_COLUMN = { HOLDER: "CLIENTE" } as const;

export const PERIOD_COLUMN = { FROM: "DESDE", TO: "HASTA" } as const;

export const ACCOUNT_COLUMN = {
  TYPE: "TIPO CUENTA",
  NUMBER: "NRO CUENTA",
} as const;

/** The account number as printed: digits only. Its last 4 are all that's kept. */
export const ACCOUNT_NUMBER_PATTERN = /^\d{4,}$/;
export const ACCOUNT_LAST_DIGITS = 4;

export const SUMMARY_COLUMN = {
  OPENING_BALANCE: "SALDO ANTERIOR",
  CREDITS: "TOTAL ABONOS",
  DEBITS: "TOTAL CARGOS",
  CLOSING_BALANCE: "SALDO ACTUAL",
  AVERAGE_BALANCE: "SALDO PROMEDIO",
  INTEREST: "INTERESES",
  WITHHOLDING: "RETEFUENTE",
} as const;

// SUCURSAL and DCTO. aren't read: the parsed statement has no field for them.
export const MOVEMENTS_COLUMN = {
  DATE: "FECHA",
  DESCRIPTION: "DESCRIPCIÓN",
  AMOUNT: "VALOR",
  BALANCE: "SALDO",
} as const;

/**
 * How older exports mark a description they split at "ñí": the text goes on
 * in the next cell, starting with this mark (Appendix A.1).
 */
export const SPLIT_MARK = "¡";

/** The only account type the MVP reads. */
export const SAVINGS_ACCOUNT_TYPE = "CUENTA DE AHORROS";

// The quarterly statement's PDF (Appendix A.3).

/** What the page's header box and its summary are called in a failure. */
export const QUARTERLY_PDF_BLOCK = {
  HEADER: "ESTADO DE CUENTA",
  SUMMARY: "RESUMEN",
} as const;

/** The labels in the page's header box, each before its value. */
export const QUARTERLY_PDF_LABEL = {
  FROM: "DESDE:",
  TO: "HASTA:",
  NUMBER: "NÚMERO",
} as const;

/**
 * How a PDF's account type starts, compared without accents or case: the
 * quarterly statement's "CUENTA DE AHORROS", the movements export's "Cuenta
 * de Ahorros".
 */
export const PDF_ACCOUNT_TYPE = /^CUENTA\s/i;

/** The summary's labels: the spreadsheet's INTERESES reads differently. */
export const QUARTERLY_PDF_SUMMARY = {
  ...SUMMARY_COLUMN,
  INTEREST: "VALOR INTERESES PAGADOS",
} as const;

/** Every column of the movements table, as each page's header prints them. */
export const QUARTERLY_PDF_COLUMNS = [
  "FECHA",
  "DESCRIPCIÓN",
  "SUCURSAL",
  "DCTO.",
  "VALOR",
  "SALDO",
] as const;

/** What each page prints under its table: the bank's contact, its number. */
export const QUARTERLY_PDF_FOOTERS = ["DCF:", "PÁGINA:"] as const;

/** How the PDF prints, inside one description, the "ñí" a spreadsheet splits. */
export const PDF_SPLIT_MARK = "|¡";

/** The movements export's header is its first row. */
export const EXPORT_HEADER_ROW = 0;

/** Header names in the first row of the movements export. */
export const EXPORT_COLUMN = {
  DATE: "Fecha",
  DESCRIPTION: "Descripción",
  REFERENCE: "Referencia",
  AMOUNT: "Valor",
} as const;

/** The export's date cells hold local midnight in Bogotá as 05:00 UTC. */
export const EXPORT_DATE_TIME_ZONES: ExcelDateTimeZones = {
  serialTimeZone: "UTC",
  targetTimeZone: DEFAULT_TIME_ZONE,
};

/** How an ATM withdrawal's reference starts: `ATM <location>`. */
export const ATM_REFERENCE_PREFIX = "ATM ";

/** How the export writes some of the references it doesn't have, in Excel and in PDF. */
export const EXPORT_NO_REFERENCE = "null";

// The movements export's PDF (Appendix A.2b).

/** What a failure calls the PDF's first page: by its title. */
export const MOVEMENTS_PDF_BLOCK = "Movimientos: Cuentas";

/** What a failure calls the header's fields, which the PDF prints unlabeled. */
export const MOVEMENTS_PDF_FIELD = {
  HOLDER: "CLIENTE",
  TYPE: "CUENTA",
  NUMBER: "NÚMERO",
} as const;

/**
 * The account's number as the PDF prints it, in groups after its product's
 * name: "Ahorros 123 - 456789 - 01". Its last 4 digits alone also match.
 */
export const MOVEMENTS_PDF_ACCOUNT_NUMBER =
  /^(?:\p{L}+\s+)?\d+(?:\s*-\s*\d+)*$/u;

/** Every column of the movements table, as each page's header prints them. */
export const MOVEMENTS_PDF_COLUMNS = [
  EXPORT_COLUMN.DATE,
  EXPORT_COLUMN.DESCRIPTION,
  EXPORT_COLUMN.REFERENCE,
  EXPORT_COLUMN.AMOUNT,
] as const;

/** What each page prints under its table: the IP address it came from. */
export const MOVEMENTS_PDF_FOOTER = "Dirección IP";
