import type { ExtractedContent } from "@xtrakto/core";
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { accounts } from "../accounts/account.schemas";
import { isOneOf } from "../columns/check.utils";
import { createdAt, primaryId } from "../columns/column.utils";
import { statements } from "../statements/statement.schemas";
import { users } from "../users/user.schemas";
import {
  INGESTION_JOB_ERROR,
  INGESTION_JOB_STATUS,
} from "./ingestion-job.constants";
import type {
  IngestionJobError,
  IngestionJobStatus,
  IngestionStats,
} from "./ingestion-job.types";

export const ingestionJobs = pgTable(
  "ingestion_jobs",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // A movements export names no account: the one it was pinned to when
    // submitted, or null until it's processed.
    accountId: uuid("account_id"),
    // Or the last 4 digits of the account a quarterly statement of the same
    // upload creates, when the user chose that one (Phase 5.3b).
    accountLast4: text("account_last4"),
    status: text("status")
      .$type<IngestionJobStatus>()
      .notNull()
      .default(INGESTION_JOB_STATUS.PENDING),
    formatId: text("format_id"),
    errorCode: text("error_code").$type<IngestionJobError>(),
    // The statement a finished job saved, or the one that already held it.
    statementId: uuid("statement_id"),
    // Temporary: deleted when the job ends (system design §4).
    extractedContent: jsonb("extracted_content").$type<ExtractedContent>(),
    // Counts only, never content; written when the job is done.
    stats: jsonb("stats")
      .$type<Partial<IngestionStats>>()
      .notNull()
      .default({}),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    foreignKey({
      name: "ingestion_jobs_account_fk",
      columns: [t.accountId, t.userId],
      foreignColumns: [accounts.id, accounts.userId],
    }).onDelete("cascade"),
    // A statement the job saved, replaced later as a version that didn't
    // reconcile, takes the job with it.
    foreignKey({
      name: "ingestion_jobs_statement_fk",
      columns: [t.statementId, t.userId],
      foreignColumns: [statements.id, statements.userId],
    }).onDelete("cascade"),
    index("ingestion_jobs_user_created_idx").on(t.userId, t.createdAt),
    check(
      "ingestion_jobs_status_check",
      isOneOf(t.status, Object.values(INGESTION_JOB_STATUS)),
    ),
    check(
      "ingestion_jobs_error_code_check",
      isOneOf(t.errorCode, Object.values(INGESTION_JOB_ERROR)),
    ),
    // A failed job says why; a done one, which statement it saved.
    check(
      "ingestion_jobs_outcome_check",
      sql`(${t.status} = 'failed') = (${t.errorCode} is not null) and (${t.status} <> 'done' or ${t.statementId} is not null)`,
    ),
    check(
      "ingestion_jobs_account_last4_check",
      sql`${t.accountLast4} ~ '^[0-9]{4}$'`,
    ),
    // Pinned to an account or to the digits of one, never both.
    check(
      "ingestion_jobs_one_account_check",
      sql`${t.accountId} is null or ${t.accountLast4} is null`,
    ),
    // A finished job must not keep the statement's content.
    check(
      "ingestion_jobs_content_deleted_check",
      sql`${t.status} not in ('done', 'failed') or ${t.extractedContent} is null`,
    ),
  ],
);
