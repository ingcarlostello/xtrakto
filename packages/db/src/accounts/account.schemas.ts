import {
  ACCOUNT_TYPE,
  type AccountType,
  CURRENCY,
  type Currency,
} from "@xtrakto/core";
import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { isOneOf } from "../columns/check.utils";
import { createdAt, primaryId } from "../columns/column.utils";
import { users } from "../users/user.schemas";

export const accounts = pgTable(
  "accounts",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bankId: text("bank_id").notNull(),
    accountType: text("account_type").$type<AccountType>().notNull(),
    // The movements export has no account number, so it can be unknown.
    last4: text("last4"),
    currency: text("currency").$type<Currency>().notNull(),
    // Optional: the UI can label an account from its bank, type and last4.
    displayName: text("display_name"),
    holderNameNormalized: text("holder_name_normalized"),
    createdAt: createdAt(),
  },
  (t) => [
    // Target of the composite foreign keys that keep rows on their user's accounts.
    unique("accounts_id_user_id_key").on(t.id, t.userId),
    // NULLs stay distinct here, so the next index allows one account without
    // last4 per bank and type: the one a quarterly statement adopts later.
    unique("accounts_user_bank_type_last4_key").on(
      t.userId,
      t.bankId,
      t.accountType,
      t.last4,
    ),
    uniqueIndex("accounts_one_unnumbered_key")
      .on(t.userId, t.bankId, t.accountType)
      .where(sql`${t.last4} is null`),
    check(
      "accounts_account_type_check",
      isOneOf(t.accountType, Object.values(ACCOUNT_TYPE)),
    ),
    check(
      "accounts_currency_check",
      isOneOf(t.currency, Object.values(CURRENCY)),
    ),
    check("accounts_last4_check", sql`${t.last4} ~ '^[0-9]{4}$'`),
  ],
);
