import { PERIOD_SOURCE } from "@xtrakto/core";
import type { PeriodSource } from "@xtrakto/core";
import type { FormatId } from "@xtrakto/parsers";

// Keyed by the parsers' format ids: the build fails if a format has no label.
export const FORMAT_LABELS = {
  "bancolombia-savings-quarterly": "Extracto trimestral",
  "bancolombia-savings-quarterly-pdf": "Extracto trimestral",
  "bancolombia-movements-export": "Movimientos",
  "bancolombia-movements-export-pdf": "Movimientos",
} as const satisfies Record<FormatId, string>;

/** The files statements come in, as their tags say it. */
export const FILE_TYPE = { EXCEL: "Excel", PDF: "PDF" } as const;

// The file each format comes in, as its tags and "Archivos subidos" say it.
export const FORMAT_FILE_TYPES = {
  "bancolombia-savings-quarterly": FILE_TYPE.EXCEL,
  "bancolombia-savings-quarterly-pdf": FILE_TYPE.PDF,
  "bancolombia-movements-export": FILE_TYPE.EXCEL,
  "bancolombia-movements-export-pdf": FILE_TYPE.PDF,
} as const satisfies Record<
  FormatId,
  (typeof FILE_TYPE)[keyof typeof FILE_TYPE]
>;

// A statement's own period reads as months, a range of movements as days.
export const FORMAT_PERIOD_SOURCE = {
  "bancolombia-savings-quarterly": PERIOD_SOURCE.STATEMENT,
  "bancolombia-savings-quarterly-pdf": PERIOD_SOURCE.STATEMENT,
  "bancolombia-movements-export": PERIOD_SOURCE.ROWS,
  "bancolombia-movements-export-pdf": PERIOD_SOURCE.ROWS,
} as const satisfies Record<FormatId, PeriodSource>;
