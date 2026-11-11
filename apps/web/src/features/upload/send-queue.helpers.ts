import { APP_ERROR_CODE } from "@xtrakto/core";
import type { AppErrorCode } from "@xtrakto/core";
import { NO_ANSWER, UPLOAD_STATUS } from "./upload.constants";
import type { SendOutcome, UploadItem } from "./upload.types";

type ReadyItem = Extract<
  UploadItem,
  { readonly status: typeof UPLOAD_STATUS.READY }
>;
type SendingItem = Extract<
  UploadItem,
  { readonly status: typeof UPLOAD_STATUS.SENDING }
>;

/** A file read that starts going up: whatever went wrong the last time is behind it now. */
export const startSending = ({
  id,
  file,
  statement,
  accountKey,
  mapping,
}: ReadyItem): UploadItem => ({
  id,
  file,
  status: UPLOAD_STATUS.SENDING,
  statement,
  accountKey,
  mapping,
});

// Refusals the person can fix by choosing another account.
const ACCOUNT_REFUSALS: ReadonlySet<AppErrorCode> = new Set([
  APP_ERROR_CODE.ACCOUNT_REQUIRED,
  APP_ERROR_CODE.NOT_FOUND,
]);

/**
 * A file once its send ends. A sent file lets its content go. One the
 * month's limit stopped stays as it was: the screen says so once. One that
 * got no answer, or whose account the server couldn't use, can be sent
 * again; any other refusal is final.
 */
export const afterSending = (
  { id, file, statement, accountKey, mapping }: SendingItem,
  outcome: SendOutcome,
): UploadItem => {
  const ready = {
    id,
    file,
    status: UPLOAD_STATUS.READY,
    statement,
    accountKey,
    mapping,
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
