declare const localDateBrand: unique symbol;

/**
 * A calendar date without time or time zone, as `"YYYY-MM-DD"`: a transaction
 * happens on a day, not at an instant. Only the date helpers create one.
 */
export type LocalDate = string & { readonly [localDateBrand]: true };

/** A range of days with both ends included. */
export type Period = {
  readonly from: LocalDate;
  readonly to: LocalDate;
};

/** How a spreadsheet stores its date cells. See `localDateFromExcelSerial`. */
export type ExcelDateTimeZones = {
  /** Time zone of the wall-clock time stored in the cell. */
  readonly serialTimeZone: string;
  /** Time zone whose calendar day the movement belongs to. */
  readonly targetTimeZone: string;
};
