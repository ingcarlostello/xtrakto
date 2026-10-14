import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ingestStatement } from "./ingest-statement.function";

// The service is tested against the database; here, what Inngest runs and
// keeps: step outputs, the run's result and a step's error.
const mocks = vi.hoisted(() => ({
  claimJob: vi.fn(),
  ingestJob: vi.fn(),
  failJob: vi.fn(),
}));
vi.mock("./ingest-statement.service", () => mocks);

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
  });

  it("claims the job, then ingests it, keeping only the outcome", async () => {
    const { result, state } = await run();

    expect(mocks.claimJob).toHaveBeenCalledWith(JOB);
    expect(mocks.ingestJob).toHaveBeenCalledWith(JOB);
    expect(result).toEqual(DONE);
    expect(await Promise.all(Object.values(state))).toEqual([true, DONE]);
  });

  it("stops when the job has nothing left to do", async () => {
    mocks.claimJob.mockResolvedValue(false);

    const { result } = await run();

    expect(result).toEqual({ status: "closed" });
    expect(mocks.ingestJob).not.toHaveBeenCalled();
  });

  it("keeps a step's error as the service throws it, sanitized", async () => {
    mocks.ingestJob.mockRejectedValue(new Error(SANITIZED));

    const { error } = await run();

    expect(error).toMatchObject({ name: "Error", message: SANITIZED });
    expect(error).not.toHaveProperty("cause");
  });
});
