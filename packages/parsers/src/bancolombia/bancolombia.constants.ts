import { DEFAULT_TIME_ZONE } from "@xtrakto/core";
import type { ExcelDateTimeZones } from "@xtrakto/core";

// The quarterly statement and the movements export as Appendices A.1 and A.2
// of docs/ROADMAP.md describe them.

export const BANCOLOMBIA_BANK_ID = "bancolombia";

// Stored with each statement as its format.
export const QUARTERLY_FORMAT_ID = "bancolombia-savings-quarterly";
export const MOVEMENTS_EXPORT_FORMAT_ID = "bancolombia-movements-export";

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

/** The only account type the MVP reads. */
export const SAVINGS_ACCOUNT_TYPE = "CUENTA DE AHORROS";

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
