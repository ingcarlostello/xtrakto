"use server";

import {
  APP_ERROR_CODE,
  type AppError,
  err,
  ok,
  type Result,
} from "@xtrakto/core";
import { getSignedInClerkUserId } from "@/lib/auth";
import { jobIdsSchema } from "../upload.schemas";
import { listUploadJobs } from "../upload.service";
import type { UploadJob } from "../upload.types";

/**
 * How the upload screen's jobs go, all in one call. The ids are validated
 * here, whatever their type says, and only the signed-in user's jobs answer.
 */
export async function getUploadStatuses(
  jobIds: readonly string[],
): Promise<Result<readonly UploadJob[], AppError>> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  const ids = jobIdsSchema.safeParse(jobIds);
  if (!ids.success) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  return ok(await listUploadJobs(clerkUserId, ids.data));
}
