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
import { getCategories } from "./categories.service";

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

describe.skipIf(!testDatabase)("an account's categories", () => {
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

  it("reads the quarter's movements, what they add up to, and the user's rules", async () => {
    const { clerkUserId, userId } = await newUser();
    const rule = {
      target: "description",
      descriptionFolded: "PAGO PSE BANCO EJEMPLO S",
      direction: "out",
      categoryId: "investment",
    } as const;
    await withUserContext(app.db, userId, (ctx) =>
      saveUserCategoryRule(ctx, rule),
    );

    const categories = await getCategories(clerkUserId, {
      period: THIRD_QUARTER,
    });

    expect(categories?.movements).toHaveLength(33);
    expect(categories?.summary.kinds.spending).toEqual({
      amountMinor: -147_100_000,
      count: 14,
    });
    expect(categories?.rules).toEqual([rule]);
  });

  it("reads nothing for a user without movements", async () => {
    const clerkUserId = `test_${randomUUID()}`;
    await findOrCreateUser(app.db, clerkUserId);

    expect(await getCategories(clerkUserId, {})).toBeNull();
  });
});
