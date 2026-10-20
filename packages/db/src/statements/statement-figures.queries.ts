import type { AmountMinor, Period } from "@xtrakto/core";
import { and, asc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
import { transactions } from "../transactions/transaction.schemas";
import type { UserContext } from "../user-context/user-context.types";
import { chainedFrom } from "./statement-chain.queries";
import { statements } from "./statement.schemas";

// A statement's movements, under an alias so the subquery names each table.
const movementsOf = alias(transactions, "statement_movements");
const MOVEMENT_COUNT = new QueryBuilder()
  .select({ count: sql<number>`count(*)::int` })
  .from(movementsOf)
  .where(eq(movementsOf.statementId, statements.id));

/** The bank's own figures, as a quarterly statement's summary prints them. */
export type BankFigures = {
  /** The statement's, which opens on the previous quarter's last day. */
  readonly period: Period;
  /** SALDO PROMEDIO. */
  readonly averageBalanceMinor: AmountMinor | null;
  /** INTERESES: what the account paid, without its investment's. */
  readonly interestMinor: AmountMinor | null;
  /** Its movements, every one of which reconciles: "312 cuadran". */
  readonly movementCount: number;
  /** The period of the verified statement it chains on to: "Encadenado con abr–jun". */
  readonly chainedTo: Period | null;
};

/**
 * The bank's own figures of the account's quarterly statements whose days
 * meet `period`, the oldest first, with how many movements each holds and
 * the statement each chains on to. A statement that doesn't reconcile stays
 * out of every figure, these too.
 */
export const listBankFigures = async (
  { tx, userId }: UserContext,
  {
    accountId,
    period,
  }: { readonly accountId: string; readonly period: Period },
): Promise<BankFigures[]> => {
  const rows = await tx
    .select({
      from: statements.periodFrom,
      to: statements.periodTo,
      averageBalanceMinor: statements.averageBalanceMinor,
      interestMinor: statements.interestMinor,
      movementCount: sql<number>`(${MOVEMENT_COUNT})`,
      chainedFrom,
    })
    .from(statements)
    .where(
      and(
        eq(statements.userId, userId),
        eq(statements.accountId, accountId),
        eq(statements.balanceVerified, true),
        isNotNull(statements.openingBalanceMinor),
        // Its first day only gives the opening balance (coverage.queries).
        lt(statements.periodFrom, period.to),
        gte(statements.periodTo, period.from),
      ),
    )
    .orderBy(asc(statements.periodFrom));
  return rows.map(({ from, to, chainedFrom: previousFrom, ...figures }) => ({
    period: { from, to },
    ...figures,
    // The statement it chains on to ends the day this one starts.
    chainedTo: previousFrom ? { from: previousFrom, to: from } : null,
  }));
};
