import type { Period } from "@xtrakto/core";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import { transactions } from "./transaction.schemas";

export type TransactionRow = typeof transactions.$inferSelect;

export type TransactionFilter = {
  readonly accountId?: string;
  /** Inclusive on both ends. */
  readonly period?: Period;
  readonly limit: number;
  readonly offset: number;
};

export type TransactionPage = {
  readonly items: readonly TransactionRow[];
  readonly hasMore: boolean;
};

/**
 * The user's movements, newest first and in the bank's order within a day.
 * Reads one row past the page to know whether another page follows.
 */
export const listTransactions = async (
  { tx, userId }: UserContext,
  { accountId, period, limit, offset }: TransactionFilter,
): Promise<TransactionPage> => {
  const rows = await tx
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        accountId === undefined
          ? undefined
          : eq(transactions.accountId, accountId),
        period === undefined ? undefined : gte(transactions.date, period.from),
        period === undefined ? undefined : lte(transactions.date, period.to),
      ),
    )
    .orderBy(
      desc(transactions.date),
      desc(transactions.position),
      desc(transactions.id),
    )
    .limit(limit + 1)
    .offset(offset);
  return { items: rows.slice(0, limit), hasMore: rows.length > limit };
};
