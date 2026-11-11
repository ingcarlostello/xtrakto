import type { FormatMapping } from "@xtrakto/core";
import type { MappingChoices } from "@xtrakto/parsers";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore, useTransition } from "react";
import type { RefObject } from "react";
import { findSavedFormat } from "@/features/format-mappings/actions/find-saved-format.action";
import { proposeFormatMapping } from "@/features/format-mappings/actions/propose-format-mapping.action";
import { getUploadStatuses } from "../actions/get-upload-statuses.action";
import { submitStatement } from "../actions/submit-statement.action";
import {
  jobIdsFromHash,
  sentJobIds,
  trackedJobIds,
} from "../upload-jobs.helpers";
import { isAskingForPassword } from "../upload-display.helpers";
import { filesToSend } from "../upload-send.helpers";
import { JOBS_PARAM, UPLOAD_STATUS } from "../upload.constants";
import { takeHandedFiles } from "../upload.store";
import type {
  AccountKey,
  ExtractionWorker,
  FileToSend,
  UploadAccount,
  UploadItem,
} from "../upload.types";
import type { FormatServices } from "./use-file-readers";
import { useUploadEvents } from "./use-upload-events";
import { useUploadQueue } from "./use-upload-queue";
import { useUploadStatuses } from "./use-upload-statuses";

// Turbopack bundles the worker, SheetJS included, into chunks of its own,
// served from this origin; the browser loads them when the first file is
// chosen, never with the page.
const createExtractionWorker = (): ExtractionWorker =>
  new Worker(new URL("../extract-statement.worker.ts", import.meta.url));

// The format of a file no parser knows: the one saved for it, else the LLM's
// proposal (11.3a). One object, so the queue's effects don't run again.
const FORMAT_SERVICES: FormatServices = {
  findSaved: findSavedFormat,
  propose: proposeFormatMapping,
};

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

// When a PDF opens, its password's form goes and the focus would fall to the
// page: hand it to the picker, unless another PDF's field took it.
const usePickerFocusWhenOpened = (
  items: readonly UploadItem[],
  picker: RefObject<HTMLButtonElement | null>,
) => {
  const asking = items.filter(isAskingForPassword).length;
  const wasAsking = useRef(0);
  useEffect(() => {
    const isFocusLost = document.activeElement === document.body;
    if (asking < wasAsking.current && isFocusLost) picker.current?.focus();
    wasAsking.current = asking;
  }, [asking, picker]);
};

// The URL's fragment keeps the jobs sent, so a reload shows them again. Not a
// search param: a new one would make Next.js mount the page anew, losing the
// files on screen. Replacing the entry adds no step to the history.
const useJobsInUrl = (jobIds: readonly string[]) => {
  const value = jobIds.join();
  useEffect(() => {
    // Empty while hydrating, before the fragment is read: never erase it.
    if (value === "") return;
    const hash = `#${JOBS_PARAM}=${value}`;
    if (window.location.hash === hash) return;
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}${hash}`);
  }, [value]);
};

// The fragment as the browser has it; the server never sees one.
const subscribeToNothing = () => () => {};
const useJobIdsInUrl = (): readonly string[] =>
  jobIdsFromHash(
    useSyncExternalStore(
      subscribeToNothing,
      () => window.location.hash,
      () => "",
    ),
  );

// Once the last open job ends, the month's count may change (a file already
// loaded frees its slot): the page asks the server again, keeping its state.
const useRefreshWhenDone = (hasOpenJobs: boolean) => {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const hadOpenJobs = useRef(false);
  useEffect(() => {
    if (hadOpenJobs.current && !hasOpenJobs)
      startRefresh(() => router.refresh());
    hadOpenJobs.current = hasOpenJobs;
  }, [hasOpenJobs, router]);
};

// The jobs the page follows: those its URL kept that this page didn't send,
// shown on their own, and those of the files sent from it.
const useSentJobs = (sent: readonly string[]) => {
  const fromUrl = useJobIdsInUrl().filter((id) => !sent.includes(id));
  const jobIds = trackedJobIds(fromUrl, sent);
  const statuses = useUploadStatuses({
    jobIds,
    getStatuses: getUploadStatuses,
  });
  useJobsInUrl(jobIds);
  useRefreshWhenDone(statuses.hasOpenJobs);
  const restored = fromUrl.filter((id) => !statuses.missing.has(id));
  return { restored, statuses };
};

/** What a row of the list can do with its file. */
export type FileActions = {
  readonly onRemove: (id: string) => void;
  readonly onRetry: (id: string) => void;
  readonly onChooseAccount: (id: string, key: AccountKey) => void;
  /** Tries the password the person typed for a PDF. */
  readonly onOpenPdf: (id: string, password: string) => void;
  /** Takes a PDF out, to choose another file instead. */
  readonly onChooseAnother: (id: string) => void;
};

// The screen's files, read in the browser's workers and sent by the server's
// actions.
const useScreenQueue = () =>
  useUploadQueue({
    createWorker: createExtractionWorker,
    submit: submitStatement,
    services: FORMAT_SERVICES,
    takeHandedFiles,
  });

/** A file no parser knows, waiting for the person to confirm how to read it. */
export type ConfirmingItem = Extract<
  UploadItem,
  { readonly status: typeof UPLOAD_STATUS.CONFIRMING }
>;

/** What the person does with a file whose format they're asked to confirm (11.3a, 11.3b). */
export type FormatActions = {
  /** Reads it again with their choices. */
  readonly onCorrect: (id: string, choices: MappingChoices) => void;
  /** Reads it with the mapping, the bank they chose included. */
  readonly onConfirm: (id: string, mapping: FormatMapping) => void;
  /** "Algo está mal": the file is left out, unread, and nothing is saved. */
  readonly onLeaveOut: (id: string) => void;
};

// The first file waiting for its format, which the screen asks about; the
// others wait their turn.
const useConfirmation = (queue: ReturnType<typeof useScreenQueue>) => {
  const confirming = queue.items.find(
    (item): item is ConfirmingItem => item.status === UPLOAD_STATUS.CONFIRMING,
  );
  const formatActions: FormatActions = {
    onCorrect: queue.correctFormat,
    onConfirm: queue.confirmFormat,
    onLeaveOut: queue.remove,
  };
  return { confirming, formatActions };
};

// The "Elegir archivos" button, where the focus goes when what had it goes.
const usePicker = (isBusy: boolean, items: readonly UploadItem[]) => {
  const picker = useRef<HTMLButtonElement>(null);
  usePickerFocusAfter(isBusy, picker);
  usePickerFocusWhenOpened(items, picker);
  return picker;
};

/**
 * The upload screen's state: the files chosen, here or on the welcome's last
 * step, the ones ready to send, whether files are going up (until the page
 * has the server's new count), how the jobs sent go, those of earlier visits
 * to the page included, and the file whose format the person confirms.
 */
export const useUploadFlow = (accounts: readonly UploadAccount[]) => {
  const queue = useScreenQueue();
  const { sendFiles, isRefreshing } = useRefreshingSend(queue.send);
  const isBusy = queue.isSending || isRefreshing;
  const picker = usePicker(isBusy, queue.items);
  const files = filesToSend(queue.items, accounts);
  const actions: FileActions = {
    // A removed row takes the focus with it: hand it back to the picker.
    onRemove: (id) => {
      queue.remove(id);
      picker.current?.focus();
    },
    onRetry: (id) => void sendFiles(files.filter((file) => file.id === id)),
    onChooseAccount: queue.chooseAccount,
    onOpenPdf: queue.openPdf,
    // Its row goes, and the picker opens, still within the person's click.
    onChooseAnother: (id) => {
      queue.remove(id);
      picker.current?.focus();
      picker.current?.click();
    },
  };
  const sendAll = () => void sendFiles(files);
  const { restored, statuses } = useSentJobs(sentJobIds(queue.items));
  useUploadEvents(queue.items, statuses.jobs);
  return {
    restored,
    statuses,
    items: queue.items,
    addFiles: queue.addFiles,
    files,
    isBusy,
    picker,
    actions,
    sendAll,
    ...useConfirmation(queue),
  };
};

/** The upload screen's state, as `useUploadFlow` gives it. */
export type UploadFlowState = ReturnType<typeof useUploadFlow>;
