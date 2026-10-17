import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { pgErrorCode } from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import {
  type AccountKind,
  findAccountHolderName,
  listAccounts,
  resolveIdentifiedAccount,
  resolveUnidentifiedAccount,
} from "./account.queries";
import { accounts } from "./account.schemas";

const UNIQUE_VIOLATION = "23505";
const SAVINGS: AccountKind = {
  bankId: "bancolombia",
  accountType: "savings",
  currency: "COP",
};

describe.skipIf(!testDatabase)("accounts", () => {
  let app: DbClient;
  let owner: DbClient;

  const newUser = () => findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);

  const identified = (
    userId: UserId,
    last4: string,
    holderNameNormalized?: string,
  ) =>
    withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, {
        ...SAVINGS,
        last4,
        holderNameNormalized,
      }),
    );

  const unidentified = (userId: UserId, kind: AccountKind = SAVINGS) =>
    withUserContext(app.db, userId, (ctx) =>
      resolveUnidentifiedAccount(ctx, kind),
    );

  const read = async (accountId: string) => {
    const [row] = await owner.db
      .select({ last4: accounts.last4, holder: accounts.holderNameNormalized })
      .from(accounts)
      .where(eq(accounts.id, accountId));
    return row;
  };

  beforeAll(() => {
    const { appUrl, ownerUrl } = requireTestDatabase();
    app = createDb({ connectionString: appUrl });
    owner = createDb({ connectionString: ownerUrl });
  });

  afterAll(async () => {
    await Promise.all([app.pool.end(), owner.pool.end()]);
  });

  it("lists only the user's accounts, oldest first", async () => {
    const userId = await newUser();
    const first = await identified(userId, "1111");
    const second = await identified(userId, "2222");
    await identified(await newUser(), "3333");

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
    expect(
      await withUserContext(app.db, await newUser(), listAccounts),
    ).toEqual([]);
  });

  it("finds a statement's account by its digits, and keeps the holder's name", async () => {
    const userId = await newUser();
    const created = await identified(userId, "8901");

    const found = await identified(userId, "8901", "ANA PRUEBA");

    expect(found).toBe(created);
    expect(await read(found)).toEqual({ last4: "8901", holder: "ANA PRUEBA" });
  });

  it("reads the holder's name a statement kept, to its user only", async () => {
    const userId = await newUser();
    const named = await identified(userId, "8901", "ANA PRUEBA");
    const unnamed = await identified(userId, "2109");
    const holderOf = (user: UserId, accountId: string) =>
      withUserContext(app.db, user, (ctx) =>
        findAccountHolderName(ctx, accountId),
      );

    expect(await holderOf(userId, named)).toBe("ANA PRUEBA");
    expect(await holderOf(userId, unnamed)).toBeUndefined();
    expect(await holderOf(await newUser(), named)).toBeUndefined();
  });

  it("lets a quarterly statement adopt the account an export created without a number", async () => {
    const userId = await newUser();
    const exported = await unidentified(userId);

    const adopted = await identified(userId, "8901", "ANA PRUEBA");

    expect(exported).toEqual({ ok: true, value: adopted });
    expect(await read(adopted)).toEqual({
      last4: "8901",
      holder: "ANA PRUEBA",
    });
  });

  it("creates the account of a quarterly statement with new digits", async () => {
    const userId = await newUser();
    const first = await identified(userId, "8901");

    const second = await identified(userId, "2109");

    expect(second).not.toBe(first);
    expect(await withUserContext(app.db, userId, listAccounts)).toHaveLength(2);
  });

  it("sends an export to the user's only account of its kind", async () => {
    const userId = await newUser();
    const only = await identified(userId, "8901");
    await withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, {
        ...SAVINGS,
        accountType: "credit_card",
        last4: "4242",
      }),
    );

    expect(await unidentified(userId)).toEqual({ ok: true, value: only });
  });

  it("creates one account without a number for a user who has none", async () => {
    const userId = await newUser();

    const first = await unidentified(userId);
    const second = await unidentified(userId);

    expect(first).toEqual(second);
    expect(first.ok && (await read(first.value))).toEqual({
      last4: null,
      holder: null,
    });
  });

  it("asks which account when the user has several of the export's kind", async () => {
    const userId = await newUser();
    await identified(userId, "8901");
    await identified(userId, "2109");

    expect(await unidentified(userId)).toEqual({
      ok: false,
      error: { code: "ACCOUNT_REQUIRED" },
    });
  });

  it("allows one account without a number per bank and type", async () => {
    const userId = await newUser();
    await unidentified(userId);
    const second = owner.db.insert(accounts).values({ userId, ...SAVINGS });

    expect(await pgErrorCode(second)).toBe(UNIQUE_VIOLATION);
  });
});
