import { eq } from "drizzle-orm";
import type { Database } from "../client/db-client.types";
import { toUserId } from "../user-context/user-context.helpers";
import type { UserId } from "../user-context/user-context.types";
import { users } from "./user.schemas";

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
