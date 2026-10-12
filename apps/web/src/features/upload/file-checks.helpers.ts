import { APP_ERROR_CODE } from "@xtrakto/core";
import type { AppError, AppErrorCode } from "@xtrakto/core";
import {
  ACCEPTED_EXTENSION,
  FILE_PROBLEM,
  MAX_FILE_SIZE_BYTES,
} from "./upload.constants";

const problem = (code: AppErrorCode, reason: string): AppError => ({
  code,
  details: { reason },
});

const isSameFile = (a: File, b: File): boolean =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/**
 * Why a chosen file is refused before it is read: it isn't an XLSX, it's over
 * 10 MB, or it's already among the chosen files. The worker then checks what
 * the file holds.
 */
export const fileProblem = (
  file: File,
  chosen: readonly File[],
): AppError | undefined => {
  if (!file.name.toLowerCase().endsWith(ACCEPTED_EXTENSION)) {
    return problem(APP_ERROR_CODE.UNKNOWN_FORMAT, FILE_PROBLEM.TYPE);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return problem(APP_ERROR_CODE.INVALID_INPUT, FILE_PROBLEM.SIZE);
  }
  if (chosen.some((other) => isSameFile(other, file))) {
    return problem(APP_ERROR_CODE.INVALID_INPUT, FILE_PROBLEM.DUPLICATE);
  }
  return undefined;
};
