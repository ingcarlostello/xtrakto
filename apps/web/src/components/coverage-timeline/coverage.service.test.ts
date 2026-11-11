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
import {
  claimJob,
  ingestJob,
} from "@/features/ingestion/ingest-statement.service";
import { getCoverage, getYourData } from "./coverage.service";

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
// A day in Bogotá after the fixtures' quarter, whatever day the tests run.
const TODAY = new Date("2026-11-05T15:00:00Z");

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

describe.skipIf(!testDatabase)("an account's coverage", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    database.current = app.db;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TODAY);
  });

  afterAll(async () => {
    vi.useRealTimers();
    await app.pool.end();
  });

  // A new user's files, uploaded in order as the function runs them.
  const uploadAs = async (fixtures: readonly string[]) => {
    const clerkUserId = `test_${randomUUID()}`;
    const userId = await findOrCreateUser(app.db, clerkUserId);
    for (const name of fixtures) {
      const created = await withUserContext(app.db, userId, (ctx) =>
        createIngestionJobWithinLimit(ctx, fixtureJob(name), {
          limit: 100,
          month: {
            start: new Date(TODAY.getTime() - HOUR_MS),
            end: new Date(TODAY.getTime() + HOUR_MS),
          },
        }),
      );
      if (!created.ok) throw new Error("No job created.");
      await claimJob({ jobId: created.value, userId });
      await ingestJob({ jobId: created.value, userId });
    }
    return clerkUserId;
  };

  it("reads each month through this one, and the files the user keeps", async () => {
    const clerkUserId = await uploadAs([
      "quarterly-basic",
      "movements-overlap",
    ]);

    const [view] = await getCoverage(clerkUserId);
    const data = await getYourData(clerkUserId);

    expect(
      view?.segments.map(({ label, status, isAlsoInMovements }) => [
        label,
        status,
        isAlsoInMovements,
      ]),
    ).toEqual([
      ["jul", "verified", true],
      ["ago", "verified", false],
      ["sep", "verified", false],
      ["oct", "missing", false],
      ["nov", "missing", false],
    ]);
    expect(view?.sentence).toBe(
      "Julio a septiembre de 2026 completo y verificado. Octubre y noviembre no los tienes todavía.",
    );
    expect(data.files).toEqual([
      { bankId: "bancolombia", withBalances: 1, withoutBalances: 1 },
    ]);
    expect(data.coverage).toEqual([view]);
    expect(view?.isOtherBank).toBe(false);
  });

  it("reads nothing before the user's first file", async () => {
    const clerkUserId = `test_${randomUUID()}`;

    expect(await getCoverage(clerkUserId)).toEqual([]);
    expect(await getYourData(clerkUserId)).toEqual({
      files: [],
      coverage: [],
    });
  });
});
