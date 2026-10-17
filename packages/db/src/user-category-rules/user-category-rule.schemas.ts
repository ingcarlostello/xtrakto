import {
  type CategoryId,
  MONEY_DIRECTION,
  type MoneyDirection,
  NO_DESCRIPTION,
} from "@xtrakto/core";
import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { isOneOf, isSha256Hex } from "../columns/check.utils";
import { createdAt, primaryId } from "../columns/column.utils";
import { users } from "../users/user.schemas";

// The rules a user made answering the quick review or correcting a movement
// (6.3), which come before the table's when movements are categorized.
export const userCategoryRules = pgTable(
  "user_category_rules",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The bank's text as `userRuleTextOf` writes it, for money going one way…
    descriptionFolded: text("description_folded"),
    direction: text("direction").$type<MoneyDirection>(),
    // …or a reference's HMAC, both ways, with its last 4 digits to show it.
    referenceHash: text("reference_hash"),
    referenceLast4: text("reference_last4"),
    categoryId: text("category_id").$type<CategoryId>().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One rule per text and direction, and one per reference: a new answer
    // replaces the earlier one.
    uniqueIndex("user_category_rules_description_key")
      .on(t.userId, t.direction, t.descriptionFolded)
      .where(sql`${t.descriptionFolded} is not null`),
    uniqueIndex("user_category_rules_reference_key")
      .on(t.userId, t.referenceHash)
      .where(sql`${t.referenceHash} is not null`),
    check(
      "user_category_rules_target_check",
      sql`(${t.descriptionFolded} is null) <> (${t.referenceHash} is null)`,
    ),
    check(
      "user_category_rules_direction_check",
      sql`(${t.descriptionFolded} is null) = (${t.direction} is null)`,
    ),
    check(
      "user_category_rules_direction_value_check",
      isOneOf(t.direction, Object.values(MONEY_DIRECTION)),
    ),
    // The bank's `0` says nothing of what a movement was.
    check(
      "user_category_rules_description_check",
      sql`${t.descriptionFolded} not in ('', ${sql.raw(`'${NO_DESCRIPTION}'`)})`,
    ),
    check(
      "user_category_rules_reference_hash_check",
      isSha256Hex(t.referenceHash),
    ),
    check(
      "user_category_rules_reference_last4_check",
      sql`${t.referenceLast4} is null or (${t.referenceLast4} ~ '^[0-9]{4}$' and ${t.referenceHash} is not null)`,
    ),
  ],
);
