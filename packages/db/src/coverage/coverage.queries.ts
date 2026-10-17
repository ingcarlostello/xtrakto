import type { LocalDate, Period } from "@xtrakto/core";
import {
  and,
  count,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
} from "drizzle-orm";
import { statements } from "../statements/statement.schemas";
import {
  matchesSearch,
  type MovementSearch,
} from "../transactions/transaction-search.queries";
import {
  matchesSelection,
  type MovementSelection,
} from "../transactions/transaction-selection.queries";
import { transactions } from "../transactions/transaction.schemas";
import type { UserContext } from "../user-context/user-context.types";

// A verified quarterly statement holds the days of its other-format
// movements (ADR 0018). Its period opens on the previous quarter's last day,
// 2026-06-30 for July to September, which only gives the opening balance and
// belongs to the previous statement: its days start the next one.

/**
 * The movements that count, for every reader: none that a verified quarterly
 * statement hides, and none of a statement with balances that don't
 * reconcile. Use it on `transactions` joined with their `statements`.
 */
export const countedMovement = and(
  isNull(transactions.coveredByStatementId),
  or(
    eq(statements.balanceVerified, true),
    isNull(statements.openingBalanceMinor),
  ),
);

/** Which movements to count: an account's, a period's, or every one. */
export type CountedFilter = MovementSelection & {
  readonly accountId?: string;
  /** Inclusive on both ends. */
  readonly period?: Period;
  readonly search?: MovementSearch;
};

/** How many of the user's movements count, within `filter`. */
export const countCountedMovements = async (
  { tx, userId }: UserContext,
  { accountId, period, search, ...selection }: CountedFilter = {},
): Promise<number> => {
  const [row] = await tx
    .select({ counted: count() })
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .where(
      and(
        eq(transactions.userId, userId),
        accountId === undefined
          ? undefined
          : eq(transactions.accountId, accountId),
        period === undefined ? undefined : gte(transactions.date, period.from),
        period === undefined ? undefined : lte(transactions.date, period.to),
        search === undefined ? undefined : matchesSearch(search),
        matchesSelection(selection),
        countedMovement,
      ),
    );
  return row?.counted ?? 0;
};

/** A verified quarterly statement's days: after `after`, through `through`. */
export type CoveredDays = {
  readonly statementId: string;
  readonly after: LocalDate;
  readonly through: LocalDate;
};

/** The account's verified quarterly statements whose days meet `period`. */
export const coveringStatements = (
  { tx, userId }: UserContext,
  accountId: string,
  period: Period,
): Promise<CoveredDays[]> =>
  tx
    .select({
      statementId: statements.id,
      after: statements.periodFrom,
      through: statements.periodTo,
    })
    .from(statements)
    .where(
      and(
        eq(statements.userId, userId),
        eq(statements.accountId, accountId),
        eq(statements.balanceVerified, true),
        isNotNull(statements.openingBalanceMinor),
        lt(statements.periodFrom, period.to),
        gte(statements.periodTo, period.from),
      ),
    );

/** The statement among `covering` whose days hold `date`, if any. */
export const coveringStatementOf = (
  covering: readonly CoveredDays[],
  date: LocalDate,
): string | undefined =>
  covering.find(({ after, through }) => date > after && date <= through)
    ?.statementId;

/**
 * Hides, under a verified quarterly statement just saved, the movements of
 * statements without balances (movements exports) saved before it on its
 * days. Returns how many it hid.
 */
export const hideOtherFormats = async (
  { tx, userId }: UserContext,
  accountId: string,
  days: CoveredDays,
): Promise<number> => {
  const withoutBalances = tx
    .select({ id: statements.id })
    .from(statements)
    .where(
      and(
        eq(statements.userId, userId),
        eq(statements.accountId, accountId),
        isNull(statements.openingBalanceMinor),
      ),
    );
  const hidden = await tx
    .update(transactions)
    .set({ coveredByStatementId: days.statementId })
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        isNull(transactions.coveredByStatementId),
        gt(transactions.date, days.after),
        lte(transactions.date, days.through),
        inArray(transactions.statementId, withoutBalances),
      ),
    )
    .returning({ id: transactions.id });
  return hidden.length;
};
