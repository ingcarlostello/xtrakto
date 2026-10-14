import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  integer,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { accounts } from "../accounts/account.schemas";
import { isSha256Hex, safeIntegerCheck } from "../columns/check.utils";
import {
  amountMinor,
  createdAt,
  localDate,
  primaryId,
} from "../columns/column.utils";

export const statements = pgTable(
  "statements",
  {
    id: primaryId(),
    userId: uuid("user_id").notNull(),
    accountId: uuid("account_id").notNull(),
    formatId: text("format_id").notNull(),
    periodFrom: localDate("period_from").notNull(),
    periodTo: localDate("period_to").notNull(),
    openingBalanceMinor: amountMinor("opening_balance_minor"),
    closingBalanceMinor: amountMinor("closing_balance_minor"),
    totalCreditsMinor: amountMinor("total_credits_minor"),
    totalDebitsMinor: amountMinor("total_debits_minor"),
    interestMinor: amountMinor("interest_minor"),
    withholdingMinor: amountMinor("withholding_minor"),
    averageBalanceMinor: amountMinor("average_balance_minor"),
    balanceVerified: boolean("balance_verified").notNull(),
    // Where it doesn't add up, as `reconcile` found it: the closing balance
    // minus the opening balance and every amount, and the positions of the
    // movements whose balance breaks the chain.
    balanceDifferenceMinor: amountMinor("balance_difference_minor"),
    balanceBreakPositions: integer("balance_break_positions")
      .array()
      .notNull()
      .default(sql`'{}'`),
    // Identifies the upload by its content: the same file saved twice
    // matches, a corrected statement for the same period doesn't.
    contentHash: text("content_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // Foreign keys skip Row-Level Security, so they must also match the user.
    foreignKey({
      name: "statements_account_fk",
      columns: [t.accountId, t.userId],
      foreignColumns: [accounts.id, accounts.userId],
    }).onDelete("cascade"),
    unique("statements_id_account_user_key").on(t.id, t.accountId, t.userId),
    unique("statements_account_content_key").on(t.accountId, t.contentHash),
    // One version of each period of a statement with balances: another one
    // replaces it while it doesn't reconcile, and stays out once it does.
    uniqueIndex("statements_one_version_key")
      .on(t.accountId, t.periodFrom, t.periodTo)
      .where(sql`${t.openingBalanceMinor} is not null`),
    check("statements_period_check", sql`${t.periodFrom} <= ${t.periodTo}`),
    // A statement that reconciles has nothing off.
    check(
      "statements_verified_balance_check",
      sql`not ${t.balanceVerified} or (coalesce(${t.balanceDifferenceMinor}, 0) = 0 and cardinality(${t.balanceBreakPositions}) = 0)`,
    ),
    check("statements_content_hash_check", isSha256Hex(t.contentHash)),
    ...[
      t.openingBalanceMinor,
      t.closingBalanceMinor,
      t.totalCreditsMinor,
      t.totalDebitsMinor,
      t.interestMinor,
      t.withholdingMinor,
      t.averageBalanceMinor,
      t.balanceDifferenceMinor,
    ].map((column) => safeIntegerCheck("statements", column)),
  ],
);
