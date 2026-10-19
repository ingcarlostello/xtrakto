import type {
  CategorizationRuleId,
  CategorySource,
  Period,
} from "@xtrakto/core";
import { and, eq } from "drizzle-orm";
import { countedMovement } from "../coverage/coverage.queries";
import { statements } from "../statements/statement.schemas";
import type { UserContext } from "../user-context/user-context.types";
import {
  LIST_ITEM_COLUMNS,
  type TransactionListItem,
} from "./transaction.queries";
import { transactions } from "./transaction.schemas";

/**
 * A movement as its detail shows it (docs/ui/v8-03): what the list shows,
 * the digits its reference kept, who gave its category, and the statement
 * it was saved from.
 */
export type MovementDetail = TransactionListItem & {
  /** The last 4 digits of the number it went to or came from, when it had one. */
  readonly referenceLast4: string | null;
  readonly categorySource: CategorySource | null;
  /** The table's rule that matched it, kept when the user decides (ADR 0025). */
  readonly categoryRuleId: CategorizationRuleId | null;
  readonly statement: { readonly formatId: string; readonly period: Period };
};

/**
 * One of an account's movements that count, with its detail. `undefined`
 * when the account has no such movement, or it counts nowhere.
 */
export const findMovementDetail = async (
  { tx, userId }: UserContext,
  {
    accountId,
    movementId,
  }: { readonly accountId: string; readonly movementId: string },
): Promise<MovementDetail | undefined> => {
  const [row] = await tx
    .select({
      ...LIST_ITEM_COLUMNS,
      referenceLast4: transactions.referenceLast4,
      categorySource: transactions.categorySource,
      categoryRuleId: transactions.categoryRuleId,
      formatId: statements.formatId,
      from: statements.periodFrom,
      to: statements.periodTo,
    })
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        eq(transactions.id, movementId),
        countedMovement,
      ),
    )
    .limit(1);
  if (!row) return undefined;
  const { formatId, from, to, ...movement } = row;
  return { ...movement, statement: { formatId, period: { from, to } } };
};
