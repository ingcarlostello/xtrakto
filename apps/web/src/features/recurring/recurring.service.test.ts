import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { extractedContentSchema } from "@xtrakto/core";
import {
  createDb,
  createIngestionJobWithinLimit,
  type DbClient,
  findOrCreateUser,
  listMovementAccounts,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import { findParser } from "@xtrakto/parsers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { claimJob, ingestJob } from "../ingestion/ingest-statement.service";
import { getRecurringPayments } from "./recurring.service";

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

// The fixed payments of quarterly-year-rollover, the largest first.
const SPENDING = [
  "Financiera Andes S",
  "EMPRESA DE ENERGIA",
  "HOGAR CONECTADO SA",
  "GIMNASIO FIT",
  "Acueducto Municipa",
  "Telefonia Movil",
  "GAS NATURAL CIUDAD",
];
const MOVED = ["AHORRO DOLAR", "TC MASTER PESOS"];

// A fixture as the browser sends it: minimized by its parser.
const fixture = (name: string) => {
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

const labels = (payments: readonly { label: string }[]) =>
  payments.map(({ label }) => label);

describe.skipIf(!testDatabase)("an account's payments that repeat", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  // A user who uploaded a fixture, as the action and the function do it.
  const userWith = async (name: string) => {
    const clerkUserId = `test_${randomUUID()}`;
    const userId = await findOrCreateUser(app.db, clerkUserId);
    const created = await withUserContext(app.db, userId, (ctx) =>
      createIngestionJobWithinLimit(ctx, fixture(name), {
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
    const [account] = await withUserContext(app.db, userId, (ctx) =>
      listMovementAccounts(ctx),
    );
    if (!account) throw new Error("No account.");
    return { clerkUserId, accountId: account.id };
  };

  it("finds the fixed payments of the latest quarter's last month", async () => {
    const { clerkUserId } = await userWith("quarterly-year-rollover");

    const recurring = await getRecurringPayments(clerkUserId, {});

    expect(recurring?.period).toEqual({
      kind: "quarter",
      year: 2027,
      quarter: 1,
    });
    expect(recurring?.month).toEqual({ year: 2027, month: 3 });
    expect(labels(recurring?.payments.spending ?? [])).toEqual(SPENDING);
    expect(labels(recurring?.payments.moved ?? [])).toEqual(MOVED);
    const [loan, energy] = recurring?.payments.spending ?? [];
    expect(loan?.months.at(-1)?.payments).toEqual([-154_000_000, -31_100_000]);
    expect(energy?.trend).toEqual({ kind: "rose", percent: 12 });
    expect(recurring?.payments.spending.at(-1)?.channels).toEqual([
      "transfer",
      "pse",
    ]);
  });

  it("finds in a month only what repeated three months by then", async () => {
    const { clerkUserId } = await userWith("quarterly-year-rollover");
    const inMonth = (month: number) =>
      getRecurringPayments(clerkUserId, {
        period: { kind: "month", year: 2027, month },
      });

    const march = await inMonth(3);
    // The statement starts in January: by February, two months only.
    const february = await inMonth(2);

    expect(march?.month).toEqual({ year: 2027, month: 3 });
    expect(labels(march?.payments.spending ?? [])).toEqual(SPENDING);
    expect(february?.month).toEqual({ year: 2027, month: 2 });
    expect(february?.payments).toEqual({ spending: [], moved: [] });
  });

  it("finds none in a quarter whose payments don't repeat, and keeps its last month", async () => {
    const { clerkUserId } = await userWith("quarterly-basic");

    const recurring = await getRecurringPayments(clerkUserId, {});

    expect(recurring?.month).toEqual({ year: 2026, month: 9 });
    expect(recurring?.payments).toEqual({ spending: [], moved: [] });
  });

  it("opens the user's own account when the URL names another user's", async () => {
    const owner = await userWith("quarterly-year-rollover");
    const stranger = await userWith("quarterly-basic");

    const recurring = await getRecurringPayments(stranger.clerkUserId, {
      accountId: owner.accountId,
    });

    expect(recurring?.account.id).toBe(stranger.accountId);
    expect(recurring?.payments.spending).toEqual([]);
  });

  it("reads nothing for a user without movements", async () => {
    expect(await getRecurringPayments(`test_${randomUUID()}`, {})).toBeNull();
  });
});
