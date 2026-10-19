"use server";

import { APP_ERROR_CODE, err } from "@xtrakto/core";
import { refresh } from "next/cache";
import { getSignedInClerkUserId } from "@/lib/auth";
import { answerNumbersSchema } from "../review.schemas";
import { answerReviewNumbers } from "../review.service";
import type { AnswerState } from "../review.types";

/**
 * Answers the quick review's Nequi numbers from their form, and refreshes
 * the page so the group shows what it answered. The numbers marked come as
 * `mine`, each its switch's value; whose numbers they are comes only from
 * the session.
 */
export async function answerNumbers(
  _previous: AnswerState,
  form: FormData,
): Promise<AnswerState> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  const answer = answerNumbersSchema.safeParse({
    ...Object.fromEntries(form),
    mine: form.getAll("mine"),
  });
  if (!answer.success) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  const result = await answerReviewNumbers(clerkUserId, answer.data);
  if (result.ok) refresh();
  return result;
}
