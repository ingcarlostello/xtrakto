import { ok, PERIOD_SOURCE, periodSchema } from "@xtrakto/core";
import { describe, expect, it, vi } from "vitest";
import { EXTRACTION_STAGE } from "./upload.constants";
import type {
  ExtractedStatement,
  ExtractionMessage,
  ExtractionStage,
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
    period: periodSchema.parse({ from: "2026-10-01", to: "2026-10-07" }),
    periodSource: PERIOD_SOURCE.ROWS,
    movementCount: 2,
  },
};

describe("extract-statement worker", () => {
  it("posts each stage as it starts, then the result of the bytes it got", () => {
    mocks.extractStatement.mockImplementation(
      (_bytes: Uint8Array, onStage: (stage: ExtractionStage) => void) => {
        onStage(EXTRACTION_STAGE.READING);
        onStage(EXTRACTION_STAGE.RECOGNIZING);
        return ok(STATEMENT);
      },
    );

    receive({ data: { bytes: new Uint8Array([80, 75, 3, 4]).buffer } });

    expect(mocks.extractStatement).toHaveBeenCalledWith(
      new Uint8Array([80, 75, 3, 4]),
      expect.any(Function),
    );
    expect(posted).toEqual([
      { type: "stage", stage: EXTRACTION_STAGE.READING },
      { type: "stage", stage: EXTRACTION_STAGE.RECOGNIZING },
      { type: "done", result: ok(STATEMENT) },
    ]);
  });
});
