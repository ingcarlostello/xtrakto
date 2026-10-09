import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import {
  pgErrorCode,
  seedUser,
  sha256Hex,
  statementRow,
  transactionRow,
} from "../../test/test-rows";
import { accounts } from "../accounts/account.schemas";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { ingestionJobs } from "../ingestion-jobs/ingestion-job.schemas";
import { statements } from "../statements/statement.schemas";
import { transactions } from "../transactions/transaction.schemas";
import { users } from "../users/user.schemas";
import { withUserContext } from "./user-context.queries";
import type { UserId } from "./user-context.types";

const RLS_VIOLATION = "42501";
const FOREIGN_KEY_VIOLATION = "23503";

const USER_TABLES = [accounts, statements, transactions, ingestionJobs];

describe.skipIf(!testDatabase)("withUserContext", () => {
  let app: DbClient;
  let owner: DbClient;

  beforeAll(() => {
    const { appUrl, ownerUrl } = requireTestDatabase();
    app = createDb({ connectionString: appUrl, maxConnections: 2 });
    owner = createDb({ connectionString: ownerUrl });
  });

  afterAll(async () => {
    await app.pool.end();
    await owner.pool.end();
  });

  it("shows each user only their own rows, even without a filter", async () => {
    const a = await seedUser(owner.db);
    await seedUser(owner.db);

    const owners = await withUserContext(
      app.db,
      a.userId,
      // One connection: one query at a time.
      async ({ tx }) => {
        const seen = [];
        for (const table of USER_TABLES)
          seen.push(await tx.select({ userId: table.userId }).from(table));
        return seen;
      },
    );
    expect(owners).toEqual(USER_TABLES.map(() => [{ userId: a.userId }]));
  });

  it("shows nothing and accepts nothing without a user", async () => {
    const a = await seedUser(owner.db);

    for (const table of USER_TABLES)
      expect(await app.db.select().from(table)).toEqual([]);
    const insert = app.db
      .insert(statements)
      .values({ ...statementRow(a), contentHash: sha256Hex() });
    expect(await pgErrorCode(insert)).toBe(RLS_VIOLATION);
  });

  it("treats the setting a pooled connection keeps afterwards as no user", async () => {
    const a = await seedUser(owner.db);
    const solo = createDb({
      connectionString: requireTestDatabase().appUrl,
      maxConnections: 1,
    });
    try {
      await withUserContext(solo.db, a.userId, ({ tx }) =>
        tx.select().from(accounts),
      );
      expect(await solo.db.select().from(accounts)).toEqual([]);
    } finally {
      await solo.pool.end();
    }
  });

  it("rejects rows written for another user", async () => {
    const a = await seedUser(owner.db);
    const b = await seedUser(owner.db);

    const insert = await pgErrorCode(
      withUserContext(app.db, a.userId, ({ tx }) =>
        tx.insert(statements).values(statementRow(b)),
      ),
    );
    const handOver = await pgErrorCode(
      withUserContext(app.db, a.userId, ({ tx }) =>
        tx
          .update(accounts)
          .set({ userId: b.userId })
          .where(eq(accounts.id, a.accountId)),
      ),
    );
    expect([insert, handOver]).toEqual([RLS_VIOLATION, RLS_VIOLATION]);
  });

  it("can't change or delete another user's rows", async () => {
    const a = await seedUser(owner.db);
    const b = await seedUser(owner.db);

    const touched = await withUserContext(app.db, a.userId, async ({ tx }) => [
      await tx
        .update(accounts)
        .set({ displayName: "mine now" })
        .where(eq(accounts.id, b.accountId))
        .returning(),
      await tx
        .delete(transactions)
        .where(eq(transactions.id, b.transactionId))
        .returning(),
    ]);
    expect(touched).toEqual([[], []]);
    const left = await owner.db
      .select({ displayName: accounts.displayName })
      .from(accounts)
      .where(eq(accounts.id, b.accountId));
    expect(left).toEqual([{ displayName: null }]);
  });

  it("can't attach movements to another user's statement, so theirs still save", async () => {
    const a = await seedUser(owner.db);
    const b = await seedUser(owner.db);
    const fingerprint = sha256Hex();
    const theirs = { userId: b.userId, accountId: b.accountId };

    const attack = withUserContext(app.db, a.userId, ({ tx }) =>
      tx.insert(transactions).values({
        ...transactionRow(theirs, b.statementId),
        userId: a.userId,
        fingerprint,
      }),
    );
    expect(await pgErrorCode(attack)).toBe(FOREIGN_KEY_VIOLATION);

    const saved = await withUserContext(app.db, b.userId, ({ tx }) =>
      tx
        .insert(transactions)
        .values({ ...transactionRow(theirs, b.statementId), fingerprint })
        .returning({ id: transactions.id }),
    );
    expect(saved).toHaveLength(1);
  });

  it("keeps concurrent users apart", async () => {
    const a = await seedUser(owner.db);
    const b = await seedUser(owner.db);
    const readAccounts = (userId: UserId) =>
      withUserContext(app.db, userId, async ({ tx }) => {
        await tx.execute(sql`select pg_sleep(0.05)`);
        return tx.select({ id: accounts.id }).from(accounts);
      });

    const [seenByA, seenByB] = await Promise.all([
      readAccounts(a.userId),
      readAccounts(b.userId),
    ]);
    expect(seenByA).toEqual([{ id: a.accountId }]);
    expect(seenByB).toEqual([{ id: b.accountId }]);
  });

  it("rolls back every write when fn throws", async () => {
    const a = await seedUser(owner.db);

    const failing = withUserContext(app.db, a.userId, async ({ tx }) => {
      await tx.delete(transactions).where(eq(transactions.userId, a.userId));
      throw new Error("Something failed after the write.");
    });
    await expect(failing).rejects.toThrow("Something failed");
    const left = await owner.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.userId, a.userId));
    expect(left).toEqual([{ id: a.transactionId }]);
  });

  it("rejects an id that isn't a UUID, such as a Clerk id", async () => {
    // A bad cast is the only way to get here; the check still guards it.
    const clerkId = "user_2abc" as UserId;

    await expect(
      withUserContext(app.db, clerkId, async () => "never runs"),
    ).rejects.toThrow(TypeError);
  });

  it("refuses a connection whose role bypasses Row-Level Security", async () => {
    const a = await seedUser(owner.db);

    await expect(
      withUserContext(owner.db, a.userId, async () => "never runs"),
    ).rejects.toThrow(/bypasses Row-Level Security/);
  });

  it("lets the application read and add users, not change or remove them", async () => {
    const a = await seedUser(owner.db);
    await app.db.insert(users).values({ clerkUserId: `test_${sha256Hex()}` });

    const update = app.db
      .update(users)
      .set({ clerkUserId: "taken" })
      .where(eq(users.id, a.userId));
    const remove = app.db.delete(users).where(eq(users.id, a.userId));
    const truncate = app.db.execute(sql`truncate ${users} cascade`);
    for (const query of [update, remove, truncate])
      expect(await pgErrorCode(query)).toBe(RLS_VIOLATION);
  });
});
