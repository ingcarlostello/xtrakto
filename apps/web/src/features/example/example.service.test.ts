import {
  createDb,
  type DbClient,
  findUserId,
  listAccounts,
  listExportMovements,
  listHolderNames,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { EXAMPLE_CLERK_USER_ID } from "@/lib/example-mode";
import { EXAMPLE_HOLDER, EXAMPLE_MOVEMENTS } from "./example-quarter.constants";
import { ensureExampleData } from "./example.service";

// Against the test database, as the application role.
const database = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@/lib/db", () => ({ getDb: () => database.current }));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    IDENTIFIER_HASH_KEY: "test-key-with-at-least-32-characters!",
  }),
}));
vi.mock("@/lib/auth", () => ({ requireSignedIn: vi.fn() }));

describe.skipIf(!testDatabase)("the example's data", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  it("saves the example's quarter once, however often it's asked", async () => {
    await ensureExampleData();
    await ensureExampleData();

    const userId = await findUserId(app.db, EXAMPLE_CLERK_USER_ID);
    if (!userId) throw new Error("The example's user wasn't saved.");
    const saved = await withUserContext(app.db, userId, async (ctx) => ({
      accounts: await listAccounts(ctx),
      holders: await listHolderNames(ctx),
      movements: await listExportMovements(ctx),
    }));

    expect(saved.accounts).toHaveLength(1);
    expect(saved.holders).toEqual([EXAMPLE_HOLDER]);
    expect(saved.movements).toHaveLength(EXAMPLE_MOVEMENTS.length);
    // Its statement reconciles, so every movement counts.
    expect(saved.movements.every(({ counts }) => counts)).toBe(true);
  });
});
