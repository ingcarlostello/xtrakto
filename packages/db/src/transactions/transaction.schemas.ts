import {
  CATEGORY_KINDS,
  CATEGORY_SOURCE,
  type CategoryId,
  type CategoryKind,
  type CategorySource,
  REFERENCE_KIND,
  type ReferenceKind,
} from "@xtrakto/core";
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { isOneOf, isSha256Hex, safeIntegerCheck } from "../columns/check.utils";
import {
  amountMinor,
  createdAt,
  localDate,
  primaryId,
} from "../columns/column.utils";
import { statements } from "../statements/statement.schemas";

export const transactions = pgTable(
  "transactions",
  {
    id: primaryId(),
    userId: uuid("user_id").notNull(),
    accountId: uuid("account_id").notNull(),
    statementId: uuid("statement_id").notNull(),
    date: localDate("date").notNull(),
    descriptionRaw: text("description_raw").notNull(),
    descriptionNormalized: text("description_normalized").notNull(),
    amountMinor: amountMinor("amount_minor").notNull(),
    balanceAfterMinor: amountMinor("balance_after_minor"),
    // HMAC of the raw reference; the raw value is never stored.
    referenceHash: text("reference_hash"),
    referenceKind: text("reference_kind").$type<ReferenceKind>(),
    categoryId: text("category_id").$type<CategoryId>(),
    categorySource: text("category_source").$type<CategorySource>(),
    kind: text("kind").$type<CategoryKind>(),
    fingerprint: text("fingerprint").notNull(),
    // Kept so fingerprints can be recomputed from stored rows.
    occurrenceIndex: integer("occurrence_index").notNull(),
    // Order within its statement, oldest first: the bank's order within a day.
    position: integer("position").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // One key ties the movement to a statement of the same account and user.
    foreignKey({
      name: "transactions_statement_fk",
      columns: [t.statementId, t.accountId, t.userId],
      foreignColumns: [statements.id, statements.accountId, statements.userId],
    }).onDelete("cascade"),
    unique("transactions_account_fingerprint_key").on(
      t.accountId,
      t.fingerprint,
    ),
    index("transactions_user_date_idx").on(t.userId, t.date),
    index("transactions_account_date_idx").on(t.accountId, t.date),
    index("transactions_statement_idx").on(t.statementId),
    check(
      "transactions_reference_kind_check",
      isOneOf(t.referenceKind, Object.values(REFERENCE_KIND)),
    ),
    check(
      "transactions_category_source_check",
      isOneOf(t.categorySource, Object.values(CATEGORY_SOURCE)),
    ),
    check("transactions_kind_check", isOneOf(t.kind, CATEGORY_KINDS)),
    check(
      "transactions_category_pair_check",
      sql`(${t.categoryId} is null) = (${t.categorySource} is null)`,
    ),
    check(
      "transactions_reference_pair_check",
      sql`(${t.referenceHash} is null) = (${t.referenceKind} is null or ${t.referenceKind} = 'none')`,
    ),
    check("transactions_fingerprint_check", isSha256Hex(t.fingerprint)),
    check("transactions_reference_hash_check", isSha256Hex(t.referenceHash)),
    check(
      "transactions_order_check",
      sql`${t.occurrenceIndex} >= 0 and ${t.position} >= 0`,
    ),
    safeIntegerCheck("transactions", t.amountMinor),
    safeIntegerCheck("transactions", t.balanceAfterMinor),
  ],
);
