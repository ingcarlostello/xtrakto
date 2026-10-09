import { pgTable, text, unique } from "drizzle-orm/pg-core";
import { createdAt, primaryId } from "../columns/column.utils";

/** Maps a Clerk user to the internal id. No financial data, so no RLS. */
export const users = pgTable(
  "users",
  {
    id: primaryId(),
    clerkUserId: text("clerk_user_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique("users_clerk_user_id_key").on(t.clerkUserId)],
);
