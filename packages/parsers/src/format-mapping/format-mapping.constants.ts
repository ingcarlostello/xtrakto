import { DEFAULT_TIME_ZONE } from "@xtrakto/core";
import type { ExcelDateTimeZones } from "@xtrakto/core";

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
