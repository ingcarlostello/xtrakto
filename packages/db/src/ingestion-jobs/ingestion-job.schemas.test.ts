import type { ExtractedContent } from "@xtrakto/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { insertUser, pgErrorCode } from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { ingestionJobs } from "./ingestion-job.schemas";

const CHECK_VIOLATION = "23514";
const CONTENT: ExtractedContent = { type: "spreadsheet", sheets: [] };

describe.skipIf(!testDatabase)("ingestion_jobs table", () => {
  let owner: DbClient;

  beforeAll(() => {
    owner = createDb({ connectionString: requireTestDatabase().ownerUrl });
  });

  afterAll(async () => {
    await owner.pool.end();
  });

  it("keeps a pending job's content until it ends", async () => {
    const userId = await insertUser(owner.db);
    const [job] = await owner.db
      .insert(ingestionJobs)
      .values({ userId, extractedContent: CONTENT })
      .returning({ status: ingestionJobs.status });

    expect(job).toEqual({ status: "pending" });
  });

  it.each(["done", "failed"] as const)(
    "rejects a %s job that still holds the statement's content",
    async (status) => {
      const userId = await insertUser(owner.db);
      const insert = owner.db
        .insert(ingestionJobs)
        .values({ userId, status, extractedContent: CONTENT });

      expect(await pgErrorCode(insert)).toBe(CHECK_VIOLATION);
    },
  );
});
