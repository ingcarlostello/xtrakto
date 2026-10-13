// @vitest-environment happy-dom
import {
  APP_ERROR_CODE,
  err,
  ok,
  PERIOD_SOURCE,
  periodSchema,
} from "@xtrakto/core";
import type { AppError } from "@xtrakto/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXTRACTION_STAGE,
  FILE_PROBLEM,
  UPLOAD_STATUS,
} from "../upload.constants";
import type {
  ExtractedStatement,
  ExtractionMessage,
  ExtractionWorker,
  ExtractRequest,
} from "../upload.types";
import { useUploadQueue } from "./use-upload-queue";

// Stands in for a worker: records what it's sent and whether it was
// terminated, and lets the test post its messages.
class FakeWorker implements ExtractionWorker {
  onmessage: ExtractionWorker["onmessage"] = null;
  onerror: ExtractionWorker["onerror"] = null;
  readonly requests: { request: ExtractRequest; transfer: Transferable[] }[] =
    [];
  isTerminated = false;

  postMessage(request: ExtractRequest, transfer: Transferable[]) {
    this.requests.push({ request, transfer });
  }

  terminate() {
    this.isTerminated = true;
  }

  post(message: ExtractionMessage) {
    act(() => this.onmessage?.(new MessageEvent("message", { data: message })));
  }

  crash() {
    act(() => this.onerror?.(new ErrorEvent("error")));
  }
}

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
const UNREADABLE: AppError = {
  code: APP_ERROR_CODE.PARSE_FAILED,
  details: { reason: "unreadable" },
};

type Queue = ReturnType<typeof useUploadQueue>;
let queue: Queue;
let workers: FakeWorker[];
const createWorker = () => {
  const worker = new FakeWorker();
  workers.push(worker);
  return worker;
};

function Harness({ onRender }: { onRender: (queue: Queue) => void }) {
  onRender(useUploadQueue({ createWorker }));
  return null;
}

let root: Root;
let isMounted: boolean;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  workers = [];
  root = createRoot(document.createElement("div"));
  act(() =>
    root.render(
      <Harness
        onRender={(current) => {
          queue = current;
        }}
      />,
    ),
  );
  isMounted = true;
});

afterEach(() => {
  if (isMounted) act(() => root.unmount());
});

const fileNamed = (name: string, bytes = [80, 75, 3, 4]) =>
  new File([new Uint8Array(bytes)], name);

const add = (...files: File[]) => act(() => queue.addFiles(files));

const statuses = () => queue.items.map((item) => item.status);

// The file's bytes reach a worker after an asynchronous read.
const bytesSentTo = async (worker: FakeWorker | undefined) => {
  await vi.waitFor(() => expect(worker?.requests).toHaveLength(1));
  return worker?.requests[0];
};

describe("useUploadQueue", () => {
  it("reads at most three files at a time, and starts the next when one ends", async () => {
    add(...["a", "b", "c", "d"].map((name) => fileNamed(`${name}.xlsx`)));

    expect(workers).toHaveLength(3);
    expect(statuses()).toEqual([
      UPLOAD_STATUS.EXTRACTING,
      UPLOAD_STATUS.EXTRACTING,
      UPLOAD_STATUS.EXTRACTING,
      UPLOAD_STATUS.WAITING,
    ]);

    await bytesSentTo(workers[0]);
    workers[0]?.post({ type: "done", result: ok(STATEMENT) });

    expect(workers[0]?.isTerminated).toBe(true);
    expect(workers).toHaveLength(4);
    expect(statuses()).toEqual([
      UPLOAD_STATUS.READY,
      UPLOAD_STATUS.EXTRACTING,
      UPLOAD_STATUS.EXTRACTING,
      UPLOAD_STATUS.EXTRACTING,
    ]);
  });

  it("hands each worker its file's bytes, transferred, and never its name", async () => {
    add(fileNamed("extracto-ana.xlsx", [1, 2, 3]));

    const sent = await bytesSentTo(workers[0]);

    expect(Object.keys(sent?.request ?? {})).toEqual(["bytes"]);
    expect(new Uint8Array(sent?.request.bytes ?? [])).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(sent?.transfer).toEqual([sent?.request.bytes]);
  });

  it("follows each stage and keeps what was read", async () => {
    add(fileNamed("extracto.xlsx"));
    await bytesSentTo(workers[0]);

    workers[0]?.post({ type: "stage", stage: EXTRACTION_STAGE.RECOGNIZING });
    expect(queue.items[0]).toMatchObject({
      status: UPLOAD_STATUS.EXTRACTING,
      stage: EXTRACTION_STAGE.RECOGNIZING,
    });

    workers[0]?.post({ type: "done", result: ok(STATEMENT) });
    expect(queue.items[0]).toMatchObject({
      status: UPLOAD_STATUS.READY,
      statement: STATEMENT,
    });
  });

  it("keeps the error of a file its worker couldn't read", async () => {
    const unknownFormat: AppError = { code: APP_ERROR_CODE.UNKNOWN_FORMAT };
    add(fileNamed("lista.xlsx"));
    await bytesSentTo(workers[0]);

    workers[0]?.post({ type: "done", result: err(unknownFormat) });

    expect(queue.items[0]).toMatchObject({
      status: UPLOAD_STATUS.FAILED,
      error: unknownFormat,
    });
    expect(workers[0]?.isTerminated).toBe(true);
  });

  it("marks a file unreadable when its worker stops unexpectedly", async () => {
    add(fileNamed("extracto.xlsx"));
    await bytesSentTo(workers[0]);

    workers[0]?.crash();

    expect(queue.items[0]).toMatchObject({
      status: UPLOAD_STATUS.FAILED,
      error: UNREADABLE,
    });
    expect(workers[0]?.isTerminated).toBe(true);
  });

  it("marks a file unreadable when the browser can't read it from disk", async () => {
    const file = fileNamed("movido.xlsx");
    vi.spyOn(file, "arrayBuffer").mockRejectedValue(new Error("not found"));

    add(file);

    await vi.waitFor(() =>
      expect(queue.items[0]).toMatchObject({
        status: UPLOAD_STATUS.FAILED,
        error: UNREADABLE,
      }),
    );
    expect(workers[0]?.requests).toHaveLength(0);
  });

  it("never reads a file that fails the checks", () => {
    const statement = fileNamed("extracto.xlsx");

    add(fileNamed("extracto.pdf"), statement, statement);

    expect(queue.items).toMatchObject([
      {
        status: UPLOAD_STATUS.FAILED,
        error: { details: { reason: FILE_PROBLEM.TYPE } },
      },
      { status: UPLOAD_STATUS.EXTRACTING },
      {
        status: UPLOAD_STATUS.FAILED,
        error: { details: { reason: FILE_PROBLEM.DUPLICATE } },
      },
    ]);
    expect(workers).toHaveLength(1);
  });

  it("stops a removed file's worker and starts a waiting file", () => {
    add(...["a", "b", "c", "d"].map((name) => fileNamed(`${name}.xlsx`)));
    const [first] = queue.items;

    act(() => queue.remove(first?.id ?? ""));

    expect(workers[0]?.isTerminated).toBe(true);
    expect(queue.items.map((item) => item.file.name)).toEqual([
      "b.xlsx",
      "c.xlsx",
      "d.xlsx",
    ]);
    expect(workers).toHaveLength(4);
  });

  it("stops every worker when the screen closes", () => {
    add(fileNamed("a.xlsx"), fileNamed("b.xlsx"));

    act(() => root.unmount());
    isMounted = false;

    expect(workers.map((worker) => worker.isTerminated)).toEqual([true, true]);
  });

  it("keeps the account chosen for a file read", async () => {
    add(fileNamed("movimientos.xlsx"));
    await bytesSentTo(workers[0]);
    workers[0]?.post({ type: "done", result: ok(STATEMENT) });
    const [item] = queue.items;

    act(() => queue.chooseAccount(item?.id ?? "", "account:a"));

    expect(queue.items[0]).toMatchObject({
      status: UPLOAD_STATUS.READY,
      accountKey: "account:a",
    });
  });
});
