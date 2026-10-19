import "server-only";
import {
  DEFAULT_TIME_ZONE,
  localDateFromInstant,
  type Period,
} from "@xtrakto/core";
import {
  countCountedMovements,
  findMovementDetail,
  findStatementBreaks,
  findUserId,
  listAccounts,
  listCategoryTotals,
  listMovementAccounts,
  listMovementQuarters,
  listTransactions,
  listUnreconciledStatements,
  type MovementDetail,
  type StatementBreaks,
  type UnreconciledStatement,
  type UserContext,
  withUserContext,
} from "@xtrakto/db";
import { getDb } from "@/lib/db";
import { kindTotalsOf } from "@/utils/kind-totals.helpers";
import { periodDays } from "@/utils/transactions-url.helpers";
import {
  meetsPeriod,
  quarterChoices,
  selectPeriod,
} from "./period-selector.helpers";
import { selectionOf } from "./kind-view.helpers";
import { movementSearchOf } from "./transaction-list.helpers";
import type {
  AccountTransactions,
  TransactionsRequest,
} from "./transaction.types";

/** This year in Bogotá, which day headings leave out. */
export const currentYearInBogota = (): string =>
  localDateFromInstant(new Date(), DEFAULT_TIME_ZONE).slice(0, 4);

type Located = Pick<
  AccountTransactions,
  "accounts" | "account" | "quarters" | "period" | "unreconciled"
>;

// The accounts with something to show: movements that count, the latest
// first, then those whose only statements don't reconcile.
const listShownAccounts = async (
  ctx: UserContext,
  unreconciled: readonly UnreconciledStatement[],
) => {
  const withMovements = await listMovementAccounts(ctx);
  const others = (await listAccounts(ctx)).filter(
    ({ id }) =>
      !withMovements.some((account) => account.id === id) &&
      unreconciled.some(({ accountId }) => accountId === id),
  );
  return [...withMovements, ...others];
};

// The account and the period to show: those the URL asks when they're the
// user's and have something to show, else the latest; and the account's
// statements that don't reconcile on the period's days.
const locate = async (
  ctx: UserContext,
  request: TransactionsRequest,
): Promise<Located | undefined> => {
  const allUnreconciled = await listUnreconciledStatements(ctx);
  const accounts = await listShownAccounts(ctx, allUnreconciled);
  const account =
    accounts.find(({ id }) => id === request.accountId) ?? accounts[0];
  if (!account) return undefined;
  const unreconciled = allUnreconciled.filter(
    ({ accountId }) => accountId === account.id,
  );
  const counted = await listMovementQuarters(ctx, account.id);
  const quarters = quarterChoices(counted, unreconciled);
  const period = selectPeriod(request.period, quarters);
  if (!period) return undefined;
  const days = periodDays(period);
  return {
    accounts,
    account,
    quarters,
    period,
    unreconciled: unreconciled.filter((s) => meetsPeriod(s.period, days)),
  };
};

// The movement the URL details, when it's one of the account's that count.
const detailOf = async (
  ctx: UserContext,
  accountId: string,
  movementId: string | undefined,
): Promise<MovementDetail | null> =>
  movementId === undefined
    ? null
    : ((await findMovementDetail(ctx, { accountId, movementId })) ?? null);

// The tiles and "Por revisar · 24" add up the whole period, whatever the
// list shows of it.
const periodKinds = async (
  ctx: UserContext,
  shownPeriod: { readonly accountId: string; readonly period: Period },
): Promise<Pick<AccountTransactions, "kindTotals" | "pendingReview">> => ({
  kindTotals: kindTotalsOf(await listCategoryTotals(ctx, shownPeriod)),
  pendingReview: await countCountedMovements(ctx, {
    ...shownPeriod,
    isPendingReview: true,
  }),
});

/**
 * The signed-in user's movements that count, newest first, in the account
 * and period the URL asks, or the latest, matching its search when there's
 * one, and the detail of the movement it asks, when it's the account's.
 * `null` until a movement counts or a statement doesn't reconcile; reading
 * never creates the user's row. The Clerk id must come from the session.
 */
export const getAccountTransactions = async (
  clerkUserId: string,
  request: TransactionsRequest,
): Promise<AccountTransactions | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  const currentYear = currentYearInBogota();
  return withUserContext(db, userId, async (ctx) => {
    const located = await locate(ctx, request);
    if (!located) return null;
    const { search, filter } = request;
    const shownPeriod = {
      accountId: located.account.id,
      period: periodDays(located.period),
    };
    const shown = {
      ...shownPeriod,
      ...(search === undefined ? {} : { search: movementSearchOf(search) }),
      ...selectionOf(filter),
    };
    const total = await countCountedMovements(ctx, shown);
    const { items } = await listTransactions(ctx, {
      ...shown,
      limit: request.shown,
      offset: 0,
    });
    return {
      ...located,
      total,
      items,
      ...(search === undefined ? {} : { search }),
      ...(filter === undefined ? {} : { filter }),
      ...(await periodKinds(ctx, shownPeriod)),
      detail: await detailOf(ctx, located.account.id, request.movementId),
      currentYear,
    };
  });
};

/** How many of the signed-in user's movements count, in every account. */
export const countTransactions = async (
  clerkUserId: string,
): Promise<number> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  return userId
    ? withUserContext(db, userId, (ctx) => countCountedMovements(ctx))
    : 0;
};

/** The signed-in user's latest statement that doesn't reconcile, if any. */
export const findUnreconciledStatement = async (
  clerkUserId: string,
): Promise<UnreconciledStatement | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  const [latest] = await withUserContext(db, userId, (ctx) =>
    listUnreconciledStatements(ctx),
  );
  return latest ?? null;
};

/**
 * One of the signed-in user's statements that don't reconcile, with all its
 * movements. `null` when it isn't theirs or reconciles.
 */
export const getStatementBreaks = async (
  clerkUserId: string,
  statementId: string,
): Promise<StatementBreaks | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  const breaks = await withUserContext(db, userId, (ctx) =>
    findStatementBreaks(ctx, statementId),
  );
  return breaks ?? null;
};
