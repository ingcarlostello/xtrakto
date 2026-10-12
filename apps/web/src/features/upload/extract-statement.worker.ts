import { extractStatement } from "./statement-extraction.helpers";
import type { ExtractionMessage, ExtractRequest } from "./upload.types";

// The dedicated worker's global scope. The app's TypeScript configuration has
// the DOM library, not the worker one, so only what this file uses is typed.
type WorkerScope = {
  onmessage: ((event: MessageEvent<ExtractRequest>) => void) | null;
  postMessage: (message: ExtractionMessage) => void;
};

// Safe: this module only runs as a dedicated worker, which UploadFlow creates.
const scope = globalThis as unknown as WorkerScope;

// One file per worker: the page terminates it once the result arrives.
scope.onmessage = ({ data }) => {
  const result = extractStatement(new Uint8Array(data.bytes), (stage) =>
    scope.postMessage({ type: "stage", stage }),
  );
  scope.postMessage({ type: "done", result });
};
