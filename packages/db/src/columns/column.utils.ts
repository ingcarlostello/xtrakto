import type { AmountMinor, LocalDate } from "@xtrakto/core";
import { bigint, date, timestamp, uuid } from "drizzle-orm/pg-core";

// Builders, not shared instances: each table needs its own column objects.

export const primaryId = () => uuid("id").primaryKey().defaultRandom();

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** Read back as a JavaScript number; a CHECK keeps it a safe integer. */
export const amountMinor = (name: string) =>
  bigint(name, { mode: "number" }).$type<AmountMinor>();

/** A date without time, read back as "YYYY-MM-DD". */
export const localDate = (name: string) =>
  date(name, { mode: "string" }).$type<LocalDate>();
