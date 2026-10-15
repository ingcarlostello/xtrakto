import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUploadStatuses } from "./get-upload-statuses.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  listUploadJobs: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("../upload.service", () => ({
  listUploadJobs: mocks.listUploadJobs,
}));

const JOB_ID = "7d1e3c5a-2b4f-4e6a-8c9d-0e1f2a3b4c5d";
const INVALID_INPUT = { ok: false, error: { code: "INVALID_INPUT" } };

// The action's input type is the browser's promise, not a guarantee.
const askUntyped = (jobIds: unknown) =>
  getUploadStatuses(jobIds as Parameters<typeof getUploadStatuses>[0]);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
  mocks.listUploadJobs.mockResolvedValue([]);
});

describe("getUploadStatuses", () => {
  it("refuses a signed-out visitor and reads nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    expect(await getUploadStatuses([JOB_ID])).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.listUploadJobs).not.toHaveBeenCalled();
  });

  it.each([
    ["no ids", []],
    ["an id that isn't a job's", ["../users"]],
    ["more than 10 ids", Array(11).fill(JOB_ID)],
    ["something else", JOB_ID],
  ])("refuses %s", async (_case, jobIds) => {
    expect(await askUntyped(jobIds)).toEqual(INVALID_INPUT);
    expect(mocks.listUploadJobs).not.toHaveBeenCalled();
  });

  it("reads the signed-in user's jobs", async () => {
    const jobs = [{ jobId: JOB_ID, status: "done", isSlow: false }];
    mocks.listUploadJobs.mockResolvedValue(jobs);

    expect(await getUploadStatuses([JOB_ID])).toEqual({
      ok: true,
      value: jobs,
    });
    expect(mocks.listUploadJobs).toHaveBeenCalledWith("user_clerk", [JOB_ID]);
  });
});
