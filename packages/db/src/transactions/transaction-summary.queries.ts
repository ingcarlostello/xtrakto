import type { Period, RecurringMovement } from "@xtrakto/core";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { countedMovement } from "../coverage/coverage.queries";
import { statements } from "../statements/statement.schemas";
import type { UserContext } from "../user-context/user-context.types";
import {
  LIST_ITEM_COLUMNS,
  type TransactionListItem,
} from "./transaction.queries";
import { transactions } from "./transaction.schemas";

/**
 * A movement that counts, with what a period's summary reads of it: what
 * a list shows of it, which "Tu extracto, traducido" shows too (8.6c), and
 * the number it went to.
 */
export type PeriodMovement = RecurringMovement & TransactionListItem;

/**
 * An account's movements that count in a period, the oldest first, with
 * only what its summary (`summarizeMovements`), its balance, its payments
 * that repeat (`findRecurringPayments`) and its translated lines read of
 * each.
 */
export const listSummaryMovements = (
  { tx, userId }: UserContext,
  {
    accountId,
    period,
  }: { readonly accountId: string; readonly period: Period },
): Promise<PeriodMovement[]> =>
  tx
    .select({
      ...LIST_ITEM_COLUMNS,
      referenceHash: transactions.referenceHash,
      referenceLast4: transactions.referenceLast4,
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

/**
 * The day and the bank's text of the movements that count and that these
 * statements saved, with no one else's: what an upload brought (10.4b).
 */
export const listMovementsOfStatements = async (
  { tx, userId }: UserContext,
  statementIds: readonly string[],
): Promise<Pick<PeriodMovement, "date" | "descriptionRaw">[]> =>
  statementIds.length === 0
    ? []
    : tx
        .select({
          date: transactions.date,
          descriptionRaw: transactions.descriptionRaw,
        })
        .from(transactions)
        .innerJoin(statements, eq(statements.id, transactions.statementId))
        .where(
          and(
            eq(transactions.userId, userId),
            inArray(transactions.statementId, [...statementIds]),
            countedMovement,
          ),
        );
