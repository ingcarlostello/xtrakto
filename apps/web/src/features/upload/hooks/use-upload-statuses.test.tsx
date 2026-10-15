// @vitest-environment happy-dom
import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POLL_INTERVAL_MS } from "../upload.constants";
import type { GetUploadStatuses, UploadJob } from "../upload.types";
import { useUploadStatuses } from "./use-upload-statuses";

const FIRST = "0b6f1d2e-58c4-4c31-9a59-000000000001";
const SECOND = "0b6f1d2e-58c4-4c31-9a59-000000000002";

const job = (jobId: string, status: UploadJob["status"]): UploadJob => ({
  jobId,
  status,
  isSlow: false,
});

type Statuses = ReturnType<typeof useUploadStatuses>;
let statuses: Statuses;
// Stands in for the server action.
const getStatuses = vi.fn<GetUploadStatuses>();

type HarnessProps = {
  jobIds: readonly string[];
  onRender: (current: Statuses) => void;
};

function Harness({ jobIds, onRender }: HarnessProps) {
  onRender(useUploadStatuses({ jobIds, getStatuses }));
  return null;
}

let root: Root;

const follow = (jobIds: readonly string[]) =>
  act(() =>
    root.render(
      <Harness
        jobIds={jobIds}
        onRender={(current) => {
          statuses = current;
        }}
      />,
    ),
  );

// Lets each round's timer fire and its answer arrive. One act per round:
// React commits an answer, and schedules the next question, when act ends.
const waitRounds = async (rounds: number) => {
  for (let round = 0; round < rounds; round += 1)
    await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));
};

const unavailable = err({ code: APP_ERROR_CODE.UNAUTHORIZED });

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  getStatuses.mockReset();
  root = createRoot(document.createElement("div"));
});

afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
});

describe("useUploadStatuses", () => {
  it("asks at once, then every 2 seconds about the open jobs only, until they all end", async () => {
    getStatuses
      .mockResolvedValueOnce(
        ok([job(FIRST, "processing"), job(SECOND, "done")]),
      )
      .mockResolvedValueOnce(ok([job(FIRST, "processing")]))
      .mockResolvedValueOnce(ok([job(FIRST, "done")]));
    follow([FIRST, SECOND]);

    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(statuses.jobs.get(FIRST)?.status).toBe("processing");
    await act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS - 1));
    expect(getStatuses).toHaveBeenCalledTimes(1);
    await waitRounds(7);

    expect(getStatuses.mock.calls).toEqual([
      [[FIRST, SECOND]],
      [[FIRST]],
      [[FIRST]],
    ]);
    expect(statuses.jobs.get(FIRST)?.status).toBe("done");
    expect(statuses.hasOpenJobs).toBe(false);
  });

  it("stops asking about a job the server doesn't answer for", async () => {
    getStatuses.mockResolvedValue(ok([]));
    follow([FIRST]);

    await waitRounds(5);

    expect(getStatuses).toHaveBeenCalledTimes(1);
    expect(statuses.missing.has(FIRST)).toBe(true);
    expect(statuses.hasOpenJobs).toBe(false);
  });

  it("stops after 3 failures in a row, until asked to check again", async () => {
    getStatuses
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(unavailable)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(ok([job(FIRST, "done")]));
    follow([FIRST]);

    await waitRounds(5);
    expect(getStatuses).toHaveBeenCalledTimes(3);
    expect(statuses.stopped).toBe("failures");

    act(() => statuses.checkAgain());
    await waitRounds(1);
    expect(getStatuses).toHaveBeenCalledTimes(4);
    expect(statuses.stopped).toBeUndefined();
    expect(statuses.jobs.get(FIRST)?.status).toBe("done");
  });

  it("asks about a new job even after stopping", async () => {
    getStatuses.mockResolvedValue(unavailable);
    follow([FIRST]);
    await waitRounds(3);
    expect(statuses.stopped).toBe("failures");

    follow([FIRST, SECOND]);
    await waitRounds(1);

    expect(statuses.stopped).toBeUndefined();
    expect(getStatuses).toHaveBeenLastCalledWith([FIRST, SECOND]);
  });
});
