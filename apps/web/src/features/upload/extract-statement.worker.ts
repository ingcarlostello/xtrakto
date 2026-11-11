import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type { ExtractedContent, Result } from "@xtrakto/core";
import {
  extractStatement,
  proposeReading,
  readWithMapping,
} from "./statement-extraction.helpers";
import { FILE_PROBLEM } from "./upload.constants";
import type {
  ExtractionMessage,
  ExtractRequest,
  FileReading,
} from "./upload.types";

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

// A file no parser knows stays here, never in the page, while its format is
// settled (11.3a): the page gets its sample, and what each mapping makes of it.
let held: ExtractedContent | undefined;

const post = (reading: Result<FileReading>) => {
  if (!reading.ok) {
    scope.postMessage({ type: "done", result: reading });
    return;
  }
  const { value } = reading;
  if (value.kind === "unknown") {
    held = value.content;
    scope.postMessage({ type: "unknown", format: value.format });
    return;
  }
  scope.postMessage({ type: "done", result: ok(value.statement) });
};

// One file per worker: the page terminates it once the file is read, or left
// out. A PDF's password, when there is one, opens the file here and goes
// nowhere else.
scope.onmessage = ({ data }) => {
  switch (data.type) {
    case "extract":
      extractStatement(new Uint8Array(data.bytes), {
        password: data.password,
        onStage: (stage) => scope.postMessage({ type: "stage", stage }),
      }).then(post, () =>
        scope.postMessage({ type: "done", result: unreadable }),
      );
      return;
    case "read":
      scope.postMessage({
        type: "read",
        result: held ? readWithMapping(held, data.mapping) : unreadable,
      });
      return;
    case "propose":
      scope.postMessage({
        type: "proposed",
        result: held ? proposeReading(held, data.roles) : unreadable,
      });
  }
};
