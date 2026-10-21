import { formatMonthName } from "@xtrakto/core";
import type { MovementPeriod } from "./transactions-url.helpers";

// The words around a period's months: "Julio a septiembre de 2026".
const WORDS = { to: "a", of: "de" } as const;

/** A period in words: `"Julio a septiembre de 2026"`, `"Agosto de 2026"`. */
export const periodWords = (period: MovementPeriod): string => {
  if (period.kind === "month")
    return `${formatMonthName(period)} ${WORDS.of} ${period.year}`;
  const first = { year: period.year, month: period.quarter * 3 - 2 };
  const last = { year: period.year, month: period.quarter * 3 };
  return `${formatMonthName(first)} ${WORDS.to} ${formatMonthName(last).toLowerCase()} ${WORDS.of} ${period.year}`;
};
