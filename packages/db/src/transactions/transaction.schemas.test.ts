import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import {
  asAmount,
  asLocalDate,
  insertAccount,
  insertStatement,
  insertTransaction,
  insertUser,
  pgErrorCode,
  sha256Hex,
  transactionRow,
} from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { transactions } from "./transaction.schemas";

const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

describe.skipIf(!testDatabase)("transactions table", () => {
  let owner: DbClient;

  beforeAll(() => {
    owner = createDb({ connectionString: requireTestDatabase().ownerUrl });
  });

  afterAll(async () => {
    await owner.pool.end();
  });

  const newStatement = async (userId?: string) => {
    const user = userId ?? (await insertUser(owner.db));
    const account = {
      userId: user,
      accountId: await insertAccount(owner.db, user),
    };
    const statementId = await insertStatement(owner.db, account);
    return { account, statementId };
  };

  it("rejects a movement whose statement belongs to another account", async () => {
    const a = await newStatement();
    const b = await newStatement(a.account.userId);
    const row = transactionRow(b.account, a.statementId);

    expect(await pgErrorCode(insertTransaction(owner.db, row))).toBe(
      FOREIGN_KEY_VIOLATION,
    );
  });

  it("rejects a movement on another user's account", async () => {
    const mine = await newStatement();
    const theirs = await newStatement();
    const row = {
      ...transactionRow(mine.account, mine.statementId),
      accountId: theirs.account.accountId,
    };

    expect(await pgErrorCode(insertTransaction(owner.db, row))).toBe(
      FOREIGN_KEY_VIOLATION,
    );
  });

  it("stores a fingerprint once per account, and twins with their own", async () => {
    const { account, statementId } = await newStatement();
    const first = transactionRow(account, statementId);
    await insertTransaction(owner.db, first);
    await insertTransaction(owner.db, {
      ...transactionRow(account, statementId),
      occurrenceIndex: 1,
    });

    expect(await pgErrorCode(insertTransaction(owner.db, first))).toBe(
      UNIQUE_VIOLATION,
    );
  });

  it.each([
    ["a reference hash without a kind", { referenceHash: sha256Hex() }],
    ["a phone reference without its hash", { referenceKind: "phone" as const }],
    [
      "a hash for a movement without reference",
      { referenceHash: sha256Hex(), referenceKind: "none" as const },
    ],
    ["a category without its source", { categoryId: "groceries" as const }],
    ["a fingerprint that isn't SHA-256 hex", { fingerprint: "ABC" }],
    ["a negative position", { position: -1 }],
  ])("rejects %s", async (_, change) => {
    const { account, statementId } = await newStatement();
    const row = { ...transactionRow(account, statementId), ...change };

    expect(await pgErrorCode(insertTransaction(owner.db, row))).toBe(
      CHECK_VIOLATION,
    );
  });

  it("reads back extreme amounts and dates exactly", async () => {
    const { account, statementId } = await newStatement();
    const rows = [
      [Number.MAX_SAFE_INTEGER, "2028-02-29"],
      [Number.MIN_SAFE_INTEGER, "2026-12-31"],
    ] as const;
    for (const [value, day] of rows)
      await insertTransaction(owner.db, {
        ...transactionRow(account, statementId),
        amountMinor: asAmount(value),
        date: asLocalDate(day),
      });

    const stored = await owner.db
      .select({ amount: transactions.amountMinor, date: transactions.date })
      .from(transactions)
      .where(eq(transactions.statementId, statementId))
      .orderBy(transactions.date);
    expect(stored).toEqual([
      { amount: Number.MIN_SAFE_INTEGER, date: "2026-12-31" },
      { amount: Number.MAX_SAFE_INTEGER, date: "2028-02-29" },
    ]);
  });
});
