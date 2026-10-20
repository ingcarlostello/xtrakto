import type { LocalDate } from "@xtrakto/core";
import { and, eq, ne, sql } from "drizzle-orm";
import { alias, QueryBuilder } from "drizzle-orm/pg-core";
import { statements } from "./statement.schemas";

// A statement that reconciles is chained when it opens with the closing
// balance of the account's verified statement that ends the day it starts.
// Found when read, so the order the two were uploaded in doesn't matter.
const previous = alias(statements, "previous");
const PREVIOUS_START = new QueryBuilder()
  .select({ from: previous.periodFrom })
  .from(previous)
  .where(
    and(
      eq(previous.accountId, statements.accountId),
      eq(previous.userId, statements.userId),
      ne(previous.id, statements.id),
      eq(previous.balanceVerified, true),
      eq(previous.periodTo, statements.periodFrom),
      eq(previous.closingBalanceMinor, statements.openingBalanceMinor),
    ),
  )
  .orderBy(previous.periodFrom)
  .limit(1);

/**
 * The first day of the verified statement a statement chains on to, when it
 * reconciles; that statement ends the day this one starts.
 */
export const chainedFrom = sql<LocalDate | null>`case when ${statements.balanceVerified} then (${PREVIOUS_START}) end`;
