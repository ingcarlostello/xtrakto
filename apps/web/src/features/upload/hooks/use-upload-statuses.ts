import { useEffect, useReducer } from "react";
import {
  isAskable,
  startPolling,
  type StatusPollingAction,
  statusPollingReducer,
} from "../upload-jobs.helpers";
import { POLL_INTERVAL_MS } from "../upload.constants";
import type { GetUploadStatuses } from "../upload.types";

type UploadStatusesOptions = {
  /** The jobs to follow. */
  readonly jobIds: readonly string[];
  readonly getStatuses: GetUploadStatuses;
};

type Question = {
  readonly watching: string;
  readonly getStatuses: GetUploadStatuses;
  readonly answer: (action: StatusPollingAction) => void;
};

// Asks once about the open jobs. A refused or rejected call is a failure.
const ask = ({ watching, getStatuses, answer }: Question): void => {
  getStatuses(watching.split(",")).then(
    (result) =>
      answer(
        result.ok
          ? { type: "answered", watching, jobs: result.value }
          : { type: "failed", watching },
      ),
    () => answer({ type: "failed", watching }),
  );
};

/**
 * How the screen's jobs go. One call asks about those still open, at once
 * for a new job and then every 2 seconds, until they all end. It stops
 * after 3 failures in a row, or 10 minutes without any change, until
 * `checkAgain` or a new job.
 */
export const useUploadStatuses = ({
  jobIds,
  getStatuses,
}: UploadStatusesOptions) => {
  const [state, dispatch] = useReducer(
    statusPollingReducer,
    undefined,
    startPolling,
  );
  const watching = jobIds.filter((id) => isAskable(state, id)).join();
  // A job not asked about yet is asked about at once.
  const asked = new Set(state.watching.split(","));
  const isNew = watching.split(",").some((id) => id !== "" && !asked.has(id));
  const isStopped = state.stopped !== undefined && state.watching === watching;
  useEffect(() => {
    if (watching === "" || isStopped) return;
    let isCancelled = false;
    // An answer that comes after the question changed is dropped.
    const answer = (action: StatusPollingAction) => {
      if (!isCancelled) dispatch(action);
    };
    const timer = setTimeout(
      () => ask({ watching, getStatuses, answer }),
      isNew ? 0 : POLL_INTERVAL_MS,
    );
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [watching, isNew, isStopped, state.tick, getStatuses]);
  return {
    jobs: state.jobs,
    missing: state.missing,
    hasOpenJobs: watching !== "",
    stopped: isStopped ? state.stopped : undefined,
    checkAgain: () => dispatch({ type: "restarted" }),
  };
};
