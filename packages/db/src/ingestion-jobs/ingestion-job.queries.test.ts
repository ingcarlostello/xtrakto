import type { ExtractedContent } from "@xtrakto/core";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { insertAccount, insertUser, pgErrorCode } from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import {
  createIngestionJobWithinLimit,
  deletePendingIngestionJob,
  type NewIngestionJob,
  type SubmissionQuota,
} from "./ingestion-job.queries";
import { ingestionJobs } from "./ingestion-job.schemas";

const FOREIGN_KEY_VIOLATION = "23503";
const HOUR_MS = 3_600_000;
const CONTENT: ExtractedContent = {
  type: "spreadsheet",
  sheets: [
    { name: "", rows: [["Fecha", "Descripción", "Referencia", "Valor"]] },
  ],
};
const JOB: NewIngestionJob = {
  formatId: "bancolombia-movements-export",
  extractedContent: CONTENT,
};

// October 2025 in Bogotá.
const OCTOBER: SubmissionQuota["month"] = {
  start: new Date("2025-10-01T05:00:00Z"),
  end: new Date("2025-11-01T05:00:00Z"),
};

// A month around now, which holds the jobs created with the default instant.
const quotaOf = (limit: number): SubmissionQuota => ({
  limit,
  month: {
    start: new Date(Date.now() - HOUR_MS),
    end: new Date(Date.now() + HOUR_MS),
  },
});

// A promise and the function that resolves it.
const signal = () => {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe.skipIf(!testDatabase)("ingestion jobs", () => {
  let owner: DbClient;
  let app: DbClient;

  const newUser = async (): Promise<UserId> =>
    toUserId(await insertUser(owner.db));

  // As the owner, so a test can set what the application never writes itself.
  const insertJob = (
    userId: string,
    values: Partial<typeof ingestionJobs.$inferInsert> = {},
  ) => owner.db.insert(ingestionJobs).values({ userId, ...values });

  const submit = (
    userId: UserId,
    quota: SubmissionQuota,
    job: NewIngestionJob = JOB,
  ) =>
    withUserContext(app.db, userId, (ctx) =>
      createIngestionJobWithinLimit(ctx, job, quota),
    );

  const readJob = async (jobId: string) => {
    const [row] = await owner.db
      .select()
      .from(ingestionJobs)
      .where(eq(ingestionJobs.id, jobId));
    return row;
  };

  beforeAll(() => {
    const { appUrl, ownerUrl } = requireTestDatabase();
    owner = createDb({ connectionString: ownerUrl });
    app = createDb({ connectionString: appUrl });
  });

  afterAll(async () => {
    await Promise.all([owner.pool.end(), app.pool.end()]);
  });

  it("creates a pending job with the content, pinned to the chosen account", async () => {
    const userId = await newUser();
    const accountId = await insertAccount(owner.db, userId);

    const created = await submit(userId, quotaOf(10), { ...JOB, accountId });

    expect(created.ok).toBe(true);
    expect(created.ok && (await readJob(created.value))).toMatchObject({
      userId,
      status: "pending",
      formatId: JOB.formatId,
      accountId,
      accountLast4: null,
      extractedContent: CONTENT,
    });
  });

  it("can pin a job to the last 4 digits of an account still to be created", async () => {
    const userId = await newUser();

    const created = await submit(userId, quotaOf(10), {
      ...JOB,
      accountLast4: "2109",
    });

    expect(created.ok && (await readJob(created.value))).toMatchObject({
      accountId: null,
      accountLast4: "2109",
    });
  });

  it("never pins a job to another user's account", async () => {
    const userId = await newUser();
    const othersAccount = await insertAccount(owner.db, await newUser());

    const submission = submit(userId, quotaOf(10), {
      ...JOB,
      accountId: othersAccount,
    });

    expect(await pgErrorCode(submission)).toBe(FOREIGN_KEY_VIOLATION);
  });

  it("counts pending and processing jobs, and finished ones only if they added movements", async () => {
    const userId = await newUser();
    await insertJob(userId, { status: "pending", extractedContent: CONTENT });
    await insertJob(userId, { status: "processing" });
    await insertJob(userId, { status: "done", stats: { added: 2 } });
    await insertJob(userId, { status: "done", stats: { added: 0 } });
    await insertJob(userId, { status: "failed" });

    expect(await submit(userId, quotaOf(3))).toEqual({
      ok: false,
      error: { used: 3 },
    });
    expect((await submit(userId, quotaOf(4))).ok).toBe(true);
  });

  it("counts only the jobs created within the month", async () => {
    const userId = await newUser();
    const instants = [
      new Date(OCTOBER.start.getTime() - 1_000),
      OCTOBER.start,
      new Date(OCTOBER.end.getTime() - 1_000),
      OCTOBER.end,
    ];
    for (const createdAt of instants) await insertJob(userId, { createdAt });

    expect(await submit(userId, { limit: 2, month: OCTOBER })).toEqual({
      ok: false,
      error: { used: 2 },
    });
  });

  it("lets only one of two racing submissions take the last slot", async () => {
    const userId = await newUser();
    const firstInserted = signal();
    const firstMayCommit = signal();
    const quota = quotaOf(1);

    // The first submission takes the slot and keeps its transaction open.
    const first = withUserContext(app.db, userId, async (ctx) => {
      const created = await createIngestionJobWithinLimit(ctx, JOB, quota);
      firstInserted.resolve();
      await firstMayCommit.promise;
      return created;
    });
    await firstInserted.promise;
    const second = submit(userId, quota);
    // Time for the second to reach the lock; without one, it would count
    // before the first commits and take a second slot.
    await new Promise((resolve) => setTimeout(resolve, 200));
    firstMayCommit.resolve();

    expect((await first).ok).toBe(true);
    expect(await second).toEqual({ ok: false, error: { used: 1 } });
  });

  it("deletes a pending job, but never a started job or another user's", async () => {
    const userId = await newUser();
    const created = await submit(userId, quotaOf(10));
    const jobId = created.ok ? created.value : "";
    const [started] = await insertJob(userId, {
      status: "processing",
    }).returning({ id: ingestionJobs.id });
    const deleteAs = (user: UserId, id: string) =>
      withUserContext(app.db, user, (ctx) =>
        deletePendingIngestionJob(ctx, id),
      );

    expect(await deleteAs(await newUser(), jobId)).toBe(false);
    expect(await deleteAs(userId, started?.id ?? "")).toBe(false);
    expect(await deleteAs(userId, jobId)).toBe(true);
    expect(await readJob(jobId)).toBeUndefined();
    expect(await readJob(started?.id ?? "")).toBeDefined();
  });
});
