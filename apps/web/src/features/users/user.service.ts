import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { DEFAULT_TIME_ZONE, localDateFromInstant } from "@xtrakto/core";
import {
  deleteAllUserData,
  findUserId,
  listExportMovements,
  withUserContext,
} from "@xtrakto/db";
import { getDb } from "@/lib/db";
import { type CsvFile, movementsCsv } from "@/utils/movements-csv.helpers";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";
import { MY_DATA_CSV_NAME } from "./user.constants";

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
