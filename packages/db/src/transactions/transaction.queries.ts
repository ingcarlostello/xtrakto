import type { AmountMinor, LocalDate, Period } from "@xtrakto/core";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import type { AccountRow } from "../accounts/account.queries";
import { accounts } from "../accounts/account.schemas";
import { countedMovement } from "../coverage/coverage.queries";
import { statements } from "../statements/statement.schemas";
import type { UserContext } from "../user-context/user-context.types";
import { transactions } from "./transaction.schemas";

/** A movement as the movements list shows it, and nothing more. */
export type TransactionListItem = {
  readonly id: string;
  readonly date: LocalDate;
  /** As the bank printed it, long numbers masked (ADR 0012). */
  readonly descriptionRaw: string;
  readonly amountMinor: AmountMinor;
  /** Only a statement with balances prints it. */
  readonly balanceAfterMinor: AmountMinor | null;
};

export type TransactionFilter = {
  readonly accountId: string;
  /** Inclusive on both ends. */
  readonly period?: Period;
  readonly limit: number;
  readonly offset: number;
};

export type TransactionPage = {
  readonly items: readonly TransactionListItem[];
  readonly hasMore: boolean;
};

/**
 * An account's movements that count (`countedMovement`), newest first and,
 * within a day, the bank's last one first, so a day's first row carries its
 * closing balance. Reads one row past the page to know whether another
 * page follows.
 */
export const listTransactions = async (
  { tx, userId }: UserContext,
  { accountId, period, limit, offset }: TransactionFilter,
): Promise<TransactionPage> => {
  const rows = await tx
    .select({
      id: transactions.id,
      date: transactions.date,
      descriptionRaw: transactions.descriptionRaw,
      amountMinor: transactions.amountMinor,
      balanceAfterMinor: transactions.balanceAfterMinor,
    })
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        countedMovement,
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

/**
 * The account whose latest movement that counts is the most recent, where
 * the movements list opens; the oldest account wins a tie. `undefined` when
 * no movement counts yet.
 */
export const findLatestMovementAccount = async ({
  tx,
  userId,
}: UserContext): Promise<AccountRow | undefined> => {
  const [account] = await tx
    .select({
      id: accounts.id,
      bankId: accounts.bankId,
      accountType: accounts.accountType,
      last4: accounts.last4,
    })
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(and(eq(transactions.userId, userId), countedMovement))
    .orderBy(desc(transactions.date), asc(accounts.createdAt), asc(accounts.id))
    .limit(1);
  return account;
};
