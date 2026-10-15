import type { Database } from "../client/db-client.types";
import { waitlistEntries } from "./waitlist-entry.schemas";

export type NewWaitlistEntry = Pick<
  typeof waitlistEntries.$inferInsert,
  "name" | "email" | "consentVersion"
>;

/**
 * Adds someone to the waitlist, without a user context. An email already on
 * it keeps its first entry, and the caller can't tell: the application role
 * may only insert (ADR 0021), and an insert that names its conflict target
 * would need to read the table. The table's only unique keys are its id and
 * the email, so any conflict is the email's.
 */
export const addWaitlistEntry = async (
  db: Database,
  entry: NewWaitlistEntry,
): Promise<void> => {
  await db.insert(waitlistEntries).values(entry).onConflictDoNothing();
};
