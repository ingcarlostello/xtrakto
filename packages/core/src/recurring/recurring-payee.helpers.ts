import { categoryKind } from "../categories/category.helpers";
import { NO_DESCRIPTION } from "../categorization/categorization.constants";
import type { CategorizationRuleId } from "../categorization/categorization.types";
import { payeeOf } from "../categorization/channel.helpers";
import { compareLocalDates } from "../dates/date.helpers";
import { foldText } from "../text/text.utils";
import { MIN_SHARED_NAME_LENGTH } from "./recurring.constants";
import type { RecurringMovement } from "./recurring.types";

// The 4x1000 follows what moved that month: it's no bill.
const GMF_TAX_RULE: CategorizationRuleId = "gmf_tax";
const NUMBER_MARK = "#";

/** The payments that went to one payee, the oldest first. */
export type PayeePayments = {
  /** A name, or a number marked as one (`isNumberPayee`). */
  readonly payee: string;
  readonly payments: readonly RecurringMovement[];
};

// Money out that is real spending or only moves; not the 4x1000, nor cash,
// which pays no one in particular, nor the bank's 0, which names no one.
const mayRepeat = ({
  amountMinor,
  categoryId,
  categoryRuleId,
  descriptionRaw,
}: RecurringMovement): boolean => {
  if (amountMinor >= 0 || categoryId === null) return false;
  if (categoryRuleId === GMF_TAX_RULE || categoryId === "cash_withdrawal")
    return false;
  const kind = categoryKind(categoryId);
  return (
    (kind === "spending" || kind === "internal") &&
    foldText(descriptionRaw) !== NO_DESCRIPTION
  );
};

// Who a payment went to: the words after its channel's, or the number it
// went to when they name no one, as a Nequi send's.
const payeeKeyOf = ({
  descriptionRaw,
  referenceHash,
}: RecurringMovement): string | undefined => {
  const { words } = payeeOf(descriptionRaw);
  if (words.length > 0) return words.join(" ");
  return referenceHash === null ? undefined : NUMBER_MARK + referenceHash;
};

/** Whether a payee is the number paid rather than a name. */
export const isNumberPayee = (payee: string): boolean =>
  payee.startsWith(NUMBER_MARK);

// The bank cuts a name in different places, after a channel's longer words
// or before an accented letter, so a name joins the longest one it starts.
const mergeCutNames = (
  keys: readonly string[],
): ReadonlyMap<string, string> => {
  const longestFirst = [...new Set(keys)].sort((a, b) => b.length - a.length);
  const names: string[] = [];
  const merged = new Map<string, string>();
  for (const key of longestFirst) {
    const longer =
      isNumberPayee(key) || key.length < MIN_SHARED_NAME_LENGTH
        ? undefined
        : names.find((name) => name.startsWith(key));
    if (longer === undefined) names.push(key);
    merged.set(key, longer ?? key);
  }
  return merged;
};

/** The payments that may repeat, by who they went to. */
export const paymentsByPayee = (
  movements: readonly RecurringMovement[],
): PayeePayments[] => {
  const paid = movements.filter(mayRepeat).flatMap((movement) => {
    const key = payeeKeyOf(movement);
    return key === undefined ? [] : [{ movement, key }];
  });
  const merged = mergeCutNames(paid.map(({ key }) => key));
  const groups = new Map<string, RecurringMovement[]>();
  for (const { movement, key } of paid) {
    const payee = merged.get(key) ?? key;
    const group = groups.get(payee);
    if (group === undefined) groups.set(payee, [movement]);
    else group.push(movement);
  }
  return [...groups].map(([payee, payments]) => ({
    payee,
    payments: payments.sort((a, b) => compareLocalDates(a.date, b.date)),
  }));
};
