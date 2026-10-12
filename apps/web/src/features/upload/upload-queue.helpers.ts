import type { Result } from "@xtrakto/core";
import {
  EXTRACTION_STAGE,
  MAX_PARALLEL_EXTRACTIONS,
  UPLOAD_STATUS,
} from "./upload.constants";
import type {
  ExtractedStatement,
  ExtractionStage,
  UploadItem,
} from "./upload.types";

export type UploadQueueAction =
  | {
      readonly type: "added";
      readonly files: readonly { readonly id: string; readonly file: File }[];
    }
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

/** The files chosen for upload, each one waiting, being read, read or failed. */
export const uploadQueueReducer = (
  items: Queue,
  action: UploadQueueAction,
): Queue => {
  switch (action.type) {
    case "added":
      return [
        ...items,
        ...action.files.map(({ id, file }) => ({
          id,
          file,
          status: UPLOAD_STATUS.WAITING,
        })),
      ];
    case "started":
      return updateItem(items, action.id, ({ id, file }) => ({
        id,
        file,
        status: UPLOAD_STATUS.EXTRACTING,
        stage: EXTRACTION_STAGE.READING,
      }));
    case "stageReached":
      return updateItem(items, action.id, (item) =>
        item.status === UPLOAD_STATUS.EXTRACTING
          ? { ...item, stage: action.stage }
          : item,
      );
    case "finished":
      return updateItem(items, action.id, (item) =>
        finishedItem(item, action.result),
      );
    case "removed":
      return items.filter((item) => item.id !== action.id);
  }
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
