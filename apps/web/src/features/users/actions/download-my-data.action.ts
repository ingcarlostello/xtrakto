"use server";

import {
  APP_ERROR_CODE,
  type AppError,
  err,
  ok,
  type Result,
} from "@xtrakto/core";
import { getSignedInClerkUserId } from "@/lib/auth";
import type { CsvFile } from "@/utils/movements-csv.helpers";
import { getMyDataCsv } from "../user.service";

/**
 * Every movement of the signed-in user, as a CSV to download (7.6). It
 * takes no input: whose data comes only from the session.
 */
export async function downloadMyData(): Promise<Result<CsvFile, AppError>> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  return ok(await getMyDataCsv(clerkUserId));
}
