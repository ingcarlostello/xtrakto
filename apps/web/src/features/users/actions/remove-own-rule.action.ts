"use server";

import { APP_ERROR_CODE, err } from "@xtrakto/core";
import { refresh } from "next/cache";
import { getSignedInClerkUserId } from "@/lib/auth";
import { deleteOwnRule } from "../user.service";
import { removeOwnRuleSchema } from "../user.schemas";
import type { RemoveOwnRuleState } from "../user.types";

/**
 * Undoes one of the signed-in user's rules from the profile's "×", and
 * refreshes the page so the list and its counts show it. The form is
 * validated here, whatever it sends, and whose rule it is comes only from
 * the session.
 */
export async function removeOwnRule(
  _previous: RemoveOwnRuleState,
  form: FormData,
): Promise<RemoveOwnRuleState> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  const input = removeOwnRuleSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  const result = await deleteOwnRule(clerkUserId, input.data.rule);
  if (result.ok) refresh();
  return result;
}
