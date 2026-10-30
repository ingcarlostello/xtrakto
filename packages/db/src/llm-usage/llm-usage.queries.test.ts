import { monthBoundsInTimeZone } from "@xtrakto/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { insertUser, LLM_USAGE, pgErrorCode } from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserContext, UserId } from "../user-context/user-context.types";
import {
  platformLlmCostThisMonth,
  recordLlmUsage,
  userLlmCostIn,
} from "./llm-usage.queries";
import { llmUsage } from "./llm-usage.schemas";

const CHECK_VIOLATION = "23514";
// The calendar month in Bogotá, as the limits count it.
const MONTH = monthBoundsInTimeZone(new Date(), "America/Bogota");
const LAST_MONTH = monthBoundsInTimeZone(
  new Date(MONTH.start.getTime() - 1),
  "America/Bogota",
);

describe.skipIf(!testDatabase)("LLM usage queries", () => {
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

  // A row written as the owner, at a given instant.
  const usageAt = (userId: UserId, createdAt: Date, costMicroUsd: number) =>
    owner.db
      .insert(llmUsage)
      .values({ ...LLM_USAGE, userId, createdAt, costMicroUsd });

  it("records each attempt as the user's and adds up their month", async () => {
    const userId = await newUser();

    await asUser(userId, (ctx) =>
      recordLlmUsage(ctx, [
        { ...LLM_USAGE, outcome: "INVALID_OUTPUT", costMicroUsd: 27 },
        { ...LLM_USAGE, model: "deepseek-v4-pro", costMicroUsd: 101 },
      ]),
    );

    expect(await asUser(userId, (ctx) => userLlmCostIn(ctx, MONTH))).toBe(128);
    const rows = await asUser(userId, (ctx) =>
      ctx.tx.select().from(llmUsage).orderBy(llmUsage.model),
    );
    expect(rows.map(({ model, outcome }) => ({ model, outcome }))).toEqual([
      { model: "deepseek-flash", outcome: "INVALID_OUTPUT" },
      { model: "deepseek-v4-pro", outcome: "OK" },
    ]);
  });

  it("counts a user's month from its first instant in Bogotá", async () => {
    const userId = await newUser();
    await usageAt(userId, new Date(MONTH.start.getTime() - 1), 1_000);
    await usageAt(userId, MONTH.start, 20);

    expect(await asUser(userId, (ctx) => userLlmCostIn(ctx, MONTH))).toBe(20);
    expect(await asUser(userId, (ctx) => userLlmCostIn(ctx, LAST_MONTH))).toBe(
      1_000,
    );
  });

  it("never counts or shows a user another user's usage", async () => {
    const mine = await newUser();
    const theirs = await newUser();
    await usageAt(mine, new Date(), 60);
    await usageAt(theirs, new Date(), 5_000);

    expect(await asUser(mine, (ctx) => userLlmCostIn(ctx, MONTH))).toBe(60);
    const seen = await asUser(mine, (ctx) =>
      ctx.tx.select({ userId: llmUsage.userId }).from(llmUsage),
    );
    expect(seen).toEqual([{ userId: mine }]);
  });

  // Other test files write usage at the same time, so the platform's total
  // is read as a change, with amounts no seeded row comes near.
  it("adds up every user's month for the platform, from its first instant in Bogotá", async () => {
    const [one, other] = [await newUser(), await newUser()];
    const before = await asUser(one, platformLlmCostThisMonth);
    await usageAt(one, new Date(), 2_000_000);
    await usageAt(other, MONTH.start, 3_000_000);
    await usageAt(other, new Date(MONTH.start.getTime() - 1), 1e12);

    const added = (await asUser(one, platformLlmCostThisMonth)) - before;

    expect(added).toBeGreaterThanOrEqual(5_000_000);
    expect(added).toBeLessThan(1e12);
  });

  it("refuses a negative cost or an outcome it doesn't know", async () => {
    const userId = await newUser();

    expect(await pgErrorCode(usageAt(userId, new Date(), -1))).toBe(
      CHECK_VIOLATION,
    );
    const unknown = owner.db
      .insert(llmUsage)
      .values({ ...LLM_USAGE, userId, outcome: "MAYBE" as "OK" });
    expect(await pgErrorCode(unknown)).toBe(CHECK_VIOLATION);
  });
});
