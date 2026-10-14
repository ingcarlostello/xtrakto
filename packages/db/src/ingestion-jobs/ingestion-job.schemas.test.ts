import type { ExtractedContent } from "@xtrakto/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { eq } from "drizzle-orm";
import {
  insertAccount,
  insertStatement,
  insertUser,
  pgErrorCode,
} from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { statements } from "../statements/statement.schemas";
import { ingestionJobs } from "./ingestion-job.schemas";

const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";
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

  // A user and one of their statements, which a done job points to.
  const userWithStatement = async () => {
    const userId = await insertUser(owner.db);
    const accountId = await insertAccount(owner.db, userId);
    return {
      userId,
      statementId: await insertStatement(owner.db, { userId, accountId }),
    };
  };

  it.each(["done", "failed"] as const)(
    "rejects a %s job that still holds the statement's content",
    async (status) => {
      const { userId, statementId } = await userWithStatement();
      const outcome =
        status === "done"
          ? { statementId }
          : { errorCode: "PARSE_FAILED" as const };
      const insert = owner.db
        .insert(ingestionJobs)
        .values({ userId, status, ...outcome, extractedContent: CONTENT });

      expect(await pgErrorCode(insert)).toBe(CHECK_VIOLATION);
    },
  );

  it.each([
    { status: "failed" },
    { status: "pending", errorCode: "PARSE_FAILED" },
    { status: "done" },
  ] as const)(
    "rejects a $status job with an outcome that doesn't match",
    async (job) => {
      const { userId } = await userWithStatement();
      const insert = owner.db.insert(ingestionJobs).values({ userId, ...job });

      expect(await pgErrorCode(insert)).toBe(CHECK_VIOLATION);
    },
  );

  it("never points a job to another user's statement", async () => {
    const { statementId } = await userWithStatement();
    const insert = owner.db.insert(ingestionJobs).values({
      userId: await insertUser(owner.db),
      status: "done",
      statementId,
    });

    expect(await pgErrorCode(insert)).toBe(FOREIGN_KEY_VIOLATION);
  });

  it("deletes a done job with the statement it saved", async () => {
    const { userId, statementId } = await userWithStatement();
    await owner.db
      .insert(ingestionJobs)
      .values({ userId, status: "done", statementId });

    await owner.db.delete(statements).where(eq(statements.id, statementId));

    expect(
      await owner.db
        .select()
        .from(ingestionJobs)
        .where(eq(ingestionJobs.userId, userId)),
    ).toEqual([]);
  });

  it.each(["210", "21a9", "02109"])(
    "rejects %s as an account's last 4 digits",
    async (accountLast4) => {
      const userId = await insertUser(owner.db);
      const insert = owner.db
        .insert(ingestionJobs)
        .values({ userId, accountLast4 });

      expect(await pgErrorCode(insert)).toBe(CHECK_VIOLATION);
    },
  );

  it("rejects a job pinned to both an account and the digits of one", async () => {
    const userId = await insertUser(owner.db);
    const accountId = await insertAccount(owner.db, userId);
    const insert = owner.db
      .insert(ingestionJobs)
      .values({ userId, accountId, accountLast4: "2109" });

    expect(await pgErrorCode(insert)).toBe(CHECK_VIOLATION);
  });
});
