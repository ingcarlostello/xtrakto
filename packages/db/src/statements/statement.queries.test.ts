import { type AmountMinor, hashIdentifier } from "@xtrakto/core";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  manyMovements,
  preparedExport,
  TEST_HASH_KEY,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { insertUser } from "../../test/test-rows";
import { findOrCreateAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { transactions } from "../transactions/transaction.schemas";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { saveStatement } from "./statement.queries";
import { statements } from "./statement.schemas";
import type { SaveStatementInput } from "./statement.types";

const NEQUI = "TRANSFERENCIAS A NEQUI";

describe.skipIf(!testDatabase)("saveStatement", () => {
  let app: DbClient;
  let owner: DbClient;

  beforeAll(() => {
    const { appUrl, ownerUrl } = requireTestDatabase();
    app = createDb({ connectionString: appUrl });
    owner = createDb({ connectionString: ownerUrl });
  });

  afterAll(async () => {
    await app.pool.end();
    await owner.pool.end();
  });

  const newAccount = async () => {
    const userId = toUserId(await insertUser(owner.db));
    const accountId = await withUserContext(app.db, userId, (ctx) =>
      findOrCreateAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4: "8901",
        currency: "COP",
      }),
    );
    return { userId, accountId };
  };

  const save = (userId: UserId, input: SaveStatementInput) =>
    withUserContext(app.db, userId, (ctx) => saveStatement(ctx, input));

  const savedValue = async (userId: UserId, input: SaveStatementInput) => {
    const result = await save(userId, input);
    if (!result.ok)
      throw new Error(`Expected a save, got ${result.error.code}`);
    return result.value;
  };

  const movementsOf = (accountId: string) =>
    owner.db
      .select({
        amount: transactions.amountMinor,
        referenceHash: transactions.referenceHash,
      })
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(transactions.date, transactions.position);

  it("saves the movements with their reference's HMAC, never the raw one", async () => {
    const { userId, accountId } = await newAccount();
    const statement = await preparedExport([
      {
        date: "2026-10-01",
        amount: -5_000_000,
        description: NEQUI,
        phone: "3001234567",
      },
      { date: "2026-10-02", amount: 12 },
    ]);

    const saved = await savedValue(userId, {
      accountId,
      balanceVerified: false,
      statement,
    });

    expect(saved).toMatchObject({ inserted: 2, skipped: 0 });
    expect(await movementsOf(accountId)).toEqual([
      {
        amount: -5_000_000,
        referenceHash: await hashIdentifier("3001234567", TEST_HASH_KEY),
      },
      { amount: 12, referenceHash: null },
    ]);
  });

  it("inserts nothing when the same statement is saved again", async () => {
    const { userId, accountId } = await newAccount();
    const statement = await preparedExport(manyMovements(5));
    const input = { accountId, balanceVerified: false, statement };

    const first = await savedValue(userId, input);
    const second = await savedValue(userId, input);

    expect(second).toEqual({
      statementId: first.statementId,
      inserted: 0,
      skipped: 5,
    });
  });

  it("keeps two identical transfers on the same day", async () => {
    const { userId, accountId } = await newAccount();
    const twin = { date: "2026-10-01", amount: -5_000_000, description: NEQUI };

    const saved = await savedValue(userId, {
      accountId,
      balanceVerified: false,
      statement: await preparedExport([twin, twin]),
    });

    expect(saved).toMatchObject({ inserted: 2, skipped: 0 });
  });

  it("stores overlapping exports' movements once", async () => {
    const { userId, accountId } = await newAccount();
    const twin = { date: "2026-10-02", amount: -5_000_000, description: NEQUI };
    const first = await preparedExport([
      { date: "2026-10-01", amount: -1 },
      twin,
      twin,
    ]);
    const second = await preparedExport([
      twin,
      twin,
      { date: "2026-10-03", amount: -3 },
    ]);

    await savedValue(userId, {
      accountId,
      balanceVerified: false,
      statement: first,
    });
    const saved = await savedValue(userId, {
      accountId,
      balanceVerified: false,
      statement: second,
    });

    expect(saved).toMatchObject({ inserted: 1, skipped: 2 });
    expect(await movementsOf(accountId)).toHaveLength(4);
  });

  it("saves a statement longer than one insert, and nothing more the second time", async () => {
    const { userId, accountId } = await newAccount();
    const statement = await preparedExport(manyMovements(2_500));
    const input = { accountId, balanceVerified: false, statement };

    expect(await savedValue(userId, input)).toMatchObject({ inserted: 2_500 });
    expect(await savedValue(userId, input)).toMatchObject({
      inserted: 0,
      skipped: 2_500,
    });
  });

  it("saves nothing when the last insert fails", async () => {
    const { userId, accountId } = await newAccount();
    const statement = await preparedExport(manyMovements(1_500));
    const last = statement.transactions[1_499];
    if (!last) throw new Error("Missing movement.");
    // Unreachable through parsing: forces a CHECK failure in the second insert.
    const tooLarge = (2 ** 53) as AmountMinor;
    const broken = {
      ...statement,
      transactions: [
        ...statement.transactions.slice(0, 1_499),
        { ...last, amountMinor: tooLarge },
      ],
    };

    await expect(
      save(userId, { accountId, balanceVerified: false, statement: broken }),
    ).rejects.toThrow();
    const left = await owner.db
      .select({ id: statements.id })
      .from(statements)
      .where(eq(statements.accountId, accountId));
    expect(left).toEqual([]);
  });

  it("refuses a statement that repeats a fingerprint", async () => {
    const { userId, accountId } = await newAccount();
    const statement = await preparedExport([
      { date: "2026-10-01", amount: -1 },
    ]);
    const repeated = {
      ...statement,
      transactions: [...statement.transactions, ...statement.transactions],
    };

    await expect(
      save(userId, { accountId, balanceVerified: false, statement: repeated }),
    ).rejects.toThrow(/repeat a movement fingerprint/);
  });

  it("answers NOT_FOUND for another user's account and writes nothing", async () => {
    const mine = await newAccount();
    const theirs = await newAccount();
    const statement = await preparedExport([
      { date: "2026-10-01", amount: -1 },
    ]);

    const result = await save(mine.userId, {
      accountId: theirs.accountId,
      balanceVerified: false,
      statement,
    });

    expect(result).toEqual({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await movementsOf(theirs.accountId)).toEqual([]);
  });
});
