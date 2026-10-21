import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { extractedContentSchema } from "@xtrakto/core";
import {
  createDb,
  createIngestionJobWithinLimit,
  type DbClient,
  findOrCreateUser,
  saveUserCategoryRule,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import { findParser } from "@xtrakto/parsers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { claimJob, ingestJob } from "../ingestion/ingest-statement.service";
import { getCategoryDetail } from "./category-detail.service";

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

// quarterly-basic as the browser sends it: minimized by its parser.
const quarterlyBasic = () => {
  const json: unknown = JSON.parse(
    readFileSync(new URL("quarterly-basic.json", FIXTURES), "utf8"),
  );
  const content = extractedContentSchema.parse(json);
  const parser = findParser(content);
  if (!parser.ok) throw new Error("No parser recognizes quarterly-basic.");
  return {
    formatId: parser.value.id,
    extractedContent: parser.value.minimize(content),
  };
};

describe.skipIf(!testDatabase)("a category's detail", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  // A user who uploaded quarterly-basic, as the action and the function do.
  const newUser = async () => {
    const clerkUserId = `test_${randomUUID()}`;
    const userId = await findOrCreateUser(app.db, clerkUserId);
    const created = await withUserContext(app.db, userId, (ctx) =>
      createIngestionJobWithinLimit(ctx, quarterlyBasic(), {
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
    return { clerkUserId, userId };
  };

  it("reads the quarter's movements, the category's newest and the user's rules for it", async () => {
    const { clerkUserId, userId } = await newUser();
    const cash = {
      target: "description",
      descriptionFolded: "RETIRO CORRESPONSAL CB",
      direction: "out",
      categoryId: "cash_withdrawal",
    } as const;
    await withUserContext(app.db, userId, async (ctx) => {
      await saveUserCategoryRule(ctx, cash);
      await saveUserCategoryRule(ctx, {
        ...cash,
        descriptionFolded: "PAGO PSE BANCO EJEMPLO S",
        categoryId: "investment",
      });
    });

    const detail = await getCategoryDetail(clerkUserId, "cash_withdrawal", {
      period: THIRD_QUARTER,
    });

    expect(detail?.movements).toHaveLength(33);
    expect(detail?.summary.kinds.spending).toEqual({
      amountMinor: -147_100_000,
      count: 14,
    });
    // The corresponsal in September, then the ATM in July.
    expect(
      detail?.latest.map(({ date, descriptionRaw }) => [date, descriptionRaw]),
    ).toEqual([
      ["2026-09-02", "RETIRO CORRESPONSAL CB"],
      ["2026-07-20", "RETIRO CAJERO  ATM PLAZA CENTR"],
    ]);
    expect(detail?.rules).toEqual([cash]);
  });

  it("reads at most four of the category's newest movements", async () => {
    const { clerkUserId } = await newUser();

    const detail = await getCategoryDetail(clerkUserId, "transfers_to_people", {
      period: THIRD_QUARTER,
    });

    expect(detail?.latest.map(({ date }) => date)).toEqual([
      "2026-09-22",
      "2026-08-25",
      "2026-08-20",
      "2026-08-12",
    ]);
  });

  it("reads nothing for a user without movements", async () => {
    const clerkUserId = `test_${randomUUID()}`;
    await findOrCreateUser(app.db, clerkUserId);

    expect(
      await getCategoryDetail(clerkUserId, "cash_withdrawal", {}),
    ).toBeNull();
  });
});
