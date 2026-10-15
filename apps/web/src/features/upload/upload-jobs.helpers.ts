import { z } from "zod";
import {
  JOB_STATUS,
  JOBS_PARAM,
  MAX_POLL_FAILURES,
  MAX_TRACKED_JOBS,
  POLL_FOR_MS,
  POLL_INTERVAL_MS,
  UPLOAD_STATUS,
} from "./upload.constants";
import type { UploadItem, UploadJob } from "./upload.types";

const MAX_POLLS = POLL_FOR_MS / POLL_INTERVAL_MS;
const jobIdSchema = z.uuid();

const latestOnce = (ids: readonly string[]): readonly string[] =>
  [...new Set(ids)].slice(-MAX_TRACKED_JOBS);

/** The jobs a `jobs` search param names: valid ids, once each, the latest 10. */
export const jobIdsFromParam = (
  param: string | string[] | undefined,
): readonly string[] =>
  latestOnce(
    [param ?? []]
      .flat()
      .flatMap((value) => value.split(","))
      .filter((id) => jobIdSchema.safeParse(id).success),
  );

/** The jobs the URL's fragment names, `#jobs=<id>,<id>`, as a search param would. */
export const jobIdsFromHash = (hash: string): readonly string[] =>
  jobIdsFromParam(
    new URLSearchParams(hash.replace(/^#/, "")).get(JOBS_PARAM) ?? undefined,
  );

/** The jobs of the files this page sent, in order. */
export const sentJobIds = (items: readonly UploadItem[]): readonly string[] =>
  items.flatMap((item) =>
    item.status === UPLOAD_STATUS.SENT ? [item.jobId] : [],
  );

/** The jobs the screen follows: those its URL brought, then those sent from it. */
export const trackedJobIds = (
  restored: readonly string[],
  sent: readonly string[],
): readonly string[] => latestOnce([...restored, ...sent]);

/** Whether the screen still has to ask about a job: unknown yet, or open. */
export const isOpenJob = (job: UploadJob | undefined): boolean =>
  job === undefined ||
  job.status === JOB_STATUS.PENDING ||
  job.status === JOB_STATUS.PROCESSING;

/** Why the screen stopped asking: failures in a row, or no change for too long. */
export type PollingStop = "failures" | "time";

export type StatusPolling = {
  readonly jobs: ReadonlyMap<string, UploadJob>;
  /** Asked about but not answered for: gone, or not the user's. */
  readonly missing: ReadonlySet<string>;
  /** The open jobs asked about, which the counts below are for. */
  readonly watching: string;
  readonly polls: number;
  readonly failures: number;
  readonly stopped?: PollingStop;
  /** Changes with every answer, so the next question gets scheduled. */
  readonly tick: number;
};

export type StatusPollingAction =
  | {
      readonly type: "answered";
      readonly watching: string;
      readonly jobs: readonly UploadJob[];
    }
  | { readonly type: "failed"; readonly watching: string }
  | { readonly type: "restarted" };

export const startPolling = (): StatusPolling => ({
  jobs: new Map(),
  missing: new Set(),
  watching: "",
  polls: 0,
  failures: 0,
  tick: 0,
});

/** Whether the screen still has to ask about a job: open, or not answered for yet. */
export const isAskable = (state: StatusPolling, jobId: string): boolean =>
  !state.missing.has(jobId) && isOpenJob(state.jobs.get(jobId));

// What an answer tells: each job returned, and those asked about but missing.
const withAnswer = (
  state: StatusPolling,
  { watching, jobs }: { watching: string; jobs: readonly UploadJob[] },
): Pick<StatusPolling, "jobs" | "missing"> => {
  const returned = new Set(jobs.map((job) => job.jobId));
  return {
    jobs: new Map([
      ...state.jobs,
      ...jobs.map((job) => [job.jobId, job] as const),
    ]),
    missing: new Set([
      ...state.missing,
      ...watching.split(",").filter((id) => !returned.has(id)),
    ]),
  };
};

// Another set of open jobs, because one ended or a new one came, starts the
// counts over: the screen stops after 10 minutes without any change.
const countingFor = (state: StatusPolling, watching: string): StatusPolling =>
  watching === state.watching
    ? state
    : { ...state, watching, polls: 0, failures: 0 };

const stopFor = (polls: number, failures: number): PollingStop | undefined => {
  if (failures >= MAX_POLL_FAILURES) return "failures";
  return polls >= MAX_POLLS ? "time" : undefined;
};

export const statusPollingReducer = (
  state: StatusPolling,
  action: StatusPollingAction,
): StatusPolling => {
  const tick = state.tick + 1;
  if (action.type === "restarted")
    return { ...state, polls: 0, failures: 0, stopped: undefined, tick };
  const counting = countingFor(state, action.watching);
  const polls = counting.polls + 1;
  const failures = action.type === "failed" ? counting.failures + 1 : 0;
  return {
    ...counting,
    ...(action.type === "answered" ? withAnswer(counting, action) : {}),
    polls,
    failures,
    stopped: stopFor(polls, failures),
    tick,
  };
};
