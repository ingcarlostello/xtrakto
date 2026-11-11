import type { UserFiles } from "@xtrakto/db";
import { isOtherBank } from "@/utils/account-label.helpers";
import { countText, wordFor } from "@/utils/count-text.utils";
import { joined } from "@/utils/list-text.utils";
import { YOUR_DATA_COPY as COPY } from "./user.constants";

type Kinds = {
  readonly quarterly: number;
  readonly movements: number;
  readonly otherBanks: number;
};

// Bancolombia's files by kind, quarterly statements with balances and
// movements files without; another bank's, all together (11.3c).
const kindsOf = (files: UserFiles): Kinds =>
  files.reduce<Kinds>(
    (kinds, { bankId, withBalances, withoutBalances }) =>
      isOtherBank(bankId)
        ? {
            ...kinds,
            otherBanks: kinds.otherBanks + withBalances + withoutBalances,
          }
        : {
            ...kinds,
            quarterly: kinds.quarterly + withBalances,
            movements: kinds.movements + withoutBalances,
          },
    { quarterly: 0, movements: 0, otherBanks: 0 },
  );

/**
 * The files the user keeps, by kind (docs/ui/v8-11): "9 archivos: 3
 * trimestrales y 6 de movimientos.", "2 archivos trimestrales.", "11
 * archivos: 3 trimestrales, 6 de movimientos y 2 de otros bancos.", or that
 * there are none.
 */
export const filesText = (files: UserFiles): string => {
  const { quarterly, movements, otherBanks } = kindsOf(files);
  const total = quarterly + movements + otherBanks;
  if (total === 0) return COPY.none;
  const kinds = [
    ...(quarterly === 0
      ? []
      : [{ count: quarterly, word: wordFor(quarterly, COPY.quarterly) }]),
    ...(movements === 0 ? [] : [{ count: movements, word: COPY.movements }]),
    ...(otherBanks === 0 ? [] : [{ count: otherBanks, word: COPY.otherBanks }]),
  ];
  const all = countText(total, COPY.files);
  const [only] = kinds;
  if (kinds.length === 1 && only) return `${all} ${only.word}.`;
  return `${all}: ${joined(kinds.map(({ count, word }) => `${count} ${word}`))}.`;
};
