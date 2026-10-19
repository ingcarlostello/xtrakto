import { PERIOD_SOURCE } from "@xtrakto/core";
import type { PeriodSource } from "@xtrakto/core";
import type { FormatId } from "@xtrakto/parsers";

// Keyed by the parsers' format ids: the build fails if a format has no label.
export const FORMAT_LABELS = {
  "bancolombia-savings-quarterly": "Extracto trimestral",
  "bancolombia-movements-export": "Movimientos",
} as const satisfies Record<FormatId, string>;

// A statement's own period reads as months, a range of movements as days.
export const FORMAT_PERIOD_SOURCE = {
  "bancolombia-savings-quarterly": PERIOD_SOURCE.STATEMENT,
  "bancolombia-movements-export": PERIOD_SOURCE.ROWS,
} as const satisfies Record<FormatId, PeriodSource>;
