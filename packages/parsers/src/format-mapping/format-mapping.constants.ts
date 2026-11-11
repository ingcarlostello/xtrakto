import { DEFAULT_TIME_ZONE } from "@xtrakto/core";
import type { BankId, ExcelDateTimeZones } from "@xtrakto/core";

/**
 * The format stored with every statement read through a mapping, whatever
 * its bank (Stage 11): the mapping, not the format, says how it was read.
 */
export const MAPPED_FORMAT_ID = "mapped-spreadsheet";

/**
 * Another bank's date cell reads as the day it shows: its time is Bogotá's
 * wall clock, as Excel shows it to the person.
 */
export const MAPPED_DATE_TIME_ZONES: ExcelDateTimeZones = {
  serialTimeZone: DEFAULT_TIME_ZONE,
  targetTimeZone: DEFAULT_TIME_ZONE,
};

/** The fewest names a table's header has: a date, a description and an amount. */
export const MIN_HEADER_NAMES = 3;

/** A date cell as a sample shows it: the shape of the day it holds. */
export const DATE_CELL_SHAPE = "9999-99-99";

/** A proposed mapping's bank, until the person says whose it is (11.3a). */
export const PROPOSED_BANK_ID: BankId = "other";

/**
 * The words a direction column writes for money that came in, as compared
 * (`comparableText`): Colombia's banks', and English ones.
 */
export const DIRECTION_WORDS_IN: ReadonlySet<string> = new Set([
  "+",
  "C",
  "CR",
  "CRE",
  "CRED",
  "CREDITO",
  "CREDITOS",
  "ABONO",
  "ABONOS",
  "DEPOSITO",
  "DEPOSITOS",
  "ENTRADA",
  "ENTRADAS",
  "INGRESO",
  "INGRESOS",
  "CREDIT",
  "DEPOSIT",
]);

/** The words a direction column writes for money that went out, as compared. */
export const DIRECTION_WORDS_OUT: ReadonlySet<string> = new Set([
  "-",
  "D",
  "DB",
  "DR",
  "DEB",
  "DEBITO",
  "DEBITOS",
  "CARGO",
  "CARGOS",
  "RETIRO",
  "RETIROS",
  "SALIDA",
  "SALIDAS",
  "EGRESO",
  "EGRESOS",
  "DEBIT",
  "WITHDRAWAL",
]);
