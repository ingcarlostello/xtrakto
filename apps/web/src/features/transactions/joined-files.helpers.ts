import type { PeriodFiles } from "@xtrakto/db";
import { countText } from "@/utils/count-text.utils";
import { joined } from "@/utils/list-text.utils";
import { TRANSACTIONS_COPY } from "./transaction.constants";

const COPY = TRANSACTIONS_COPY.joined;

// "tu extracto trimestral", or how many when there are several.
const quarterlyWords = (count: number): string =>
  count === 1 ? COPY.yourQuarterly : countText(count, COPY.quarterlies);

/**
 * What the list joined, when a movements file is among several files of the
 * period (10.1c): "Juntamos tu extracto trimestral y 2 archivos de
 * movimientos, sin duplicar." Nothing for one file, or quarterly statements
 * alone, which never repeat each other's movements.
 */
export const joinedFilesText = ({
  quarterly,
  movements,
}: PeriodFiles): string | undefined => {
  if (movements === 0 || quarterly + movements < 2) return undefined;
  const files = [
    ...(quarterly === 0 ? [] : [quarterlyWords(quarterly)]),
    countText(movements, COPY.movements),
  ];
  return `${COPY.before} ${joined(files)}, ${COPY.after}`;
};
