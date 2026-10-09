import { type SQL, sql } from "drizzle-orm";
import { type AnyPgColumn, check } from "drizzle-orm/pg-core";

const PLAIN_WORD = /^[A-Za-z_]+$/;
const HEX_SHA_256 = "^[0-9a-f]{64}$";

/**
 * `column in ('a', 'b')`. drizzle-kit drops bound parameters from CHECK
 * constraints, so the values are written into the SQL; only plain words pass.
 */
export const isOneOf = (
  column: AnyPgColumn,
  values: readonly string[],
): SQL => {
  const unsafe = values.find((value) => !PLAIN_WORD.test(value));
  if (unsafe !== undefined)
    throw new Error(`Unsafe value for a CHECK constraint: ${unsafe}`);
  const list = values.map((value) => `'${value}'`).join(", ");
  return sql`${column} in (${sql.raw(list)})`;
};

export const isSha256Hex = (column: AnyPgColumn): SQL =>
  sql`${column} ~ ${sql.raw(`'${HEX_SHA_256}'`)}`;

/**
 * Keeps a bigint within JavaScript's safe integers: Drizzle reads bigint as a
 * number and would round anything larger without warning.
 */
export const safeIntegerCheck = (table: string, column: AnyPgColumn) =>
  check(
    `${table}_${column.name}_range`,
    sql`${column} between ${sql.raw(String(Number.MIN_SAFE_INTEGER))} and ${sql.raw(String(Number.MAX_SAFE_INTEGER))}`,
  );
