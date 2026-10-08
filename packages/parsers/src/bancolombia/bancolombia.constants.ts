// The quarterly statement as Appendix A.1 of docs/ROADMAP.md describes it.

/** Labels that open each block, in the first column. */
export const QUARTERLY_BLOCK = {
  CLIENT: "Información Cliente:",
  GENERAL: "Información General:",
  SUMMARY: "Resumen:",
} as const;

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

/** The only account type the MVP reads. */
export const SAVINGS_ACCOUNT_TYPE = "CUENTA DE AHORROS";
