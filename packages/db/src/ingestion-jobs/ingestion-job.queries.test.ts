import type { ExtractedContent } from "@xtrakto/core";
import { eq, sql, TransactionRollbackError } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import {
  insertAccount,
  insertStatement,
  insertUser,
  pgErrorCode,
} from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient, DbTransaction } from "../client/db-client.types";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import {
  claimIngestionJob,
  countSlotsUsed,
  createIngestionJobWithinLimit,
  deletePendingIngestionJob,
  expireStaleIngestionJobs,
  failIngestionJob,
  finishIngestionJob,
  lockIngestionJob,
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

  const insertJobId = async (
    userId: string,
    values: Partial<typeof ingestionJobs.$inferInsert> = {},
  ): Promise<string> => {
    const [job] = await insertJob(userId, values).returning({
      id: ingestionJobs.id,
    });
    if (!job) throw new Error("No job inserted.");
    return job.id;
  };

  // A done job and the statement it saved, in one of the user's accounts.
  const insertDoneJob = async (
    userId: string,
    accountId: string,
    stats: Partial<typeof ingestionJobs.$inferInsert>["stats"] = {},
  ): Promise<string> => {
    const statementId = await insertStatement(owner.db, { userId, accountId });
    return insertJobId(userId, { status: "done", statementId, stats });
  };

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
    const accountId = await insertAccount(owner.db, userId);
    await insertJob(userId, { status: "pending", extractedContent: CONTENT });
    await insertJob(userId, { status: "processing" });
    await insertDoneJob(userId, accountId, { added: 2 });
    await insertDoneJob(userId, accountId, { added: 0 });
    await insertJob(userId, { status: "failed", errorCode: "PARSE_FAILED" });
    const { month } = quotaOf(0);

    expect(
      await withUserContext(app.db, userId, (ctx) =>
        countSlotsUsed(ctx, month),
      ),
    ).toBe(3);
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

  it("claims an open job, again on a retry, but never a finished job or another user's", async () => {
    const userId = await newUser();
    const jobId = await insertJobId(userId, { extractedContent: CONTENT });
    const doneJob = await insertDoneJob(
      userId,
      await insertAccount(owner.db, userId),
    );
    const claimAs = (user: UserId, id: string) =>
      withUserContext(app.db, user, (ctx) => claimIngestionJob(ctx, id));

    expect(await claimAs(await newUser(), jobId)).toBe(false);
    expect(await claimAs(userId, jobId)).toBe(true);
    expect(await claimAs(userId, jobId)).toBe(true);
    expect(await claimAs(userId, doneJob)).toBe(false);
    expect(await readJob(jobId)).toMatchObject({ status: "processing" });
    expect(await readJob(doneJob)).toMatchObject({ status: "done" });
  });

  it("reads an open job's pin and content, and nothing once it's finished or another user's", async () => {
    const userId = await newUser();
    const accountId = await insertAccount(owner.db, userId);
    const jobId = await insertJobId(userId, {
      accountId,
      extractedContent: CONTENT,
    });
    const doneJob = await insertDoneJob(userId, accountId);
    const lockAs = (user: UserId, id: string) =>
      withUserContext(app.db, user, (ctx) => lockIngestionJob(ctx, id));

    expect(await lockAs(userId, jobId)).toEqual({
      accountId,
      accountLast4: null,
      extractedContent: CONTENT,
    });
    expect(await lockAs(userId, doneJob)).toBeUndefined();
    expect(await lockAs(await newUser(), jobId)).toBeUndefined();
  });

  it("makes a user's jobs wait for each other while one is being ingested", async () => {
    const userId = await newUser();
    const first = await insertJobId(userId, { extractedContent: CONTENT });
    const second = await insertJobId(userId, { extractedContent: CONTENT });
    const firstLocked = signal();
    const firstMayCommit = signal();
    let isSecondLocked = false;

    const ingesting = withUserContext(app.db, userId, async (ctx) => {
      await lockIngestionJob(ctx, first);
      firstLocked.resolve();
      await firstMayCommit.promise;
    });
    await firstLocked.promise;
    const waiting = withUserContext(app.db, userId, async (ctx) => {
      await lockIngestionJob(ctx, second);
      isSecondLocked = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(isSecondLocked).toBe(false);
    firstMayCommit.resolve();
    await Promise.all([ingesting, waiting]);
    expect(isSecondLocked).toBe(true);
  });

  it("finishes a job with its statement and counts, and deletes its content", async () => {
    const userId = await newUser();
    const accountId = await insertAccount(owner.db, userId);
    const statementId = await insertStatement(owner.db, { userId, accountId });
    const jobId = await insertJobId(userId, {
      status: "processing",
      extractedContent: CONTENT,
    });
    const stats = {
      total: 3,
      added: 2,
      skipped: 1,
      covered: 0,
      hidden: 0,
      replaced: 0,
    };

    await withUserContext(app.db, userId, (ctx) =>
      finishIngestionJob(ctx, jobId, { statementId, stats }),
    );

    expect(await readJob(jobId)).toMatchObject({
      status: "done",
      statementId,
      stats,
      errorCode: null,
      extractedContent: null,
    });
  });

  it("fails an open job with its code and deletes its content, but never a finished one", async () => {
    const userId = await newUser();
    const jobId = await insertJobId(userId, {
      status: "processing",
      extractedContent: CONTENT,
    });
    const doneJob = await insertDoneJob(
      userId,
      await insertAccount(owner.db, userId),
    );
    const failAs = (user: UserId, id: string) =>
      withUserContext(app.db, user, (ctx) =>
        failIngestionJob(ctx, id, "UNKNOWN_FORMAT"),
      );

    expect(await failAs(await newUser(), jobId)).toBe(false);
    expect(await failAs(userId, jobId)).toBe(true);
    expect(await failAs(userId, doneJob)).toBe(false);
    expect(await readJob(jobId)).toMatchObject({
      status: "failed",
      errorCode: "UNKNOWN_FORMAT",
      extractedContent: null,
    });
    expect(await readJob(doneJob)).toMatchObject({
      status: "done",
      errorCode: null,
    });
  });

  describe("the daily cleanup", () => {
    const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR_MS);

    // As the application role, in a transaction undone at the end: the
    // cleanup reaches every user's jobs, other test files' included.
    const inUndoneTransaction = async <T>(
      work: (tx: DbTransaction) => Promise<T>,
    ): Promise<T> => {
      let outcome: { value: T } | undefined;
      await app.db
        .transaction(async (tx) => {
          outcome = { value: await work(tx) };
          tx.rollback();
        })
        .catch((error: unknown) => {
          if (!(error instanceof TransactionRollbackError)) throw error;
        });
      if (!outcome) throw new Error("The transaction didn't run.");
      return outcome.value;
    };

    // Each user's jobs as Row-Level Security shows them in that transaction.
    const jobsSeenBy = async (tx: DbTransaction, users: readonly UserId[]) => {
      const seen = new Map<string, unknown>();
      for (const userId of users) {
        await tx.execute(
          sql`select set_config('app.user_id', ${userId}, true)`,
        );
        const { rows } = await tx.execute<{ id: string }>(sql`
          select id, status, error_code as "errorCode",
            extracted_content is null as "isContentDeleted"
          from ingestion_jobs`);
        for (const { id, ...job } of rows) seen.set(id, job);
      }
      return seen;
    };

    it("expires every user's jobs left open for more than 24 hours, and nothing else", async () => {
      const [first, second] = [await newUser(), await newUser()];
      const statementId = await insertStatement(owner.db, {
        userId: first,
        accountId: await insertAccount(owner.db, first),
      });
      const open = { extractedContent: CONTENT };
      const stale = [
        await insertJobId(first, { ...open, createdAt: hoursAgo(25) }),
        await insertJobId(second, {
          ...open,
          status: "processing",
          createdAt: hoursAgo(24.1),
        }),
      ];
      const recent = await insertJobId(first, {
        ...open,
        createdAt: hoursAgo(23.9),
      });
      const done = await insertJobId(first, {
        status: "done",
        statementId,
        createdAt: hoursAgo(48),
      });
      const failed = await insertJobId(second, {
        status: "failed",
        errorCode: "PARSE_FAILED",
        createdAt: hoursAgo(48),
      });

      const { expired, seen } = await inUndoneTransaction(async (tx) => ({
        expired: await expireStaleIngestionJobs(tx),
        seen: await jobsSeenBy(tx, [first, second]),
      }));

      expect(expired).toBeGreaterThanOrEqual(stale.length);
      const expiredJob = {
        status: "failed",
        errorCode: "CONTENT_EXPIRED",
        isContentDeleted: true,
      };
      expect(stale.map((id) => seen.get(id))).toEqual([expiredJob, expiredJob]);
      expect([recent, done, failed].map((id) => seen.get(id))).toEqual([
        { status: "pending", errorCode: null, isContentDeleted: false },
        { status: "done", errorCode: null, isContentDeleted: true },
        { status: "failed", errorCode: "PARSE_FAILED", isContentDeleted: true },
      ]);
    });
  });
});
