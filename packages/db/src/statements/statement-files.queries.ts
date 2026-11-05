import type { Period } from "@xtrakto/core";
import { and, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { countingStatement } from "../coverage/coverage.queries";
import { transactions } from "../transactions/transaction.schemas";
import type { UserContext } from "../user-context/user-context.types";
import { statements } from "./statement.schemas";

/** The files that saved an account's movements on a period's days (10.1c). */
export type PeriodFiles = {
  /** Quarterly statements, which print balances. */
  readonly quarterly: number;
  /** Movements files, which print none. */
  readonly movements: number;
};

/**
 * How many of the user's files saved the account's movements on the
 * period's days, inclusive: those that count, and those a verified quarterly
 * statement hides, which it joined without counting them twice. A statement
 * that doesn't reconcile counts nowhere, and a file whose movements another
 * saved before saved none.
 */
export const countPeriodFiles = async (
  { tx, userId }: UserContext,
  {
    accountId,
    period,
  }: { readonly accountId: string; readonly period: Period },
): Promise<PeriodFiles> => {
  const [row] = await tx
    .select({
      quarterly:
        sql<number>`count(distinct ${statements.id}) filter (where ${isNotNull(statements.openingBalanceMinor)})`.mapWith(
          Number,
        ),
      movements:
        sql<number>`count(distinct ${statements.id}) filter (where ${isNull(statements.openingBalanceMinor)})`.mapWith(
          Number,
        ),
    })
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        gte(transactions.date, period.from),
        lte(transactions.date, period.to),
        countingStatement,
      ),
    );
  return { quarterly: row?.quarterly ?? 0, movements: row?.movements ?? 0 };
};

/** The files the user keeps, of every account (10.2a). */
export type UserFiles = PeriodFiles;

/**
 * How many statements the user keeps, of each kind: every file saved, also
 * one that doesn't reconcile or whose movements another saved before.
 */
export const countUserFiles = async ({
  tx,
  userId,
}: UserContext): Promise<UserFiles> => {
  const [row] = await tx
    .select({
      quarterly:
        sql<number>`count(*) filter (where ${isNotNull(statements.openingBalanceMinor)})`.mapWith(
          Number,
        ),
      movements:
        sql<number>`count(*) filter (where ${isNull(statements.openingBalanceMinor)})`.mapWith(
          Number,
        ),
    })
    .from(statements)
    .where(eq(statements.userId, userId));
  return { quarterly: row?.quarterly ?? 0, movements: row?.movements ?? 0 };
};
