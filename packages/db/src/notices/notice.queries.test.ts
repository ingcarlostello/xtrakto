import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { insertUser } from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserContext, UserId } from "../user-context/user-context.types";
import { deleteAllUserData } from "../users/user.queries";
import { readNoticePreferences, saveNoticePreference } from "./notice.queries";
import { noticePreferences } from "./notice.schemas";

describe.skipIf(!testDatabase)("notice preferences", () => {
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

  const newUser = async (): Promise<UserId> =>
    toUserId(await insertUser(owner.db));

  const asUser = <T>(userId: UserId, run: (ctx: UserContext) => Promise<T>) =>
    withUserContext(app.db, userId, run);

  const isOn = async (userId: UserId) =>
    (await asUser(userId, readNoticePreferences)).uploadReady;

  it("starts on, without a row", async () => {
    const userId = await newUser();

    expect(await isOn(userId)).toBe(true);
    expect(
      await asUser(userId, (ctx) => ctx.tx.select().from(noticePreferences)),
    ).toEqual([]);
  });

  it("starts every notice on, and changes one at a time", async () => {
    const userId = await newUser();

    await asUser(userId, (ctx) =>
      saveNoticePreference(ctx, "reviewWaiting", false),
    );

    expect(await asUser(userId, readNoticePreferences)).toEqual({
      uploadReady: true,
      reviewWaiting: false,
      fixedPaymentRose: true,
    });
  });

  it("turns a notice off and on again, in one row", async () => {
    const userId = await newUser();

    await asUser(userId, (ctx) =>
      saveNoticePreference(ctx, "uploadReady", false),
    );
    expect(await isOn(userId)).toBe(false);

    await asUser(userId, (ctx) =>
      saveNoticePreference(ctx, "uploadReady", true),
    );
    expect(await isOn(userId)).toBe(true);
    expect(
      await asUser(userId, (ctx) => ctx.tx.select().from(noticePreferences)),
    ).toHaveLength(1);
  });

  it("changes only the context user's notice, and shows no one else's", async () => {
    const [ana, bruno] = [await newUser(), await newUser()];

    await asUser(ana, (ctx) => saveNoticePreference(ctx, "uploadReady", false));

    expect(await isOn(bruno)).toBe(true);
    expect(
      await asUser(bruno, (ctx) => ctx.tx.select().from(noticePreferences)),
    ).toEqual([]);
  });

  it("goes with its user", async () => {
    const userId = await newUser();
    await asUser(userId, (ctx) =>
      saveNoticePreference(ctx, "uploadReady", false),
    );

    await asUser(userId, deleteAllUserData);

    const rows = await owner.db.select().from(noticePreferences);
    expect(rows.filter((row) => row.userId === userId)).toEqual([]);
  });
});
