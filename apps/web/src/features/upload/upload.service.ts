import "server-only";
import { findUserId, listAccounts, withUserContext } from "@xtrakto/db";
import { getDb } from "@/lib/db";
import type { UploadAccount } from "./upload.types";

/**
 * The signed-in user's accounts, where a movements export can go. Someone
 * who never sent a file has no user row yet, so no accounts; reading never
 * creates one. The Clerk id must come from the session.
 */
export const listUploadAccounts = async (
  clerkUserId: string,
): Promise<readonly UploadAccount[]> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  return userId ? withUserContext(db, userId, listAccounts) : [];
};
