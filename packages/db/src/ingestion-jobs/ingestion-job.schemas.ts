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
import { users } from "../users/user.schemas";
import { INGESTION_JOB_STATUS } from "./ingestion-job.constants";

type IngestionJobStatus =
  (typeof INGESTION_JOB_STATUS)[keyof typeof INGESTION_JOB_STATUS];

export const ingestionJobs = pgTable(
  "ingestion_jobs",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Unknown until the user picks it, for formats without an account number.
    accountId: uuid("account_id"),
    status: text("status")
      .$type<IngestionJobStatus>()
      .notNull()
      .default(INGESTION_JOB_STATUS.PENDING),
    step: text("step"),
    formatId: text("format_id"),
    errorCode: text("error_code"),
    // Temporary: deleted when the job ends (system design §4).
    extractedContent: jsonb("extracted_content").$type<ExtractedContent>(),
    // Counts only, never content.
    stats: jsonb("stats").$type<Record<string, number>>().notNull().default({}),
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
    index("ingestion_jobs_user_created_idx").on(t.userId, t.createdAt),
    check(
      "ingestion_jobs_status_check",
      isOneOf(t.status, Object.values(INGESTION_JOB_STATUS)),
    ),
    // A finished job must not keep the statement's content.
    check(
      "ingestion_jobs_content_deleted_check",
      sql`${t.status} not in ('done', 'failed') or ${t.extractedContent} is null`,
    ),
  ],
);
