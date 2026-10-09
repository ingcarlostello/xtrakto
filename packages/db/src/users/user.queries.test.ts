import { randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { seedUser } from "../../test/test-rows";
import { accounts } from "../accounts/account.schemas";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { ingestionJobs } from "../ingestion-jobs/ingestion-job.schemas";
import { statements } from "../statements/statement.schemas";
import { transactions } from "../transactions/transaction.schemas";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { deleteAllUserData, findUserId } from "./user.queries";
import { users } from "./user.schemas";

const DATA_TABLES = [accounts, statements, transactions, ingestionJobs];
// seedUser leaves one row in users and in each data table.
const SEEDED = [1, 1, 1, 1, 1];
const GONE = [0, 0, 0, 0, 0];

describe.skipIf(!testDatabase)("user queries", () => {
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

  // Counted as the owner, who sees every user's rows.
  const rowsOf = async (userId: UserId): Promise<number[]> => {
    const [user] = await owner.db
      .select({ rows: count() })
      .from(users)
      .where(eq(users.id, userId));
    const counts = [user?.rows ?? 0];
    for (const table of DATA_TABLES) {
      const [data] = await owner.db
        .select({ rows: count() })
        .from(table)
        .where(eq(table.userId, userId));
      counts.push(data?.rows ?? 0);
    }
    return counts;
  };

  const clerkIdOf = async (userId: UserId): Promise<string> => {
    const [row] = await owner.db
      .select({ clerkUserId: users.clerkUserId })
      .from(users)
      .where(eq(users.id, userId));
    if (!row) throw new Error("No user seeded.");
    return row.clerkUserId;
  };

  it("deletes every row of the user in the five tables, and nothing of another user", async () => {
    const a = await seedUser(owner.db);
    const b = await seedUser(owner.db);

    const deleted = await withUserContext(app.db, a.userId, deleteAllUserData);

    expect(deleted).toBe(true);
    expect(await rowsOf(a.userId)).toEqual(GONE);
    expect(await rowsOf(b.userId)).toEqual(SEEDED);
  });

  it("deletes no user without a user context", async () => {
    const a = await seedUser(owner.db);

    const removed = await app.db
      .delete(users)
      .where(eq(users.id, a.userId))
      .returning({ id: users.id });

    expect(removed).toEqual([]);
    expect(await rowsOf(a.userId)).toEqual(SEEDED);
  });

  it("can't delete another user from a user's context", async () => {
    const a = await seedUser(owner.db);
    const b = await seedUser(owner.db);

    const removed = await withUserContext(app.db, a.userId, ({ tx }) =>
      tx
        .delete(users)
        .where(eq(users.id, b.userId))
        .returning({ id: users.id }),
    );

    expect(removed).toEqual([]);
    expect(await rowsOf(b.userId)).toEqual(SEEDED);
  });

  it("does nothing the second time", async () => {
    const a = await seedUser(owner.db);
    await withUserContext(app.db, a.userId, deleteAllUserData);

    await expect(
      withUserContext(app.db, a.userId, deleteAllUserData),
    ).resolves.toBe(false);
  });

  it("finds a user by their Clerk id", async () => {
    const a = await seedUser(owner.db);

    await expect(findUserId(app.db, await clerkIdOf(a.userId))).resolves.toBe(
      a.userId,
    );
  });

  it("finds no unknown Clerk user, and doesn't create one", async () => {
    const clerkUserId = `test_${randomUUID()}`;

    await expect(findUserId(app.db, clerkUserId)).resolves.toBeUndefined();
    const [created] = await owner.db
      .select({ rows: count() })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId));
    expect(created?.rows).toBe(0);
  });
});
