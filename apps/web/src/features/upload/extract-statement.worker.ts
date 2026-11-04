import { APP_ERROR_CODE, err } from "@xtrakto/core";
import { extractStatement } from "./statement-extraction.helpers";
import { FILE_PROBLEM } from "./upload.constants";
import type { ExtractionMessage, ExtractRequest } from "./upload.types";

// The dedicated worker's global scope. The app's TypeScript configuration has
// the DOM library, not the worker one, so only what this file uses is typed.
type WorkerScope = {
  onmessage: ((event: MessageEvent<ExtractRequest>) => void) | null;
  postMessage: (message: ExtractionMessage) => void;
};

// Safe: this module only runs as a dedicated worker, which UploadFlow creates.
const scope = globalThis as unknown as WorkerScope;

// A rejection the page wouldn't hear of, such as pdf.js failing to download,
// leaves the file unreadable instead of waiting forever.
const unreadable = err({
  code: APP_ERROR_CODE.PARSE_FAILED,
  details: { reason: FILE_PROBLEM.UNREADABLE },
});

// One file per worker: the page terminates it once the result arrives. A
// PDF's password, when there is one, opens the file here and goes nowhere else.
scope.onmessage = ({ data }) => {
  extractStatement(new Uint8Array(data.bytes), {
    password: data.password,
    onStage: (stage) => scope.postMessage({ type: "stage", stage }),
  }).then(
    (result) => scope.postMessage({ type: "done", result }),
    () => scope.postMessage({ type: "done", result: unreadable }),
  );
};
