import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ingestStatement } from "./ingest-statement.function";

// The service is tested against the database; here, what Inngest runs and
// keeps: step outputs, the run's result and a step's error.
const mocks = vi.hoisted(() => ({
  claimJob: vi.fn(),
  ingestJob: vi.fn(),
  failJob: vi.fn(),
  categorizeWaitingMovements: vi.fn(),
}));
vi.mock("./ingest-statement.service", () => mocks);
vi.mock("@/features/llm-categories/llm-categories.service", () => ({
  categorizeWaitingMovements: mocks.categorizeWaitingMovements,
}));

const JOB = {
  jobId: "7d1e3c5a-2b4f-4e6a-8c9d-0e1f2a3b4c5d",
  userId: "0b6f1d2e-58c4-4c31-9a59-6a3f0f5c2e11",
};
const DONE = {
  status: "done",
  stats: {
    total: 33,
    added: 33,
    skipped: 0,
    covered: 0,
    hidden: 0,
    replaced: 0,
  },
};
// A round of the LLM's categories, with texts left to send or not.
const round = (hasMore: boolean) => ({
  fromCache: 1,
  asked: 25,
  answered: 24,
  categorized: 30,
  hasMore,
});
const SANITIZED =
  "JOB_NOT_INGESTED: DrizzleQueryError 23514 transactions_amount_minor_range";

const run = () =>
  new InngestTestEngine({ function: ingestStatement }).execute({
    events: [{ name: "statement/submitted", data: JOB }],
  });

describe("ingest-statement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.claimJob.mockResolvedValue(true);
    mocks.ingestJob.mockResolvedValue(DONE);
    mocks.categorizeWaitingMovements.mockResolvedValue(round(false));
  });

  it("claims the job, ingests it and categorizes with the LLM, keeping only the outcome", async () => {
    const { result, state } = await run();

    expect(mocks.claimJob).toHaveBeenCalledWith(JOB);
    expect(mocks.ingestJob).toHaveBeenCalledWith(JOB);
    expect(mocks.categorizeWaitingMovements).toHaveBeenCalledWith(JOB.userId);
    expect(result).toEqual(DONE);
    expect(await Promise.all(Object.values(state))).toEqual([
      true,
      DONE,
      round(false),
    ]);
  });

  it("categorizes in rounds while texts wait for the LLM", async () => {
    mocks.categorizeWaitingMovements
      .mockResolvedValueOnce(round(true))
      .mockResolvedValueOnce(round(true));

    await run();

    expect(mocks.categorizeWaitingMovements).toHaveBeenCalledTimes(3);
  });

  it("stops after 8 rounds, leaving the rest for the next upload", async () => {
    mocks.categorizeWaitingMovements.mockResolvedValue(round(true));

    const { result } = await run();

    expect(mocks.categorizeWaitingMovements).toHaveBeenCalledTimes(8);
    expect(result).toEqual(DONE);
  });

  it("stops when the job has nothing left to do", async () => {
    mocks.claimJob.mockResolvedValue(false);

    const { result } = await run();

    expect(result).toEqual({ status: "closed" });
    expect(mocks.ingestJob).not.toHaveBeenCalled();
    expect(mocks.categorizeWaitingMovements).not.toHaveBeenCalled();
  });

  it("never asks the LLM when the statement couldn't be read", async () => {
    const failed = { status: "failed", errorCode: "PARSE_FAILED" };
    mocks.ingestJob.mockResolvedValue(failed);

    const { result } = await run();

    expect(result).toEqual(failed);
    expect(mocks.categorizeWaitingMovements).not.toHaveBeenCalled();
  });

  it("keeps a step's error as the service throws it, sanitized", async () => {
    mocks.ingestJob.mockRejectedValue(new Error(SANITIZED));

    const { error } = await run();

    expect(error).toMatchObject({ name: "Error", message: SANITIZED });
    expect(error).not.toHaveProperty("cause");
  });
});
