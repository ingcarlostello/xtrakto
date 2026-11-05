import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { extractedContentSchema } from "@xtrakto/core";
import {
  createDb,
  createIngestionJobWithinLimit,
  type DbClient,
  findOrCreateUser,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import { findParser } from "@xtrakto/parsers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { claimJob, ingestJob } from "../ingestion/ingest-statement.service";
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
const THIRD_QUARTER = { kind: "quarter", year: 2026, quarter: 3 } as const;

// A fixture as the browser sends it: minimized by its parser.
const fixtureJob = (name: string) => {
  const json: unknown = JSON.parse(
    readFileSync(new URL(`${name}.json`, FIXTURES), "utf8"),
  );
  const content = extractedContentSchema.parse(json);
  const parser = findParser(content);
  if (!parser.ok) throw new Error(`No parser recognizes ${name}.`);
  return {
    formatId: parser.value.id,
    extractedContent: parser.value.minimize(content),
  };
};

// A new user's files, uploaded in order as the function runs them.
const uploadAs = async (app: DbClient, fixtures: readonly string[]) => {
  const clerkUserId = `test_${randomUUID()}`;
  const userId = await findOrCreateUser(app.db, clerkUserId);
  for (const name of fixtures) {
    const created = await withUserContext(app.db, userId, (ctx) =>
      createIngestionJobWithinLimit(ctx, fixtureJob(name), {
        limit: 100,
        month: {
          start: new Date(Date.now() - HOUR_MS),
          end: new Date(Date.now() + HOUR_MS),
        },
      }),
    );
    if (!created.ok) throw new Error("No job created.");
    await claimJob({ jobId: created.value, userId });
    await ingestJob({ jobId: created.value, userId });
  }
  return clerkUserId;
};

describe.skipIf(!testDatabase)("the movements list", () => {
  let app: DbClient;
  let clerkUserId: string;

  beforeAll(async () => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
    clerkUserId = await uploadAs(app, ["quarterly-basic"]);
  });

  afterAll(async () => {
    await app.pool.end();
  });

  const listOf = async (shown: number) => {
    const transactions = await getAccountTransactions(clerkUserId, {
      period: THIRD_QUARTER,
      shown,
    });
    if (!transactions) throw new Error("No movements.");
    return transactions;
  };

  it("puts July's four daily abonos in one line, and counts every movement", async () => {
    const { total, list } = await listOf(30);

    // August and September have one abono each, which show as they are.
    expect(total).toBe(33);
    expect(list).toMatchObject({
      shownLines: 30,
      shownMovements: 33,
      lineCount: 30,
      groupedInterest: 4,
    });
    expect(
      list.days.flatMap(({ lines }) =>
        lines.filter(({ kind }) => kind === "interest"),
      ),
    ).toEqual([
      {
        kind: "interest",
        date: "2026-07-31",
        descriptionRaw: "ABONO INTERESES AHORROS",
        amountMinor: 957,
        count: 4,
      },
    ]);
  });

  it("shows as many lines as asked, out of every movement of the period", async () => {
    const { total, list } = await listOf(5);

    expect(total).toBe(33);
    expect(list).toMatchObject({ shownLines: 5, lineCount: 30 });
  });

  it("shows a category's movements, leaving any filter out, and the period's totals", async () => {
    const transactions = await getAccountTransactions(clerkUserId, {
      period: THIRD_QUARTER,
      filter: "income",
      category: "cash_withdrawal",
      shown: 30,
    });

    // The ATM in July and the corresponsal in September.
    expect(transactions).toMatchObject({
      total: 2,
      category: "cash_withdrawal",
      kindTotals: { spending: { amountMinor: -147_100_000, count: 14 } },
    });
    expect(transactions?.filter).toBeUndefined();
    expect(
      transactions?.list.days.flatMap(({ lines }) =>
        lines.map((line) => line.kind === "movement" && line.item.date),
      ),
    ).toEqual(["2026-09-02", "2026-07-20"]);
  });

  it("names the files it joined, and both files of a movement July's export repeats", async () => {
    const joinedUser = await uploadAs(app, [
      "quarterly-basic",
      "movements-overlap",
    ]);
    const joined = await getAccountTransactions(joinedUser, {
      period: THIRD_QUARTER,
      shown: 30,
    });
    const july = joined?.list.days
      .flatMap(({ lines }) => lines)
      .find(
        (line) => line.kind === "movement" && line.item.date < "2026-08-01",
      );
    if (july?.kind !== "movement") throw new Error("No movement in July.");

    const opened = await getAccountTransactions(joinedUser, {
      period: THIRD_QUARTER,
      shown: 30,
      movementId: july.item.id,
    });

    // The export's movements are hidden behind the quarterly statement's.
    expect(joined).toMatchObject({
      total: 33,
      files: { quarterly: 1, movements: 1 },
    });
    expect(opened?.detail?.movement).toMatchObject({
      statement: { formatId: "bancolombia-savings-quarterly" },
      twin: { statement: { formatId: "bancolombia-movements-export" } },
    });
  });
});
