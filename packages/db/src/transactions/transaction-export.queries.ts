import type {
  AccountType,
  AmountMinor,
  CategoryId,
  LocalDate,
  Period,
} from "@xtrakto/core";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
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

/** A movement as a CSV export writes it (7.6): never a reference's hash. */
export type ExportMovement = {
  readonly date: LocalDate;
  readonly bankId: string;
  readonly accountType: AccountType;
  readonly accountLast4: string | null;
  /** As the bank printed it, long numbers masked (ADR 0012). */
  readonly descriptionRaw: string;
  readonly amountMinor: AmountMinor;
  readonly balanceAfterMinor: AmountMinor | null;
  readonly categoryId: CategoryId | null;
  readonly isPendingReview: boolean;
  readonly referenceLast4: string | null;
  /** Whether it counts in the summary and the movements list. */
  readonly counts: boolean;
};

/**
 * Which movements to export: every one the user has (their data, as the
 * right to know it asks), or those of an account that count, in a period,
 * as the movements list shows them.
 */
export type ExportFilter = MovementSelection & {
  readonly countedIn?: {
    readonly accountId: string;
    /** Inclusive on both ends. */
    readonly period: Period;
  };
  readonly search?: MovementSearch;
};

const EXPORT_COLUMNS = {
  date: transactions.date,
  bankId: accounts.bankId,
  accountType: accounts.accountType,
  accountLast4: accounts.last4,
  descriptionRaw: transactions.descriptionRaw,
  amountMinor: transactions.amountMinor,
  balanceAfterMinor: transactions.balanceAfterMinor,
  categoryId: transactions.categoryId,
  isPendingReview: transactions.isPendingReview,
  referenceLast4: transactions.referenceLast4,
  counts: sql<boolean>`coalesce(${countedMovement}, false)`,
};

/**
 * The signed-in user's movements for a CSV, oldest first and in the bank's
 * order within a day: every one, those that count nowhere too (hidden by a
 * quarterly statement, or of a statement that doesn't reconcile), or those
 * the filter keeps.
 */
export const listExportMovements = (
  { tx, userId }: UserContext,
  { countedIn, search, ...selection }: ExportFilter = {},
): Promise<ExportMovement[]> =>
  tx
    .select(EXPORT_COLUMNS)
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        eq(transactions.userId, userId),
        countedIn === undefined
          ? undefined
          : and(
              eq(transactions.accountId, countedIn.accountId),
              countedMovement,
              gte(transactions.date, countedIn.period.from),
              lte(transactions.date, countedIn.period.to),
            ),
        search === undefined ? undefined : matchesSearch(search),
        matchesSelection(selection),
      ),
    )
    .orderBy(
      asc(transactions.date),
      asc(accounts.createdAt),
      asc(transactions.position),
      asc(transactions.id),
    );
