import { CATEGORIZATION_RULES } from "@xtrakto/core";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import { transactions } from "./transaction.schemas";

// The rules that recognize the holder's name, whole or cut (6.2a).
const OWN_NAME_RULES = CATEGORIZATION_RULES.flatMap((rule) =>
  "namesHolder" in rule ? [rule.id] : [],
);

/** How many texts "Cómo te escribe el banco" shows at most. */
export const OWN_NAME_TEXTS_SHOWN = 10;

/**
 * The texts in which the rules of the holder's name recognized the user,
 * as the bank printed them (7.7c): those still counted as theirs, so not
 * one the user said is someone else's; the most frequent first.
 */
export const listOwnNameTexts = async ({
  tx,
  userId,
}: UserContext): Promise<string[]> => {
  const rows = await tx
    .select({ text: transactions.descriptionRaw })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        inArray(transactions.categoryRuleId, OWN_NAME_RULES),
        eq(transactions.categoryId, "own_account_transfer"),
      ),
    )
    .groupBy(transactions.descriptionRaw)
    .orderBy(desc(count()), asc(transactions.descriptionRaw))
    .limit(OWN_NAME_TEXTS_SHOWN);
  return rows.map(({ text }) => text);
};
