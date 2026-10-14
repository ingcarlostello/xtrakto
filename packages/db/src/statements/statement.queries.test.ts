import {
  type AmountMinor,
  hashIdentifier,
  type PreparedStatement,
} from "@xtrakto/core";
import { and, eq, isNotNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  manyMovements,
  preparedExport,
  preparedQuarterly,
  TEST_HASH_KEY,
  type TestMovement,
  UNCHECKED,
  UNVERIFIED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { insertUser } from "../../test/test-rows";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { transactions } from "../transactions/transaction.schemas";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { deleteAllUserData } from "../users/user.queries";
import { saveStatement } from "./statement.queries";
import { statements } from "./statement.schemas";
import type { BalanceCheck, SaveStatementInput } from "./statement.types";

const NEQUI = "TRANSFERENCIAS A NEQUI";

// An export across a quarter's edges: its first and last movement belong to
// the quarters before and after July to September 2026.
const EXPORT_ACROSS_EDGES: TestMovement[] = [
  { date: "2026-06-30", amount: -1 },
  { date: "2026-07-15", amount: -2 },
  { date: "2026-09-30", amount: -3 },
  { date: "2026-10-01", amount: -4 },
];
const QUARTER: TestMovement[] = [
  { date: "2026-07-01", amount: -10 },
  { date: "2026-07-15", amount: -2 },
  { date: "2026-09-30", amount: -3 },
];

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
      resolveIdentifiedAccount(ctx, {
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

  // Saves a statement with its balance check in a new or given account.
  const saveIn = (
    account: { userId: UserId; accountId: string },
    statement: PreparedStatement,
    balance: BalanceCheck,
  ) =>
    savedValue(account.userId, {
      accountId: account.accountId,
      statement,
      balance,
    });

  const movementsOf = (accountId: string) =>
    owner.db
      .select({
        amount: transactions.amountMinor,
        referenceHash: transactions.referenceHash,
        referenceLast4: transactions.referenceLast4,
      })
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(transactions.date, transactions.position);

  const statementsOf = (accountId: string) =>
    owner.db
      .select({ id: statements.id })
      .from(statements)
      .where(eq(statements.accountId, accountId));

  it("saves the movements with their reference's HMAC and last 4 digits, never the raw one", async () => {
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

    const saved = await saveIn({ userId, accountId }, statement, UNCHECKED);

    expect(saved).toMatchObject({ total: 2, added: 2, skipped: 0 });
    expect(await movementsOf(accountId)).toEqual([
      {
        amount: -5_000_000,
        referenceHash: await hashIdentifier("3001234567", TEST_HASH_KEY),
        referenceLast4: "4567",
      },
      { amount: 12, referenceHash: null, referenceLast4: null },
    ]);
  });

  it("adds nothing when the same statement is saved again", async () => {
    const account = await newAccount();
    const statement = await preparedExport(manyMovements(5));

    const first = await saveIn(account, statement, UNCHECKED);
    const second = await saveIn(account, statement, UNCHECKED);

    expect(second).toEqual({
      statementId: first.statementId,
      total: 5,
      added: 0,
      skipped: 5,
      covered: 0,
      hidden: 0,
      replaced: 0,
    });
  });

  it("keeps two identical transfers on the same day", async () => {
    const twin = { date: "2026-10-01", amount: -5_000_000, description: NEQUI };

    const saved = await saveIn(
      await newAccount(),
      await preparedExport([twin, twin]),
      UNCHECKED,
    );

    expect(saved).toMatchObject({ added: 2, skipped: 0 });
  });

  it("stores overlapping exports' movements once, and keeps both exports", async () => {
    const account = await newAccount();
    const twin = { date: "2026-10-02", amount: -5_000_000, description: NEQUI };
    const first = [{ date: "2026-10-01", amount: -1 }, twin, twin];
    const second = [twin, twin, { date: "2026-10-03", amount: -3 }];

    await saveIn(account, await preparedExport(first), UNCHECKED);
    const saved = await saveIn(
      account,
      await preparedExport(second),
      UNCHECKED,
    );

    expect(saved).toMatchObject({ added: 1, skipped: 2, replaced: 0 });
    expect(await movementsOf(account.accountId)).toHaveLength(4);
    expect(await statementsOf(account.accountId)).toHaveLength(2);
  });

  it("saves a statement longer than one insert, and nothing more the second time", async () => {
    const account = await newAccount();
    const statement = await preparedExport(manyMovements(2_500));

    expect(await saveIn(account, statement, UNCHECKED)).toMatchObject({
      added: 2_500,
    });
    expect(await saveIn(account, statement, UNCHECKED)).toMatchObject({
      added: 0,
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
      save(userId, { accountId, statement: broken, balance: UNCHECKED }),
    ).rejects.toThrow();
    expect(await statementsOf(accountId)).toEqual([]);
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
      save(userId, { accountId, statement: repeated, balance: UNCHECKED }),
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
      statement,
      balance: UNCHECKED,
    });

    expect(result).toEqual({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await movementsOf(theirs.accountId)).toEqual([]);
  });
});

describe.skipIf(!testDatabase)(
  "saveStatement with quarterly statements",
  () => {
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
        resolveIdentifiedAccount(ctx, {
          bankId: "bancolombia",
          accountType: "savings",
          last4: "8901",
          currency: "COP",
        }),
      );
      return { userId, accountId };
    };

    const saveIn = async (
      { userId, accountId }: { userId: UserId; accountId: string },
      statement: PreparedStatement,
      balance: BalanceCheck,
    ) => {
      const result = await withUserContext(app.db, userId, (ctx) =>
        saveStatement(ctx, { accountId, statement, balance }),
      );
      if (!result.ok) throw new Error(result.error.code);
      return result.value;
    };

    const hiddenDates = async (accountId: string) =>
      (
        await owner.db
          .select({
            date: transactions.date,
            by: transactions.coveredByStatementId,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.accountId, accountId),
              isNotNull(transactions.coveredByStatementId),
            ),
          )
          .orderBy(transactions.date)
      ).map(({ date, by }) => ({ date, by }));

    const statementsOf = (accountId: string) =>
      owner.db
        .select({
          id: statements.id,
          difference: statements.balanceDifferenceMinor,
          breaks: statements.balanceBreakPositions,
        })
        .from(statements)
        .where(
          and(
            eq(statements.accountId, accountId),
            isNotNull(statements.openingBalanceMinor),
          ),
        );

    it("hides an export's movements on the days of a verified quarterly statement saved after it", async () => {
      const account = await newAccount();
      const exported = await saveIn(
        account,
        await preparedExport(EXPORT_ACROSS_EDGES),
        UNCHECKED,
      );

      const quarter = await saveIn(
        account,
        await preparedQuarterly(QUARTER),
        VERIFIED,
      );

      expect(exported).toMatchObject({ added: 4, covered: 0 });
      expect(quarter).toMatchObject({
        total: 3,
        added: 1,
        hidden: 2,
        covered: 0,
      });
      expect(await hiddenDates(account.accountId)).toEqual([
        { date: "2026-07-15", by: quarter.statementId },
        { date: "2026-09-30", by: quarter.statementId },
      ]);
    });

    it("saves an export's movements hidden on the days of a verified quarterly statement saved before it", async () => {
      const account = await newAccount();
      const quarter = await saveIn(
        account,
        await preparedQuarterly(QUARTER),
        VERIFIED,
      );

      const exported = await saveIn(
        account,
        await preparedExport(EXPORT_ACROSS_EDGES),
        UNCHECKED,
      );

      expect(quarter).toMatchObject({ added: 3, hidden: 0 });
      expect(exported).toMatchObject({ total: 4, added: 2, covered: 2 });
      expect(await hiddenDates(account.accountId)).toEqual([
        { date: "2026-07-15", by: quarter.statementId },
        { date: "2026-09-30", by: quarter.statementId },
      ]);
    });

    it("lets a quarterly statement that doesn't reconcile hide nothing and count nowhere, keeping where it's off", async () => {
      const account = await newAccount();
      await saveIn(
        account,
        await preparedExport(EXPORT_ACROSS_EDGES),
        UNCHECKED,
      );

      const quarter = await saveIn(
        account,
        await preparedQuarterly(QUARTER),
        UNVERIFIED,
      );
      const later = await saveIn(
        account,
        await preparedExport([{ date: "2026-08-01", amount: -5 }]),
        UNCHECKED,
      );

      expect(quarter).toMatchObject({ added: 0, hidden: 0 });
      expect(later).toMatchObject({ added: 1, covered: 0 });
      expect(await hiddenDates(account.accountId)).toEqual([]);
      expect(await statementsOf(account.accountId)).toEqual([
        { id: quarter.statementId, difference: -1_000, breaks: [3] },
      ]);
    });

    it("replaces a version of the period that didn't reconcile with the next one", async () => {
      const account = await newAccount();
      await saveIn(account, await preparedQuarterly(QUARTER), UNVERIFIED);
      await saveIn(
        account,
        await preparedExport(EXPORT_ACROSS_EDGES),
        UNCHECKED,
      );

      const corrected = await saveIn(
        account,
        await preparedQuarterly(QUARTER, { openingMinor: 200_000 }),
        VERIFIED,
      );

      expect(corrected).toMatchObject({ replaced: 1, hidden: 2, added: 1 });
      expect(await statementsOf(account.accountId)).toEqual([
        { id: corrected.statementId, difference: 0, breaks: [] },
      ]);
    });

    it("keeps a version of the period that reconciles, and leaves the next one out", async () => {
      const account = await newAccount();
      const first = await saveIn(
        account,
        await preparedQuarterly(QUARTER),
        VERIFIED,
      );

      const next = await saveIn(
        account,
        await preparedQuarterly(QUARTER, { openingMinor: 200_000 }),
        VERIFIED,
      );

      expect(next).toEqual({
        statementId: first.statementId,
        total: 3,
        added: 0,
        skipped: 3,
        covered: 0,
        hidden: 0,
        replaced: 0,
      });
      expect(await statementsOf(account.accountId)).toHaveLength(1);
    });

    it("deletes a user whose movements a quarterly statement hides", async () => {
      const account = await newAccount();
      await saveIn(
        account,
        await preparedExport(EXPORT_ACROSS_EDGES),
        UNCHECKED,
      );
      await saveIn(account, await preparedQuarterly(QUARTER), VERIFIED);

      const deleted = await withUserContext(
        app.db,
        account.userId,
        deleteAllUserData,
      );

      expect(deleted).toBe(true);
      expect(await hiddenDates(account.accountId)).toEqual([]);
    });
  },
);
