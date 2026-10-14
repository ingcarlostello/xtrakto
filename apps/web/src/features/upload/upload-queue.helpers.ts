import { APP_ERROR_CODE } from "@xtrakto/core";
import type { AppErrorCode, Result } from "@xtrakto/core";
import { fileProblem } from "./file-checks.helpers";
import {
  EXTRACTION_STAGE,
  MAX_PARALLEL_EXTRACTIONS,
  NO_ANSWER,
  UPLOAD_STATUS,
} from "./upload.constants";
import type {
  AccountKey,
  ExtractedStatement,
  ExtractionStage,
  SendOutcome,
  UploadItem,
} from "./upload.types";

type QueuedFile = { readonly id: string; readonly file: File };

export type UploadQueueAction =
  | { readonly type: "added"; readonly files: readonly QueuedFile[] }
  | { readonly type: "started"; readonly id: string }
  | {
      readonly type: "stageReached";
      readonly id: string;
      readonly stage: ExtractionStage;
    }
  | {
      readonly type: "finished";
      readonly id: string;
      readonly result: Result<ExtractedStatement>;
    }
  | {
      readonly type: "accountChosen";
      readonly id: string;
      readonly key: AccountKey;
    }
  | { readonly type: "sendStarted"; readonly id: string }
  | {
      readonly type: "sendFinished";
      readonly id: string;
      readonly outcome: SendOutcome;
    }
  | { readonly type: "removed"; readonly id: string };

type Queue = readonly UploadItem[];

// Changes the item with that id. An action for a removed file changes nothing.
const updateItem = (
  items: Queue,
  id: string,
  change: (item: UploadItem) => UploadItem,
): Queue => items.map((item) => (item.id === id ? change(item) : item));

const finishedItem = (
  { id, file }: UploadItem,
  result: Result<ExtractedStatement>,
): UploadItem =>
  result.ok
    ? { id, file, status: UPLOAD_STATUS.READY, statement: result.value }
    : { id, file, status: UPLOAD_STATUS.FAILED, error: result.error };

type ReadyItem = Extract<
  UploadItem,
  { readonly status: typeof UPLOAD_STATUS.READY }
>;
type SendingItem = Extract<
  UploadItem,
  { readonly status: typeof UPLOAD_STATUS.SENDING }
>;

// Whatever went wrong the last time is behind it now.
const startSending = ({
  id,
  file,
  statement,
  accountKey,
}: ReadyItem): UploadItem => ({
  id,
  file,
  status: UPLOAD_STATUS.SENDING,
  statement,
  accountKey,
});

// Refusals the person can fix by choosing another account.
const ACCOUNT_REFUSALS: ReadonlySet<AppErrorCode> = new Set([
  APP_ERROR_CODE.ACCOUNT_REQUIRED,
  APP_ERROR_CODE.NOT_FOUND,
]);

// A sent file lets its content go. One the month's limit stopped stays as it
// was: the screen says so once. One that got no answer, or whose account the
// server couldn't use, can be sent again; any other refusal is final.
const afterSending = (
  { id, file, statement, accountKey }: SendingItem,
  outcome: SendOutcome,
): UploadItem => {
  const ready = {
    id,
    file,
    status: UPLOAD_STATUS.READY,
    statement,
    accountKey,
  };
  if (outcome === NO_ANSWER) return { ...ready, sendProblem: NO_ANSWER };
  if (outcome.ok) {
    const { jobId } = outcome.value;
    return {
      id,
      file,
      status: UPLOAD_STATUS.SENT,
      preview: statement.preview,
      jobId,
    };
  }
  const { error } = outcome;
  if (error.code === APP_ERROR_CODE.LIMIT_REACHED) return ready;
  if (ACCOUNT_REFUSALS.has(error.code)) return { ...ready, sendProblem: error };
  return { id, file, status: UPLOAD_STATUS.FAILED, error };
};

// A file that fails the checks is never read; the others wait their turn.
const addFile = (items: Queue, { id, file }: QueuedFile): Queue => {
  const error = fileProblem(
    file,
    items.map((item) => item.file),
  );
  const item: UploadItem = error
    ? { id, file, status: UPLOAD_STATUS.FAILED, error }
    : { id, file, status: UPLOAD_STATUS.WAITING };
  return [...items, item];
};

type ItemAction = Exclude<
  UploadQueueAction,
  { readonly type: "added" | "removed" }
>;

// One file's next state. An action that doesn't fit its state changes nothing.
const changedItem = (item: UploadItem, action: ItemAction): UploadItem => {
  const { id, file } = item;
  switch (action.type) {
    case "started":
      return {
        id,
        file,
        status: UPLOAD_STATUS.EXTRACTING,
        stage: EXTRACTION_STAGE.READING,
      };
    case "stageReached":
      return item.status === UPLOAD_STATUS.EXTRACTING
        ? { ...item, stage: action.stage }
        : item;
    case "finished":
      return finishedItem(item, action.result);
    case "accountChosen":
      return item.status === UPLOAD_STATUS.READY
        ? { ...item, accountKey: action.key, sendProblem: undefined }
        : item;
    case "sendStarted":
      return item.status === UPLOAD_STATUS.READY ? startSending(item) : item;
    case "sendFinished":
      return item.status === UPLOAD_STATUS.SENDING
        ? afterSending(item, action.outcome)
        : item;
  }
};

/**
 * The files chosen for upload, each one waiting, being read, read, being
 * sent, sent or failed.
 */
export const uploadQueueReducer = (
  items: Queue,
  action: UploadQueueAction,
): Queue => {
  if (action.type === "added") return action.files.reduce(addFile, items);
  if (action.type === "removed") {
    return items.filter((item) => item.id !== action.id);
  }
  return updateItem(items, action.id, (item) => changedItem(item, action));
};

/** The waiting files that can start now, oldest first, without passing the limit. */
export const itemsToStart = (items: Queue): Queue => {
  const reading = items.filter(
    (item) => item.status === UPLOAD_STATUS.EXTRACTING,
  ).length;
  return items
    .filter((item) => item.status === UPLOAD_STATUS.WAITING)
    .slice(0, Math.max(0, MAX_PARALLEL_EXTRACTIONS - reading));
};
