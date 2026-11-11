import { APP_ERROR_CODE } from "@xtrakto/core";
import type { FormatMapping } from "@xtrakto/core";
import type { MappingChoices } from "@xtrakto/parsers";
import { useEffect, useReducer, useState } from "react";
import type { Dispatch } from "react";
import { uploadQueueReducer } from "../upload-queue.helpers";
import type { UploadQueueAction } from "../upload-queue.helpers";
import { NO_ANSWER } from "../upload.constants";
import type {
  AccountKey,
  ExtractionWorker,
  FileToSend,
  SendOutcome,
  SubmitStatement,
} from "../upload.types";
import { type FormatServices, useFileReaders } from "./use-file-readers";

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
  /** Look up and propose the format of a file no parser knows; never a new object each render. */
  readonly services: FormatServices;
  /** The files chosen on another screen, such as the welcome's last step. */
  readonly takeHandedFiles?: TakeHandedFiles;
};

/**
 * The files chosen for upload, each read in its own worker, at most three at
 * a time, then sent one at a time. A PDF with a password waits for it, and the
 * one that opened a PDF is tried on the others; it never leaves the browser.
 * A file no parser knows waits for its format: the one saved for it, or the
 * one the person corrects and confirms (11.3a, 11.3b).
 */
export const useUploadQueue = ({
  createWorker,
  submit,
  services,
  takeHandedFiles,
}: UploadQueueOptions) => {
  const [{ items }, dispatch] = useReducer(uploadQueueReducer, { items: [] });
  const readers = useFileReaders({ items, createWorker, services, dispatch });
  const { send, isSending } = useSending(submit, dispatch);
  useHandedFiles(takeHandedFiles, dispatch);

  const addFiles = (files: readonly File[]) => dispatch(added(files));

  const remove = (id: string) => {
    readers.stop(id);
    dispatch({ type: "removed", id });
  };

  const chooseAccount = (id: string, key: AccountKey) =>
    dispatch({ type: "accountChosen", id, key });

  const openPdf = (id: string, password: string) =>
    dispatch({ type: "passwordTyped", id, password });

  const correctFormat = (id: string, choices: MappingChoices) =>
    readers.correct(id, choices);

  const confirmFormat = (id: string, mapping: FormatMapping) =>
    readers.confirm(id, mapping);

  return {
    items,
    addFiles,
    remove,
    chooseAccount,
    openPdf,
    correctFormat,
    confirmFormat,
    send,
    isSending,
  };
};
