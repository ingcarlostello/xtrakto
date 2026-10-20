import type {
  AmountMinor,
  AppError,
  CategorizationRuleId,
  CategoryId,
  CategoryKind,
  KindTotals,
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
  /** The answer as an answered group says it back: "Son tuyas". */
  readonly said: string;
  readonly categoryId: CategoryId | null;
};

export type ReviewAnswerId = keyof typeof REVIEW_ANSWERS;

/** One question of the quick review. */
export type ReviewGroupDefinition = {
  readonly id: string;
  /** What the group is, once answered: "Transferencias a tu nombre". */
  readonly name: string;
  /** The rules whose guesses it asks about. */
  readonly ruleIds: readonly CategorizationRuleId[];
  readonly icon: LucideIcon;
  readonly question: string;
  readonly context: string;
  /** The best guess first. */
  readonly answers: readonly ReviewAnswerId[];
  /** Asked number by number, each with its switch (the Nequi numbers, 6.3d). */
  readonly asksByNumber?: boolean;
  /**
   * The answer "Lo que está en juego" weighs against the guess, one that
   * changes the period's totals, and how it starts saying it: "Si son
   * compras" (6.3e).
   */
  readonly whatIf: {
    readonly answer: ReviewAnswerId;
    readonly ifSaid: string;
  };
};

export type ReviewGroupId = (typeof REVIEW_GROUPS)[number]["id"];

/** A bank text as printed, and how many of the group's movements carry it. */
export type ReviewText = { readonly text: string; readonly count: number };

/** A number the movements went to, as its HMAC and last 4 digits, and what went there. */
export type ReviewNumber = {
  readonly referenceHash: string;
  readonly last4: string | null;
  /** The bank's text of its movements, as printed. */
  readonly text: string;
  readonly count: number;
  readonly amountMinor: AmountMinor;
  /** The user's rule says it's theirs. */
  readonly isMine: boolean;
};

/** Some of a group's movements in the period. */
export type GroupMovements = {
  readonly texts: readonly ReviewText[];
  /** What the movements add up to, signed. */
  readonly amountMinor: AmountMinor;
  readonly count: number;
  /** For a group asked by number: each number, the most movements first. */
  readonly numbers?: readonly ReviewNumber[];
};

/** What some of a group's answered movements count as now. */
export type ReviewOutcome = {
  /** The answer said back, "No sé", or the label of a category given elsewhere. */
  readonly said: string;
  readonly categoryId: CategoryId;
  /** "No sé": they keep the best guess. */
  readonly isGuessKept: boolean;
  readonly count: number;
};

/** A group's answered movements, and what they count as now. */
export type AnsweredMovements = GroupMovements & {
  readonly outcomes: readonly ReviewOutcome[];
};

/** Some of a group's movements that count as one kind now. */
export type KindShare = {
  readonly kind: CategoryKind;
  /** What they add up to, signed. */
  readonly amountMinor: AmountMinor;
  readonly count: number;
};

/** What waits for an answer in a group, and what it counts as meanwhile. */
export type PendingMovements = GroupMovements & {
  /** By kind, the most movements first; a category the table lost has none. */
  readonly kinds: readonly KindShare[];
};

/**
 * A question with its movements in the period: open while some wait for an
 * answer (`pending`), closed once none does. What was answered is what
 * "Cambiar" asks about again.
 */
export type ReviewGroup = { readonly id: ReviewGroupId } & (
  | {
      readonly pending: PendingMovements;
      readonly answered: AnsweredMovements | null;
    }
  | { readonly pending: null; readonly answered: AnsweredMovements }
);

/** What waits for an answer in a quarter: the summary's banner says it. */
export type PendingReview = {
  readonly groups: number;
  readonly movements: number;
};

/** The quick review of one account's quarter. */
export type Review = {
  readonly account: AccountRow;
  readonly period: MovementPeriod;
  readonly groups: readonly ReviewGroup[];
  /** The quarter's movements that count, by kind, with the guesses as they stand. */
  readonly totals: KindTotals;
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

/** The Nequi numbers' answer: the ones the user marked as theirs, by HMAC. */
export type NumbersAnswerInput = {
  readonly account: string;
  readonly period: MovementPeriod;
  readonly mine: readonly string[];
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
