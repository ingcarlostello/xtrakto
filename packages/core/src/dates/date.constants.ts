/** Default time zone for bank dates. Colombia has no daylight saving time. */
export const DEFAULT_TIME_ZONE = "America/Bogota";

/** The order a bank's file writes a date's day, month and year in. */
export const DATE_ORDER = {
  DAY_MONTH_YEAR: "dmy",
  MONTH_DAY_YEAR: "mdy",
  YEAR_MONTH_DAY: "ymd",
} as const;
