import { APP_ERROR_CODE } from "@xtrakto/core";
import type { AppError, AppErrorCode } from "@xtrakto/core";
import {
  ACCEPTED_EXTENSIONS,
  FILE_PROBLEM,
  MAX_FILE_SIZE_BYTES,
} from "./upload.constants";

const problem = (code: AppErrorCode, reason: string): AppError => ({
  code,
  details: { reason },
});

const isSameFile = (a: File, b: File): boolean =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/** Whether a file's name says it's a PDF; its bytes decide how it's read. */
export const isPdfName = (name: string): boolean =>
  name.toLowerCase().endsWith(".pdf");

/**
 * Why a chosen file is refused before it is read: it isn't an XLSX or a PDF,
 * it's over 10 MB, or it's already among the chosen files. The worker then
 * checks what the file holds.
 */
export const fileProblem = (
  file: File,
  chosen: readonly File[],
): AppError | undefined => {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
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
