import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import { findOrCreateAccount, listAccounts } from "./account.queries";

describe.skipIf(!testDatabase)("listAccounts", () => {
  let app: DbClient;
  let userId: UserId;

  const createAccount = (owner: UserId, last4: string) =>
    withUserContext(app.db, owner, (ctx) =>
      findOrCreateAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4,
        currency: "COP",
      }),
    );

  beforeAll(async () => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    userId = await findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
  });

  afterAll(async () => {
    await app.pool.end();
  });

  it("lists only the user's accounts, oldest first", async () => {
    const first = await createAccount(userId, "1111");
    const second = await createAccount(userId, "2222");
    const other = await findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
    await createAccount(other, "3333");

    const listed = await withUserContext(app.db, userId, listAccounts);

    expect(listed).toEqual([
      {
        id: first,
        bankId: "bancolombia",
        accountType: "savings",
        last4: "1111",
      },
      {
        id: second,
        bankId: "bancolombia",
        accountType: "savings",
        last4: "2222",
      },
    ]);
  });

  it("lists nothing for a user without accounts", async () => {
    const newcomer = await findOrCreateUser(
      app.db,
      `test_${crypto.randomUUID()}`,
    );

    expect(await withUserContext(app.db, newcomer, listAccounts)).toEqual([]);
  });
});
