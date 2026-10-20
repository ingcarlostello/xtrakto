import type { CategoryTotals, Period } from "@xtrakto/core";
import { and, eq, gte, lte, type SQL, sql } from "drizzle-orm";
import { countedMovement } from "../coverage/coverage.queries";
import { statements } from "../statements/statement.schemas";
import type { UserContext } from "../user-context/user-context.types";
import { transactions } from "./transaction.schemas";

const sumWhere = (direction: SQL) =>
  sql`coalesce(sum(${transactions.amountMinor}) filter (where ${direction}), 0)::bigint`.mapWith(
    transactions.amountMinor,
  );

const countWhere = (direction: SQL) =>
  sql`count(*) filter (where ${direction})`.mapWith(Number);

/**
 * An account's movements that count in a period, added up by category, in
 * each direction: what the kind totals of the movements list read.
 */
export const listCategoryTotals = (
  { tx, userId }: UserContext,
  {
    accountId,
    period,
  }: { readonly accountId: string; readonly period: Period },
): Promise<CategoryTotals[]> => {
  const moneyIn = sql`${transactions.amountMinor} > 0`;
  const moneyOut = sql`${transactions.amountMinor} < 0`;
  return tx
    .select({
      categoryId: transactions.categoryId,
      inMinor: sumWhere(moneyIn),
      inCount: countWhere(moneyIn),
      outMinor: sumWhere(moneyOut),
      outCount: countWhere(moneyOut),
    })
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        gte(transactions.date, period.from),
        lte(transactions.date, period.to),
        countedMovement,
      ),
    )
    .groupBy(transactions.categoryId);
};
