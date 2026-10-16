import "server-only";
import { DEFAULT_TIME_ZONE, localDateFromInstant } from "@xtrakto/core";
import {
  countCountedMovements,
  findLatestMovementAccount,
  findUserId,
  listTransactions,
  withUserContext,
} from "@xtrakto/db";
import { getDb } from "@/lib/db";
import type { AccountTransactions } from "./transaction.types";

/**
 * The signed-in user's movements that count, newest first, as many as
 * `shown`: of the account with the most recent one, until 5.7b lets the user
 * switch. `null` until a movement counts; reading never creates the user's
 * row. The Clerk id must come from the session.
 */
export const getAccountTransactions = async (
  clerkUserId: string,
  shown: number,
): Promise<AccountTransactions | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  const currentYear = localDateFromInstant(new Date(), DEFAULT_TIME_ZONE).slice(
    0,
    4,
  );
  return withUserContext(db, userId, async (ctx) => {
    const account = await findLatestMovementAccount(ctx);
    if (!account) return null;
    const total = await countCountedMovements(ctx, account.id);
    const { items } = await listTransactions(ctx, {
      accountId: account.id,
      limit: shown,
      offset: 0,
    });
    return { account, total, items, currentYear };
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
