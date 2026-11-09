import { beforeEach, describe, expect, it, vi } from "vitest";
import { listUploadedFiles, listUploadJobs } from "./upload-results.service";

// The queries and their Row-Level Security are tested in their package;
// here, what the service asks for and what it gives the screen.
const mocks = vi.hoisted(() => ({
  findUserId: vi.fn(),
  listIngestionJobResults: vi.fn(),
  listRecentIngestionJobs: vi.fn(),
  listStatementMatches: vi.fn(),
  countCountedMovements: vi.fn(),
  readTodaysBalanceOffer: vi.fn(),
  withUserContext: vi.fn(),
}));

vi.mock("@/features/todays-balance/todays-balance.service", () => ({
  readTodaysBalanceOffer: mocks.readTodaysBalanceOffer,
}));
vi.mock("@xtrakto/db", () => ({
  findUserId: mocks.findUserId,
  listIngestionJobResults: mocks.listIngestionJobResults,
  listRecentIngestionJobs: mocks.listRecentIngestionJobs,
  listStatementMatches: mocks.listStatementMatches,
  countCountedMovements: mocks.countCountedMovements,
  withUserContext: mocks.withUserContext,
}));
vi.mock("@/lib/db", () => ({ getDb: () => "db" }));

const USER_ID = "0b6f1d2e-58c4-4c31-9a59-6a3f0f5c2e11";
const JOB_ID = "7d1e3c5a-2b4f-4e6a-8c9d-0e1f2a3b4c5d";
const OTHER_JOB = "8e2f4d6b-3c5a-4f7b-9d0e-1f2a3b4c5d6e";
const CONTEXT = { tx: "tx", userId: USER_ID };
const QUARTER = { from: "2026-06-30", to: "2026-09-30" };
const PREVIOUS = { from: "2026-03-31", to: "2026-06-30" };
const AUGUST_1_TO_15 = { from: "2026-08-01", to: "2026-08-15" };
const MATCHES = { matched: 12, dayApart: 3, references: 4, verifiedBy: [] };
const NO_MATCHES = { matched: 0, dayApart: 0, references: 0, verifiedBy: [] };
const ALL_COUNTS = { added: 0, skipped: 0, covered: 0, hidden: 0, replaced: 0 };

const doneJob = (
  id: string,
  statement: { id: string; period: typeof QUARTER } & Record<string, unknown>,
) => ({
  id,
  status: "done",
  formatId: "f",
  isSlow: false,
  errorCode: null,
  stats: { total: 3, added: 3 },
  statement: {
    accountId: "a1",
    balance: "none",
    differenceMinor: null,
    chainedTo: null,
    ...statement,
  },
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.withUserContext.mockImplementation(
    (_db: unknown, userId: string, work: (ctx: unknown) => unknown) =>
      work({ tx: "tx", userId }),
  );
  mocks.findUserId.mockResolvedValue(USER_ID);
  mocks.listStatementMatches.mockResolvedValue(new Map());
  mocks.countCountedMovements.mockResolvedValue(0);
});

describe("listUploadJobs", () => {
  it("gives the user's jobs in the order asked, with what each statement matched and its quarter has to review", async () => {
    mocks.listIngestionJobResults.mockResolvedValue([
      doneJob(OTHER_JOB, { id: "s1", period: AUGUST_1_TO_15 }),
      {
        id: JOB_ID,
        status: "failed",
        formatId: null,
        isSlow: false,
        errorCode: "PARSE_FAILED",
        stats: {},
        statement: null,
      },
    ]);
    mocks.listStatementMatches.mockResolvedValue(new Map([["s1", MATCHES]]));
    mocks.countCountedMovements.mockResolvedValue(24);

    expect(await listUploadJobs("user_clerk", [JOB_ID, OTHER_JOB])).toEqual([
      {
        jobId: JOB_ID,
        status: "failed",
        isSlow: false,
        errorCode: "PARSE_FAILED",
      },
      {
        jobId: OTHER_JOB,
        status: "done",
        isSlow: false,
        formatId: "f",
        outcome: {
          stats: { ...ALL_COUNTS, total: 3, added: 3 },
          statementId: "s1",
          accountId: "a1",
          period: AUGUST_1_TO_15,
          balance: "none",
          matches: MATCHES,
          toReview: 24,
        },
      },
    ]);
    expect(mocks.listIngestionJobResults).toHaveBeenCalledWith(CONTEXT, [
      JOB_ID,
      OTHER_JOB,
    ]);
    expect(mocks.listStatementMatches).toHaveBeenCalledWith(CONTEXT, ["s1"]);
    // The quarter of the file's last day, which the quick review asks about.
    expect(mocks.countCountedMovements).toHaveBeenCalledWith(CONTEXT, {
      accountId: "a1",
      period: { from: "2026-07-01", to: "2026-09-30" },
      isPendingReview: true,
    });
  });

  it("counts a quarter's movements to review once for the jobs of its account", async () => {
    mocks.listIngestionJobResults.mockResolvedValue([
      doneJob(JOB_ID, { id: "s1", period: AUGUST_1_TO_15 }),
      doneJob(OTHER_JOB, { id: "s2", period: QUARTER }),
    ]);
    mocks.countCountedMovements.mockResolvedValue(5);

    const jobs = await listUploadJobs("user_clerk", [JOB_ID, OTHER_JOB]);

    expect(jobs.map(({ outcome }) => outcome?.toReview)).toEqual([5, 5]);
    expect(jobs.map(({ outcome }) => outcome?.matches)).toEqual([
      NO_MATCHES,
      NO_MATCHES,
    ]);
    expect(mocks.countCountedMovements).toHaveBeenCalledTimes(1);
  });

  it("gives no references to a job that saved nothing of its own, as the same file again", async () => {
    const again = doneJob(JOB_ID, { id: "s1", period: AUGUST_1_TO_15 });
    mocks.listIngestionJobResults.mockResolvedValue([
      { ...again, stats: { total: 14, added: 0, skipped: 14 } },
    ]);
    mocks.listStatementMatches.mockResolvedValue(new Map([["s1", MATCHES]]));

    const [job] = await listUploadJobs("user_clerk", [JOB_ID]);

    expect(job?.outcome?.matches).toEqual({ ...MATCHES, references: 0 });
  });

  it("offers today's balance on a file without balances, once each (10.3)", async () => {
    const offer = { accountId: "a1" };
    mocks.readTodaysBalanceOffer.mockResolvedValue(offer);
    // The same file twice points at one statement.
    const THIRD_JOB = "9f3a5e7c-4d6b-4a8c-8e1f-2a3b4c5d6e7f";
    mocks.listIngestionJobResults.mockResolvedValue([
      doneJob(JOB_ID, { id: "s1", period: AUGUST_1_TO_15 }),
      doneJob(OTHER_JOB, { id: "s2", period: QUARTER, balance: "verified" }),
      doneJob(THIRD_JOB, { id: "s1", period: AUGUST_1_TO_15 }),
    ]);

    const [movements, quarterly, again] = await listUploadJobs("user_clerk", [
      JOB_ID,
      OTHER_JOB,
      THIRD_JOB,
    ]);

    expect(movements?.outcome?.todaysBalance).toBe(offer);
    expect(again?.outcome?.todaysBalance).toBe(offer);
    expect(quarterly?.outcome?.todaysBalance).toBeUndefined();
    expect(mocks.readTodaysBalanceOffer).toHaveBeenCalledTimes(1);
    expect(mocks.readTodaysBalanceOffer.mock.calls[0]?.[1]).toMatchObject({
      accountId: "a1",
      period: AUGUST_1_TO_15,
    });
  });

  it("reads nothing for no jobs, or for someone who never sent a file", async () => {
    mocks.findUserId.mockResolvedValue(undefined);

    expect(await listUploadJobs("user_clerk", [])).toEqual([]);
    expect(await listUploadJobs("user_new", [JOB_ID])).toEqual([]);
    expect(mocks.withUserContext).not.toHaveBeenCalled();
  });
});

describe("listUploadedFiles", () => {
  it("gives the user's latest files, with the quarter a statement is chained to and what it matched", async () => {
    mocks.listRecentIngestionJobs.mockResolvedValue([
      doneJob(JOB_ID, {
        id: "s1",
        period: QUARTER,
        balance: "verified",
        chainedTo: PREVIOUS,
      }),
    ]);
    mocks.listStatementMatches.mockResolvedValue(new Map([["s1", MATCHES]]));

    expect(await listUploadedFiles("user_clerk")).toEqual([
      {
        jobId: JOB_ID,
        status: "done",
        isSlow: false,
        formatId: "f",
        outcome: {
          stats: { ...ALL_COUNTS, total: 3, added: 3 },
          statementId: "s1",
          accountId: "a1",
          period: QUARTER,
          balance: "verified",
          chainedTo: PREVIOUS,
          matches: MATCHES,
        },
      },
    ]);
    expect(mocks.listRecentIngestionJobs).toHaveBeenCalledWith(CONTEXT, 30);
    expect(mocks.countCountedMovements).not.toHaveBeenCalled();
  });

  it("offers no balance in the list of files", async () => {
    mocks.listRecentIngestionJobs.mockResolvedValue([
      doneJob(JOB_ID, { id: "s1", period: AUGUST_1_TO_15 }),
    ]);

    const [file] = await listUploadedFiles("user_clerk");

    expect(file?.outcome?.todaysBalance).toBeUndefined();
    expect(mocks.readTodaysBalanceOffer).not.toHaveBeenCalled();
  });

  it("lists nothing for someone who never sent a file", async () => {
    mocks.findUserId.mockResolvedValue(undefined);

    expect(await listUploadedFiles("user_new")).toEqual([]);
    expect(mocks.withUserContext).not.toHaveBeenCalled();
  });
});
