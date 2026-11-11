import {
  check,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { isSha256Hex } from "../columns/check.utils";
import { createdAt, primaryId } from "../columns/column.utils";
import { users } from "../users/user.schemas";

// How to read a spreadsheet no parser knows (Stage 11), by its format's
// fingerprint (`formatFingerprint`), the SHA-256 of its header's names. The
// mapping is the JSON `formatMappingSchema` reads back: its header, each
// column's role, its formats and its bank, never a value of a file.

// A mapping its balances proved, which reads every user's files of its
// format and is linked to none. The first one proved for a format stays.
export const formatMappings = pgTable(
  "format_mappings",
  {
    id: primaryId(),
    fingerprint: text("fingerprint").notNull(),
    mapping: jsonb("mapping").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("format_mappings_fingerprint_key").on(t.fingerprint),
    check("format_mappings_fingerprint_check", isSha256Hex(t.fingerprint)),
  ],
);

// The mapping a person confirmed, which reads their files first. Their next
// confirmation for the format replaces it.
export const userFormatMappings = pgTable(
  "user_format_mappings",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fingerprint: text("fingerprint").notNull(),
    mapping: jsonb("mapping").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("user_format_mappings_fingerprint_key").on(t.userId, t.fingerprint),
    check("user_format_mappings_fingerprint_check", isSha256Hex(t.fingerprint)),
  ],
);
