import { boolean, pgTable, uuid } from "drizzle-orm/pg-core";
import { users } from "../users/user.schemas";
import { NOTICE_DEFAULTS } from "./notice.constants";

// Which email notices a user receives (10.4a), the first preference the
// database keeps: a background function can't read the browser. A row only
// once they change one; never an address, which comes from Clerk.
export const noticePreferences = pgTable("notice_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  uploadReady: boolean("upload_ready")
    .notNull()
    .default(NOTICE_DEFAULTS.uploadReady),
  reviewWaiting: boolean("review_waiting")
    .notNull()
    .default(NOTICE_DEFAULTS.reviewWaiting),
  fixedPaymentRose: boolean("fixed_payment_rose")
    .notNull()
    .default(NOTICE_DEFAULTS.fixedPaymentRose),
  monthlySummary: boolean("monthly_summary")
    .notNull()
    .default(NOTICE_DEFAULTS.monthlySummary),
});
