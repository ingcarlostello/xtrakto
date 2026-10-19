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
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import { claimJob, ingestJob } from "../ingestion/ingest-statement.service";
import {
  answerReviewGroup,
  answerReviewNumbers,
  getReview,
} from "./review.service";

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
const OCTOBER_QUARTER = { kind: "quarter", year: 2026, quarter: 4 } as const;
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

  // A user with October's movements export only, which sends to two Nequi
  // numbers, ••4567 and ••6543.
  const newExportUser = async () => {
    const clerkUserId = `test_${randomUUID()}`;
    const userId = await findOrCreateUser(app.db, clerkUserId);
    await upload(userId, "movements-basic");
    const review = await getReview(clerkUserId, {});
    if (!review) throw new Error("Nothing to review.");
    return { clerkUserId, userId, accountId: review.account.id };
  };

  // The Nequi numbers of a quarter, as the review shows them.
  const nequiOf = async (
    clerkUserId: string,
    period: MovementPeriod = OCTOBER_QUARTER,
  ) =>
    (await getReview(clerkUserId, { period }))?.groups.find(
      ({ id }) => id === "nequi_numbers",
    );

  const numberHash = async (clerkUserId: string, last4: string) => {
    const group = await nequiOf(clerkUserId);
    const numbers = [
      ...(group?.pending?.numbers ?? []),
      ...(group?.answered?.numbers ?? []),
    ];
    const hash = numbers.find(
      (number) => number.last4 === last4,
    )?.referenceHash;
    if (!hash) throw new Error(`No Nequi number ending in ${last4}.`);
    return hash;
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
    expect(review?.groups[0]?.pending?.texts).toEqual([
      { text: "TRANSF A Ana Maria Pru", count: 1 },
      { text: "TRANSF A ANA MARIA PRUEB", count: 1 },
    ]);
  });

  // What the review says now of the quarter's key payment to a person.
  const keyPeopleOf = async (clerkUserId: string, period = QUARTER) =>
    (await getReview(clerkUserId, { period }))?.groups.find(
      ({ id }) => id === "key_people",
    );

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
    // The group stays in its place, closed, saying what it counts as now;
    // the others keep asking.
    const review = await getReview(clerkUserId, { period: QUARTER });
    expect(
      review?.groups.map(({ id, pending }) => [id, pending === null]),
    ).toEqual([
      ["own_name", false],
      ["key_people", true],
      ["corresponsal", false],
      ["pse_banks", false],
    ]);
    expect((await keyPeopleOf(clerkUserId))?.answered?.outcomes).toEqual([
      {
        said: "Compras",
        categoryId: "other_spending",
        isGuessKept: false,
        count: 1,
      },
    ]);
    // In October, the latest quarter now, its key payment comes answered by
    // the rule; only its Nequi numbers ask (6.3d).
    const latest = await getReview(clerkUserId, {});
    expect(
      latest?.groups.map(({ id, pending, answered }) => ({
        id,
        isOpen: pending !== null,
        said: answered?.outcomes.map(({ said }) => said),
      })),
    ).toEqual([
      { id: "key_people", isOpen: false, said: ["Compras"] },
      { id: "nequi_numbers", isOpen: true, said: undefined },
    ]);
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
    expect(
      october.items
        .filter(({ isPendingReview }) => isPendingReview)
        .map(({ descriptionRaw }) => descriptionRaw),
    ).toEqual(["TRANSFERENCIAS A NEQUI", "TRANSFERENCIAS A NEQUI"]);
  });

  it("asks an answered group again, and changes the answer in every statement", async () => {
    const { clerkUserId, userId, accountId } = await newUser();
    const answer = (choice: "purchase" | "person") =>
      answerReviewGroup(clerkUserId, {
        group: "key_people",
        answer: choice,
        account: accountId,
        period: QUARTER,
      });
    await answer("purchase");
    await upload(userId, "movements-basic");

    const changed = await answer("person");

    expect(changed).toEqual({ ok: true, value: null });
    expect((await keyPeopleOf(clerkUserId))?.answered?.outcomes).toEqual([
      {
        said: "Pagos a otras personas",
        categoryId: "transfers_to_people",
        isGuessKept: false,
        count: 1,
      },
    ]);
    // October's movement follows the rule's new answer.
    for (const movement of await keyPaymentOf(userId, accountId))
      expect(movement).toMatchObject({
        categoryId: "transfers_to_people",
        isPendingReview: false,
      });
    expect(
      await withUserContext(app.db, userId, listUserCategoryRules),
    ).toMatchObject([{ categoryId: "transfers_to_people" }]);
  });

  it('answers a group again after "No sé", with a rule this time', async () => {
    const { clerkUserId, userId, accountId } = await newUser();
    const answer = (choice: "unsure" | "purchase") =>
      answerReviewGroup(clerkUserId, {
        group: "key_people",
        answer: choice,
        account: accountId,
        period: QUARTER,
      });
    await answer("unsure");
    const unsure = (await keyPeopleOf(clerkUserId))?.answered?.outcomes;

    await answer("purchase");

    expect(unsure).toEqual([
      {
        said: "No sé",
        categoryId: "transfers_to_people",
        isGuessKept: true,
        count: 1,
      },
    ]);
    expect(await keyPaymentOf(userId, accountId)).toMatchObject([
      { categoryId: "other_spending", isPendingReview: false },
    ]);
    expect(
      await withUserContext(app.db, userId, listUserCategoryRules),
    ).toMatchObject([{ categoryId: "other_spending" }]);
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

  it("marks a Nequi number as the user's in every statement and in the next upload", async () => {
    const { clerkUserId, userId, accountId } = await newExportUser();
    const mine = await numberHash(clerkUserId, "4567");

    const answered = await answerReviewNumbers(clerkUserId, {
      account: accountId,
      period: OCTOBER_QUARTER,
      mine: [mine],
    });
    // July's export sends to ••4567 again.
    await upload(userId, "movements-overlap");

    expect(answered).toEqual({ ok: true, value: null });
    expect((await nequiOf(clerkUserId))?.answered?.outcomes).toEqual([
      {
        said: "Son tuyos",
        categoryId: "own_account_transfer",
        isGuessKept: false,
        count: 1,
      },
      {
        said: "No son tuyos",
        categoryId: "transfers_to_people",
        isGuessKept: false,
        count: 1,
      },
    ]);
    expect(await nequiOf(clerkUserId, QUARTER)).toMatchObject({
      pending: null,
      answered: { outcomes: [{ said: "Son tuyos", count: 1 }] },
    });
  });

  it("doesn't ask again about money going out to a number that isn't the user's", async () => {
    const { clerkUserId, userId, accountId } = await newExportUser();

    await answerReviewNumbers(clerkUserId, {
      account: accountId,
      period: OCTOBER_QUARTER,
      mine: [],
    });
    await upload(userId, "movements-overlap");

    expect(await nequiOf(clerkUserId, QUARTER)).toMatchObject({
      pending: null,
      answered: {
        outcomes: [
          { said: "No son tuyos", categoryId: "transfers_to_people", count: 1 },
        ],
      },
    });
  });

  it('marks more numbers with "Cambiar", keeping those already the user\'s', async () => {
    const { clerkUserId, accountId } = await newExportUser();
    const answer = async (last4: string) =>
      answerReviewNumbers(clerkUserId, {
        account: accountId,
        period: OCTOBER_QUARTER,
        mine: [await numberHash(clerkUserId, last4)],
      });
    await answer("4567");

    await answer("6543");

    expect((await nequiOf(clerkUserId))?.answered?.numbers).toMatchObject([
      { last4: "4567", isMine: true },
      { last4: "6543", isMine: true },
    ]);
  });

  it("marks nothing on another user's account", async () => {
    const owner = await newExportUser();
    const other = await newExportUser();

    const answered = await answerReviewNumbers(other.clerkUserId, {
      account: owner.accountId,
      period: OCTOBER_QUARTER,
      mine: [await numberHash(owner.clerkUserId, "4567")],
    });

    expect(answered).toEqual({ ok: false, error: { code: "NOT_FOUND" } });
    expect((await nequiOf(owner.clerkUserId))?.pending?.count).toBe(2);
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
