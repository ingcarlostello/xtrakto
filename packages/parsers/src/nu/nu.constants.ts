import type { CardSummary } from "@xtrakto/core";

// Nu's credit card statement, a PDF from its app (Appendix A.5): a first page
// with the cards, what's due and "Resumen de tu extracto", then the movements.

type NuSummary = Extract<CardSummary, { kind: "nu" }>;

/** Nu's id among core's banks. */
export const NU_BANK_ID = "nu";

/** Stored with each statement as its format. */
export const NU_CARD_FORMAT_ID = "nu-credit-card-pdf";

/** Labels of the first page, each over its value. */
export const NU_LABEL = {
  /** The holder's name is the text left of it, on its line. */
  CARDS: "Tus tarjetas",
  /** The physical card, over its last 4 digits; the virtual one shares its limit. */
  PHYSICAL_CARD: "Tarjeta física",
  DUE_DATE: "Fecha límite de pago",
  CUT_DATE: "Fecha de corte",
  PERIOD: "Periodo facturado",
  CREDIT_LIMIT: "Tu cupo definido",
  AVAILABLE: "Disponible",
  /** The summary's title: its lines follow, each label beside its amount. */
  SUMMARY: "Resumen de tu extracto",
  MINIMUM: "PAGO MÍNIMO",
  /** The total's label goes on with the due date: "PAGO HASTA EL 4 OCTUBRE 2026". */
  TOTAL: "PAGO HASTA EL",
} as const;

/** The summary's lines, by the field each fills (12.2a). */
export const NU_SUMMARY_LABEL = {
  dueThisMonthMinor: "Deuda a pagar este mes",
  lateInterestMinor: "Intereses de mora",
  interestMinor: "Intereses",
  advanceFeesMinor: "Comisiones de avances",
  serviceFeesMinor: "Comisiones por servicio",
  conversionChargesMinor: "Cargos por conversión",
  refundsMinor: "Devoluciones o ajustes a favor",
  remainingDebtMinor: "Deuda restante",
} as const satisfies Partial<Record<keyof NuSummary, string>>;

/** The summary's payments, twice: to the minimum over it, to the total under it. */
export const NU_PAYMENTS_LABEL = "Abonos";

/** The first line of the movements' header, which takes two. */
export const NU_COLUMNS = [
  "Fecha",
  "Descripción",
  "Valor",
  "Cuotas",
  "Valor",
  "Interés del mes",
  "Total a pagar",
  "Restante",
] as const;

/** Header names of the columns read, their two lines joined. */
export const NU_MOVEMENTS_COLUMN = {
  DATE: "Fecha",
  DESCRIPTION: "Descripción",
  AMOUNT: "Valor",
  INSTALLMENTS: "Cuotas",
  MONTHLY: "Valor del mes",
  INTEREST: "Interés del mes Porcentaje y valor",
  TOTAL: "Total a pagar este mes",
  REMAINING: "Restante por pagar",
} as const;

/** What Nu writes in its movements' rows. */
export const NU_ROW_TEXT = {
  PAYMENT: "Gracias por tu pago",
  /** A sub-row under a purchase abroad, its charge under "Total a pagar". */
  CONVERSION: "Comisión por cambio de moneda",
  /** A sub-row under a purchase, its rate and value under "Interés del mes". */
  LATE_INTEREST: "Intereses en mora",
  /** After the last movement, under "Total a pagar", on its page or the next. */
  END: "Pago mínimo",
  /** The first words of each page's footer. */
  FOOTER: "Nu Financiera",
} as const;

/**
 * The movements the month's interest and late interest make, one each
 * (decided with the human in 12.2d), as the summary words them.
 */
export const NU_INTEREST_TEXT = {
  INTEREST: "Intereses",
  LATE: "Intereses de mora",
} as const;

/** A sub-row's mark, "↪" or, in some months, "•". */
export const NU_SUB_ROW_MARK = /^[↪•]\s*/;

/** A row's date as its first line starts: "31 AGO", or "11 SEP 2026". */
export const NU_ROW_DATE = /^\d{1,2} \p{L}{3}/u;

/** A date's year, alone on a row's second line. */
export const NU_YEAR = /^\d{4}$/;

/** A monthly rate alone, as "Interés del mes" prints it before its value: "2.05%". */
export const NU_RATE = /^\d+(?:[.,]\d+)?\s?%$/;

/** A purchase's installment of its count: "3 de 24". */
export const NU_INSTALLMENTS = /^(\d{1,3}) de (\d{1,3})$/;

/** A card's number as the first page prints it: "• • • • 1234". */
export const NU_CARD_NUMBER = /^(?:•\s*)+(\d{4})$/;
