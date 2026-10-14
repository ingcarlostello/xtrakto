import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import type { RefObject } from "react";
import { submitStatement } from "../actions/submit-statement.action";
import { filesToSend } from "../upload-send.helpers";
import type {
  AccountKey,
  ExtractionWorker,
  FileToSend,
  UploadAccount,
} from "../upload.types";
import { useUploadQueue } from "./use-upload-queue";

// Turbopack bundles the worker, SheetJS included, into chunks of its own,
// served from this origin; the browser loads them when the first file is
// chosen, never with the page.
const createExtractionWorker = (): ExtractionWorker =>
  new Worker(new URL("../extract-statement.worker.ts", import.meta.url));

// The month's count and the user's accounts come from the server: once files
// go up, the page asks for them again, keeping what's on screen.
const useRefreshingSend = (
  send: (files: readonly FileToSend[]) => Promise<void>,
) => {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const sendFiles = async (files: readonly FileToSend[]) => {
    await send(files);
    startRefresh(() => router.refresh());
  };
  return { sendFiles, isRefreshing };
};

// When sending ends and takes its button with it, the focus would fall to the
// page: hand it to the picker.
const usePickerFocusAfter = (
  isBusy: boolean,
  picker: RefObject<HTMLButtonElement | null>,
) => {
  const wasBusy = useRef(false);
  useEffect(() => {
    const isFocusLost = document.activeElement === document.body;
    if (wasBusy.current && !isBusy && isFocusLost) picker.current?.focus();
    wasBusy.current = isBusy;
  }, [isBusy, picker]);
};

/** What a row of the list can do with its file. */
export type FileActions = {
  readonly onRemove: (id: string) => void;
  readonly onRetry: (id: string) => void;
  readonly onChooseAccount: (id: string, key: AccountKey) => void;
};

/**
 * The upload card's state: the files chosen, the ones ready to send, and
 * whether files are going up (until the page has the server's new count).
 */
export const useUploadFlow = (accounts: readonly UploadAccount[]) => {
  const queue = useUploadQueue({
    createWorker: createExtractionWorker,
    submit: submitStatement,
  });
  const { sendFiles, isRefreshing } = useRefreshingSend(queue.send);
  const isBusy = queue.isSending || isRefreshing;
  const picker = useRef<HTMLButtonElement>(null);
  usePickerFocusAfter(isBusy, picker);
  const files = filesToSend(queue.items, accounts);
  const actions: FileActions = {
    // A removed row takes the focus with it: hand it back to the picker.
    onRemove: (id) => {
      queue.remove(id);
      picker.current?.focus();
    },
    onRetry: (id) => void sendFiles(files.filter((file) => file.id === id)),
    onChooseAccount: queue.chooseAccount,
  };
  const sendAll = () => void sendFiles(files);
  return {
    items: queue.items,
    addFiles: queue.addFiles,
    files,
    isBusy,
    picker,
    actions,
    sendAll,
  };
};
