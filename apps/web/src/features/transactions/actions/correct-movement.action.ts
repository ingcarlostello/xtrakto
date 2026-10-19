"use server";

import { APP_ERROR_CODE, err } from "@xtrakto/core";
import { refresh } from "next/cache";
import { getSignedInClerkUserId } from "@/lib/auth";
import { correctionSchema } from "../correction.schemas";
import { correctMovementCategory } from "../correction.service";
import type { CorrectionState } from "../transaction.types";

/**
 * Saves a correction from a movement's detail, and refreshes the page so the
 * list, its totals and the detail show it. The form is validated here,
 * whatever it sends, and whose movement it is comes only from the session.
 */
export async function correctMovement(
  _previous: CorrectionState,
  form: FormData,
): Promise<CorrectionState> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  const correction = correctionSchema.safeParse(Object.fromEntries(form));
  if (!correction.success) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  const result = await correctMovementCategory(clerkUserId, correction.data);
  if (result.ok) refresh();
  return result;
}
