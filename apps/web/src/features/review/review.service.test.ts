import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  type ExtractedContent,
  extractedContentSchema,
  periodSchema,
} from "@xtrakto/core";
import {
  createDb,
  createIngestionJobWithinLimit,
  type DbClient,
  findOrCreateUser,
  listTransactions,
  listUserCategoryRules,
  type UserId,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import { findParser } from "@xtrakto/parsers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { claimJob, ingestJob } from "../ingestion/ingest-statement.service";
import { answerReviewGroup, getReview } from "./review.service";

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
const QUARTER = { kind: "quarter", year: 2026, quarter: 3 } as const;
const OCTOBER = periodSchema.parse({ from: "2026-10-01", to: "2026-10-31" });

// A fixture as the browser sends it: minimized by its format's parser.
const fixture = (name: string): ExtractedContent => {
  const json: unknown = JSON.parse(
    readFileSync(new URL(`${name}.json`, FIXTURES), "utf8"),
  );
  const content = extractedContentSchema.parse(json);
  const parser = findParser(content);
  if (!parser.ok) throw new Error(`No parser recognizes ${name}.`);
  return parser.value.minimize(content);
};

describe.skipIf(!testDatabase)("quick review", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  // Uploads a fixture as the submit action and the function do.
  const upload = async (userId: UserId, name: string) => {
    const content = fixture(name);
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

  // A user with the quarterly statement of July to September, by Clerk id.
  const newUser = async () => {
    const clerkUserId = `test_${randomUUID()}`;
    const userId = await findOrCreateUser(app.db, clerkUserId);
    await upload(userId, "quarterly-basic");
    const review = await getReview(clerkUserId, {});
    if (!review) throw new Error("Nothing to review.");
    return { clerkUserId, userId, accountId: review.account.id };
  };

  const keyPaymentOf = async (userId: UserId, accountId: string) => {
    const { items } = await withUserContext(app.db, userId, (ctx) =>
      listTransactions(ctx, { accountId, limit: 100, offset: 0 }),
    );
    return items.filter(
      ({ descriptionRaw }) => descriptionRaw === "PAGO LLAVE Maria Lopez",
    );
  };

  it("asks about the latest quarter's guesses by group", async () => {
    const { clerkUserId } = await newUser();

    const review = await getReview(clerkUserId, {});

    expect(review?.period).toEqual(QUARTER);
    expect(review?.groups.map(({ id }) => id)).toEqual([
      "own_name",
      "key_people",
      "corresponsal",
      "pse_banks",
    ]);
    expect(review?.groups[0]?.texts).toEqual([
      { text: "TRANSF A Ana Maria Pru", count: 1 },
      { text: "TRANSF A ANA MARIA PRUEB", count: 1 },
    ]);
  });

  it("answers a group in every statement and in the next upload", async () => {
    const { clerkUserId, userId, accountId } = await newUser();

    const answered = await answerReviewGroup(clerkUserId, {
      group: "key_people",
      answer: "purchase",
      account: accountId,
      period: QUARTER,
    });
    await upload(userId, "movements-basic");

    expect(answered).toEqual({ ok: true, value: null });
    // Only that group leaves the quarter's review: the others keep their
    // guesses. October, the latest quarter now, has nothing to ask.
    expect(
      (await getReview(clerkUserId, { period: QUARTER }))?.groups.map(
        ({ id }) => id,
      ),
    ).toEqual(["own_name", "corresponsal", "pse_banks"]);
    expect((await getReview(clerkUserId, {}))?.groups).toEqual([]);
    const movements = await keyPaymentOf(userId, accountId);
    expect(movements.map(({ date }) => date)).toEqual([
      expect.stringMatching(/^2026-10-/),
      expect.stringMatching(/^2026-0[7-9]-/),
    ]);
    for (const movement of movements)
      expect(movement).toMatchObject({
        categoryId: "other_spending",
        isPendingReview: false,
      });
    const october = await withUserContext(app.db, userId, (ctx) =>
      listTransactions(ctx, {
        accountId,
        period: OCTOBER,
        limit: 100,
        offset: 0,
      }),
    );
    expect(october.items.some(({ isPendingReview }) => isPendingReview)).toBe(
      false,
    );
  });

  it("takes what the user doesn't know out of the review, keeping the guess and no rule", async () => {
    const { clerkUserId, userId, accountId } = await newUser();

    await answerReviewGroup(clerkUserId, {
      group: "key_people",
      answer: "unsure",
      account: accountId,
      period: QUARTER,
    });

    expect(await keyPaymentOf(userId, accountId)).toMatchObject([
      { categoryId: "transfers_to_people", isPendingReview: false },
    ]);
    expect(
      await withUserContext(app.db, userId, listUserCategoryRules),
    ).toEqual([]);
  });

  it("answers nothing on another user's account", async () => {
    const owner = await newUser();
    const other = await newUser();

    const answered = await answerReviewGroup(other.clerkUserId, {
      group: "key_people",
      answer: "purchase",
      account: owner.accountId,
      period: QUARTER,
    });

    expect(answered).toEqual({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await keyPaymentOf(owner.userId, owner.accountId)).toMatchObject([
      { categoryId: "transfers_to_people", isPendingReview: true },
    ]);
  });
});
