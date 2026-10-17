import type { CategoryId } from "@xtrakto/core";
import { and, eq, inArray } from "drizzle-orm";
import { transactions } from "./transaction.schemas";

/**
 * Which movements a list or a count keeps besides its period and search:
 * those of some categories (a kind's), or those waiting for review.
 */
export type MovementSelection = {
  readonly categoryIds?: readonly CategoryId[];
  readonly isPendingReview?: boolean;
};

export const matchesSelection = ({
  categoryIds,
  isPendingReview,
}: MovementSelection) =>
  and(
    categoryIds === undefined
      ? undefined
      : inArray(transactions.categoryId, [...categoryIds]),
    isPendingReview === undefined
      ? undefined
      : eq(transactions.isPendingReview, isPendingReview),
  );
