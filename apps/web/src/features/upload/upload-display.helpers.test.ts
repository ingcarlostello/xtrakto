import {
  APP_ERROR_CODE,
  localDateSchema,
  PERIOD_SOURCE,
  periodSchema,
} from "@xtrakto/core";
import type { AppError, Period } from "@xtrakto/core";
import type { IngestionJobError } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import {
  fileRowView,
  jobLabel,
  jobView,
  limitText,
  previewTags,
  problemText,
  usagePill,
} from "./upload-display.helpers";
import {
  NO_ANSWER,
  PROBLEM_COPY,
  UPLOAD_COPY,
  UPLOAD_STATUS,
} from "./upload.constants";
import type {
  ExtractedStatement,
  JobOutcome,
  SendProblem,
  UploadItem,
  UploadJob,
} from "./upload.types";

describe("previewTags", () => {
  it("names a quarterly statement's bank, format, file type and months", () => {
    expect(
      previewTags({
        bankId: "bancolombia",
        formatId: "bancolombia-savings-quarterly",
        accountType: "savings",
        accountLast4: "8901",
        period: periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" }),
        periodSource: PERIOD_SOURCE.STATEMENT,
        movementCount: 33,
      }),
    ).toEqual(["Bancolombia", "Extracto trimestral", "Excel", "jul–sep 2026"]);
  });

  it("names a movements export by the days of its movements", () => {
    expect(
      previewTags({
        bankId: "bancolombia",
        formatId: "bancolombia-movements-export",
        accountType: "savings",
        period: periodSchema.parse({ from: "2026-08-01", to: "2026-08-15" }),
        periodSource: PERIOD_SOURCE.ROWS,
        movementCount: 48,
      }),
    ).toEqual(["Bancolombia", "Movimientos", "Excel", "1–15 ago 2026"]);
  });
});

describe("fileRowView", () => {
  const preview = {
    bankId: "bancolombia",
    formatId: "bancolombia-savings-quarterly",
    accountType: "savings",
    accountLast4: "8901",
    period: periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" }),
    periodSource: PERIOD_SOURCE.STATEMENT,
    movementCount: 33,
  } as const;
  const file = new File([], "extracto.xlsx");
  const statement: ExtractedStatement = {
    content: { type: "spreadsheet", sheets: [] },
    preview,
  };
  const readyItem = (sendProblem?: SendProblem): UploadItem => ({
    id: "1",
    file,
    status: UPLOAD_STATUS.READY,
    statement,
    sendProblem,
  });

  it("names a quarterly statement's account next to its count", () => {
    expect(fileRowView(readyItem())).toMatchObject({
      kind: "ready",
      count: "33 movimientos · cuenta ••••8901",
      note: undefined,
    });
  });

  it.each<[string, UploadItem, string]>([
    [
      "going up",
      { id: "1", file, status: UPLOAD_STATUS.SENDING, statement },
      "Subiendo…",
    ],
    [
      "gone up",
      { id: "1", file, status: UPLOAD_STATUS.SENT, preview, jobId: "job" },
      "Subido · en cola para procesar",
    ],
  ])("keeps a file's tags while it's %s, and says so", (_case, item, note) => {
    expect(fileRowView(item)).toMatchObject({
      kind: "ready",
      tags: ["Bancolombia", "Extracto trimestral", "Excel", "jul–sep 2026"],
      note,
    });
  });

  it.each<[string, SendProblem, { title: string; detail: string }]>([
    ["a send that got no answer", NO_ANSWER, PROBLEM_COPY.noAnswer],
    [
      "an account to choose",
      { code: APP_ERROR_CODE.ACCOUNT_REQUIRED },
      PROBLEM_COPY.chooseAccount,
    ],
    [
      "a chosen account that's gone",
      { code: APP_ERROR_CODE.NOT_FOUND },
      PROBLEM_COPY.accountGone,
    ],
  ])("explains %s", (_case, sendProblem, expected) => {
    expect(fileRowView(readyItem(sendProblem))).toEqual({
      kind: "problem",
      ...expected,
    });
  });
});

describe("a sent file's job", () => {
  const preview = {
    bankId: "bancolombia",
    formatId: "bancolombia-movements-export",
    accountType: "savings",
    period: periodSchema.parse({ from: "2026-08-01", to: "2026-08-15" }),
    periodSource: PERIOD_SOURCE.ROWS,
    movementCount: 48,
  } as const;
  const sent: UploadItem = {
    id: "1",
    file: new File([], "movimientos.xlsx"),
    status: UPLOAD_STATUS.SENT,
    preview,
    jobId: "job",
  };
  const outcomeIn = (period: Period): JobOutcome => ({
    statementId: "s1",
    accountId: "a1",
    stats: {
      total: 1,
      added: 1,
      skipped: 0,
      covered: 0,
      hidden: 0,
      replaced: 0,
    },
    period,
    balance: "none",
  });
  const job = (status: UploadJob["status"], isSlow = false): UploadJob => ({
    jobId: "job",
    status,
    isSlow,
    formatId: preview.formatId,
  });

  it.each<[string, UploadJob | undefined, string]>([
    ["not asked about yet", undefined, UPLOAD_COPY.sent],
    ["pending", job("pending"), UPLOAD_COPY.sent],
    ["processing", job("processing"), UPLOAD_COPY.processing],
    ["done", job("done"), UPLOAD_COPY.processed],
  ])(
    "keeps the file's tags and says when its job is %s",
    (_case, job, note) => {
      expect(fileRowView(sent, job)).toEqual({
        kind: "ready",
        tags: ["Bancolombia", "Movimientos", "Excel", "1–15 ago 2026"],
        count: "48 movimientos",
        note,
        notice: undefined,
      });
    },
  );

  it("says when its job takes longer than usual", () => {
    expect(fileRowView(sent, job("pending", true))).toMatchObject({
      note: UPLOAD_COPY.sent,
      notice: UPLOAD_COPY.slow,
    });
  });

  it.each<[IngestionJobError | undefined, { title: string; detail: string }]>([
    ["UNKNOWN_FORMAT", PROBLEM_COPY.notAStatement],
    ["PARSE_FAILED", PROBLEM_COPY.incomplete],
    ["ACCOUNT_REQUIRED", PROBLEM_COPY.chooseAccount],
    ["INTERNAL_ERROR", PROBLEM_COPY.notProcessed],
    ["CONTENT_EXPIRED", PROBLEM_COPY.expired],
    [undefined, PROBLEM_COPY.notProcessed],
  ])(
    "explains a job that failed with %s, on the attention surface",
    (errorCode, problem) => {
      expect(
        fileRowView(sent, {
          ...job("failed"),
          ...(errorCode ? { errorCode } : {}),
        }),
      ).toEqual({ kind: "problem", ...problem });
    },
  );

  it("shows a job of an earlier visit without the file it came from", () => {
    expect(jobView(job("processing"))).toEqual({
      kind: "ready",
      tags: [],
      note: UPLOAD_COPY.processing,
      notice: undefined,
    });
  });

  it.each<[string, UploadJob, string]>([
    ["a format alone while pending", job("pending"), "Movimientos"],
    [
      "a range of movements by its days",
      { ...job("done"), outcome: outcomeIn(preview.period) },
      "Movimientos 1–15 ago 2026",
    ],
    [
      "a quarterly statement by its months",
      {
        ...job("done"),
        formatId: "bancolombia-savings-quarterly",
        outcome: outcomeIn(
          periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" }),
        ),
      },
      "Extracto trimestral jul–sep 2026",
    ],
    [
      "a job without a format",
      { jobId: "job", status: "pending", isSlow: false },
      "Extracto",
    ],
  ])("names %s", (_case, job, label) => {
    expect(jobLabel(job)).toBe(label);
  });
});

describe("usagePill", () => {
  const usage = (used: number) => ({
    used,
    limit: 10,
    resetsOn: localDateSchema.parse("2026-11-01"),
  });

  it("counts the statements left this month", () => {
    expect(usagePill(usage(3))).toEqual({
      tone: "ok",
      title: "7 de 10 disponibles",
      detail: "Archivos este mes",
    });
  });

  it("says when they renew once none are left", () => {
    expect(usagePill(usage(10))).toEqual({
      tone: "attention",
      title: "0 de 10 disponibles",
      detail: "Se renuevan el 1 de noviembre",
    });
    expect(limitText(usage(10))).toBe(
      "Llegaste al límite de este mes. Se renuevan el 1 de noviembre.",
    );
  });
});

describe("problemText", () => {
  const problem = (code: AppError["code"], reason?: string): AppError =>
    reason ? { code, details: { reason } } : { code };

  it.each([
    [
      "a file that isn't a spreadsheet",
      problem(APP_ERROR_CODE.UNKNOWN_FORMAT, "file_type"),
      PROBLEM_COPY.notExcel,
    ],
    [
      "a spreadsheet no parser knows",
      problem(APP_ERROR_CODE.UNKNOWN_FORMAT),
      PROBLEM_COPY.notAStatement,
    ],
    [
      "a file over 10 MB",
      problem(APP_ERROR_CODE.INVALID_INPUT, "file_size"),
      PROBLEM_COPY.tooHeavy,
    ],
    [
      "a file chosen twice",
      problem(APP_ERROR_CODE.INVALID_INPUT, "duplicate"),
      PROBLEM_COPY.duplicate,
    ],
    [
      "content over the bounds",
      problem(APP_ERROR_CODE.INVALID_INPUT, "too_large"),
      PROBLEM_COPY.tooLarge,
    ],
    [
      "a file SheetJS can't open",
      problem(APP_ERROR_CODE.PARSE_FAILED),
      PROBLEM_COPY.damaged,
    ],
    [
      "a file the browser can't read",
      problem(APP_ERROR_CODE.PARSE_FAILED, "unreadable"),
      PROBLEM_COPY.unreadable,
    ],
    [
      "a statement with a part missing",
      problem(APP_ERROR_CODE.PARSE_FAILED, "missing_column"),
      PROBLEM_COPY.incomplete,
    ],
    [
      "a session that ended while sending",
      problem(APP_ERROR_CODE.UNAUTHORIZED),
      PROBLEM_COPY.signedOut,
    ],
    [
      "any other error",
      problem(APP_ERROR_CODE.NOT_FOUND),
      PROBLEM_COPY.unreadable,
    ],
  ])("explains %s", (_case, error, expected) => {
    expect(problemText(error)).toEqual(expected);
  });
});
