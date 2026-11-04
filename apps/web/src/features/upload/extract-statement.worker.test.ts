import {
  APP_ERROR_CODE,
  err,
  ok,
  PERIOD_SOURCE,
  periodSchema,
} from "@xtrakto/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtractionOptions } from "./statement-extraction.helpers";
import { EXTRACTION_STAGE, FILE_PROBLEM } from "./upload.constants";
import type {
  ExtractedStatement,
  ExtractionMessage,
  ExtractRequest,
} from "./upload.types";

const mocks = vi.hoisted(() => ({ extractStatement: vi.fn() }));

vi.mock("./statement-extraction.helpers", () => ({
  extractStatement: mocks.extractStatement,
}));

// The worker's global scope: what it posts, and the handler it installs.
const posted: ExtractionMessage[] = [];
vi.stubGlobal("postMessage", (message: ExtractionMessage) => {
  posted.push(message);
});
await import("./extract-statement.worker");
type Handler = (event: { data: ExtractRequest }) => void;
// Safe: importing the worker module installed its handler on the scope.
const receive = (globalThis as unknown as { onmessage: Handler }).onmessage;

const STATEMENT: ExtractedStatement = {
  content: { type: "spreadsheet", sheets: [] },
  preview: {
    bankId: "bancolombia",
    formatId: "bancolombia-movements-export",
    accountType: "savings",
    period: periodSchema.parse({ from: "2026-10-01", to: "2026-10-07" }),
    periodSource: PERIOD_SOURCE.ROWS,
    movementCount: 2,
  },
};

const BYTES = new Uint8Array([80, 75, 3, 4]);

// What the worker posts once it's done.
const done = async () => {
  await vi.waitFor(() =>
    expect(posted.some(({ type }) => type === "done")).toBe(true),
  );
  return posted;
};

beforeEach(() => {
  posted.length = 0;
  mocks.extractStatement.mockReset();
});

describe("extract-statement worker", () => {
  it("posts each stage as it starts, then the result of the bytes it got", async () => {
    mocks.extractStatement.mockImplementation(
      (_bytes: Uint8Array, { onStage }: ExtractionOptions) => {
        onStage(EXTRACTION_STAGE.READING);
        onStage(EXTRACTION_STAGE.RECOGNIZING);
        return Promise.resolve(ok(STATEMENT));
      },
    );

    receive({ data: { bytes: BYTES.slice().buffer } });

    expect(await done()).toEqual([
      { type: "stage", stage: EXTRACTION_STAGE.READING },
      { type: "stage", stage: EXTRACTION_STAGE.RECOGNIZING },
      { type: "done", result: ok(STATEMENT) },
    ]);
    expect(mocks.extractStatement).toHaveBeenCalledWith(BYTES, {
      password: undefined,
      onStage: expect.any(Function),
    });
  });

  it("opens a PDF with the password it got", async () => {
    mocks.extractStatement.mockResolvedValue(ok(STATEMENT));

    receive({
      data: { bytes: BYTES.slice().buffer, password: "clave-inventada" },
    });

    await done();
    expect(mocks.extractStatement).toHaveBeenCalledWith(BYTES, {
      password: "clave-inventada",
      onStage: expect.any(Function),
    });
  });

  it("says the file is unreadable when reading it fails unexpectedly", async () => {
    mocks.extractStatement.mockRejectedValue(new Error("chunk failed"));

    receive({ data: { bytes: BYTES.slice().buffer } });

    expect(await done()).toEqual([
      {
        type: "done",
        result: err({
          code: APP_ERROR_CODE.PARSE_FAILED,
          details: { reason: FILE_PROBLEM.UNREADABLE },
        }),
      },
    ]);
  });
});
