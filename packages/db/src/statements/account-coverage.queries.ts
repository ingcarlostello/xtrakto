import { compareLocalDates, type Period } from "@xtrakto/core";
import { and, count, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { countingStatement } from "../coverage/coverage.queries";
import { transactions } from "../transactions/transaction.schemas";
import type { UserContext } from "../user-context/user-context.types";
import { chainedFrom } from "./statement-chain.queries";
import { CARRIED_REFERENCES } from "./statement-matches.queries";
import { statements } from "./statement.schemas";

/** A file that saved an account's movements in a month (10.2a). */
export type MonthFile = {
  readonly statementId: string;
  /** A quarterly statement, which prints balances; else a movements file. */
  readonly isQuarterly: boolean;
  readonly period: Period;
};

/** A month of an account with movements, and what saved them. */
export type CoverageMonth = {
  /** `"2026-08"`. */
  readonly month: string;
  /**
   * The files that saved its movements, those that count and those a
   * verified quarterly statement hides; never one that doesn't reconcile,
   * whose movements count nowhere, nor one whose movements another saved
   * before.
   */
  readonly files: readonly MonthFile[];
  /** The references movements files carried over to its quarterly statement's movements (10.1a). */
  readonly references: number;
};

/** A verified quarterly statement, and whether it chains on to the one before it. */
export type CoverageQuarter = {
  readonly period: Period;
  readonly isChained: boolean;
};

/** What covers an account's months, worked out when read (10.2a). */
export type AccountCoverage = {
  readonly accountId: string;
  /** Its months with movements, oldest first. */
  readonly months: readonly CoverageMonth[];
  /** Its verified quarterly statements, oldest first. */
  readonly quarters: readonly CoverageQuarter[];
};

const monthOf = sql<string>`to_char(${transactions.date}, 'YYYY-MM')`;

// Each file that saved movements in each month of the user's accounts.
const listMonthFiles = ({ tx, userId }: UserContext) =>
  tx
    .selectDistinct({
      accountId: transactions.accountId,
      month: monthOf,
      statementId: statements.id,
      isQuarterly: sql<boolean>`${isNotNull(statements.openingBalanceMinor)}`,
      from: statements.periodFrom,
      to: statements.periodTo,
    })
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .where(and(eq(transactions.userId, userId), countingStatement));

// How many references movements files carried over in each month: their
// matched movements with a phone's or a code's (10.1a).
const listMonthReferences = ({ tx, userId }: UserContext) =>
  tx
    .select({
      accountId: transactions.accountId,
      month: monthOf,
      references: count(),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNotNull(transactions.matchedTransactionId),
        inArray(transactions.referenceKind, CARRIED_REFERENCES),
      ),
    )
    .groupBy(transactions.accountId, monthOf);

const listQuarters = ({ tx, userId }: UserContext) =>
  tx
    .select({
      accountId: statements.accountId,
      from: statements.periodFrom,
      to: statements.periodTo,
      chainedFrom,
    })
    .from(statements)
    .where(
      and(
        eq(statements.userId, userId),
        eq(statements.balanceVerified, true),
        isNotNull(statements.openingBalanceMinor),
      ),
    );

type MonthFileRow = Awaited<ReturnType<typeof listMonthFiles>>[number];
type ReferenceRow = Awaited<ReturnType<typeof listMonthReferences>>[number];

// An account's months, oldest first, each with its files and references.
const monthsOf = (
  files: readonly MonthFileRow[],
  references: readonly ReferenceRow[],
): CoverageMonth[] =>
  [...new Set(files.map(({ month }) => month))].sort().map((month) => ({
    month,
    files: files
      .filter((file) => file.month === month)
      .map(({ statementId, isQuarterly, from, to }) => ({
        statementId,
        isQuarterly,
        period: { from, to },
      }))
      .sort((a, b) => compareLocalDates(a.period.from, b.period.from)),
    references: references.find((row) => row.month === month)?.references ?? 0,
  }));

/**
 * What covers each of the user's accounts that has movements or a verified
 * quarterly statement: its months with the files that saved them, and its
 * verified quarterly statements with their chain (5.6c), worked out when
 * read so the upload order doesn't matter.
 */
export const listAccountCoverage = async (
  ctx: UserContext,
): Promise<AccountCoverage[]> => {
  const files = await listMonthFiles(ctx);
  const references = await listMonthReferences(ctx);
  const quarters = await listQuarters(ctx);
  const accountIds = [
    ...new Set([...files, ...quarters].map(({ accountId }) => accountId)),
  ];
  return accountIds.map((accountId) => {
    const ofAccount = (row: { readonly accountId: string }) =>
      row.accountId === accountId;
    return {
      accountId,
      months: monthsOf(files.filter(ofAccount), references.filter(ofAccount)),
      quarters: quarters
        .filter(ofAccount)
        .sort((a, b) => compareLocalDates(a.from, b.from))
        .map(({ from, to, chainedFrom: previous }) => ({
          period: { from, to },
          isChained: previous !== null,
        })),
    };
  });
};
