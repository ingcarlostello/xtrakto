import { ACCOUNT_TYPE } from "@xtrakto/core";
import {
  ACCOUNT_TYPE_LABELS,
  BANK_LABELS,
  CARD_SHORT_LABEL,
  MASKED_DIGITS,
  PARSED_BANK_ID,
} from "./account-label.constants";

/**
 * Whether an account is another bank's than the one whose formats the parsers
 * read (11.3c): its files are no quarterly statements or movements exports,
 * but spreadsheets with balances or without them.
 */
export const isOtherBank = (bankId: string): boolean =>
  bankId !== PARSED_BANK_ID;

type Labels = Readonly<Partial<Record<string, string>>>;
type AccountKind = { readonly bankId: string; readonly accountType: string };
type Digits = string | null;

/** Whether an account is a credit card's (12.3a). */
export const isCard = ({
  accountType,
}: Pick<AccountKind, "accountType">): boolean =>
  accountType === ACCOUNT_TYPE.CREDIT_CARD;

// An id without a label is shown as it is: no parser returns one today.
const labelOf = (labels: Labels, id: string): string => labels[id] ?? id;

/** `"Cuenta de ahorros · Bancolombia ••••8901"`, without digits until a statement names them. */
export const accountLabel = (
  { bankId, accountType }: AccountKind,
  last4: Digits,
): string => {
  const name = `${labelOf(ACCOUNT_TYPE_LABELS, accountType)} · ${labelOf(BANK_LABELS, bankId)}`;
  return last4 ? `${name} ${MASKED_DIGITS}${last4}` : name;
};

/**
 * `"Cuenta de ahorros ••••8901"`: where the whole label doesn't fit, as on a
 * phone, the digits that tell accounts apart stay in sight. A card goes by
 * its bank, `"Tarjeta Nu ••••5678"`, so two cards with the same digits stay
 * apart (12.3c).
 */
export const accountShortLabel = (
  account: AccountKind,
  last4: Digits,
): string => {
  const name = isCard(account)
    ? `${CARD_SHORT_LABEL} ${labelOf(BANK_LABELS, account.bankId)}`
    : labelOf(ACCOUNT_TYPE_LABELS, account.accountType);
  return last4 ? `${name} ${MASKED_DIGITS}${last4}` : name;
};
