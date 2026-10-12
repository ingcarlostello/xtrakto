import type { AppError, ExtractedContent, Period, Result } from "@xtrakto/core";
import type { EXTRACTION_STAGE, UPLOAD_STATUS } from "./upload.constants";

export type ExtractionStage =
  (typeof EXTRACTION_STAGE)[keyof typeof EXTRACTION_STAGE];

/** What the screen shows of a file before sending it: never its movements. */
export type StatementPreview = {
  readonly bankId: string;
  readonly formatId: string;
  readonly period: Period;
  readonly movementCount: number;
};

/** A file read in the browser: what will be sent, and its preview. */
export type ExtractedStatement = {
  /** Only what the parser reads (ADR 0017). */
  readonly content: ExtractedContent;
  readonly preview: StatementPreview;
};

/** The one message a worker receives: the file's bytes, without its name. */
export type ExtractRequest = { readonly bytes: ArrayBuffer };

/** What a worker posts back: each stage as it starts, then the result. */
export type ExtractionMessage =
  | { readonly type: "stage"; readonly stage: ExtractionStage }
  | { readonly type: "done"; readonly result: Result<ExtractedStatement> };

/** What the upload queue needs from a worker, so tests can pass a fake one. */
export type ExtractionWorker = {
  postMessage: (request: ExtractRequest, transfer: Transferable[]) => void;
  terminate: () => void;
  onmessage: ((event: MessageEvent<ExtractionMessage>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
};

type UploadState =
  | { readonly status: typeof UPLOAD_STATUS.WAITING }
  | {
      readonly status: typeof UPLOAD_STATUS.EXTRACTING;
      readonly stage: ExtractionStage;
    }
  | {
      readonly status: typeof UPLOAD_STATUS.READY;
      readonly statement: ExtractedStatement;
    }
  | { readonly status: typeof UPLOAD_STATUS.FAILED; readonly error: AppError };

/** A chosen file in the upload queue. Its name never leaves the browser. */
export type UploadItem = {
  readonly id: string;
  readonly file: File;
} & UploadState;
