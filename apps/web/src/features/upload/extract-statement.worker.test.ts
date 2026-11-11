import {
  APP_ERROR_CODE,
  err,
  formatMappingSchema,
  ok,
  PERIOD_SOURCE,
  periodSchema,
} from "@xtrakto/core";
import type { ExtractedContent } from "@xtrakto/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtractionOptions } from "./statement-extraction.helpers";
import { EXTRACTION_STAGE, FILE_PROBLEM } from "./upload.constants";
import type {
  ExtractedStatement,
  ExtractionMessage,
  ExtractRequest,
  UnknownFormat,
} from "./upload.types";

const mocks = vi.hoisted(() => ({
  extractStatement: vi.fn(),
  readWithMapping: vi.fn(),
  reviewReading: vi.fn(),
}));

vi.mock("./statement-extraction.helpers", () => mocks);

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

// A file no parser knows, as the extraction keeps it.
const UNKNOWN_CONTENT: ExtractedContent = {
  type: "spreadsheet",
  sheets: [{ name: "Hoja1", rows: [["FECHA", "DETALLE", "VALOR"]] }],
};
const FORMAT: UnknownFormat = {
  header: ["FECHA", "DETALLE", "VALOR"],
  sample: {
    header: ["FECHA", "DETALLE", "VALOR"],
    rows: [["99/99/9999", "AAAA", "99"]],
  },
};
const MAPPING = formatMappingSchema.parse({
  header: ["FECHA", "DETALLE", "VALOR"],
  columns: ["date", "description", "amount"],
  dateOrder: "dmy",
  decimalSeparator: ",",
  bankId: "other",
});

const extract = (password?: string) =>
  receive({
    data: {
      type: "extract",
      bytes: BYTES.slice().buffer,
      ...(password ? { password } : {}),
    },
  });

// What the worker posts once it answers with a message of that type.
const answered = async (type: ExtractionMessage["type"]) => {
  await vi.waitFor(() =>
    expect(posted.some((message) => message.type === type)).toBe(true),
  );
  return posted;
};

beforeEach(() => {
  posted.length = 0;
  mocks.extractStatement.mockReset();
  mocks.readWithMapping.mockReset();
  mocks.reviewReading.mockReset();
});

describe("extract-statement worker", () => {
  it("posts each stage as it starts, then the statement it read", async () => {
    mocks.extractStatement.mockImplementation(
      (_bytes: Uint8Array, { onStage }: ExtractionOptions) => {
        onStage(EXTRACTION_STAGE.READING);
        onStage(EXTRACTION_STAGE.RECOGNIZING);
        return Promise.resolve(ok({ kind: "statement", statement: STATEMENT }));
      },
    );

    extract();

    expect(await answered("done")).toEqual([
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
    mocks.extractStatement.mockResolvedValue(
      ok({ kind: "statement", statement: STATEMENT }),
    );

    extract("clave-inventada");

    await answered("done");
    expect(mocks.extractStatement).toHaveBeenCalledWith(BYTES, {
      password: "clave-inventada",
      onStage: expect.any(Function),
    });
  });

  it("passes on what reading the file failed with", async () => {
    const unknown = err({ code: APP_ERROR_CODE.UNKNOWN_FORMAT });
    mocks.extractStatement.mockResolvedValue(unknown);

    extract();

    expect(await answered("done")).toEqual([{ type: "done", result: unknown }]);
  });

  it("says the file is unreadable when reading it fails unexpectedly", async () => {
    mocks.extractStatement.mockRejectedValue(new Error("chunk failed"));

    extract();

    expect(await answered("done")).toEqual([
      {
        type: "done",
        result: err({
          code: APP_ERROR_CODE.PARSE_FAILED,
          details: { reason: FILE_PROBLEM.UNREADABLE },
        }),
      },
    ]);
  });

  it("keeps a file no parser knows, and posts only what's asked about its format", async () => {
    mocks.extractStatement.mockResolvedValue(
      ok({ kind: "unknown", content: UNKNOWN_CONTENT, format: FORMAT }),
    );

    extract();

    expect(await answered("unknown")).toEqual([
      { type: "unknown", format: FORMAT },
    ]);
  });

  it("reads the file it keeps with a mapping, and says what each choice makes of it", async () => {
    mocks.extractStatement.mockResolvedValue(
      ok({ kind: "unknown", content: UNKNOWN_CONTENT, format: FORMAT }),
    );
    mocks.readWithMapping.mockReturnValue(ok(STATEMENT));
    mocks.reviewReading.mockReturnValue(err({ code: "PARSE_FAILED" }));
    extract();
    await answered("unknown");
    const choices = { roles: MAPPING.columns };

    receive({ data: { type: "review", revision: 0 } });
    receive({ data: { type: "review", choices, revision: 3 } });
    receive({ data: { type: "read", mapping: MAPPING } });

    expect(posted.slice(1)).toEqual([
      { type: "reviewed", revision: 0, result: err({ code: "PARSE_FAILED" }) },
      { type: "reviewed", revision: 3, result: err({ code: "PARSE_FAILED" }) },
      { type: "read", result: ok(STATEMENT) },
    ]);
    expect(mocks.reviewReading.mock.calls).toEqual([
      [UNKNOWN_CONTENT, undefined],
      [UNKNOWN_CONTENT, choices],
    ]);
    expect(mocks.readWithMapping).toHaveBeenCalledWith(
      UNKNOWN_CONTENT,
      MAPPING,
    );
  });
});
