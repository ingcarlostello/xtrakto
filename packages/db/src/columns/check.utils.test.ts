import { PgDialect, pgTable, text } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { isOneOf } from "./check.utils";

const table = pgTable("t", { kind: text("kind") });
const toSql = (value: Parameters<typeof isOneOf>[1]) =>
  new PgDialect().sqlToQuery(isOneOf(table.kind, value)).sql;

describe("isOneOf", () => {
  it("writes the values into the SQL, since drizzle-kit drops parameters", () => {
    expect(toSql(["savings", "credit_card"])).toBe(
      `"t"."kind" in ('savings', 'credit_card')`,
    );
  });

  it.each(["it's", "a b", "x'); drop table users; --"])(
    "refuses a value that isn't a plain word: %s",
    (value) => {
      expect(() => toSql([value])).toThrow(/Unsafe value/);
    },
  );
});
