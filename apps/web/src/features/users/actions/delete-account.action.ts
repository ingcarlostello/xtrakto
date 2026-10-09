"use server";

import {
  APP_ERROR_CODE,
  type AppError,
  err,
  ok,
  type Result,
} from "@xtrakto/core";
import { getSignedInClerkUserId } from "@/lib/auth";
import { deleteAccountAndData } from "../user.service";

/**
 * Deletes the signed-in user's account and every row of their data. It takes
 * no input: whose account comes only from the session.
 */
export async function deleteAccount(): Promise<Result<null, AppError>> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  await deleteAccountAndData(clerkUserId);
  return ok(null);
}
