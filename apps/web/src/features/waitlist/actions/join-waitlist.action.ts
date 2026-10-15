"use server";

import {
  APP_ERROR_CODE,
  type AppError,
  err,
  ok,
  type Result,
} from "@xtrakto/core";
import { joinWaitlistSchema } from "../waitlist.schemas";
import { addToWaitlist } from "../waitlist.service";
import type { WaitlistFormValues } from "../waitlist.types";

/**
 * Adds someone to the waitlist. Public: whoever joins has no account, so
 * there is no session to check (project rules §7, ADR 0021). It answers the
 * same whether the email was there or not, so it can't tell who joined.
 */
export async function joinWaitlist(
  input: WaitlistFormValues,
): Promise<Result<null, AppError>> {
  const request = joinWaitlistSchema.safeParse(input);
  if (!request.success) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  await addToWaitlist(request.data);
  return ok(null);
}
