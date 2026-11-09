"use server";

import {
  APP_ERROR_CODE,
  type AppError,
  err,
  parseTypedAmount,
  type Result,
} from "@xtrakto/core";
import { getSignedInClerkUserId } from "@/lib/auth";
import { todaysBalanceSchema } from "../todays-balance.schemas";
import { keepTodaysBalance } from "../todays-balance.service";
import type { TodaysBalanceAnswer } from "../todays-balance.types";

/**
 * Today's balance as the person typed it, kept on their account and checked
 * against the movements that count (10.3). The session names the user; the
 * account must be theirs.
 */
export async function saveTodaysBalance(
  input: unknown,
): Promise<Result<TodaysBalanceAnswer, AppError>> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  const parsed = todaysBalanceSchema.safeParse(input);
  if (!parsed.success) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  const amount = parseTypedAmount(parsed.data.balance);
  if (!amount.ok) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  return keepTodaysBalance(clerkUserId, parsed.data.accountId, amount.value);
}
