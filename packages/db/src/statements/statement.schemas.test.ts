import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import {
  asLocalDate,
  insertAccount,
  insertStatement,
  insertUser,
  pgErrorCode,
  statementRow,
} from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { statements } from "./statement.schemas";

const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

describe.skipIf(!testDatabase)("statements table", () => {
  let owner: DbClient;

  beforeAll(() => {
    owner = createDb({ connectionString: requireTestDatabase().ownerUrl });
  });

  afterAll(async () => {
    await owner.pool.end();
  });

  const newAccount = async () => {
    const userId = await insertUser(owner.db);
    return { userId, accountId: await insertAccount(owner.db, userId) };
  };

  it("rejects a statement on another user's account", async () => {
    const mine = await newAccount();
    const theirs = await newAccount();
    const row = { ...statementRow(mine), accountId: theirs.accountId };

    expect(await pgErrorCode(owner.db.insert(statements).values(row))).toBe(
      FOREIGN_KEY_VIOLATION,
    );
  });

  it("rejects the same content twice on one account", async () => {
    const account = await newAccount();
    const row = statementRow(account);
    await owner.db.insert(statements).values(row);

    expect(await pgErrorCode(owner.db.insert(statements).values(row))).toBe(
      UNIQUE_VIOLATION,
    );
  });

  it("rejects a period that ends before it starts", async () => {
    const row = {
      ...statementRow(await newAccount()),
      periodTo: asLocalDate("2026-06-01"),
    };

    expect(await pgErrorCode(owner.db.insert(statements).values(row))).toBe(
      CHECK_VIOLATION,
    );
  });

  it("rejects a balance JavaScript can't represent exactly", async () => {
    const id = await insertStatement(owner.db, await newAccount());
    const update = owner.db.execute(
      sql`update ${statements} set opening_balance_minor = 9007199254740992 where id = ${id}`,
    );

    expect(await pgErrorCode(update)).toBe(CHECK_VIOLATION);
  });

  it("deletes a user's statements with the user", async () => {
    const account = await newAccount();
    const id = await insertStatement(owner.db, account);
    await owner.db.execute(sql`delete from users where id = ${account.userId}`);

    const left = await owner.db
      .select()
      .from(statements)
      .where(eq(statements.id, id));
    expect(left).toEqual([]);
  });
});
