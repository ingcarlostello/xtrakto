import type { CardSummary } from "@xtrakto/core";

// Bancolombia's credit card statement in Excel, "Extracto Mastercard
// Detallado" (Appendix A.4): a sheet per currency, its blocks found by the
// labels in its first column.

type BancolombiaSummary = Extract<CardSummary, { kind: "bancolombia" }>;

/** Stored with each statement as its format. */
export const CARD_FORMAT_ID = "bancolombia-credit-card";

/** Labels in the first column, each before its values. */
export const CARD_LABEL = {
  CARD: "Información de la Tarjeta",
  CURRENCY: "Moneda:",
  PERIOD: "Periodo facturado:",
  DUE_DATE: "Pagar antes de:",
  MINIMUM: "Pago mínimo",
  TOTAL: "Pago total",
  CREDIT_LIMIT: "Cupo total:",
  AVAILABLE: "Cupo disponible:",
} as const;

/** What each sheet's currency says: pesos are read, dollars only counted. */
export const CARD_CURRENCY = { PESOS: "PESOS", DOLLARS: "DOLARES" } as const;

/** What a due date says when nothing is due: the sheet's "-", the PDF's "---". */
export const NOTHING_DUE = /^-+$/;

/** The card's number, masked but its last 4 digits, as the sheet prints it. */
export const CARD_NUMBER_PATTERN = /^\**(\d{4})$/;

/** The headers over the summaries, each label beside its amount. */
export const CARD_SUMMARY_HEADER = {
  TOTAL: "Resumen Saldo Total",
  MINIMUM: "Resumen Pago Mínimo",
} as const;

/** The total's summary, by the field each line fills. */
export const CARD_TOTAL_LABEL = {
  previousBalanceMinor: "+ Saldo anterior",
  purchasesMinor: "+ Compras del mes",
  lateInterestMinor: "+ Intereses de mora",
  interestMinor: "+ Intereses corrientes",
  advancesMinor: "+ Avances",
  otherChargesMinor: "+ Otros cargos",
  chargesMinor: "Cargos",
  paymentsMinor: "(-) Pagos / abonos",
  creditInFavorMinor: "(-) Saldo a favor",
} as const satisfies Record<keyof BancolombiaSummary["total"], string>;

/** The minimum's detail, by the field each line fills. */
export const CARD_MINIMUM_LABEL = {
  installmentsMinor: "Cuota transacciones",
  earlierInstallmentsMinor: "Cuota Transacciones anteriores",
  advanceInstallmentsMinor: "Cuota avances",
  lateInterestMinor: "+ Intereses de mora",
  interestMinor: "+ Intereses corrientes",
  otherChargesMinor: "Otros cargos",
  overdueMinor: "(+) Saldo en mora",
  inFavorMinor: "(-) A favor",
} as const satisfies Record<keyof BancolombiaSummary["minimum"], string>;

/** The labels of the two tables of movements, in their order. */
export const CARD_TABLE = {
  PERIOD: "Movimientos durante el periodo",
  EARLIER: "Movimientos antes del periodo",
} as const;

// Header names of the columns read. The authorization number and the
// annual rate aren't: the parsed statement has no field for them.
export const CARD_MOVEMENTS_COLUMN = {
  DATE: "Fecha",
  DESCRIPTION: "Movimientos",
  AMOUNT: "Valor Movimiento",
  INSTALLMENTS: "Número de cuotas",
  MONTHLY: "Valor cuota/abono",
  MONTHLY_RATE: "Interés mensual (%)",
  REMAINING: "Saldo pendiente",
} as const;

/** A purchase's installment of its count: "3/12". */
export const INSTALLMENTS_PATTERN = /^(\d{1,3})\s*\/\s*(\d{1,3})$/;

/** A movement's date, day first: "15/09/2026". */
export const CARD_DATE_PATTERN = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

// The same statement as a PDF (Appendix A.4b): the pages of each currency,
// pesos first, each value under its label or beside it.

/** Stored with each statement as its format. */
export const CARD_PDF_FORMAT_ID = "bancolombia-credit-card-pdf";

/** Labels of the first page of each currency, each before its value. */
export const CARD_PDF_LABEL = {
  /** The bank's tax id under its logo: the holder's name is the next line. */
  BANK_ID: "NIT:",
  CARD: "Información de la Tarjeta",
  CURRENCY: "Moneda:",
  PERIOD: "Periodo facturado",
  TOTAL: "Pago Total:",
  DUE_DATE: "Pagar antes de:",
  MINIMUM: "Pago mínimo:",
  CREDIT_LIMIT: "Cupo total:",
  AVAILABLE: "Disponible:",
} as const;

/** What the pages of movements say their currency is in, beside it. */
export const CARD_PDF_PAGE_CURRENCY = "ESTADO DE CUENTA EN:";

/** The summaries' titles, each over its half of the page. */
export const CARD_PDF_SUMMARY_TITLE = {
  TOTAL: "Resumen saldo total",
  MINIMUM: "Detalle del pago mínimo",
} as const;

/**
 * The minimum's detail as the PDF words it, by the field each line fills:
 * "+ Cuota transacciones" twice, this period's with its dates under it, the
 * earlier ones' with "anteriores".
 */
export const CARD_PDF_MINIMUM_LABEL = {
  installmentsMinor: "+ Cuota transacciones entre",
  earlierInstallmentsMinor: "+ Cuota transacciones anteriores",
  advanceInstallmentsMinor: "+ Cuota avances",
  lateInterestMinor: "+ Intereses de mora",
  interestMinor: "+ Intereses corrientes",
  otherChargesMinor: "Otros Cargos",
  overdueMinor: "(+) En mora",
  inFavorMinor: "(-) A favor",
} as const satisfies Record<keyof BancolombiaSummary["minimum"], string>;

/** The titles over the tables of movements, before their dates. */
export const CARD_PDF_TABLE_TITLE = {
  PERIOD: "Nuevos movimientos entre",
  EARLIER: "Movimientos antes de",
} as const;

/** The first line of the movements' header, which takes two. */
export const CARD_PDF_COLUMNS = [
  "Número de",
  "Fecha",
  "Movimientos",
  "Valor",
  "Número",
  "Valor",
  "% Interés",
  "% Interés",
  "Saldo",
] as const;

/** Header names of the columns read, their two lines joined. */
export const CARD_PDF_MOVEMENTS_COLUMN = {
  DATE: "Fecha",
  DESCRIPTION: "Movimientos",
  AMOUNT: "Valor movimiento",
  INSTALLMENTS: "Número cuotas",
  MONTHLY: "Valor Couta/Abono",
  MONTHLY_RATE: "% Interés mensual",
  REMAINING: "Saldo pendiente",
} as const satisfies Record<keyof typeof CARD_MOVEMENTS_COLUMN, string>;
