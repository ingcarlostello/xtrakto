import { eq } from "drizzle-orm";
import type { Database } from "../client/db-client.types";
import { toUserId } from "../user-context/user-context.helpers";
import type { UserContext, UserId } from "../user-context/user-context.types";
import { users } from "./user.schemas";

/**
 * The internal id of a Clerk user, or `undefined` if they never used the app.
 * Never creates the row: a deleted user must not come back.
 */
export const findUserId = async (
  db: Database,
  clerkUserId: string,
): Promise<UserId | undefined> => {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId));
  return row ? toUserId(row.id) : undefined;
};

/**
 * Deletes the context's user. The foreign keys' cascades take every account,
 * statement, movement and ingestion job of theirs with it, and Row-Level
 * Security lets no context delete another user. Returns whether the user was
 * still there, so a repeated call is harmless.
 */
export const deleteAllUserData = async ({
  tx,
  userId,
}: UserContext): Promise<boolean> => {
  const deleted = await tx
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return deleted.length > 0;
};

/**
 * The internal id of a Clerk user, created on first use. Insert first, then
 * read: if two requests race, one inserts and both read the same row.
 */
export const findOrCreateUser = async (
  db: Database,
  clerkUserId: string,
): Promise<UserId> => {
  const [created] = await db
    .insert(users)
    .values({ clerkUserId })
    .onConflictDoNothing({ target: users.clerkUserId })
    .returning({ id: users.id });
  if (created) return toUserId(created.id);
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId));
  if (!existing) throw new Error("A user conflicted but can't be read back.");
  return toUserId(existing.id);
};
