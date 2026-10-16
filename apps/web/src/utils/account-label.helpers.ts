import {
  ACCOUNT_TYPE_LABELS,
  BANK_LABELS,
  MASKED_DIGITS,
} from "./account-label.constants";

type Labels = Readonly<Partial<Record<string, string>>>;
type AccountKind = { readonly bankId: string; readonly accountType: string };
type Digits = string | null;

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
 * phone, the digits that tell accounts apart stay in sight.
 */
export const accountShortLabel = (
  { accountType }: Pick<AccountKind, "accountType">,
  last4: Digits,
): string => {
  const name = labelOf(ACCOUNT_TYPE_LABELS, accountType);
  return last4 ? `${name} ${MASKED_DIGITS}${last4}` : name;
};
