import type { AmountMinor, Period } from "@xtrakto/core";
import { and, desc, eq, gte, isNotNull, lt } from "drizzle-orm";
import type { AccountRow } from "../accounts/account.queries";
import { accounts } from "../accounts/account.schemas";
import {
  LIST_ITEM_COLUMNS,
  type TransactionListItem,
} from "../transactions/transaction.queries";
import { transactions } from "../transactions/transaction.schemas";
import type { UserContext } from "../user-context/user-context.types";
import { statements } from "./statement.schemas";

/** A statement whose balances don't reconcile: none of its movements count. */
export type UnreconciledStatement = {
  readonly id: string;
  readonly accountId: string;
  /** From the day of its opening balance, which belongs to the period before. */
  readonly period: Period;
  /** The closing balance minus the opening balance and every amount. */
  readonly differenceMinor: AmountMinor | null;
};

const doesNotReconcile = (userId: string) =>
  and(
    eq(statements.userId, userId),
    eq(statements.balanceVerified, false),
    isNotNull(statements.openingBalanceMinor),
  );

/**
 * The user's statements that don't reconcile, the latest first: of one
 * account, and whose days (after its opening balance's) meet `period`.
 */
export const listUnreconciledStatements = (
  { tx, userId }: UserContext,
  {
    accountId,
    period,
  }: { readonly accountId?: string; readonly period?: Period } = {},
): Promise<UnreconciledStatement[]> =>
  tx
    .select({
      id: statements.id,
      accountId: statements.accountId,
      from: statements.periodFrom,
      to: statements.periodTo,
      differenceMinor: statements.balanceDifferenceMinor,
    })
    .from(statements)
    .where(
      and(
        doesNotReconcile(userId),
        accountId === undefined
          ? undefined
          : eq(statements.accountId, accountId),
        period === undefined ? undefined : lt(statements.periodFrom, period.to),
        period === undefined
          ? undefined
          : gte(statements.periodTo, period.from),
      ),
    )
    .orderBy(desc(statements.periodTo), desc(statements.id))
    .then((rows) =>
      rows.map(({ from, to, ...statement }) => ({
        ...statement,
        period: { from, to },
      })),
    );

/** A statement that doesn't reconcile, with every movement it printed. */
export type StatementBreaks = {
  readonly statement: UnreconciledStatement & {
    readonly openingBalanceMinor: AmountMinor | null;
    /** Where the chain of balances breaks: the movements' positions. */
    readonly breakPositions: readonly number[];
  };
  readonly account: AccountRow;
  /** Newest first, each with its order in the statement. */
  readonly movements: readonly (TransactionListItem & {
    readonly position: number;
  })[];
};

/**
 * One of the user's statements that don't reconcile, with its account and
 * all its movements, counted or not. `undefined` when it isn't theirs, or
 * reconciles.
 */
export const findStatementBreaks = async (
  { tx, userId }: UserContext,
  statementId: string,
): Promise<StatementBreaks | undefined> => {
  const [found] = await tx
    .select({
      id: statements.id,
      from: statements.periodFrom,
      to: statements.periodTo,
      differenceMinor: statements.balanceDifferenceMinor,
      openingBalanceMinor: statements.openingBalanceMinor,
      breakPositions: statements.balanceBreakPositions,
      account: {
        id: accounts.id,
        bankId: accounts.bankId,
        accountType: accounts.accountType,
        last4: accounts.last4,
      },
    })
    .from(statements)
    .innerJoin(accounts, eq(accounts.id, statements.accountId))
    .where(and(doesNotReconcile(userId), eq(statements.id, statementId)));
  if (!found) return undefined;
  const movements = await tx
    .select({ ...LIST_ITEM_COLUMNS, position: transactions.position })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.statementId, statementId),
      ),
    )
    .orderBy(desc(transactions.position));
  const { from, to, account, ...statement } = found;
  return {
    statement: { ...statement, accountId: account.id, period: { from, to } },
    account,
    movements,
  };
};
