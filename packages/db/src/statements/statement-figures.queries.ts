import type { AmountMinor, Period } from "@xtrakto/core";
import { and, asc, eq, gte, isNotNull, lt } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import { statements } from "./statement.schemas";

/** The bank's own figures, as a quarterly statement's summary prints them. */
export type BankFigures = {
  /** The statement's, which opens on the previous quarter's last day. */
  readonly period: Period;
  /** SALDO PROMEDIO. */
  readonly averageBalanceMinor: AmountMinor | null;
  /** INTERESES: what the account paid, without its investment's. */
  readonly interestMinor: AmountMinor | null;
};

/**
 * The bank's own figures of the account's quarterly statements whose days
 * meet `period`, the oldest first. A statement that doesn't reconcile stays
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
  return rows.map(({ from, to, ...figures }) => ({
    period: { from, to },
    ...figures,
  }));
};
