// @vitest-environment happy-dom
import {
  APP_ERROR_CODE,
  err,
  ok,
  PERIOD_SOURCE,
  periodSchema,
} from "@xtrakto/core";
import type { AppError, Result } from "@xtrakto/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXTRACTION_STAGE,
  FILE_PROBLEM,
  NO_ANSWER,
  UPLOAD_STATUS,
} from "../upload.constants";
import type {
  ExtractedStatement,
  ExtractionMessage,
  ExtractionWorker,
  ExtractRequest,
  FileToSend,
  SubmitStatement,
  SubmittedStatement,
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
// Stands in for the server action.
const submit = vi.fn<SubmitStatement>();

type TakeHandedFiles = () => readonly File[];

function Harness({
  onRender,
  takeHandedFiles,
}: {
  onRender: (queue: Queue) => void;
  takeHandedFiles?: TakeHandedFiles;
}) {
  onRender(useUploadQueue({ createWorker, submit, takeHandedFiles }));
  return null;
}

let root: Root;
let isMounted: boolean;

const mount = (takeHandedFiles?: TakeHandedFiles) => {
  root = createRoot(document.createElement("div"));
  act(() =>
    root.render(
      <Harness
        takeHandedFiles={takeHandedFiles}
        onRender={(current) => {
          queue = current;
        }}
      />,
    ),
  );
  isMounted = true;
};

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  workers = [];
  submit.mockReset();
  mount();
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

  it("reads the files chosen on another screen as soon as it starts", () => {
    act(() => root.unmount());
    const handed = [fileNamed("trimestral.xlsx"), fileNamed("julio.xlsx")];
    const takeHandedFiles = vi.fn(() => handed);

    mount(takeHandedFiles);

    expect(takeHandedFiles).toHaveBeenCalledOnce();
    expect(queue.items.map((item) => item.file)).toEqual(handed);
    expect(workers).toHaveLength(2);
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

    add(fileNamed("movimientos.csv"), statement, statement);

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

describe("PDFs with a password in useUploadQueue", () => {
  const PASSWORD = "clave-inventada";
  const asksForPassword = err({
    code: APP_ERROR_CODE.INVALID_INPUT,
    details: { reason: "password_required" },
  });
  const wrongPassword = err({
    code: APP_ERROR_CODE.INVALID_INPUT,
    details: { reason: "password_incorrect" },
  });

  // A worker's answer, once it got its file.
  const answer = async (
    worker: FakeWorker | undefined,
    result: Result<ExtractedStatement>,
  ) => {
    await bytesSentTo(worker);
    worker?.post({ type: "done", result });
  };

  const idOf = (index: number) => queue.items[index]?.id ?? "";

  const open = (index: number, password = PASSWORD) =>
    act(() => queue.openPdf(idOf(index), password));

  // What a worker was asked to open its file with, if anything.
  const passwordSentTo = async (worker: FakeWorker | undefined) =>
    (await bytesSentTo(worker))?.request.password;

  it("asks for a PDF's password, and reads it again with the one typed", async () => {
    add(fileNamed("trimestral.pdf"));
    await answer(workers[0], asksForPassword);

    expect(queue.items[0]).toMatchObject({
      status: UPLOAD_STATUS.LOCKED,
      isWrong: false,
    });

    open(0);
    expect(await passwordSentTo(workers[1])).toBe(PASSWORD);
    workers[1]?.post({ type: "done", result: ok(STATEMENT) });

    expect(queue.items[0]).toMatchObject({ status: UPLOAD_STATUS.READY });
    expect(JSON.stringify(queue.items)).not.toContain(PASSWORD);
  });

  it("says a typed password didn't open the PDF, and asks again", async () => {
    add(fileNamed("trimestral.pdf"));
    await answer(workers[0], asksForPassword);

    open(0, "otra-clave");
    await answer(workers[1], wrongPassword);

    expect(queue.items[0]).toMatchObject({
      status: UPLOAD_STATUS.LOCKED,
      isWrong: true,
    });
  });

  it("tries the password that opened one PDF on the others, once each", async () => {
    add(...["a", "b", "c"].map((name) => fileNamed(`${name}.pdf`)));
    for (const worker of workers.slice(0, 3))
      await answer(worker, asksForPassword);

    open(0);
    await answer(workers[3], ok(STATEMENT));

    expect(await passwordSentTo(workers[4])).toBe(PASSWORD);
    expect(await passwordSentTo(workers[5])).toBe(PASSWORD);
    // c doesn't open with it; b does after, which tries it again on the
    // locked ones.
    workers[5]?.post({ type: "done", result: wrongPassword });
    workers[4]?.post({ type: "done", result: ok(STATEMENT) });

    expect(statuses()).toEqual([
      UPLOAD_STATUS.READY,
      UPLOAD_STATUS.READY,
      UPLOAD_STATUS.LOCKED,
    ]);
    // Not the person's try: it asks without saying it's wrong, and the same
    // password isn't tried on it again.
    expect(queue.items[2]).toMatchObject({ isWrong: false });
    expect(workers).toHaveLength(6);
  });

  it("tries it on a PDF still being read when it opened another", async () => {
    add(fileNamed("a.pdf"), fileNamed("b.pdf"));
    await answer(workers[0], asksForPassword);
    open(0);
    await answer(workers[2], ok(STATEMENT));

    await answer(workers[1], asksForPassword);

    expect(await passwordSentTo(workers[3])).toBe(PASSWORD);
  });

  it("forgets it once the file it opened is removed", async () => {
    add(fileNamed("a.pdf"), fileNamed("b.pdf"));
    await answer(workers[0], asksForPassword);
    open(0);
    await answer(workers[2], ok(STATEMENT));

    act(() => queue.remove(idOf(0)));
    await answer(workers[1], asksForPassword);

    expect(queue.items[0]).toMatchObject({ status: UPLOAD_STATUS.LOCKED });
    expect(workers).toHaveLength(3);
  });

  it("forgets it once no file waits to be read or opened", async () => {
    add(fileNamed("a.pdf"));
    await answer(workers[0], asksForPassword);
    open(0);
    await answer(workers[1], ok(STATEMENT));

    add(fileNamed("b.pdf"));
    await answer(workers[2], asksForPassword);

    expect(queue.items[1]).toMatchObject({ status: UPLOAD_STATUS.LOCKED });
    expect(workers).toHaveLength(3);
  });

  it("never sends a PDF's password up with its content", async () => {
    add(fileNamed("trimestral.pdf"));
    await answer(workers[0], asksForPassword);
    open(0);
    await answer(workers[1], ok(STATEMENT));
    submit.mockResolvedValue(ok({ jobId: "job-a" }));

    await act(() =>
      queue.send([{ id: idOf(0), input: { content: STATEMENT.content } }]),
    );

    expect(JSON.stringify(submit.mock.calls)).not.toContain(PASSWORD);
  });
});

describe("sending with useUploadQueue", () => {
  // Chooses files and has their workers read them.
  const readFiles = async (...names: string[]) => {
    add(...names.map((name) => fileNamed(name)));
    for (const worker of workers) {
      await bytesSentTo(worker);
      worker.post({ type: "done", result: ok(STATEMENT) });
    }
  };

  const everyFile = (): FileToSend[] =>
    queue.items.map(({ id }) => ({
      id,
      input: { content: STATEMENT.content },
    }));

  const sendAll = () => act(() => queue.send(everyFile()));

  it("sends the files one at a time, in order, and lets go of what was sent", async () => {
    await readFiles("a.xlsx", "b.xlsx");
    let answerFirst: (result: Result<SubmittedStatement>) => void = () => {};
    submit
      .mockReturnValueOnce(new Promise((resolve) => (answerFirst = resolve)))
      .mockResolvedValueOnce(ok({ jobId: "job-b" }));
    let sending = Promise.resolve();

    act(() => {
      sending = queue.send(everyFile());
    });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(queue.isSending).toBe(true);
    expect(statuses()).toEqual([UPLOAD_STATUS.SENDING, UPLOAD_STATUS.READY]);

    await act(async () => {
      answerFirst(ok({ jobId: "job-a" }));
      await sending;
    });
    expect(submit).toHaveBeenCalledTimes(2);
    expect(queue.isSending).toBe(false);
    expect(queue.items).toMatchObject([
      { status: UPLOAD_STATUS.SENT, jobId: "job-a" },
      { status: UPLOAD_STATUS.SENT, jobId: "job-b" },
    ]);
    expect(queue.items[0]).not.toHaveProperty("statement");
  });

  it("stops at the month's limit and leaves the rest ready to send", async () => {
    await readFiles("a.xlsx", "b.xlsx", "c.xlsx");
    submit
      .mockResolvedValueOnce(ok({ jobId: "job-a" }))
      .mockResolvedValueOnce(err({ code: APP_ERROR_CODE.LIMIT_REACHED }));

    await sendAll();

    expect(submit).toHaveBeenCalledTimes(2);
    expect(statuses()).toEqual([
      UPLOAD_STATUS.SENT,
      UPLOAD_STATUS.READY,
      UPLOAD_STATUS.READY,
    ]);
    expect(queue.items[1]).not.toHaveProperty("sendProblem");
  });

  it("asks again for the account the server needs, until one is chosen", async () => {
    await readFiles("movimientos.xlsx");
    const accountRequired: AppError = {
      code: APP_ERROR_CODE.ACCOUNT_REQUIRED,
    };
    submit.mockResolvedValueOnce(err(accountRequired));

    await sendAll();
    expect(queue.items[0]).toMatchObject({
      status: UPLOAD_STATUS.READY,
      sendProblem: accountRequired,
    });

    act(() => queue.chooseAccount(queue.items[0]?.id ?? "", "account:a"));
    expect(queue.items[0]).toMatchObject({ sendProblem: undefined });
  });

  it("keeps a file whose send got no answer, content and all, to try again", async () => {
    await readFiles("extracto.xlsx");
    submit.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await sendAll();

    expect(queue.items[0]).toMatchObject({
      status: UPLOAD_STATUS.READY,
      statement: STATEMENT,
      sendProblem: NO_ANSWER,
    });
    expect(queue.isSending).toBe(false);
  });

  it("fails a file the server won't read", async () => {
    await readFiles("extracto.xlsx");
    const unknownFormat: AppError = { code: APP_ERROR_CODE.UNKNOWN_FORMAT };
    submit.mockResolvedValueOnce(err(unknownFormat));

    await sendAll();

    expect(queue.items[0]).toMatchObject({
      status: UPLOAD_STATUS.FAILED,
      error: unknownFormat,
    });
  });
});
