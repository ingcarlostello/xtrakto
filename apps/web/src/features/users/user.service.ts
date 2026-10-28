import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import {
  APP_ERROR_CODE,
  type AppError,
  DEFAULT_TIME_ZONE,
  err,
  localDateFromInstant,
  ok,
  type Result,
} from "@xtrakto/core";
import {
  deleteAllUserData,
  deleteUserCategoryRule,
  findUserCategoryRule,
  findUserId,
  listAccounts,
  listExportMovements,
  listHolderNames,
  listOwnNameTexts,
  listOwnUserCategoryRules,
  withUserContext,
} from "@xtrakto/db";
import { getDb } from "@/lib/db";
import { type CsvFile, movementsCsv } from "@/utils/movements-csv.helpers";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";
import { lastSignInInWords, signInMethodOf } from "./profile.helpers";
import { MY_DATA_CSV_NAME } from "./user.constants";
import type { ProfileAccount, YourAccounts } from "./user.types";

/**
 * The signed-in user as Clerk knows them: their name and email, how they
 * sign in and when they last did, in words for today in Bogotá. Only what
 * the profile shows leaves this function. The Clerk id must come from the
 * session.
 */
export const getProfileAccount = async (
  clerkUserId: string,
): Promise<ProfileAccount> => {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(clerkUserId);
  return {
    name: user.fullName || null,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    signsInWith: signInMethodOf(
      user.externalAccounts.map(({ provider }) => provider),
    ),
    lastSignIn:
      user.lastSignInAt === null
        ? null
        : lastSignInInWords(new Date(user.lastSignInAt), new Date()),
  };
};

/**
 * Every movement a Clerk user has, as a CSV (7.6): those that count nowhere
 * too, each saying whether it counts in the summary, named by today's date
 * in Bogotá. A user who never uploaded has no row, and gets the header
 * alone. The Clerk id must come from the session.
 */
export const getMyDataCsv = async (clerkUserId: string): Promise<CsvFile> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  const movements = userId
    ? await withUserContext(db, userId, (ctx) => listExportMovements(ctx))
    : [];
  const today = localDateFromInstant(new Date(), DEFAULT_TIME_ZONE);
  return {
    fileName: `${MY_DATA_CSV_NAME}-${today}.csv`,
    content: movementsCsv(movements, { withCounts: true }),
  };
};

/**
 * Deletes every row of a Clerk user's data: their user and, with it, their
 * accounts, statements, movements and ingestion jobs. A user who never used
 * the app has no row, and a second call finds none, so it can be repeated:
 * Clerk delivers each webhook at least once. The Clerk id must come from the
 * session or from a verified webhook, never from the browser. Errors are
 * thrown without their message, which quotes the query's parameters.
 */
export const deleteUserData = (clerkUserId: string): Promise<void> =>
  withSanitizedErrors("USER_DATA_NOT_DELETED", async () => {
    const db = getDb();
    const userId = await findUserId(db, clerkUserId);
    if (!userId) return;
    await withUserContext(db, userId, deleteAllUserData);
  });

/**
 * Deletes the user's data, then their Clerk user. In that order: if Clerk
 * fails, the data is already gone and trying again is safe.
 */
export const deleteAccountAndData = async (
  clerkUserId: string,
): Promise<void> => {
  await deleteUserData(clerkUserId);
  const clerk = await clerkClient();
  await clerk.users.deleteUser(clerkUserId);
};

const NOTHING_YOURS: YourAccounts = {
  holderNames: [],
  ownNameTexts: [],
  accounts: [],
  ownRules: [],
};

/**
 * How the bank writes the signed-in user and what is theirs (7.7c): their
 * holders' names and the texts those were recognized in, their accounts,
 * and their rules that make something theirs. Someone who never uploaded a
 * file has none; reading never creates their row.
 */
export const getYourAccounts = async (
  clerkUserId: string,
): Promise<YourAccounts> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return NOTHING_YOURS;
  return withUserContext(db, userId, async (ctx) => ({
    holderNames: await listHolderNames(ctx),
    ownNameTexts: await listOwnNameTexts(ctx),
    accounts: await listAccounts(ctx),
    ownRules: await listOwnUserCategoryRules(ctx),
  }));
};

/**
 * Undoes one of the signed-in user's rules by its id, as a movement's
 * detail does (6.3h): its movements take what the user's other rules say,
 * else the table's. Not found for another user's rule, or for none.
 */
export const deleteOwnRule = async (
  clerkUserId: string,
  ruleId: string,
): Promise<Result<void, AppError>> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return err({ code: APP_ERROR_CODE.NOT_FOUND });
  return withUserContext(db, userId, async (ctx) => {
    const rule = await findUserCategoryRule(ctx, ruleId);
    if (!rule) return err({ code: APP_ERROR_CODE.NOT_FOUND });
    await deleteUserCategoryRule(ctx, rule);
    return ok(undefined);
  });
};
