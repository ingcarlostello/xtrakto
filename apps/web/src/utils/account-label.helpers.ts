import {
  ACCOUNT_TYPE_LABELS,
  BANK_LABELS,
  MASKED_DIGITS,
} from "./account-label.constants";

type Labels = Readonly<Partial<Record<string, string>>>;
type AccountKind = { readonly bankId: string; readonly accountType: string };

// An id without a label is shown as it is: no parser returns one today.
const labelOf = (labels: Labels, id: string): string => labels[id] ?? id;

/** `"Cuenta de ahorros · Bancolombia ••••8901"`, without digits until a statement names them. */
export const accountLabel = (
  { bankId, accountType }: AccountKind,
  last4: string | null,
): string => {
  const name = `${labelOf(ACCOUNT_TYPE_LABELS, accountType)} · ${labelOf(BANK_LABELS, bankId)}`;
  return last4 ? `${name} ${MASKED_DIGITS}${last4}` : name;
};
