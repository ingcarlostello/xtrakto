import type { PeriodFiles } from "@xtrakto/db";
import { isOtherBank } from "@/utils/account-label.helpers";
import { countText } from "@/utils/count-text.utils";
import { joined } from "@/utils/list-text.utils";
import { TRANSACTIONS_COPY } from "./transaction.constants";

const COPY = TRANSACTIONS_COPY.joined;

// "tu extracto trimestral", or how many when there are several; another
// bank's files with balances by what they are (11.3c).
const withBalancesWords = (count: number, bankId: string): string => {
  const words = isOtherBank(bankId) ? COPY.balances : COPY.quarterly;
  return count === 1 ? words.yours : countText(count, words.files);
};

/**
 * What the list joined, when a movements file is among several files of the
 * period (10.1c): "Juntamos tu extracto trimestral y 2 archivos de
 * movimientos, sin duplicar.", or, for another bank's account, "tu archivo
 * con saldos". Nothing for one file, or files with balances alone, which
 * never repeat each other's movements.
 */
export const joinedFilesText = (
  { quarterly, movements }: PeriodFiles,
  bankId: string,
): string | undefined => {
  if (movements === 0 || quarterly + movements < 2) return undefined;
  const files = [
    ...(quarterly === 0 ? [] : [withBalancesWords(quarterly, bankId)]),
    countText(movements, COPY.movements),
  ];
  return `${COPY.before} ${joined(files)}, ${COPY.after}`;
};
