import { randomUUID } from "node:crypto";
import { createDb, type DbClient, findOrCreateUser } from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { AiCallRecord } from "@/lib/ai";
import { hasUsedUpAiMonth, userLedger } from "./llm-usage.service";

// Against the test database, as the application role. The platform's month
// adds up every user's rows, which other test files write at the same time,
// so each test sets it; llm-usage.queries.test.ts proves the real one.
const mocks = vi.hoisted(() => ({
  db: undefined as unknown,
  platform: 0,
  captureMessage: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("@sentry/nextjs", () => ({ captureMessage: mocks.captureMessage }));
vi.mock("@xtrakto/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@xtrakto/db")>()),
  platformLlmCostThisMonth: async () => mocks.platform,
}));

// A call whose attempts cost what each test says.
const callCosting = (...costs: number[]): AiCallRecord => ({
  prompt: { name: "check", version: 1 },
  attempts: costs.map((costMicroUsd) => ({
    model: "deepseek-flash",
    outcome: "OK",
    startedAt: 1,
    endedAt: 2,
    usage: { inputTokens: 40, outputTokens: 12, costMicroUsd },
  })),
});

describe.skipIf(!testDatabase)("the LLM usage ledger", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    mocks.db = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  beforeEach(() => {
    mocks.platform = 0;
    mocks.captureMessage.mockReset();
  });

  const newUser = async () => {
    const clerkUserId = `test_${randomUUID()}`;
    return { clerkUserId, userId: await findOrCreateUser(app.db, clerkUserId) };
  };

  it("lets a call through until the user's month adds up to USD 1", async () => {
    const { userId } = await newUser();
    const ledger = userLedger(userId);

    expect(await ledger.check()).toBeUndefined();
    await ledger.record(callCosting(400_000, 599_999));
    expect(await ledger.check()).toBeUndefined();
    await ledger.record(callCosting(1));
    expect(await ledger.check()).toBe("USER_MONTH");
  });

  it("never counts another user's spend", async () => {
    const spender = await newUser();
    const other = await newUser();

    await userLedger(spender.userId).record(callCosting(1_000_000));

    expect(await userLedger(other.userId).check()).toBeUndefined();
  });

  it("stops every call once the platform's month reached its budget", async () => {
    const { userId } = await newUser();
    mocks.platform = 3_000_000;

    expect(await userLedger(userId).check()).toBe("PLATFORM_BUDGET");
  });

  it("tells the owner, naming only the month, when a call takes the platform past 80%", async () => {
    const { userId } = await newUser();
    mocks.platform = 2_410_000;

    await userLedger(userId).record(callCosting(20_000));

    expect(mocks.captureMessage).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(
        /^LLM spend passed 80% of the platform's budget in \d{4}-\d{2}$/,
      ),
      "warning",
    );
  });

  it("says nothing more once the platform was past 80%", async () => {
    const { userId } = await newUser();
    mocks.platform = 2_500_000;

    await userLedger(userId).record(callCosting(20_000));

    expect(mocks.captureMessage).not.toHaveBeenCalled();
  });

  it("tells the plan's card when the user's month ran out", async () => {
    const { clerkUserId, userId } = await newUser();

    expect(await hasUsedUpAiMonth(clerkUserId)).toBe(false);
    await userLedger(userId).record(callCosting(1_000_000));
    expect(await hasUsedUpAiMonth(clerkUserId)).toBe(true);
    expect(await hasUsedUpAiMonth(`test_${randomUUID()}`)).toBe(false);
  });
});
