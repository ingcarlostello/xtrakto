import { describe, expect, it } from "vitest";
import { amountMinorSchema } from "../money/money.schemas";
import { MONEY_DIRECTION } from "./categorization.constants";
import type { UserCategoryRule } from "./categorization.types";
import {
  type MatchedMovement,
  matchedUpdate,
} from "./matched-movement.helpers";
import { compileUserRules, userRuleTextOf } from "./user-rule.helpers";

const PHONE_HASH = "a".repeat(64);
const CODE_HASH = "b".repeat(64);
const NEQUI = "TRANSFERENCIAS A NEQUI";

// A Nequi send as a quarterly statement saves it: without the number.
const saved = (
  overrides: Partial<Omit<MatchedMovement, "amountMinor">> & {
    readonly amount?: number;
  } = {},
): MatchedMovement => {
  const { amount = -2_000_000, ...rest } = overrides;
  return {
    descriptionNormalized: NEQUI,
    amountMinor: amountMinorSchema.parse(amount),
    referenceHash: null,
    referenceLast4: null,
    referenceKind: null,
    categoryId: "transfers_to_people",
    categorySource: "rule",
    categoryRuleId: "nequi_out",
    llmCategoryId: null,
    isPendingReview: false,
    ...rest,
  };
};

// The same send as a movements export saves it: with the number.
const exported = (overrides: Partial<MatchedMovement> = {}) =>
  saved({
    referenceHash: PHONE_HASH,
    referenceLast4: "4567",
    referenceKind: "phone",
    categoryRuleId: "nequi_out_number",
    isPendingReview: true,
    ...overrides,
  });

const contextWith = (rules: readonly UserCategoryRule[] = []) => ({
  userRules: compileUserRules(rules),
});

const NUMBER_IS_MINE: UserCategoryRule = {
  target: "reference",
  referenceHash: PHONE_HASH,
  categoryId: "own_account_transfer",
};

describe("matchedUpdate", () => {
  it("gives a Nequi send its number, which makes it wait for the review", () => {
    expect(matchedUpdate(saved(), exported(), contextWith())).toEqual({
      referenceHash: PHONE_HASH,
      referenceLast4: "4567",
      referenceKind: "phone",
      categoryId: "transfers_to_people",
      categorySource: "rule",
      categoryRuleId: "nequi_out_number",
      isPendingReview: true,
    });
  });

  it("gives the send the user's category when they marked its number as theirs", () => {
    expect(
      matchedUpdate(saved(), exported(), contextWith([NUMBER_IS_MINE])),
    ).toMatchObject({
      referenceHash: PHONE_HASH,
      categoryId: "own_account_transfer",
      categorySource: "user",
      categoryRuleId: "nequi_out_number",
      isPendingReview: false,
    });
  });

  it("keeps the category the user's rule for its text gives, when its number has none", () => {
    const textRule: UserCategoryRule = {
      target: "description",
      descriptionFolded: userRuleTextOf(NEQUI),
      direction: MONEY_DIRECTION.OUT,
      categoryId: "own_account_transfer",
    };
    const counted = saved({
      categoryId: "own_account_transfer",
      categorySource: "user",
    });

    expect(
      matchedUpdate(counted, exported(), contextWith([textRule])),
    ).toMatchObject({
      referenceHash: PHONE_HASH,
      categoryId: "own_account_transfer",
      categorySource: "user",
      categoryRuleId: "nequi_out_number",
      isPendingReview: false,
    });
  });

  it("keeps a category the user chose for that movement alone, even with a rule for its number", () => {
    const counted = saved({ categoryId: "groceries", categorySource: "user" });

    expect(
      matchedUpdate(counted, exported(), contextWith([NUMBER_IS_MINE])),
    ).toMatchObject({
      referenceHash: PHONE_HASH,
      categoryId: "groceries",
      categorySource: "user",
      categoryRuleId: "nequi_out_number",
      isPendingReview: false,
    });
  });

  it("keeps a guess answered with «No sé» when the reference changes no rule", () => {
    const pse = {
      descriptionNormalized: "PAGO PSE Banco Ejemplo S",
      categoryId: "credit_card_payment",
      categoryRuleId: "pse_card",
    } as const;
    const counted = saved({ ...pse, isPendingReview: false });
    const hidden = saved({
      ...pse,
      referenceHash: CODE_HASH,
      referenceLast4: "5678",
      referenceKind: "code",
      isPendingReview: true,
    });

    expect(matchedUpdate(counted, hidden, contextWith())).toEqual({
      referenceHash: CODE_HASH,
      referenceLast4: "5678",
      referenceKind: "code",
      categoryId: "credit_card_payment",
      categorySource: "rule",
      categoryRuleId: "pse_card",
      isPendingReview: false,
    });
  });

  it("keeps a reference the movement already has", () => {
    const counted = exported({ referenceHash: CODE_HASH });

    expect(matchedUpdate(counted, exported(), contextWith())).toBeUndefined();
  });

  it("changes nothing when the export brings no reference and no answer", () => {
    expect(matchedUpdate(saved(), saved(), contextWith())).toBeUndefined();
  });

  describe("for a movements export that counted before its quarterly statement", () => {
    const BANK_ZERO = {
      descriptionNormalized: "0",
      categoryId: "other_spending",
      categoryRuleId: "no_description_out",
    } as const;
    const KEY_PAYMENT = {
      descriptionNormalized: "PAGO LLAVE Maria Lopez",
      categoryRuleId: "key_payment",
    } as const;

    it("gives the movement the category the user chose for the export's", () => {
      const counted = saved({ ...BANK_ZERO, isPendingReview: true });
      const hidden = saved({
        ...BANK_ZERO,
        categoryId: "groceries",
        categorySource: "user",
      });

      expect(matchedUpdate(counted, hidden, contextWith())).toMatchObject({
        categoryId: "groceries",
        categorySource: "user",
        categoryRuleId: "no_description_out",
        isPendingReview: false,
      });
    });

    it("takes it out of the review when the user answered «No sé» for the export's", () => {
      const counted = saved({ ...KEY_PAYMENT, isPendingReview: true });
      const hidden = saved({ ...KEY_PAYMENT, isPendingReview: false });

      expect(matchedUpdate(counted, hidden, contextWith())).toMatchObject({
        categoryRuleId: "key_payment",
        isPendingReview: false,
      });
    });

    it("never overrides what the user answered for the one that counts", () => {
      const counted = saved({
        ...BANK_ZERO,
        categoryId: "restaurants",
        categorySource: "user",
      });
      const hidden = saved({
        ...BANK_ZERO,
        categoryId: "groceries",
        categorySource: "user",
      });

      expect(matchedUpdate(counted, hidden, contextWith())).toBeUndefined();
    });

    it("leaves a guess the export's «No sé» didn't answer", () => {
      const counted = saved({ ...KEY_PAYMENT, isPendingReview: true });
      const hidden = saved({
        ...KEY_PAYMENT,
        categoryRuleId: "key_payment_saving",
        categoryId: "investment",
      });

      expect(matchedUpdate(counted, hidden, contextWith())).toBeUndefined();
    });
  });
});
