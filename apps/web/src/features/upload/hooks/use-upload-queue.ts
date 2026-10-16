import { APP_ERROR_CODE, err } from "@xtrakto/core";
import type { Result } from "@xtrakto/core";
import { useEffect, useReducer, useRef, useState } from "react";
import type { Dispatch } from "react";
import { itemsToStart, uploadQueueReducer } from "../upload-queue.helpers";
import type { UploadQueueAction } from "../upload-queue.helpers";
import { FILE_PROBLEM, NO_ANSWER } from "../upload.constants";
import type {
  AccountKey,
  ExtractedStatement,
  ExtractionWorker,
  FileToSend,
  SendOutcome,
  SubmitStatement,
  UploadItem,
} from "../upload.types";

// The file couldn't be read from disk, or its worker stopped unexpectedly.
const unreadable: Result<never> = err({
  code: APP_ERROR_CODE.PARSE_FAILED,
  details: { reason: FILE_PROBLEM.UNREADABLE },
});

type Extraction = {
  readonly item: UploadItem;
  readonly worker: ExtractionWorker;
  readonly dispatch: Dispatch<UploadQueueAction>;
};

// Reads the file here and hands the worker only its bytes, transferred rather
// than copied: the worker never sees the file's name.
const extractInWorker = ({ item, worker, dispatch }: Extraction): void => {
  const finish = (result: Result<ExtractedStatement>) => {
    worker.terminate();
    dispatch({ type: "finished", id: item.id, result });
  };
  worker.onmessage = ({ data }) => {
    if (data.type === "done") finish(data.result);
    else dispatch({ type: "stageReached", id: item.id, stage: data.stage });
  };
  worker.onerror = () => finish(unreadable);
  dispatch({ type: "started", id: item.id });
  item.file.arrayBuffer().then(
    (bytes) => worker.postMessage({ bytes }, [bytes]),
    () => finish(unreadable),
  );
};

const isLimitReached = (outcome: SendOutcome): boolean =>
  outcome !== NO_ANSWER &&
  !outcome.ok &&
  outcome.error.code === APP_ERROR_CODE.LIMIT_REACHED;

// One file at a time, in the list's order, so the month's limit stops the
// rest. A rejected call (no connection, a server error, a new deployment) is
// an answer the person can retry, not an exception.
const sendInOrder = async (
  files: readonly FileToSend[],
  submit: SubmitStatement,
  dispatch: Dispatch<UploadQueueAction>,
): Promise<void> => {
  for (const { id, input } of files) {
    dispatch({ type: "sendStarted", id });
    const outcome = await submit(input).catch((): SendOutcome => NO_ANSWER);
    dispatch({ type: "sendFinished", id, outcome });
    if (isLimitReached(outcome)) return;
  }
};

const useSending = (
  submit: SubmitStatement,
  dispatch: Dispatch<UploadQueueAction>,
) => {
  const [isSending, setIsSending] = useState(false);
  const send = async (files: readonly FileToSend[]) => {
    setIsSending(true);
    try {
      await sendInOrder(files, submit, dispatch);
    } finally {
      setIsSending(false);
    }
  };
  return { send, isSending };
};

const added = (files: readonly File[]): UploadQueueAction => ({
  type: "added",
  files: files.map((file) => ({ id: crypto.randomUUID(), file })),
});

type TakeHandedFiles = () => readonly File[];

// Files chosen on another screen join the queue when it starts. In an
// effect, not while rendering: taking them empties their store.
const useHandedFiles = (
  takeHandedFiles: TakeHandedFiles | undefined,
  dispatch: Dispatch<UploadQueueAction>,
) => {
  useEffect(() => {
    const handed = takeHandedFiles?.() ?? [];
    if (handed.length > 0) dispatch(added(handed));
  }, [takeHandedFiles, dispatch]);
};

type UploadQueueOptions = {
  /** A new worker for each file. */
  readonly createWorker: () => ExtractionWorker;
  /** Queues one file on the server. */
  readonly submit: SubmitStatement;
  /** The files chosen on another screen, such as the welcome's last step. */
  readonly takeHandedFiles?: TakeHandedFiles;
};

/**
 * The files chosen for upload, each read in its own worker, at most three at
 * a time, then sent one at a time. A worker ends when its file is read,
 * removed, or the screen closes.
 */
export const useUploadQueue = ({
  createWorker,
  submit,
  takeHandedFiles,
}: UploadQueueOptions) => {
  const [items, dispatch] = useReducer(uploadQueueReducer, []);
  const workers = useRef(new Map<string, ExtractionWorker>());
  const { send, isSending } = useSending(submit, dispatch);
  useHandedFiles(takeHandedFiles, dispatch);

  useEffect(() => {
    for (const item of itemsToStart(items)) {
      const worker = createWorker();
      workers.current.set(item.id, worker);
      extractInWorker({ item, worker, dispatch });
    }
  }, [items, createWorker]);

  useEffect(() => {
    const running = workers.current;
    return () => {
      for (const worker of running.values()) worker.terminate();
      running.clear();
    };
  }, []);

  const addFiles = (files: readonly File[]) => dispatch(added(files));

  const remove = (id: string) => {
    workers.current.get(id)?.terminate();
    workers.current.delete(id);
    dispatch({ type: "removed", id });
  };

  const chooseAccount = (id: string, key: AccountKey) =>
    dispatch({ type: "accountChosen", id, key });

  return { items, addFiles, remove, chooseAccount, send, isSending };
};
