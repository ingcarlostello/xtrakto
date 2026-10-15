import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createdAt, primaryId } from "../columns/column.utils";

/**
 * People waiting for the app to open, and the consent each one gave (ADR
 * 0021). Not linked to `users`: someone on the list has no account. The
 * application can only add rows; reading, exporting and deleting them takes
 * the owner role.
 */
export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: primaryId(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    // When the person said yes, by the database's clock, and to which text:
    // the proof of their consent that Ley 1581 asks to keep.
    consentAcceptedAt: timestamp("consent_accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    consentVersion: text("consent_version").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("waitlist_entries_email_key").on(t.email),
    // One spelling per address, so the same person can't join twice.
    check(
      "waitlist_entries_email_check",
      sql`${t.email} = lower(btrim(${t.email})) and char_length(${t.email}) between 3 and 254`,
    ),
    check(
      "waitlist_entries_name_check",
      sql`${t.name} = btrim(${t.name}) and char_length(${t.name}) between 1 and 100`,
    ),
    check(
      "waitlist_entries_consent_version_check",
      sql`${t.consentVersion} <> ''`,
    ),
  ],
);
