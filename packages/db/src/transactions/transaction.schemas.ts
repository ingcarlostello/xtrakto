import {
  CATEGORY_KINDS,
  CATEGORY_SOURCE,
  type CategorizationRuleId,
  type CategoryId,
  type CategoryKind,
  type CategorySource,
  REFERENCE_KIND,
  type ReferenceKind,
} from "@xtrakto/core";
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
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

type ReferenceColumns = {
  readonly referenceHash: AnyPgColumn;
  readonly referenceKind: AnyPgColumn;
  readonly referenceLast4: AnyPgColumn;
};

// A reference's HMAC goes with its kind, and its last 4 digits with the HMAC.
const referenceChecks = (t: ReferenceColumns) => [
  check(
    "transactions_reference_kind_check",
    isOneOf(t.referenceKind, Object.values(REFERENCE_KIND)),
  ),
  check(
    "transactions_reference_pair_check",
    sql`(${t.referenceHash} is null) = (${t.referenceKind} is null or ${t.referenceKind} = 'none')`,
  ),
  check("transactions_reference_hash_check", isSha256Hex(t.referenceHash)),
  check(
    "transactions_reference_last4_check",
    sql`${t.referenceLast4} is null or (${t.referenceLast4} ~ '^[0-9]{4}$' and ${t.referenceHash} is not null)`,
  ),
];

type CoverageColumns = {
  readonly coveredByStatementId: AnyPgColumn;
  readonly accountId: AnyPgColumn;
  readonly userId: AnyPgColumn;
};

// The statement that hides a movement must be of its account and user. No
// action on delete: deleting a statement that hides movements fails, unless
// they go with it, as when a user's data is deleted. Migration 0007 defers
// the check to the transaction's end, which Drizzle can't declare, so that a
// user's deletion works whatever order the cascade takes.
const coverageConstraints = (t: CoverageColumns) => [
  foreignKey({
    name: "transactions_covered_by_fk",
    columns: [t.coveredByStatementId, t.accountId, t.userId],
    foreignColumns: [statements.id, statements.accountId, statements.userId],
  }),
  index("transactions_covered_by_idx")
    .on(t.coveredByStatementId)
    .where(sql`${t.coveredByStatementId} is not null`),
];

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
    // Its last 4 digits, so the user recognizes their own Nequi.
    referenceLast4: text("reference_last4"),
    referenceKind: text("reference_kind").$type<ReferenceKind>(),
    categoryId: text("category_id").$type<CategoryId>(),
    categorySource: text("category_source").$type<CategorySource>(),
    // The rule that gave the category, by its stable id (ADR 0023).
    categoryRuleId: text("category_rule_id").$type<CategorizationRuleId>(),
    // The category is a best guess the quick review asks about (6.3).
    isPendingReview: boolean("pending_review").notNull().default(false),
    kind: text("kind").$type<CategoryKind>(),
    fingerprint: text("fingerprint").notNull(),
    // Kept so fingerprints can be recomputed from stored rows.
    occurrenceIndex: integer("occurrence_index").notNull(),
    // Order within its statement, oldest first: the bank's order within a day.
    position: integer("position").notNull(),
    // The verified quarterly statement that holds this movement of another
    // format on its days: hidden, and never counted, until 10.1 matches them.
    coveredByStatementId: uuid("covered_by_statement_id"),
    createdAt: createdAt(),
  },
  (t) => [
    // One key ties the movement to a statement of the same account and user.
    foreignKey({
      name: "transactions_statement_fk",
      columns: [t.statementId, t.accountId, t.userId],
      foreignColumns: [statements.id, statements.accountId, statements.userId],
    }).onDelete("cascade"),
    ...coverageConstraints(t),
    unique("transactions_account_fingerprint_key").on(
      t.accountId,
      t.fingerprint,
    ),
    index("transactions_user_date_idx").on(t.userId, t.date),
    index("transactions_account_date_idx").on(t.accountId, t.date),
    index("transactions_statement_idx").on(t.statementId),
    ...referenceChecks(t),
    check(
      "transactions_category_source_check",
      isOneOf(t.categorySource, Object.values(CATEGORY_SOURCE)),
    ),
    check("transactions_kind_check", isOneOf(t.kind, CATEGORY_KINDS)),
    check(
      "transactions_category_pair_check",
      sql`(${t.categoryId} is null) = (${t.categorySource} is null)`,
    ),
    // A rule's id only with a category a rule gave. `is distinct from`, not
    // `<>`: it's never null, which a check would take as passing.
    check(
      "transactions_category_rule_check",
      sql`(${t.categoryRuleId} is null) = (${t.categorySource} is distinct from ${sql.raw(`'${CATEGORY_SOURCE.RULE}'`)})`,
    ),
    // Something to review always has its best guess.
    check(
      "transactions_pending_review_check",
      sql`not ${t.isPendingReview} or ${t.categoryId} is not null`,
    ),
    check("transactions_fingerprint_check", isSha256Hex(t.fingerprint)),
    check(
      "transactions_order_check",
      sql`${t.occurrenceIndex} >= 0 and ${t.position} >= 0`,
    ),
    safeIntegerCheck("transactions", t.amountMinor),
    safeIntegerCheck("transactions", t.balanceAfterMinor),
  ],
);
