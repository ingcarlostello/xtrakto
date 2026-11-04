import {
  formatDayRange,
  formatMonthRange,
  type Period,
  PERIOD_SOURCE,
  type PeriodSource,
} from "@xtrakto/core";
import {
  FILE_TYPE,
  FORMAT_FILE_TYPES,
  FORMAT_LABELS,
  FORMAT_PERIOD_SOURCE,
} from "./statement-label.constants";

type Labels = Readonly<Partial<Record<string, string>>>;

/** An id's label; an id without one is shown as it is: no parser returns one today. */
export const labelOf = (labels: Labels, id: string): string => labels[id] ?? id;

/** The file a format comes in: "Excel" or "PDF". */
export const fileTypeOf = (formatId: string): string =>
  labelOf(FORMAT_FILE_TYPES, formatId);

/** Whether a format's files are PDFs, which show the PDF's icon. */
export const isPdfFormat = (formatId: string | undefined): boolean =>
  formatId !== undefined && fileTypeOf(formatId) === FILE_TYPE.PDF;

/** A statement's own period as months, a range of movements as days. */
export const periodText = (period: Period, source: PeriodSource): string =>
  source === PERIOD_SOURCE.STATEMENT
    ? formatMonthRange(period)
    : formatDayRange(period);

// Any other format's period reads as days, as a range of movements does.
const PERIOD_SOURCES: Readonly<Partial<Record<string, PeriodSource>>> =
  FORMAT_PERIOD_SOURCE;

/** A saved statement's period as its format reads it: "jul–sep 2026". */
export const statementPeriodText = (formatId: string, period: Period): string =>
  periodText(period, PERIOD_SOURCES[formatId] ?? PERIOD_SOURCE.ROWS);

/** A saved statement by its format and period: "Extracto trimestral jul–sep 2026". */
export const statementLabel = (formatId: string, period: Period): string =>
  `${labelOf(FORMAT_LABELS, formatId)} ${statementPeriodText(formatId, period)}`;
