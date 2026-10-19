"use server";

import { APP_ERROR_CODE, err } from "@xtrakto/core";
import { refresh } from "next/cache";
import { getSignedInClerkUserId } from "@/lib/auth";
import { ruleChangeSchema } from "../own-rules.schemas";
import { updateMovementRules } from "../own-rules.service";
import type { RuleChangeState } from "../transaction.types";

/**
 * Makes a movement's Nequi number the user's, or undoes a rule, from its
 * detail, and refreshes the page so the list, its totals and the detail
 * show it. The form is validated here, whatever it sends, and whose
 * movement it is comes only from the session.
 */
export async function changeMovementRule(
  _previous: RuleChangeState,
  form: FormData,
): Promise<RuleChangeState> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  const change = ruleChangeSchema.safeParse(Object.fromEntries(form));
  if (!change.success) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  const result = await updateMovementRules(clerkUserId, change.data);
  if (result.ok) refresh();
  return result;
}
