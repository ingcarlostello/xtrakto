import { describe, expect, it } from "vitest";
import {
  isAskable,
  isOpenJob,
  jobIdsFromHash,
  jobIdsFromParam,
  startPolling,
  type StatusPolling,
  type StatusPollingAction,
  statusPollingReducer,
  trackedJobIds,
} from "./upload-jobs.helpers";
import type { UploadJob } from "./upload.types";

const ids = Array.from(
  { length: 12 },
  (_, index) => `0b6f1d2e-58c4-4c31-9a59-${String(index).padStart(12, "0")}`,
);
const [first = "", second = "", third = ""] = ids;

const job = (jobId: string, status: UploadJob["status"]): UploadJob => ({
  jobId,
  status,
  isSlow: false,
});

const run = (
  actions: readonly StatusPollingAction[],
  state: StatusPolling = startPolling(),
) => actions.reduce(statusPollingReducer, state);

describe("jobIdsFromParam", () => {
  it.each([
    { param: undefined, expected: [] },
    { param: `${first},${second}`, expected: [first, second] },
    { param: `${first},not-an-id,,${first}`, expected: [first] },
    { param: [first, `${second},${third}`], expected: [first, second, third] },
  ])("reads $param as the jobs it names", ({ param, expected }) => {
    expect(jobIdsFromParam(param)).toEqual(expected);
  });

  it("keeps the latest 10", () => {
    expect(jobIdsFromParam(ids.join(","))).toEqual(ids.slice(2));
  });
});

describe("jobIdsFromHash", () => {
  it("reads the jobs the URL's fragment names", () => {
    expect(jobIdsFromHash(`#jobs=${first},${second}`)).toEqual([first, second]);
    expect(jobIdsFromHash(`#jobs=${first}%2C${second}`)).toEqual([
      first,
      second,
    ]);
    expect(jobIdsFromHash("")).toEqual([]);
    expect(jobIdsFromHash("#otra=cosa")).toEqual([]);
  });
});

describe("trackedJobIds", () => {
  it("follows the URL's jobs, then those sent, once each and the latest 10", () => {
    expect(trackedJobIds([first, second], [second, third])).toEqual([
      first,
      second,
      third,
    ]);
    expect(trackedJobIds(ids.slice(0, 6), ids.slice(6))).toEqual(ids.slice(2));
  });
});

describe("isOpenJob", () => {
  it.each([
    { job: undefined, isOpen: true },
    { job: job(first, "pending"), isOpen: true },
    { job: job(first, "processing"), isOpen: true },
    { job: job(first, "done"), isOpen: false },
    { job: job(first, "failed"), isOpen: false },
  ])("asks again about $job.status", ({ job, isOpen }) => {
    expect(isOpenJob(job)).toBe(isOpen);
  });
});

describe("statusPollingReducer", () => {
  it("keeps each answer's jobs and starts the failures over", () => {
    const state = run([
      { type: "failed", watching: first },
      {
        type: "answered",
        watching: first,
        jobs: [job(first, "processing")],
      },
      { type: "answered", watching: first, jobs: [job(first, "done")] },
    ]);

    expect(state.jobs.get(first)).toEqual(job(first, "done"));
    expect(state).toMatchObject({ polls: 3, failures: 0, tick: 3 });
    expect(state.stopped).toBeUndefined();
  });

  it("stops asking about a job the answer leaves out: gone, or not the user's", () => {
    const state = run([
      {
        type: "answered",
        watching: `${first},${second}`,
        jobs: [job(first, "pending")],
      },
    ]);

    expect(state.missing).toEqual(new Set([second]));
    expect(isAskable(state, first)).toBe(true);
    expect(isAskable(state, second)).toBe(false);
  });

  it("stops after 3 failures in a row", () => {
    const failed = { type: "failed", watching: first } as const;

    expect(run([failed, failed]).stopped).toBeUndefined();
    expect(run([failed, failed, failed]).stopped).toBe("failures");
  });

  it("stops after 10 minutes of questions about the same jobs", () => {
    const answered = { type: "answered", watching: first, jobs: [] } as const;

    expect(run(Array(299).fill(answered)).stopped).toBeUndefined();
    expect(run(Array(300).fill(answered)).stopped).toBe("time");
  });

  it("starts the counts over when the open jobs change", () => {
    const failed = { type: "failed", watching: first } as const;
    const state = run([
      failed,
      failed,
      { type: "failed", watching: `${first},${second}` },
    ]);

    expect(state).toMatchObject({ failures: 1, polls: 1 });
    expect(state.stopped).toBeUndefined();
  });

  it("asks again after a stop, from zero", () => {
    const failed = { type: "failed", watching: first } as const;
    const state = run([failed, failed, failed, { type: "restarted" }]);

    expect(state).toMatchObject({ polls: 0, failures: 0, tick: 4 });
    expect(state.stopped).toBeUndefined();
  });
});
