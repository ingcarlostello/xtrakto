import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { type ExtractedContent, extractedContentSchema } from "@xtrakto/core";
import {
  createDb,
  createIngestionJobWithinLimit,
  type DbClient,
  findOrCreateUser,
  listMovementAccounts,
  listTransactions,
  listUserCategoryRules,
  type UserId,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import { findParser } from "@xtrakto/parsers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { claimJob, ingestJob } from "../ingestion/ingest-statement.service";
import { answerReviewNumbers, getReview } from "../review/review.service";
import { correctMovementCategory } from "./correction.service";
import { updateMovementRules } from "./own-rules.service";

// Against the test database, as the application role, after real uploads.
const database = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@/lib/db", () => ({ getDb: () => database.current }));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    IDENTIFIER_HASH_KEY: "test-key-with-at-least-32-characters!",
  }),
}));

const FIXTURES = new URL(
  "../../../../../packages/parsers/fixtures/",
  import.meta.url,
);
const HOUR_MS = 3_600_000;
const OCTOBER_QUARTER = { kind: "quarter", year: 2026, quarter: 4 } as const;
// October's sends to ••4567 and ••6543, and a key payment.
const SEND_TO_4567 = -5_000_000;
const SEND_TO_6543 = -2_500_000;
const KEY_PAYMENT = -6_000_000;

// The export as the browser sends it: minimized by its parser.
const october = (): ExtractedContent => {
  const json: unknown = JSON.parse(
    readFileSync(new URL("movements-basic.json", FIXTURES), "utf8"),
  );
  const content = extractedContentSchema.parse(json);
  const parser = findParser(content);
  if (!parser.ok) throw new Error("No parser recognizes the export.");
  return parser.value.minimize(content);
};

describe.skipIf(!testDatabase)("own accounts and undo", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  // A user with October's export, uploaded as the action and function do.
  const newUser = async () => {
    const clerkUserId = `test_${randomUUID()}`;
    const userId = await findOrCreateUser(app.db, clerkUserId);
    const content = october();
    const created = await withUserContext(app.db, userId, (ctx) =>
      createIngestionJobWithinLimit(
        ctx,
        { formatId: "bancolombia-movements-export", extractedContent: content },
        {
          limit: 100,
          month: {
            start: new Date(Date.now() - HOUR_MS),
            end: new Date(Date.now() + HOUR_MS),
          },
        },
      ),
    );
    if (!created.ok) throw new Error("No job created.");
    await claimJob({ jobId: created.value, userId });
    await ingestJob({ jobId: created.value, userId });
    const [account] = await withUserContext(app.db, userId, (ctx) =>
      listMovementAccounts(ctx),
    );
    if (!account) throw new Error("No account.");
    return { clerkUserId, userId, accountId: account.id };
  };

  // The movement of an amount, as Movimientos lists it.
  const movementOf = async (
    { userId, accountId }: { userId: UserId; accountId: string },
    amountMinor: number,
  ) => {
    const { items } = await withUserContext(app.db, userId, (ctx) =>
      listTransactions(ctx, { accountId, limit: 100, offset: 0 }),
    );
    const found = items.find((item) => item.amountMinor === amountMinor);
    if (!found) throw new Error(`No movement of ${amountMinor}.`);
    return found;
  };

  const rulesOf = (userId: UserId) =>
    withUserContext(app.db, userId, listUserCategoryRules);

  it("makes a Nequi number the user's from a send, and undoes it back to the table's guess", async () => {
    const user = await newUser();
    const send = await movementOf(user, SEND_TO_4567);
    const change = (intent: "mine" | "undo_number") =>
      updateMovementRules(user.clerkUserId, {
        account: user.accountId,
        movement: send.id,
        intent,
      });

    const marked = await change("mine");
    const asMine = await movementOf(user, SEND_TO_4567);
    const rules = await rulesOf(user.userId);
    const undone = await change("undo_number");

    expect(marked).toEqual({ ok: true, value: "mine" });
    expect(asMine).toMatchObject({
      categoryId: "own_account_transfer",
      isPendingReview: false,
    });
    expect(rules).toMatchObject([
      { target: "reference", referenceLast4: "4567" },
    ]);
    expect(undone).toEqual({ ok: true, value: "undo_number" });
    expect(await movementOf(user, SEND_TO_4567)).toMatchObject({
      categoryId: "transfers_to_people",
      isPendingReview: true,
    });
    expect(await rulesOf(user.userId)).toEqual([]);
  });

  it("undoes a number the quick review marked as someone else's", async () => {
    const user = await newUser();
    const review = await getReview(user.clerkUserId, {
      period: OCTOBER_QUARTER,
    });
    const numbers =
      review?.groups.find(({ id }) => id === "nequi_numbers")?.pending
        ?.numbers ?? [];
    const mine = numbers.find(({ last4 }) => last4 === "4567");
    if (!mine) throw new Error("No Nequi number ••4567 to review.");
    await answerReviewNumbers(user.clerkUserId, {
      account: user.accountId,
      period: OCTOBER_QUARTER,
      mine: [mine.referenceHash],
    });
    const theirs = await movementOf(user, SEND_TO_6543);

    const undone = await updateMovementRules(user.clerkUserId, {
      account: user.accountId,
      movement: theirs.id,
      intent: "undo_number",
    });

    expect(undone.ok).toBe(true);
    expect(await movementOf(user, SEND_TO_6543)).toMatchObject({
      categoryId: "transfers_to_people",
      isPendingReview: true,
    });
    expect(await movementOf(user, SEND_TO_4567)).toMatchObject({
      categoryId: "own_account_transfer",
      isPendingReview: false,
    });
    expect(await rulesOf(user.userId)).toMatchObject([
      { target: "reference", referenceLast4: "4567" },
    ]);
  });

  it("undoes the rule a correction saved for a text", async () => {
    const user = await newUser();
    const payment = await movementOf(user, KEY_PAYMENT);
    await correctMovementCategory(user.clerkUserId, {
      account: user.accountId,
      movement: payment.id,
      category: "investment",
      scope: "similar",
    });

    const undone = await updateMovementRules(user.clerkUserId, {
      account: user.accountId,
      movement: payment.id,
      intent: "undo_text",
    });

    expect(undone).toEqual({ ok: true, value: "undo_text" });
    expect(await movementOf(user, KEY_PAYMENT)).toMatchObject({
      categoryId: "transfers_to_people",
      isPendingReview: true,
    });
    expect(await rulesOf(user.userId)).toEqual([]);
  });

  it("refuses what a movement doesn't have, and another user's movement", async () => {
    const user = await newUser();
    const intruder = await newUser();
    const payment = await movementOf(user, KEY_PAYMENT);
    const send = await movementOf(user, SEND_TO_4567);
    const change = (
      clerkUserId: string,
      movement: string,
      intent: "mine" | "undo_number" | "undo_text",
    ) =>
      updateMovementRules(clerkUserId, {
        account: user.accountId,
        movement,
        intent,
      });

    expect(
      await Promise.all([
        change(user.clerkUserId, payment.id, "mine"),
        change(user.clerkUserId, send.id, "undo_number"),
        change(user.clerkUserId, send.id, "undo_text"),
        change(intruder.clerkUserId, send.id, "mine"),
      ]),
    ).toEqual([
      { ok: false, error: { code: "INVALID_INPUT" } },
      { ok: false, error: { code: "INVALID_INPUT" } },
      { ok: false, error: { code: "INVALID_INPUT" } },
      { ok: false, error: { code: "NOT_FOUND" } },
    ]);
    expect(await rulesOf(user.userId)).toEqual([]);
  });
});
