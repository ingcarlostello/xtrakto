import type {
  AmountMinor,
  CalendarQuarter,
  CategoryId,
  LocalDate,
  Period,
} from "@xtrakto/core";
import { and, asc, desc, eq, gte, lte, max, sql } from "drizzle-orm";
import type { AccountRow } from "../accounts/account.queries";
import { accounts } from "../accounts/account.schemas";
import { countedMovement } from "../coverage/coverage.queries";
import { statements } from "../statements/statement.schemas";
import type { UserContext } from "../user-context/user-context.types";
import {
  matchesSearch,
  type MovementSearch,
} from "./transaction-search.queries";
import {
  matchesSelection,
  type MovementSelection,
} from "./transaction-selection.queries";
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
  /** As a rule gave it; `null` when no rule knows the movement. */
  readonly categoryId: CategoryId | null;
  /** The category is a best guess the quick review asks about. */
  readonly isPendingReview: boolean;
};

/** The columns of a `TransactionListItem`, for every list that shows one. */
export const LIST_ITEM_COLUMNS = {
  id: transactions.id,
  date: transactions.date,
  descriptionRaw: transactions.descriptionRaw,
  amountMinor: transactions.amountMinor,
  balanceAfterMinor: transactions.balanceAfterMinor,
  categoryId: transactions.categoryId,
  isPendingReview: transactions.isPendingReview,
};

export type TransactionFilter = MovementSelection & {
  readonly accountId: string;
  /** Inclusive on both ends. */
  readonly period?: Period;
  readonly search?: MovementSearch;
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
  { accountId, period, search, limit, offset, ...selection }: TransactionFilter,
): Promise<TransactionPage> => {
  const rows = await tx
    .select(LIST_ITEM_COLUMNS)
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        countedMovement,
        period === undefined ? undefined : gte(transactions.date, period.from),
        period === undefined ? undefined : lte(transactions.date, period.to),
        search === undefined ? undefined : matchesSearch(search),
        matchesSelection(selection),
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
 * The accounts with movements that count, the one whose latest movement is
 * the most recent first: where the movements list opens. The oldest account
 * wins a tie.
 */
export const listMovementAccounts = ({
  tx,
  userId,
}: UserContext): Promise<AccountRow[]> =>
  tx
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
    .groupBy(accounts.id)
    .orderBy(
      desc(max(transactions.date)),
      asc(accounts.createdAt),
      asc(accounts.id),
    );

/**
 * A quarter with movements that count. It is verified when every one of
 * them carries the balance a verified quarterly statement printed: none
 * comes from a file without balances.
 */
export type MovementQuarter = CalendarQuarter & {
  readonly verified: boolean;
};

/** An account's quarters with movements that count, the latest first. */
export const listMovementQuarters = (
  { tx, userId }: UserContext,
  accountId: string,
): Promise<MovementQuarter[]> => {
  const year = sql<number>`extract(year from ${transactions.date})::int`;
  const quarter = sql<number>`extract(quarter from ${transactions.date})::int`;
  return tx
    .select({
      year,
      quarter,
      verified: sql<boolean>`bool_and(${transactions.balanceAfterMinor} is not null)`,
    })
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        countedMovement,
      ),
    )
    .groupBy(year, quarter)
    .orderBy(desc(year), desc(quarter));
};
