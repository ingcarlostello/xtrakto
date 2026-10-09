import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { deleteAllUserData, findUserId, withUserContext } from "@xtrakto/db";
import { getDb } from "@/lib/db";

/**
 * Deletes every row of a Clerk user's data: their user and, with it, their
 * accounts, statements, movements and ingestion jobs. A user who never used
 * the app has no row, and a second call finds none, so it can be repeated:
 * Clerk delivers each webhook at least once. The Clerk id must come from the
 * session or from a verified webhook, never from the browser.
 */
export const deleteUserData = async (clerkUserId: string): Promise<void> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return;
  await withUserContext(db, userId, deleteAllUserData);
};

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
