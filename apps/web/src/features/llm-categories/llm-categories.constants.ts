import type { CategoryId, MoneyDirection } from "@xtrakto/core";

/**
 * The categories the LLM chooses among, by its money's direction (8.4): real
 * spending's for money going out and income's for money coming in, never
 * "moved", which only the rules, the holder's name and the user know. Cash,
 * the bank's costs and payment gateways stay out too: the rules name them.
 */
export const LLM_CATEGORY_CHOICES = {
  out: [
    "groceries",
    "restaurants",
    "transport",
    "utilities",
    "housing",
    "health",
    "education",
    "entertainment",
    "shopping",
    "subscriptions",
    "loan_payment",
    "transfers_to_people",
    "other_spending",
  ],
  in: ["income_transfer", "interest", "deposit", "refund", "other_income"],
} as const satisfies Record<MoneyDirection, readonly CategoryId[]>;

/** Texts per call: a short answer, and few texts left waiting when one fails. */
export const CATEGORIZE_BATCH_SIZE = 25;

/** The lowest confidence an answer counts with, in the eval and when saved (8.5b). */
export const MIN_LLM_CONFIDENCE = 0.7;
