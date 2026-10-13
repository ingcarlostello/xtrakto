import { APP_ERROR_CODE, err } from "@xtrakto/core";
import type { Result } from "@xtrakto/core";
import { useEffect, useReducer, useRef } from "react";
import type { Dispatch } from "react";
import { itemsToStart, uploadQueueReducer } from "../upload-queue.helpers";
import type { UploadQueueAction } from "../upload-queue.helpers";
import { FILE_PROBLEM } from "../upload.constants";
import type {
  ExtractedStatement,
  ExtractionWorker,
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

type UploadQueueOptions = {
  /** A new worker for each file. */
  readonly createWorker: () => ExtractionWorker;
};

/**
 * The files chosen for upload, each read in its own worker, at most three at
 * a time. A worker ends when its file is read, removed, or the screen closes.
 */
export const useUploadQueue = ({ createWorker }: UploadQueueOptions) => {
  const [items, dispatch] = useReducer(uploadQueueReducer, []);
  const workers = useRef(new Map<string, ExtractionWorker>());

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

  const addFiles = (files: readonly File[]) =>
    dispatch({
      type: "added",
      files: files.map((file) => ({ id: crypto.randomUUID(), file })),
    });

  const remove = (id: string) => {
    workers.current.get(id)?.terminate();
    workers.current.delete(id);
    dispatch({ type: "removed", id });
  };

  const chooseAccount = (id: string, key: string) =>
    dispatch({ type: "accountChosen", id, key });

  return { items, addFiles, remove, chooseAccount };
};
