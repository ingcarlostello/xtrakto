import type { Period, RecurringMovement } from "@xtrakto/core";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { countedMovement } from "../coverage/coverage.queries";
import { statements } from "../statements/statement.schemas";
import type { UserContext } from "../user-context/user-context.types";
import { transactions } from "./transaction.schemas";

/**
 * An account's movements that count in a period, the oldest first, with
 * only what its summary (`summarizeMovements`) and its payments that repeat
 * (`findRecurringPayments`) read of each.
 */
export const listSummaryMovements = (
  { tx, userId }: UserContext,
  {
    accountId,
    period,
  }: { readonly accountId: string; readonly period: Period },
): Promise<RecurringMovement[]> =>
  tx
    .select({
      date: transactions.date,
      amountMinor: transactions.amountMinor,
      descriptionRaw: transactions.descriptionRaw,
      referenceHash: transactions.referenceHash,
      referenceLast4: transactions.referenceLast4,
      categoryId: transactions.categoryId,
      categoryRuleId: transactions.categoryRuleId,
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
    .orderBy(
      asc(transactions.date),
      asc(transactions.position),
      asc(transactions.id),
    );
