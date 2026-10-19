import { z } from "zod";
import {
  type MovementPeriod,
  parsePeriodParam,
  TRANSACTIONS_PARAMS,
} from "@/utils/transactions-url.helpers";
import { REVIEW_ANSWERS, REVIEW_GROUPS } from "./review.constants";
import { reviewGroupById } from "./review.helpers";
import type { ReviewAnswerId, ReviewGroupId } from "./review.types";

const isGroupId = (value: unknown): value is ReviewGroupId =>
  REVIEW_GROUPS.some(({ id }) => id === value);

const isAnswerId = (value: unknown): value is ReviewAnswerId =>
  typeof value === "string" && Object.hasOwn(REVIEW_ANSWERS, value);

const periodSchema = z.string().transform(parsePeriodParam);

/**
 * The review's account and period, from the URL, as Movimientos reads them:
 * a param that doesn't parse is left out. Whether the account is the user's,
 * the service checks.
 */
export const reviewSearchSchema = z.object({
  [TRANSACTIONS_PARAMS.account]: z.uuid().optional().catch(undefined),
  [TRANSACTIONS_PARAMS.period]: periodSchema.optional().catch(undefined),
});

/** An answer from a group's form: one of that group's own answers. */
export const answerReviewSchema = z
  .object({
    group: z.custom<ReviewGroupId>(isGroupId),
    answer: z.custom<ReviewAnswerId>(isAnswerId),
    account: z.uuid(),
    period: periodSchema.pipe(
      z.custom<MovementPeriod>((period) => period !== undefined),
    ),
  })
  .refine(({ group, answer }) =>
    reviewGroupById(group).answers.includes(answer),
  );
