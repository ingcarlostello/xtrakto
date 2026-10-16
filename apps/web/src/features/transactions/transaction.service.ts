import "server-only";
import { DEFAULT_TIME_ZONE, localDateFromInstant } from "@xtrakto/core";
import {
  countCountedMovements,
  findUserId,
  listMovementAccounts,
  listMovementQuarters,
  listTransactions,
  withUserContext,
} from "@xtrakto/db";
import { getDb } from "@/lib/db";
import { periodDays } from "@/utils/transactions-url.helpers";
import { selectPeriod } from "./period-selector.helpers";
import { movementSearchOf } from "./transaction-list.helpers";
import type {
  AccountTransactions,
  TransactionsRequest,
} from "./transaction.types";

/**
 * The signed-in user's movements that count, newest first: of the account
 * the URL asks, when it's theirs and has movements, else of the one with the
 * latest; in the period it asks, when that falls in a quarter with
 * movements, else in the latest one. `null` until a movement counts; reading
 * never creates the user's row. The Clerk id must come from the session.
 */
export const getAccountTransactions = async (
  clerkUserId: string,
  request: TransactionsRequest,
): Promise<AccountTransactions | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  const today = localDateFromInstant(new Date(), DEFAULT_TIME_ZONE);
  return withUserContext(db, userId, async (ctx) => {
    const accounts = await listMovementAccounts(ctx);
    const account =
      accounts.find(({ id }) => id === request.accountId) ?? accounts[0];
    if (!account) return null;
    const quarters = await listMovementQuarters(ctx, account.id);
    const period = selectPeriod(request.period, quarters);
    if (!period) return null;
    const filter = {
      accountId: account.id,
      period: periodDays(period),
      ...(request.search === undefined
        ? {}
        : { search: movementSearchOf(request.search) }),
    };
    const total = await countCountedMovements(ctx, filter);
    const page = await listTransactions(ctx, {
      ...filter,
      limit: request.shown,
      offset: 0,
    });
    const currentYear = today.slice(0, 4);
    const { search } = request;
    const found = {
      total,
      ...page,
      ...(search === undefined ? {} : { search }),
    };
    return { accounts, account, quarters, period, ...found, currentYear };
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
