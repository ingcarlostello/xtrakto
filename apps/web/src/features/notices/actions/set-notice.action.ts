"use server";

import {
  APP_ERROR_CODE,
  type AppError,
  err,
  ok,
  type Result,
} from "@xtrakto/core";
import { getSignedInClerkUserId } from "@/lib/auth";
import { setNoticeSchema } from "../notices.schemas";
import { setNoticePreference } from "../notices.service";

/**
 * Turns one of the signed-in user's notices on or off, from the profile. The
 * input is validated here, and whose notice it is comes only from the session.
 */
export async function setNotice(
  input: unknown,
): Promise<Result<void, AppError>> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  const parsed = setNoticeSchema.safeParse(input);
  if (!parsed.success) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  await setNoticePreference(clerkUserId, parsed.data.notice, parsed.data.isOn);
  return ok(undefined);
}
