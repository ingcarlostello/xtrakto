"use server";

import { APP_ERROR_CODE, err } from "@xtrakto/core";
import { refresh } from "next/cache";
import { getSignedInClerkUserId } from "@/lib/auth";
import { answerReviewSchema } from "../review.schemas";
import { answerReviewGroup } from "../review.service";
import type { AnswerState } from "../review.types";

/**
 * Answers a group of the quick review from its form, and refreshes the page
 * so the group leaves it. The form is validated here, whatever it sends,
 * and whose movements they are comes only from the session.
 */
export async function answerReview(
  _previous: AnswerState,
  form: FormData,
): Promise<AnswerState> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  const answer = answerReviewSchema.safeParse(Object.fromEntries(form));
  if (!answer.success) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  const result = await answerReviewGroup(clerkUserId, answer.data);
  if (result.ok) refresh();
  return result;
}
