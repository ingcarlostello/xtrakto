import type {
  AmountMinor,
  AppError,
  CategorizationRuleId,
  CategoryId,
  Result,
  UserCategoryRule,
} from "@xtrakto/core";
import type { AccountRow } from "@xtrakto/db";
import type { LucideIcon } from "lucide-react";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import type { REVIEW_ANSWERS, REVIEW_GROUPS } from "./review.constants";

/** An answer and the category it gives; `null` keeps the best guess ("No sé"). */
export type ReviewAnswer = {
  readonly label: string;
  readonly categoryId: CategoryId | null;
};

export type ReviewAnswerId = keyof typeof REVIEW_ANSWERS;

/** One question of the quick review. */
export type ReviewGroupDefinition = {
  readonly id: string;
  /** The rules whose guesses it asks about. */
  readonly ruleIds: readonly CategorizationRuleId[];
  readonly icon: LucideIcon;
  readonly question: string;
  readonly context: string;
  /** The best guess first. */
  readonly answers: readonly ReviewAnswerId[];
};

export type ReviewGroupId = (typeof REVIEW_GROUPS)[number]["id"];

/** A bank text as printed, and how many of the group's movements carry it. */
export type ReviewText = { readonly text: string; readonly count: number };

/** A question with its movements in the period. */
export type ReviewGroup = {
  readonly id: ReviewGroupId;
  readonly texts: readonly ReviewText[];
  /** What the movements add up to, signed. */
  readonly amountMinor: AmountMinor;
  readonly count: number;
};

/** The quick review of one account's quarter. */
export type Review = {
  readonly account: AccountRow;
  readonly period: MovementPeriod;
  readonly groups: readonly ReviewGroup[];
};

export type ReviewRequest = {
  readonly accountId?: string;
  readonly period?: MovementPeriod;
};

/** An answer to a group, for one account's quarter. */
export type ReviewAnswerInput = {
  readonly group: ReviewGroupId;
  readonly answer: ReviewAnswerId;
  readonly account: string;
  readonly period: MovementPeriod;
};

/**
 * What an answer saves: a rule for each text and direction, and the
 * movements the bank wrote as `0` by id, since no rule can name them.
 */
export type AnswerPlan = {
  readonly rules: readonly UserCategoryRule[];
  readonly movementIds: readonly string[];
};

/** What the answer form shows after sending: nothing yet, or how it went. */
export type AnswerState = Result<null, AppError> | null;
