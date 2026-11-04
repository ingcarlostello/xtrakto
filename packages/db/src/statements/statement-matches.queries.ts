import {
  addDaysTo,
  compareLocalDates,
  isWithinPeriod,
  type Period,
  REFERENCE_KIND,
} from "@xtrakto/core";
import {
  and,
  count,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { transactions } from "../transactions/transaction.schemas";
import type { UserContext } from "../user-context/user-context.types";
import { statements } from "./statement.schemas";

/** What matching across formats came to for a statement (10.1a), counted when read. */
export type StatementMatches = {
  /**
   * Its movements the other format repeats: for a movements export, those
   * its quarterly statement had; for a quarterly statement, those movements
   * files brought too.
   */
  readonly matched: number;
  /** Of those, the ones the two formats date a day apart: interest. */
  readonly dayApart: number;
  /**
   * The references of those movements, a phone's or a code's, which the
   * quarterly statement's took when this statement was saved: each one is
   * the later file's, so two files never both count it.
   */
  readonly references: number;
  /**
   * For a movements export whose every day verified quarterly statements
   * cover, every movement on them matched: those statements' periods. Empty
   * otherwise.
   */
  readonly verifiedBy: readonly Period[];
};

type MatchCounts = Omit<StatementMatches, "verifiedBy">;

const NO_COUNTS: MatchCounts = { matched: 0, dayApart: 0, references: 0 };

const CARRIED_REFERENCES = [REFERENCE_KIND.PHONE, REFERENCE_KIND.CODE];

// The matches of each statement, on the side it takes: a movements export's
// own hidden movements, or the quarterly statement's that they repeat. A
// reference is the later statement's, the one whose upload carried it over.
const countMatches = async (
  { tx, userId }: UserContext,
  statementIds: readonly string[],
  side: "hidden" | "counted",
): Promise<Map<string, MatchCounts>> => {
  const twin = alias(transactions, "twin");
  const hiddenIn = alias(statements, "hidden_statement");
  const twinIn = alias(statements, "twin_statement");
  const [statementId, isLater] =
    side === "hidden"
      ? [transactions.statementId, lt(twinIn.createdAt, hiddenIn.createdAt)]
      : [twin.statementId, lt(hiddenIn.createdAt, twinIn.createdAt)];
  const rows = await tx
    .select({
      statementId,
      matched: count(),
      dayApart:
        sql<number>`count(*) filter (where ${transactions.date} <> ${twin.date})`.mapWith(
          Number,
        ),
      references:
        sql<number>`count(*) filter (where ${and(inArray(transactions.referenceKind, CARRIED_REFERENCES), isLater)})`.mapWith(
          Number,
        ),
    })
    .from(transactions)
    .innerJoin(twin, eq(twin.id, transactions.matchedTransactionId))
    .innerJoin(hiddenIn, eq(hiddenIn.id, transactions.statementId))
    .innerJoin(twinIn, eq(twinIn.id, twin.statementId))
    .where(
      and(
        eq(transactions.userId, userId),
        inArray(statementId, [...statementIds]),
      ),
    )
    .groupBy(statementId);
  return new Map(rows.map(({ statementId: id, ...counts }) => [id, counts]));
};

// The verified quarterly statements whose days, those after their opening
// balance's, hold every day of `days`; none when a day is left out.
const coveringPeriods = (
  days: Period,
  quarters: readonly Period[],
): Period[] => {
  const sorted = [...quarters].sort((a, b) => compareLocalDates(a.to, b.to));
  const covering: Period[] = [];
  for (let day = days.from; day <= days.to;) {
    const quarter = sorted.find(({ from, to }) => day > from && day <= to);
    if (quarter === undefined) return [];
    covering.push(quarter);
    day = addDaysTo(quarter.to, 1);
  }
  return covering;
};

// What a statement's account holds: its verified quarterly statements, and
// the days of its hidden movements still without a match.
const accountsOf = async (
  { tx, userId }: UserContext,
  accountIds: readonly string[],
) => {
  const quarters = await tx
    .select({
      accountId: statements.accountId,
      from: statements.periodFrom,
      to: statements.periodTo,
    })
    .from(statements)
    .where(
      and(
        eq(statements.userId, userId),
        inArray(statements.accountId, [...accountIds]),
        eq(statements.balanceVerified, true),
        isNotNull(statements.openingBalanceMinor),
      ),
    );
  const unmatched = await tx
    .select({ accountId: transactions.accountId, date: transactions.date })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        inArray(transactions.accountId, [...accountIds]),
        isNotNull(transactions.coveredByStatementId),
        isNull(transactions.matchedTransactionId),
      ),
    );
  return { quarters, unmatched };
};

// The quarterly statements that verify each movements export among them.
const verifiedByOf = async (
  ctx: UserContext,
  statementIds: readonly string[],
): Promise<Map<string, Period[]>> => {
  const exported = await ctx.tx
    .select({
      id: statements.id,
      accountId: statements.accountId,
      from: statements.periodFrom,
      to: statements.periodTo,
    })
    .from(statements)
    .where(
      and(
        eq(statements.userId, ctx.userId),
        inArray(statements.id, [...statementIds]),
        isNull(statements.openingBalanceMinor),
      ),
    );
  if (exported.length === 0) return new Map();
  const { quarters, unmatched } = await accountsOf(ctx, [
    ...new Set(exported.map(({ accountId }) => accountId)),
  ]);
  return new Map(
    exported.map(({ id, accountId, from, to }) => {
      const days = { from, to };
      const ofAccount = (row: { readonly accountId: string }) =>
        row.accountId === accountId;
      const isWaiting = unmatched
        .filter(ofAccount)
        .some(({ date }) => isWithinPeriod(date, days));
      const periods = quarters
        .filter(ofAccount)
        .map((quarter) => ({ from: quarter.from, to: quarter.to }));
      return [id, isWaiting ? [] : coveringPeriods(days, periods)];
    }),
  );
};

/**
 * What matching across formats came to for some of the user's statements
 * (10.1a), counted when read, so it holds in either upload order and for
 * files saved before: each statement's id with its counts, and, for a
 * movements export, the quarterly statements that verify it.
 */
export const listStatementMatches = async (
  ctx: UserContext,
  statementIds: readonly string[],
): Promise<ReadonlyMap<string, StatementMatches>> => {
  if (statementIds.length === 0) return new Map();
  const hidden = await countMatches(ctx, statementIds, "hidden");
  const counted = await countMatches(ctx, statementIds, "counted");
  const verifiedBy = await verifiedByOf(ctx, statementIds);
  return new Map(
    statementIds.map((id) => [
      id,
      {
        ...(hidden.get(id) ?? counted.get(id) ?? NO_COUNTS),
        verifiedBy: verifiedBy.get(id) ?? [],
      },
    ]),
  );
};
