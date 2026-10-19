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
import { correctMovementCategory } from "./correction.service";
import { getAccountTransactions } from "./transaction.service";

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
const KEY_PAYMENT = "PAGO LLAVE Maria Lopez";

// A fixture as the browser sends it, its texts changed if asked: minimized
// by its format's parser.
const fixture = (
  name: string,
  texts: Readonly<Record<string, string>> = {},
): ExtractedContent => {
  const json = readFileSync(new URL(`${name}.json`, FIXTURES), "utf8");
  const changed = Object.entries(texts).reduce(
    (content, [from, to]) => content.replaceAll(`"${from}"`, `"${to}"`),
    json,
  );
  const content = extractedContentSchema.parse(JSON.parse(changed));
  const parser = findParser(content);
  if (!parser.ok) throw new Error(`No parser recognizes ${name}.`);
  return parser.value.minimize(content);
};

describe.skipIf(!testDatabase)("corrections", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  // Uploads a fixture as the submit action and the function do.
  const upload = async (userId: UserId, content: ExtractedContent) => {
    const parser = findParser(content);
    const created = await withUserContext(app.db, userId, (ctx) =>
      createIngestionJobWithinLimit(
        ctx,
        {
          formatId: parser.ok ? parser.value.id : "unknown",
          extractedContent: content,
        },
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
    const job = { jobId: created.value, userId };
    await claimJob(job);
    await ingestJob(job);
  };

  // A user with July's quarterly statement and October's export, both with
  // a key payment to Maria Lopez; the export's QR payment written as `0`.
  const newUser = async () => {
    const clerkUserId = `test_${randomUUID()}`;
    const userId = await findOrCreateUser(app.db, clerkUserId);
    await upload(userId, fixture("quarterly-basic"));
    await upload(
      userId,
      fixture("movements-basic", { "PAGO QR TIENDA SIN CODIGO": "0" }),
    );
    const [account] = await withUserContext(app.db, userId, (ctx) =>
      listMovementAccounts(ctx),
    );
    if (!account) throw new Error("No account.");
    return { clerkUserId, userId, accountId: account.id };
  };

  // The user's movements with a text, the oldest first.
  const withText = async (userId: UserId, accountId: string, text: string) => {
    const { items } = await withUserContext(app.db, userId, (ctx) =>
      listTransactions(ctx, { accountId, limit: 200, offset: 0 }),
    );
    return items
      .filter(({ descriptionRaw }) => descriptionRaw === text)
      .reverse();
  };

  it("gives one movement the user's category, leaving the others with its text", async () => {
    const { clerkUserId, userId, accountId } = await newUser();
    const [july] = await withText(userId, accountId, KEY_PAYMENT);
    if (!july) throw new Error("No key payment.");

    const result = await correctMovementCategory(clerkUserId, {
      account: accountId,
      movement: july.id,
      category: "investment",
      scope: "movement",
    });

    expect(result).toEqual({
      ok: true,
      value: { scope: "movement", category: "investment" },
    });
    expect(
      (await withText(userId, accountId, KEY_PAYMENT)).map(
        ({ categoryId, isPendingReview }) => [categoryId, isPendingReview],
      ),
    ).toEqual([
      ["investment", false],
      ["transfers_to_people", true],
    ]);
    expect(
      await withUserContext(app.db, userId, listUserCategoryRules),
    ).toEqual([]);
  });

  it("counts the movement's like ones, and gives them all its category with a rule for the next ones", async () => {
    const { clerkUserId, userId, accountId } = await newUser();
    const [july] = await withText(userId, accountId, KEY_PAYMENT);
    if (!july) throw new Error("No key payment.");
    const before = await getAccountTransactions(clerkUserId, {
      accountId,
      period: { kind: "quarter", year: 2026, quarter: 3 },
      shown: 30,
      movementId: july.id,
    });

    await correctMovementCategory(clerkUserId, {
      account: accountId,
      movement: july.id,
      category: "investment",
      scope: "similar",
    });

    expect(before?.detail?.similar).toBe(1);
    expect(
      (await withText(userId, accountId, KEY_PAYMENT)).map(
        ({ categoryId, isPendingReview }) => [categoryId, isPendingReview],
      ),
    ).toEqual([
      ["investment", false],
      ["investment", false],
    ]);
    expect(
      await withUserContext(app.db, userId, listUserCategoryRules),
    ).toEqual([
      {
        target: "description",
        descriptionFolded: "PAGO LLAVE MARIA LOPEZ",
        direction: "out",
        categoryId: "investment",
      },
    ]);
  });

  it("refuses a category that doesn't fit the money's direction, and a rule for the bank's 0", async () => {
    const { clerkUserId, userId, accountId } = await newUser();
    const [july] = await withText(userId, accountId, KEY_PAYMENT);
    const [unnamed] = await withText(userId, accountId, "0");
    if (!july || !unnamed) throw new Error("No movements.");
    const correct = (
      movement: string,
      category: "income_transfer" | "groceries",
      scope: "movement" | "similar",
    ) =>
      correctMovementCategory(clerkUserId, {
        account: accountId,
        movement,
        category,
        scope,
      });

    const refused = [
      await correct(july.id, "income_transfer", "movement"),
      await correct(unnamed.id, "groceries", "similar"),
    ];
    const named = await correct(unnamed.id, "groceries", "movement");

    expect(refused).toEqual([
      { ok: false, error: { code: "INVALID_INPUT" } },
      { ok: false, error: { code: "INVALID_INPUT" } },
    ]);
    expect(named.ok).toBe(true);
    expect(
      (await withText(userId, accountId, KEY_PAYMENT))[0]?.categoryId,
    ).toBe("transfers_to_people");
  });

  it("corrects nothing on another user's account", async () => {
    const owner = await newUser();
    const intruder = await newUser();
    const [july] = await withText(owner.userId, owner.accountId, KEY_PAYMENT);
    if (!july) throw new Error("No key payment.");

    const result = await correctMovementCategory(intruder.clerkUserId, {
      account: owner.accountId,
      movement: july.id,
      category: "investment",
      scope: "similar",
    });

    expect(result).toEqual({ ok: false, error: { code: "NOT_FOUND" } });
    expect(
      (await withText(owner.userId, owner.accountId, KEY_PAYMENT))[0],
    ).toMatchObject({
      categoryId: "transfers_to_people",
      isPendingReview: true,
    });
  });
});
