import { APP_ERROR_CODE, PERIOD_SOURCE, periodSchema } from "@xtrakto/core";
import type { AppError, ExtractedContent } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import {
  jobEvents,
  movementsRange,
  queueEvents,
} from "./upload-events.helpers";
import { uploadQueueReducer } from "./upload-queue.helpers";
import { JOB_STATUS, NO_ANSWER, UPLOAD_STATUS } from "./upload.constants";
import type { SendOutcome, UploadItem, UploadJob } from "./upload.types";

// Invented values that must never reach PostHog: the file's name, its period
// and its account's digits.
const FILE = new File([], "Extracto-ANA-PRUEBA-2109.xlsx");
const PERIOD = { from: "2026-06-30", to: "2026-09-30" };
const LEAKS = ["ANA-PRUEBA", "2109", PERIOD.from, PERIOD.to];

const CONTENT: ExtractedContent = { type: "spreadsheet", sheets: [] };
const QUARTERLY = "bancolombia-savings-quarterly";

const ready: UploadItem = {
  id: "q",
  file: FILE,
  status: UPLOAD_STATUS.READY,
  statement: {
    content: CONTENT,
    preview: {
      bankId: "bancolombia",
      formatId: QUARTERLY,
      accountType: "savings",
      accountLast4: "2109",
      period: periodSchema.parse(PERIOD),
      periodSource: PERIOD_SOURCE.STATEMENT,
      movementCount: 312,
    },
  },
};

const sending = uploadQueueReducer([ready], { type: "sendStarted", id: "q" });

const afterSend = (outcome: SendOutcome) =>
  queueEvents(
    sending,
    uploadQueueReducer(sending, { type: "sendFinished", id: "q", outcome }),
  );

const refused = (code: AppError["code"]): SendOutcome => ({
  ok: false,
  error: { code },
});

describe("movementsRange", () => {
  it.each([
    [0, "0"],
    [1, "1-49"],
    [49, "1-49"],
    [50, "50-199"],
    [199, "50-199"],
    [200, "200-499"],
    [499, "200-499"],
    [500, "500+"],
  ])("puts %i movements in %s", (count, range) => {
    expect(movementsRange(count)).toBe(range);
  });
});

describe("queueEvents", () => {
  it("tells the server took a file, by its format and range only", () => {
    const calls = afterSend({ ok: true, value: { jobId: "job-1" } });

    expect(calls).toEqual([
      {
        event: "statement_uploaded",
        properties: { format_id: QUARTERLY, movements: "200-499" },
      },
    ]);
    for (const leak of LEAKS) expect(JSON.stringify(calls)).not.toContain(leak);
  });

  it.each<{ case: string; outcome: SendOutcome; code: string }>([
    { case: "no answer", outcome: NO_ANSWER, code: NO_ANSWER },
    {
      case: "an account to choose",
      outcome: refused(APP_ERROR_CODE.ACCOUNT_REQUIRED),
      code: APP_ERROR_CODE.ACCOUNT_REQUIRED,
    },
    {
      case: "the month's limit",
      outcome: refused(APP_ERROR_CODE.LIMIT_REACHED),
      code: APP_ERROR_CODE.LIMIT_REACHED,
    },
    {
      case: "a final refusal",
      outcome: refused(APP_ERROR_CODE.INVALID_INPUT),
      code: APP_ERROR_CODE.INVALID_INPUT,
    },
  ])("tells a send that ended in $case", ({ outcome, code }) => {
    expect(afterSend(outcome)).toEqual([
      {
        event: "ingestion_failed",
        properties: { stage: "send", error_code: code, format_id: QUARTERLY },
      },
    ]);
  });

  it("tells a file the browser's checks refused, by which check", () => {
    const added = uploadQueueReducer([], {
      type: "added",
      files: [{ id: "p", file: new File([], "extracto.pdf") }],
    });

    expect(queueEvents([], added)).toEqual([
      {
        event: "ingestion_failed",
        properties: { stage: "browser", error_code: "file_type" },
      },
    ]);
  });

  it("tells a file the browser couldn't read, by its code", () => {
    const reading = uploadQueueReducer(
      [{ id: "u", file: FILE, status: UPLOAD_STATUS.WAITING }],
      { type: "started", id: "u" },
    );
    const read = uploadQueueReducer(reading, {
      type: "finished",
      id: "u",
      result: { ok: false, error: { code: APP_ERROR_CODE.UNKNOWN_FORMAT } },
    });

    expect(queueEvents(reading, read)).toEqual([
      {
        event: "ingestion_failed",
        properties: {
          stage: "browser",
          error_code: APP_ERROR_CODE.UNKNOWN_FORMAT,
        },
      },
    ]);
  });

  it("tells nothing when no file changed how it goes", () => {
    const sent = uploadQueueReducer(sending, {
      type: "sendFinished",
      id: "q",
      outcome: { ok: true, value: { jobId: "job-1" } },
    });

    expect(queueEvents(sent, sent)).toEqual([]);
    expect(queueEvents([ready], [ready])).toEqual([]);
  });
});

const job = (status: UploadJob["status"]): UploadJob => ({
  jobId: "job-1",
  status,
  formatId: QUARTERLY,
  isSlow: false,
  ...(status === JOB_STATUS.FAILED ? { errorCode: "PARSE_FAILED" } : {}),
});

const jobs = (status: UploadJob["status"]) => new Map([["job-1", job(status)]]);

describe("jobEvents", () => {
  it("tells an ingestion of this page's file that failed, once", () => {
    const failed = jobs(JOB_STATUS.FAILED);

    expect(jobEvents(jobs(JOB_STATUS.PROCESSING), failed, ["job-1"])).toEqual([
      {
        event: "ingestion_failed",
        properties: {
          stage: "server",
          error_code: "PARSE_FAILED",
          format_id: QUARTERLY,
        },
      },
    ]);
    expect(jobEvents(failed, failed, ["job-1"])).toEqual([]);
  });

  it("tells nothing of a job a reload brought back, or of one that ended well", () => {
    expect(jobEvents(new Map(), jobs(JOB_STATUS.FAILED), [])).toEqual([]);
    expect(
      jobEvents(jobs(JOB_STATUS.PENDING), jobs(JOB_STATUS.DONE), ["job-1"]),
    ).toEqual([]);
  });
});
