import { APP_ERROR_CODE } from "@xtrakto/core";
import type { AppError, AppErrorCode, Result } from "@xtrakto/core";
import { fileProblem } from "./file-checks.helpers";
import {
  EXTRACTION_STAGE,
  MAX_PARALLEL_EXTRACTIONS,
  NO_ANSWER,
  PDF_PASSWORD_REASONS,
  UPLOAD_STATUS,
} from "./upload.constants";
import type {
  AccountKey,
  ExtractedStatement,
  ExtractionStage,
  PasswordTry,
  SendOutcome,
  UploadItem,
} from "./upload.types";

type QueuedFile = { readonly id: string; readonly file: File };

type FinishedAction = {
  readonly type: "finished";
  readonly id: string;
  readonly result: Result<ExtractedStatement>;
};

export type UploadQueueAction =
  | { readonly type: "added"; readonly files: readonly QueuedFile[] }
  | { readonly type: "started"; readonly id: string }
  | {
      readonly type: "stageReached";
      readonly id: string;
      readonly stage: ExtractionStage;
    }
  | FinishedAction
  | {
      readonly type: "passwordTyped";
      readonly id: string;
      readonly password: string;
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

/**
 * The files chosen, and the password that opened one of their PDFs, kept in
 * memory only while another file may still need it.
 */
export type UploadQueueState = {
  readonly items: Queue;
  readonly opener?: { readonly password: string; readonly itemId: string };
};

// Changes the item with that id. An action for a removed file changes nothing.
const updateItem = (
  items: Queue,
  id: string,
  change: (item: UploadItem) => UploadItem,
): Queue => items.map((item) => (item.id === id ? change(item) : item));

const isLockedOut = (error: AppError): boolean =>
  PDF_PASSWORD_REASONS.has(error.details?.reason);

const withPassword = (
  { id, file }: UploadItem,
  password: PasswordTry,
): UploadItem => ({ id, file, status: UPLOAD_STATUS.WAITING, password });

// A PDF that asks for its password tries the one that opened another first;
// one that didn't open with its try waits for the person's.
const finishedItem = (
  item: UploadItem,
  result: Result<ExtractedStatement>,
  remembered: string | undefined,
): UploadItem => {
  const { id, file } = item;
  if (result.ok)
    return { id, file, status: UPLOAD_STATUS.READY, statement: result.value };
  if (!isLockedOut(result.error))
    return { id, file, status: UPLOAD_STATUS.FAILED, error: result.error };
  const tried =
    item.status === UPLOAD_STATUS.EXTRACTING ? item.password : undefined;
  if (tried === undefined && remembered !== undefined)
    return withPassword(item, { value: remembered, isTyped: false });
  return {
    id,
    file,
    status: UPLOAD_STATUS.LOCKED,
    failedWith: tried?.value,
    isWrong: tried?.isTyped === true,
  };
};

// The password that opened a PDF is tried, once, on the others still locked.
const triedOnTheLocked = (items: Queue, password: string): Queue =>
  items.map((item) =>
    item.status === UPLOAD_STATUS.LOCKED && item.failedWith !== password
      ? withPassword(item, { value: password, isTyped: false })
      : item,
  );

const finished = (
  { items, opener }: UploadQueueState,
  { id, result }: FinishedAction,
): UploadQueueState => {
  const item = items.find((candidate) => candidate.id === id);
  if (item === undefined) return { items, opener };
  const updated = updateItem(items, id, () =>
    finishedItem(item, result, opener?.password),
  );
  const opened =
    result.ok && item.status === UPLOAD_STATUS.EXTRACTING
      ? item.password?.value
      : undefined;
  return opened === undefined
    ? { items: updated, opener }
    : {
        items: triedOnTheLocked(updated, opened),
        opener: { password: opened, itemId: id },
      };
};

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
  { readonly type: "added" | "removed" | "finished" }
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
        password:
          item.status === UPLOAD_STATUS.WAITING ? item.password : undefined,
      };
    case "stageReached":
      return item.status === UPLOAD_STATUS.EXTRACTING
        ? { ...item, stage: action.stage }
        : item;
    case "passwordTyped":
      return item.status === UPLOAD_STATUS.LOCKED
        ? withPassword(item, { value: action.password, isTyped: true })
        : item;
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

const isWaiting = ({ status }: UploadItem): boolean =>
  status === UPLOAD_STATUS.WAITING ||
  status === UPLOAD_STATUS.EXTRACTING ||
  status === UPLOAD_STATUS.LOCKED;

const nextState = (
  state: UploadQueueState,
  action: UploadQueueAction,
): UploadQueueState => {
  const { items, opener } = state;
  switch (action.type) {
    case "added":
      return { items: action.files.reduce(addFile, items), opener };
    case "removed":
      return {
        items: items.filter((item) => item.id !== action.id),
        // The password goes with the file it opened.
        opener: opener?.itemId === action.id ? undefined : opener,
      };
    case "finished":
      return finished(state, action);
    default:
      return {
        items: updateItem(items, action.id, (item) =>
          changedItem(item, action),
        ),
        opener,
      };
  }
};

/**
 * The files chosen for upload, each one waiting, being read, locked by its
 * password, read, being sent, sent or failed. The password that opened a PDF
 * is forgotten once no file waits to be read or opened.
 */
export const uploadQueueReducer = (
  state: UploadQueueState,
  action: UploadQueueAction,
): UploadQueueState => {
  const next = nextState(state, action);
  return next.items.some(isWaiting) ? next : { items: next.items };
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
